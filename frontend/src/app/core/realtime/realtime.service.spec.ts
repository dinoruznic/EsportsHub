import { TestBed } from '@angular/core/testing';
import { FakeStomp, provideFakeStomp } from '../../testing/fake-stomp';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let stomp: FakeStomp;

  beforeEach(() => {
    const fake = provideFakeStomp();
    stomp = fake.stomp;
    TestBed.configureTestingModule({ providers: [fake.provider] });
    service = TestBed.inject(RealtimeService);
  });

  it('connects lazily on the first subscription and builds the url from the location', () => {
    expect(stomp.clients.length).toBe(0);
    expect(service.state()).toBe('offline');

    const subscription = service.subscribe('/topic/matches/1').subscribe();

    expect(stomp.clients.length).toBe(1);
    expect(stomp.last.active).toBe(true);
    expect(stomp.last.brokerURL).toBe(`ws://${location.host}/ws`);
    expect(stomp.last.heartbeatIncoming).toBeGreaterThan(0);
    expect(service.state()).toBe('connecting');
    subscription.unsubscribe();
  });

  it('delivers parsed messages after connecting and shares one STOMP subscription per topic', () => {
    const first: unknown[] = [];
    const second: unknown[] = [];
    const a = service.subscribe('/topic/matches/1').subscribe((message) => first.push(message));
    const b = service.subscribe('/topic/matches/1').subscribe((message) => second.push(message));

    stomp.last.connect();
    stomp.last.emit('/topic/matches/1', { type: 'STARTED' });

    expect(service.state()).toBe('connected');
    expect([...stomp.last.topics.keys()]).toEqual(['/topic/matches/1']);
    expect(first).toEqual([{ type: 'STARTED' }]);
    expect(second).toEqual([{ type: 'STARTED' }]);

    a.unsubscribe();
    expect(stomp.last.topics.has('/topic/matches/1')).toBe(true);
    b.unsubscribe();
  });

  it('unsubscribes from the topic and disconnects when nobody listens', () => {
    const subscription = service.subscribe('/topic/tournaments/2').subscribe();
    stomp.last.connect();
    const client = stomp.last;

    subscription.unsubscribe();

    expect(client.unsubscribed).toEqual(['/topic/tournaments/2']);
    expect(client.active).toBe(false);
    expect(service.state()).toBe('offline');
  });

  it('subscribes immediately when already connected', () => {
    const a = service.subscribe('/topic/matches/1').subscribe();
    stomp.last.connect();
    const b = service.subscribe('/topic/matches/2').subscribe();

    expect([...stomp.last.topics.keys()]).toEqual(['/topic/matches/1', '/topic/matches/2']);
    a.unsubscribe();
    b.unsubscribe();
  });

  it('goes reconnecting, then offline, and resubscribes with one re-fetch signal after reconnecting', () => {
    let reconnects = 0;
    const reconnected = service.reconnected.subscribe(() => reconnects++);
    const subscription = service.subscribe('/topic/matches/1').subscribe();
    stomp.last.connect();
    expect(reconnects).toBe(0);

    stomp.last.drop();
    expect(service.state()).toBe('reconnecting');
    expect(stomp.last.topics.size).toBe(0);

    stomp.last.drop();
    stomp.last.drop();
    expect(service.state()).toBe('offline');

    stomp.last.connect();
    expect(service.state()).toBe('connected');
    expect([...stomp.last.topics.keys()]).toEqual(['/topic/matches/1']);
    expect(reconnects).toBe(1);

    subscription.unsubscribe();
    reconnected.unsubscribe();
  });
});
