import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface WebSocketMessage {
  type: 'message' | 'conversation_update' | 'message_read' | 'typing' | 'error';
  data: any;
  conversation_id?: string;
  sender_id?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private authService: AuthService = inject(AuthService);

  private socket: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: any = null;

  private messageSubject: Subject<WebSocketMessage> = new Subject<WebSocketMessage>();
  private connectionStatusSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public readonly message$: Observable<WebSocketMessage> = this.messageSubject.asObservable();
  public readonly connectionStatus$: Observable<boolean> = this.connectionStatusSubject.asObservable();

  async connect(): Promise<void> {
    const token: string | null = await this.authService.getToken();
    if (!token) {
      return;
    }

    const wsUrl: string = environment.wsUrl || environment.apiUrl.replace('http', 'ws').replace('/api/v1', '');
    const wsEndpoint: string = `${wsUrl}/ws/conversation/?token=${token}`;

    try {
      this.socket = new WebSocket(wsEndpoint);

      this.socket.onopen = (): void => {
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event: MessageEvent): void => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (_) {}
      };

      this.socket.onerror = (_: Event): void => {
        this.connectionStatusSubject.next(false);
      };

      this.socket.onclose = (): void => {
        this.connectionStatusSubject.next(false);
        this.attemptReconnect();
      };
    } catch (_) {
      this.connectionStatusSubject.next(false);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout((): void => {
      this.reconnectTimer = null;
      void this.connect();
    }, this.reconnectInterval);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.connectionStatusSubject.next(false);
  }

  sendMessage(message: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (_) {}
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      conversation_id: conversationId,
      data: { is_typing: isTyping }
    });
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
