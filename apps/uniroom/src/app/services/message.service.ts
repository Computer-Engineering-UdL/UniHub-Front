import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, tap, map, Subject, takeUntil } from 'rxjs';
import { ApiService } from './api.service';
import { Conversation, Message, ConversationWithOtherUser } from '../models/message.types';
import { AuthService } from './auth.service';
import { User } from '../models/auth.types';
import { WebSocketService, WebSocketMessage } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class MessageService implements OnDestroy {
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);
  private wsService: WebSocketService = inject(WebSocketService);
  private destroy$: Subject<void> = new Subject<void>();

  private conversationsSubject: BehaviorSubject<ConversationWithOtherUser[]> = new BehaviorSubject<
    ConversationWithOtherUser[]
  >([]);
  public readonly conversations$: Observable<ConversationWithOtherUser[]> = this.conversationsSubject.asObservable();

  private currentConversationSubject: BehaviorSubject<Conversation | null> = new BehaviorSubject<Conversation | null>(
    null
  );
  public readonly currentConversation$: Observable<Conversation | null> =
    this.currentConversationSubject.asObservable();

  private messagesSubject: BehaviorSubject<Message[]> = new BehaviorSubject<Message[]>([]);
  public readonly messages$: Observable<Message[]> = this.messagesSubject.asObservable();

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
    const currentMessages: Message[] = this.messagesSubject.value;
    const messageExists: boolean = currentMessages.some((m: Message): boolean => m.id === message.id);

    if (!messageExists) {
      this.messagesSubject.next([...currentMessages, message]);
    }

    this.updateConversationLastMessage(message);
  }

  private handleConversationUpdate(conversation: Conversation): void {
    const currentConversations: ConversationWithOtherUser[] = this.conversationsSubject.value;
    const index: number = currentConversations.findIndex(
      (c: ConversationWithOtherUser): boolean => c.id === conversation.id
    );

    if (index !== -1) {
      const currentUserId: string | undefined = this.authService.currentUser?.id;
      if (!currentUserId) return;

      const otherUser: User | undefined =
        conversation.participant1_id === currentUserId ? conversation.participant2 : conversation.participant1;

      const updatedConv: ConversationWithOtherUser = {
        ...conversation,
        other_user: otherUser!
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
      tap((conversations: Conversation[]): void => {
        const currentUserId: string | undefined = this.authService.currentUser?.id;
        if (!currentUserId) {
          return;
        }

        const conversationsWithOtherUser: ConversationWithOtherUser[] = conversations.map(
          (conv: Conversation): ConversationWithOtherUser => {
            const otherUser: User | undefined =
              conv.participant1_id === currentUserId ? conv.participant2 : conv.participant1;

            return {
              ...conv,
              other_user: otherUser!
            };
          }
        );

        this.conversationsSubject.next(conversationsWithOtherUser);
      }),
      map((conversations: Conversation[]): ConversationWithOtherUser[] => {
        const currentUserId: string | undefined = this.authService.currentUser?.id;
        if (!currentUserId) {
          return [];
        }

        return conversations.map((conv: Conversation): ConversationWithOtherUser => {
          const otherUser: User | undefined =
            conv.participant1_id === currentUserId ? conv.participant2 : conv.participant1;

          return {
            ...conv,
            other_user: otherUser!
          };
        });
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
        this.messagesSubject.next(messages);
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

  createConversation(otherUserId: string, housingOfferId?: string): Observable<Conversation> {
    const body: any = { user2_id: otherUserId };
    if (housingOfferId) {
      body.housing_offer_id = housingOfferId;
    }
    return this.apiService.post<Conversation>('conversation/', body).pipe(
      tap((conversation: Conversation): void => {
        const currentUserId: string | undefined = this.authService.currentUser?.id;
        if (!currentUserId) return;

        const otherUser: User | undefined =
          conversation.participant1_id === currentUserId ? conversation.participant2 : conversation.participant1;

        const convWithOtherUser: ConversationWithOtherUser = {
          ...conversation,
          other_user: otherUser!
        };

        const current: ConversationWithOtherUser[] = this.conversationsSubject.value;
        this.conversationsSubject.next([convWithOtherUser, ...current]);
      })
    );
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

  clearMessages(): void {
    this.messagesSubject.next([]);
  }
}
