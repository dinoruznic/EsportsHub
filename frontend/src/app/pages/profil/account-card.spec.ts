import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { account, cs2Account } from '../../testing/profile-data';
import { AccountCard } from './account-card';
import { offersLabel, rankLabel, splitRiotTag, tierColor } from './account-format';

describe('AccountCard', () => {
  function render(
    input: ReturnType<typeof account>,
    rankType: string,
    readonly = false,
  ): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AccountCard);
    fixture.componentRef.setInput('account', input);
    fixture.componentRef.setInput('rankType', rankType);
    fixture.componentRef.setInput('readonly', readonly);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a rank emblem and the rank name for TIER games and splits the Riot tag', () => {
    const element = render(account(), 'TIER');

    expect(element.querySelector('.ign-name')!.textContent).toBe('yueen8');
    expect(element.querySelector('.ign-tag')!.textContent).toBe('#EUW');
    expect(element.querySelector('app-rank-emblem')!.getAttribute('data-tier')).toBe('diamond');
    expect(element.querySelector('app-rank-emblem .shield')!.getAttribute('fill')).toBe('#6A8DFF');
    expect(element.querySelector('.rank-name')!.textContent).toBe('Diamond');
    expect(element.querySelector('.position')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'pozicija MID',
    );
    expect(element.querySelector('.region')!.textContent).toBe('EUW');
  });

  it('shows the rating with a thousands separator for NUMERIC games', () => {
    const element = render(cs2Account(), 'NUMERIC');

    expect(element.querySelector('app-rank-emblem')).toBeNull();
    expect(element.querySelector('.rating')!.textContent).toBe('18.450');
    expect(element.querySelector('.rating-label')!.textContent).toBe('Premier rating');
    expect(element.querySelector('.ign-tag')).toBeNull();
  });

  it('shows only the name and position for NONE games', () => {
    const element = render(
      account({ gameCode: 'CHESS', rank: null, rating: null, inGameName: 'kralj' }),
      'NONE',
    );

    expect(element.querySelector('app-rank-emblem')).toBeNull();
    expect(element.querySelector('.rating')).toBeNull();
    expect(element.querySelector('.ign-name')!.textContent).toBe('kralj');
  });

  it('is read-only with a transfer badge on the public profile', () => {
    const element = render(account({ marketStatus: 'AVAILABLE' }), 'TIER', true);

    expect(element.querySelector('.menu-button')).toBeNull();
    expect(element.querySelector('[role="switch"]')).toBeNull();
    expect(element.querySelector('.badge')!.textContent).toBe('Dostupan za transfer');
  });

  it('formats helpers in Bosnian', () => {
    expect(splitRiotTag('yueen8 #EUW')).toEqual({ name: 'yueen8', tag: '#EUW' });
    expect(splitRiotTag('bez taga')).toEqual({ name: 'bez taga', tag: null });
    expect(tierColor('Challenger')).toBe('#F2D27A');
    expect(tierColor('nepoznato')).toBeNull();
    expect(rankLabel('GRANDMASTER')).toBe('Grandmaster');
    expect([1, 2, 5, 11, 22].map(offersLabel)).toEqual([
      '1 ponuda',
      '2 ponude',
      '5 ponuda',
      '11 ponuda',
      '22 ponude',
    ]);
  });
});
