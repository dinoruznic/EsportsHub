import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameAccount } from '../../core/api/models';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { formatRating, offersLabel, rankLabel, ratingLabel, splitRiotTag } from './account-format';
import { RankEmblem } from './rank-emblem';

export interface TransferState {
  busy: boolean;
  error: string | null;
  offers: number | null;
}

@Component({
  selector: 'app-account-card',
  imports: [RouterLink, ConfirmInline, GameBadge, RankEmblem],
  templateUrl: './account-card.html',
  styleUrl: './account-card.scss',
  host: { class: 'panel', '[attr.data-account-id]': 'account().id' },
})
export class AccountCard {
  readonly account = input.required<GameAccount>();
  readonly rankType = input<string>('NONE');
  readonly readonly = input(false);
  readonly transfer = input<TransferState | null>(null);
  readonly deleting = input(false);
  readonly deleteError = input<string | null>(null);

  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly toggle = output<boolean>();

  protected readonly menuOpen = signal(false);
  protected readonly ign = computed(() => splitRiotTag(this.account().inGameName));
  protected readonly kind = computed(() => {
    const account = this.account();
    if (account.rank) {
      return 'TIER';
    }
    if (account.rating !== null && account.rating !== undefined) {
      return 'NUMERIC';
    }
    return this.rankType();
  });
  protected readonly rank = computed(() => rankLabel(this.account().rank));
  protected readonly rating = computed(() => {
    const rating = this.account().rating;
    return rating === null || rating === undefined ? null : formatRating(rating);
  });
  protected readonly ratingName = computed(() => ratingLabel(this.account().gameCode));
  protected readonly available = computed(() => this.account().marketStatus === 'AVAILABLE');
  protected readonly offers = computed(() => {
    const count = this.transfer()?.offers;
    return count ? offersLabel(count) : null;
  });

  protected onToggle(): void {
    if (this.transfer()?.busy) {
      return;
    }
    this.toggle.emit(!this.available());
  }

  protected onEdit(): void {
    this.menuOpen.set(false);
    this.edit.emit();
  }
}
