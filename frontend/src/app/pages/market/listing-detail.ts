import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Listing } from '../../core/api/models';
import { formatDate } from '../../shared/format';
import { GameBadge } from '../../shared/game-badge/game-badge';
import {
  formatRating,
  offersLabel,
  rankLabel,
  ratingLabel,
  splitRiotTag,
} from '../profil/account-format';
import { RankEmblem } from '../profil/rank-emblem';

@Component({
  selector: 'app-listing-detail',
  imports: [RouterLink, GameBadge, RankEmblem],
  template: `
    @let l = listing();
    <header class="summary">
      <p class="eyebrow">Oglas igrača</p>
      <h2 class="ign">
        <span class="ign-name">{{ ign().name }}</span>
        @if (ign().tag; as tag) {
          <span class="ign-tag">{{ tag }}</span>
        }
      </h2>
      <div class="meta">
        <app-game-badge [code]="l.gameCode" [name]="gameName()" />
        @if (region()) {
          <span class="num chip">{{ region() }}</span>
        }
        @if (l.position) {
          <span class="num chip">{{ l.position }}</span>
        }
      </div>
      <div class="skill">
        @if (l.rank) {
          <app-rank-emblem [rank]="l.rank" [size]="44" />
          <span class="rank">{{ rank() }}</span>
        } @else if (rating(); as r) {
          <span class="num rating">{{ r }}</span>
          <span class="rating-label">{{ ratingName() }}</span>
        } @else {
          <span class="rating-label">Bez ranga</span>
        }
      </div>
      <dl class="facts">
        <div>
          <dt>Igrač</dt>
          <dd>
            <a class="player" [routerLink]="profileLink()">{{ ownerName() || l.ownerUsername }}</a>
          </dd>
        </div>
        <div>
          <dt>Na listi od</dt>
          <dd>{{ since() }}</dd>
        </div>
        <div>
          <dt>Ponude</dt>
          <dd>{{ offers() }}</dd>
        </div>
      </dl>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .summary {
      display: grid;
      gap: 12px;
      padding-right: 40px;
    }

    .ign {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
    }

    .ign-name {
      overflow-wrap: anywhere;
      font: 800 40px/1 var(--display);
    }

    .ign-tag {
      color: var(--faint);
      font: 500 16px/1 var(--mono);
    }

    .meta,
    .skill {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .chip {
      padding: 3px 7px;
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--muted);
      font-size: 11px;
    }

    .rank {
      font: 700 22px/1 var(--display);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .rating {
      color: var(--gold);
      font-size: 30px;
      font-weight: 700;
    }

    .rating-label {
      color: var(--muted);
      font: 500 11px/1.2 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 4px 0 0;
      padding: 12px 0;
      border-block: 1px solid var(--line-soft);

      dt {
        color: var(--faint);
        font: 500 10px/1.3 var(--mono);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      dd {
        margin: 4px 0 0;
        font-size: 14px;
        font-weight: 600;
      }
    }

    .player {
      color: inherit;
      text-decoration: none;

      &:hover {
        color: var(--gold);
      }
    }
  `,
})
export class ListingDetail {
  readonly listing = input.required<Listing>();
  readonly gameName = input<string | null>(null);
  readonly ownerName = input<string | null>(null);
  readonly region = input<string | null>(null);
  readonly own = input(false);

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
    return count === 0 ? 'Još nema' : offersLabel(count);
  });
  protected readonly profileLink = computed(() =>
    this.own() ? ['/profil'] : ['/igraci', this.listing().ownerUsername],
  );
}
