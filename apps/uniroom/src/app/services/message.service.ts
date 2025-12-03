import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, tap, map, Subject, takeUntil, switchMap, forkJoin, of, catchError } from 'rxjs';
import { ApiService } from './api.service';
import { Conversation, Message, ConversationWithOtherUser } from '../models/message.types';
import { AuthService } from './auth.service';
import { User } from '../models/auth.types';
import { WebSocketService, WebSocketMessage } from './websocket.service';
import { resolveFileUrl } from '../utils/file-url.util';

@Injectable({
  providedIn: 'root'
})
export class MessageService implements OnDestroy {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly wsService: WebSocketService = inject(WebSocketService);
  private readonly destroy$: Subject<void> = new Subject<void>();

  private readonly conversationsSubject: BehaviorSubject<ConversationWithOtherUser[]> = new BehaviorSubject<
    ConversationWithOtherUser[]
  >([]);
  public readonly conversations$: Observable<ConversationWithOtherUser[]> = this.conversationsSubject.asObservable();

  private readonly currentConversationSubject: BehaviorSubject<Conversation | null> =
    new BehaviorSubject<Conversation | null>(null);
  public readonly currentConversation$: Observable<Conversation | null> =
    this.currentConversationSubject.asObservable();

  private readonly messagesSubject: BehaviorSubject<Message[]> = new BehaviorSubject<Message[]>([]);
  public readonly messages$: Observable<Message[]> = this.messagesSubject.asObservable();

  private activeConversationId: string | null = null;

  constructor() {
    this.initializeWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.disconnect();
  }

  private initializeWebSocket(): void {
    this.wsService.connect();

    this.wsService.message$.pipe(takeUntil(this.destroy$)).subscribe((wsMessage: WebSocketMessage): void => {
      this.handleWebSocketMessage(wsMessage);
    });
  }

  private handleWebSocketMessage(wsMessage: WebSocketMessage): void {
    switch (wsMessage.type) {
      case 'message':
        this.handleNewMessage(wsMessage.data);
        break;
      case 'conversation_update':
        this.handleConversationUpdate(wsMessage.data);
        break;
      case 'message_read':
        this.handleMessageRead(wsMessage.data);
        break;
      default:
        break;
    }
  }

