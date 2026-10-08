import { Component, computed, input, output } from '@angular/core';
import { Listing } from '../../core/api/models';
import { formatDate } from '../../shared/format';
import { GameBadge } from '../../shared/game-badge/game-badge';
import {
  offersLabel,
  formatRating,
  rankLabel,
  ratingLabel,
  splitRiotTag,
} from '../profil/account-format';
import { RankEmblem } from '../profil/rank-emblem';

@Component({
  selector: 'app-listing-card',
  imports: [GameBadge, RankEmblem],
  template: `
    @let l = listing();
    <button
      type="button"
      class="card"
      [class.own]="own()"
      [attr.data-listing-id]="l.id"
      [attr.aria-label]="'Otvori oglas ' + l.inGameName"
      (click)="open.emit()"
    >
      <span class="top">
        <app-game-badge [code]="l.gameCode" [name]="gameName()" />
        @if (own()) {
          <span class="own-badge">Tvoj oglas</span>
        } @else if (region()) {
          <span class="num region">{{ region() }}</span>
        }
      </span>
      <span class="ign">
        <span class="ign-name">{{ ign().name }}</span>
        @if (ign().tag; as tag) {
          <span class="ign-tag">{{ tag }}</span>
        }
      </span>
      <span class="skill">
        @if (l.rank) {
          <app-rank-emblem [rank]="l.rank" [size]="36" />
          <span class="rank">{{ rank() }}</span>
        } @else if (rating(); as r) {
          <span class="num rating">{{ r }}</span>
          <span class="rating-label">{{ ratingName() }}</span>
        } @else {
          <span class="unranked">Bez ranga</span>
        }
        @if (l.position) {
          <span class="num position">{{ l.position }}</span>
        }
      </span>
      <span class="bottom">
        <span class="owner">{{ ownerName() || l.ownerUsername }}</span>
        <span class="since">na listi od {{ since() }}</span>
        <span class="offers" [class.has]="l.offerCount > 0">{{ offers() }}</span>
      </span>
    </button>
  `,
  styleUrl: './listing-card.scss',
})
export class ListingCard {
  readonly listing = input.required<Listing>();
  readonly gameName = input<string | null>(null);
  readonly ownerName = input<string | null>(null);
  readonly region = input<string | null>(null);
  readonly own = input(false);
  readonly open = output<void>();

  protected readonly ign = computed(() => splitRiotTag(this.listing().inGameName));
  protected readonly rank = computed(() => rankLabel(this.listing().rank));
  protected readonly rating = computed(() => {
    const rating = this.listing().rating;
    return rating === null || rating === undefined ? null : formatRating(rating);
  });
  protected readonly ratingName = computed(() => ratingLabel(this.listing().gameCode));
  protected readonly since = computed(() => formatDate(this.listing().createdAt));
  protected readonly offers = computed(() => {
    const count = this.listing().offerCount ?? 0;
    return count === 0 ? 'bez ponuda' : offersLabel(count);
  });
}
