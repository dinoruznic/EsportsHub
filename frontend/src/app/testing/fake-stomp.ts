import { Provider } from '@angular/core';
import { IMessage, ReconnectionTimeMode, StompSubscription } from '@stomp/stompjs';
import { STOMP_CLIENT_FACTORY, StompClientLike } from '../core/realtime/realtime.service';

export class FakeStompClient implements StompClientLike {
  brokerURL: string | undefined;
  reconnectDelay = 0;
  maxReconnectDelay = 0;
  reconnectTimeMode = ReconnectionTimeMode.LINEAR;
  heartbeatIncoming = 0;
  heartbeatOutgoing = 0;
  onConnect: () => void = () => undefined;
  onWebSocketClose: () => void = () => undefined;
  onStompError: () => void = () => undefined;

  active = false;
  readonly topics = new Map<string, (message: IMessage) => void>();
  readonly unsubscribed: string[] = [];

  activate(): void {
    this.active = true;
  }

  deactivate(): Promise<void> {
    this.active = false;
    this.topics.clear();
    return Promise.resolve();
  }

  subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription {
    this.topics.set(destination, callback);
    return {
      id: destination,
      unsubscribe: () => {
        this.topics.delete(destination);
        this.unsubscribed.push(destination);
      },
    };
  }

  connect(): void {
    this.onConnect();
  }

  drop(): void {
    this.topics.clear();
    this.onWebSocketClose();
  }

  emit(destination: string, body: unknown): void {
    this.topics.get(destination)?.({ body: JSON.stringify(body) } as IMessage);
  }
}

export interface FakeStomp {
  clients: FakeStompClient[];
  readonly last: FakeStompClient;
}

export function provideFakeStomp(): { stomp: FakeStomp; provider: Provider } {
  const stomp: FakeStomp = {
    clients: [],
    get last() {
      return this.clients[this.clients.length - 1];
    },
  };
  return {
    stomp,
    provider: {
      provide: STOMP_CLIENT_FACTORY,
      useValue: () => {
        const client = new FakeStompClient();
        stomp.clients.push(client);
        return client;
      },
    },
  };
}