  private handleNewMessage(message: Message): void {
    if (!message?.id || !message.conversation_id || !message.sender_id) {
      return;
    }

    if (!message.created_at) {
      message.created_at = new Date().toISOString();
    }

    const currentMessages: Message[] = this.messagesSubject.value;

    if (this.activeConversationId === message.conversation_id) {
      const messageIndex: number = currentMessages.findIndex((m: Message): boolean => m.id === message.id);

      let updatedMessages: Message[];
      if (messageIndex === -1) {
        updatedMessages = [...currentMessages, message];
      } else {
        updatedMessages = [...currentMessages];
        updatedMessages[messageIndex] = message;
      }

      updatedMessages.sort((a: Message, b: Message): number => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      this.messagesSubject.next(updatedMessages);
    }

    this.updateConversationLastMessage(message);
  }

  private handleConversationUpdate(conversation: Conversation): void {
    const currentConversations: ConversationWithOtherUser[] = this.conversationsSubject.value;
    const index: number = currentConversations.findIndex(
      (c: ConversationWithOtherUser): boolean => c.id === conversation.id
    );

    if (index !== -1) {
      const updatedConv: ConversationWithOtherUser = {
        ...conversation,
        other_user: null
      };

      const updated: ConversationWithOtherUser[] = [...currentConversations];
      updated[index] = updatedConv;
      this.conversationsSubject.next(updated);
    }
  }

  private handleMessageRead(data: { message_id: string; conversation_id: string }): void {
    const currentMessages: Message[] = this.messagesSubject.value;
    const updated: Message[] = currentMessages.map((m: Message): Message => {
      if (m.id === data.message_id) {
        return { ...m, is_read: true };
      }
      return m;
    });
    this.messagesSubject.next(updated);
  }

  private updateConversationLastMessage(message: Message): void {
    const currentConversations: ConversationWithOtherUser[] = this.conversationsSubject.value;
    const updated: ConversationWithOtherUser[] = currentConversations.map(
      (conv: ConversationWithOtherUser): ConversationWithOtherUser => {
        if (conv.id === message.conversation_id) {
          return {
            ...conv,
            last_message: message,
            updated_at: message.created_at
          };
        }
        return conv;
      }
    );
    this.conversationsSubject.next(updated);
  }

  getConversations(): Observable<ConversationWithOtherUser[]> {
    return this.apiService.get<Conversation[]>('conversation/').pipe(
      switchMap((conversations: Conversation[]): Observable<ConversationWithOtherUser[]> => {
        const currentUserId: string | undefined = this.authService.currentUser?.id;
        if (!currentUserId || conversations.length === 0) {
          this.conversationsSubject.next([]);
          return of([]);
        }

        const conversationObservables = conversations.map(
          (conv: Conversation): Observable<ConversationWithOtherUser> => {
            const otherUserId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;

            // Fetch user and optionally housing offer
            const userObservable = this.apiService.get<User>(`user/public/${otherUserId}`).pipe(
              map((userData: User): User => this.authService.mapUserFromApi(userData)),
              catchError((): Observable<User | null> => of(null))
            );

            const offerObservable = conv.housing_offer_id
              ? this.apiService.get<any>(`offers/${conv.housing_offer_id}`).pipe(
                  map((offer: any) => ({
                    id: offer.id,
                    title: offer.title,
                    price: offer.price,
                    currency: offer.currency,
                    city: offer.city,
                    photos: (offer.photos || []).map((photo: any) => ({
                      url: resolveFileUrl(photo.url) ?? resolveFileUrl(photo.file_metadata?.public_url) ?? photo.url,
                      is_primary: photo.is_primary || false
                    }))
                  })),
                  catchError((): Observable<null> => of(null))
                )
              : of(null);

            return forkJoin({
              user: userObservable,
              offer: offerObservable
            }).pipe(
              map(
                (result: { user: User | null; offer: any }): ConversationWithOtherUser => ({
                  ...conv,
                  other_user: result.user,
                  housing_offer: result.offer
                })
              )
            );
          }
        );

        // Wait for all fetches to complete
        return forkJoin(conversationObservables).pipe(
          tap((conversationsWithUsers: ConversationWithOtherUser[]): void => {
            this.conversationsSubject.next(conversationsWithUsers);
          })
        );
      })
    );
  }

  getConversation(conversationId: string): Observable<Conversation> {
    return this.apiService.get<Conversation>(`conversation/${conversationId}`).pipe(
      tap((conversation: Conversation): void => {
        this.currentConversationSubject.next(conversation);
      })
    );
  }

  getMessages(conversationId: string, skip: number = 0, limit: number = 100): Observable<Message[]> {
    return this.apiService.get<Message[]>(`conversation/${conversationId}/messages?skip=${skip}&limit=${limit}`).pipe(
      tap((messages: Message[]): void => {
        const currentMessages = this.messagesSubject.value;
        const messageMap = new Map<string, Message>();

        currentMessages.forEach((m) => messageMap.set(m.id, m));
        messages.forEach((m) => messageMap.set(m.id, m));

        const mergedMessages = Array.from(messageMap.values());
        mergedMessages.sort((a: Message, b: Message): number => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        this.messagesSubject.next(mergedMessages);
      })
    );
  }

  sendMessage(conversationId: string, content: string): Observable<Message> {
    return this.apiService.post<Message>(`conversation/${conversationId}/messages`, { content }).pipe(
      tap((message: Message): void => {
        this.handleNewMessage(message);
      })
    );
  }

  markAsRead(conversationId: string): Observable<void> {
    return this.apiService.post<void>(`conversation/${conversationId}/mark-read`, {});
  }

  createConversation(otherUserId: string, housingOfferId?: string, itemId?: string): Observable<Conversation> {
    const body: any = { other_user_id: otherUserId };
    if (housingOfferId) {
      body.housing_offer_id = housingOfferId;
    }
    if (itemId) {
      body.marketplace_item_id = itemId;
    }
    return this.apiService.post<Conversation>('conversation/', body).pipe(
      switchMap((conversation: Conversation): Observable<Conversation> => {
        // Fetch user and optionally housing offer
        const userObservable = this.apiService.get<User>(`user/public/${otherUserId}`).pipe(
          map((userData: User): User => this.authService.mapUserFromApi(userData)),
          catchError((): Observable<User | null> => of(null))
        );

        const offerObservable = housingOfferId
          ? this.apiService.get<any>(`offers/${housingOfferId}`).pipe(
              map((offer: any) => ({
                id: offer.id,
                title: offer.title,
                price: offer.price,
                currency: offer.currency,
                city: offer.city,
                photos: (offer.photos || []).map((photo: any) => ({
                  url: resolveFileUrl(photo.url) ?? resolveFileUrl(photo.file_metadata?.public_url) ?? photo.url,
                  is_primary: photo.is_primary || false
                }))
              })),
              catchError((): Observable<null> => of(null))
            )
          : of(null);

        return forkJoin({
          user: userObservable,
          offer: offerObservable
        }).pipe(
          map((result: { user: User | null; offer: any }): Conversation => {
            const convWithOtherUser: ConversationWithOtherUser = {
              ...conversation,
              other_user: result.user,
              housing_offer: result.offer
            };

            const current: ConversationWithOtherUser[] = this.conversationsSubject.value;
            this.conversationsSubject.next([convWithOtherUser, ...current]);

            return conversation;
          })
        );
      })
    );
  }

  getOrCreateConversation(otherUserId: string, housingOfferId?: string): Observable<Conversation> {
    const currentUserId: string | undefined = this.authService.currentUser?.id;
    if (!currentUserId) {
      return this.createConversation(otherUserId, housingOfferId);
    }

    const existingConversations: ConversationWithOtherUser[] = this.conversationsSubject.value;
    const existingConversation: ConversationWithOtherUser | undefined = existingConversations.find(
      (conv: ConversationWithOtherUser): boolean => {
        return (
          (conv.user1_id === currentUserId && conv.user2_id === otherUserId) ||
          (conv.user1_id === otherUserId && conv.user2_id === currentUserId)
        );
      }
    );

    if (existingConversation) {
      return new Observable<Conversation>((observer) => {
        observer.next(existingConversation);
        observer.complete();
      });
    }

    return this.createConversation(otherUserId, housingOfferId);
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.apiService.delete<void>(`conversation/${conversationId}`).pipe(
      tap((): void => {
        const current: ConversationWithOtherUser[] = this.conversationsSubject.value;
        const filtered: ConversationWithOtherUser[] = current.filter(
          (c: ConversationWithOtherUser): boolean => c.id !== conversationId
        );
        this.conversationsSubject.next(filtered);
      })
    );
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.wsService.sendTypingIndicator(conversationId, isTyping);
  }

  getCurrentMessages(): Message[] {
    return this.messagesSubject.value;
  }

  getConversationsValue(): ConversationWithOtherUser[] {
    return this.conversationsSubject.value;
  }

  setActiveConversation(conversationId: string | null): void {
    this.activeConversationId = conversationId;
    if (conversationId) {
      this.messagesSubject.next([]);
    }
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
  }
}
