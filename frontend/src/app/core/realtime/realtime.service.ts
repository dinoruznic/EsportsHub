import { DOCUMENT, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Client, IMessage, ReconnectionTimeMode, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface StompClientLike {
  brokerURL: string | undefined;
  reconnectDelay: number;
  maxReconnectDelay: number;
  reconnectTimeMode: ReconnectionTimeMode;
  heartbeatIncoming: number;
  heartbeatOutgoing: number;
  onConnect: () => void;
  onWebSocketClose: () => void;
  onStompError: () => void;
  activate(): void;
  deactivate(): Promise<void>;
  subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription;
}

export const STOMP_CLIENT_FACTORY = new InjectionToken<() => StompClientLike>('STOMP_CLIENT_FACTORY', {
  providedIn: 'root',
  factory: () => () => new Client() as unknown as StompClientLike,
});

const OFFLINE_AFTER_FAILURES = 3;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly createClient = inject(STOMP_CLIENT_FACTORY);
  private readonly location = inject(DOCUMENT).location;

  private client: StompClientLike | null = null;
  private connectedOnce = false;
  private failures = 0;
  private readonly handlers = new Map<string, Set<(body: unknown) => void>>();
  private readonly stompSubscriptions = new Map<string, StompSubscription>();
  private readonly reconnectedSubject = new Subject<void>();

  readonly state = signal<ConnectionState>('offline');
  readonly reconnected: Observable<void> = this.reconnectedSubject.asObservable();

  subscribe<T>(topic: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (body: unknown) => subscriber.next(body as T);
      const set = this.handlers.get(topic) ?? new Set();
      set.add(handler);
      this.handlers.set(topic, set);
      this.ensureClient();
      if (this.state() === 'connected') {
        this.subscribeStomp(topic);
      }
      return () => this.remove(topic, handler);
    });
  }

  private remove(topic: string, handler: (body: unknown) => void): void {
    const set = this.handlers.get(topic);
    set?.delete(handler);
    if (set && set.size === 0) {
      this.handlers.delete(topic);
      this.stompSubscriptions.get(topic)?.unsubscribe();
      this.stompSubscriptions.delete(topic);
    }
    if (this.handlers.size === 0) {
      this.disconnect();
    }
  }

  private ensureClient(): void {
    if (this.client) {
      return;
    }
    const client = this.createClient();
    const secure = this.location.protocol === 'https:';
    client.brokerURL = `${secure ? 'wss' : 'ws'}://${this.location.host}/ws`;
    client.reconnectDelay = 1000;
    client.maxReconnectDelay = 30000;
    client.reconnectTimeMode = ReconnectionTimeMode.EXPONENTIAL;
    client.heartbeatIncoming = 10000;
    client.heartbeatOutgoing = 10000;
    client.onConnect = () => this.handleConnect();
    client.onWebSocketClose = () => this.handleClose();
    client.onStompError = () => this.handleClose();
    this.client = client;
    this.connectedOnce = false;
    this.failures = 0;
    this.state.set('connecting');
    client.activate();
  }

  private handleConnect(): void {
    this.failures = 0;
    this.stompSubscriptions.clear();
    for (const topic of this.handlers.keys()) {
      this.subscribeStomp(topic);
    }
    this.state.set('connected');
    if (this.connectedOnce) {
      this.reconnectedSubject.next();
    }
    this.connectedOnce = true;
  }

  private handleClose(): void {
    if (!this.client) {
      return;
    }
    this.failures++;
    this.stompSubscriptions.clear();
    this.state.set(this.failures >= OFFLINE_AFTER_FAILURES ? 'offline' : 'reconnecting');
  }

  private subscribeStomp(topic: string): void {
    if (!this.client || this.stompSubscriptions.has(topic)) {
      return;
    }
    const subscription = this.client.subscribe(topic, (message) => {
      let body: unknown;
      try {
        body = JSON.parse(message.body);
      } catch {
        return;
      }
      for (const handler of [...(this.handlers.get(topic) ?? [])]) {
        handler(body);
      }
    });
    this.stompSubscriptions.set(topic, subscription);
  }

  private disconnect(): void {
    const client = this.client;
    this.client = null;
    this.stompSubscriptions.clear();
    this.state.set('offline');
    void client?.deactivate();
  }
}
