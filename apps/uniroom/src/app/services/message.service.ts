import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import { Conversation, Message, CreateMessageDto, ConversationWithOtherUser } from '../models/message.types';
import { AuthService } from './auth.service';
import { User } from '../models/auth.types';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);

  private conversationsSubject: BehaviorSubject<ConversationWithOtherUser[]> = new BehaviorSubject<
    ConversationWithOtherUser[]
  >([]);
  public readonly conversations$: Observable<ConversationWithOtherUser[]> = this.conversationsSubject.asObservable();

  private currentConversationSubject: BehaviorSubject<Conversation | null> = new BehaviorSubject<Conversation | null>(
    null
  );
  public readonly currentConversation$: Observable<Conversation | null> =
    this.currentConversationSubject.asObservable();

  getConversations(): Observable<ConversationWithOtherUser[]> {
    return this.apiService.get<Conversation[]>('messages/conversations/').pipe(
      tap((conversations: Conversation[]) => {
        const currentUserId: string | undefined = this.authService.currentUser?.id;
        if (!currentUserId) {
          return;
        }

        const conversationsWithOtherUser: ConversationWithOtherUser[] = conversations.map((conv: Conversation) => {
          const otherUser: User | undefined =
            conv.participant1_id === currentUserId ? conv.participant2 : conv.participant1;

          return {
            ...conv,
            other_user: otherUser!
          };
        });

        this.conversationsSubject.next(conversationsWithOtherUser);
      }),
      tap(() => {}),
      map((conversations: Conversation[]) => {
        const currentUserId: string | undefined = this.authService.currentUser?.id;
        if (!currentUserId) {
          return [];
        }

        return conversations.map((conv: Conversation) => {
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
    return this.apiService.get<Conversation>(`messages/conversations/${conversationId}/`).pipe(
      tap((conversation: Conversation) => {
        this.currentConversationSubject.next(conversation);
      })
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.apiService.get<Message[]>(`messages/conversations/${conversationId}/messages/`);
  }

  sendMessage(data: CreateMessageDto): Observable<Message> {
    return this.apiService.post<Message>('messages/messages/', data);
  }

  markAsRead(messageId: string): Observable<Message> {
    return this.apiService.patch<Message>(`messages/messages/${messageId}/read/`, {});
  }

  createOrGetConversation(otherUserId: string): Observable<Conversation> {
    return this.apiService.post<Conversation>('messages/conversations/find-or-create/', {
      other_user_id: otherUserId
    });
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.apiService.delete<void>(`messages/conversations/${conversationId}/`);
  }
}
