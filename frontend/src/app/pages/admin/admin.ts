import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApi } from '../../core/api/admin-api';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { PendingTournaments } from '../turniri/pending-tournaments';
import { AdminOverview } from './admin-overview';
import { AdminUsers } from './admin-users';

export type AdminTab = 'pregled' | 'korisnici' | 'na-cekanju';

const TABS: { value: AdminTab; label: string }[] = [
  { value: 'pregled', label: 'Pregled' },
  { value: 'korisnici', label: 'Korisnici' },
  { value: 'na-cekanju', label: 'Turniri na čekanju' },
];

@Component({
  selector: 'app-admin',
  imports: [AdminOverview, AdminUsers, ErrorState, PendingTournaments, Skeleton],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export default class Admin {
  private readonly adminApi = inject(AdminApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly tab = computed<AdminTab>(() => {
    const value = this.params().get('tab');
    return TABS.some((t) => t.value === value) ? (value as AdminTab) : 'pregled';
  });

  protected readonly stats = rxResource({ stream: () => this.adminApi.stats() });
  private readonly games = rxResource({ stream: () => this.gamesApi.list() });
  protected readonly gameNames = computed<Record<string, string>>(() =>
    Object.fromEntries(
      (this.games.hasValue() ? this.games.value() : []).map((g) => [g.code, g.name]),
    ),
  );
  protected readonly pendingCount = computed(() =>
    this.stats.hasValue() ? (this.stats.value().tournamentsByStatus.PENDING ?? 0) : 0,
  );

  protected statsError(): string {
    return toApiError(this.stats.error()).message;
  }

  protected setTab(tab: AdminTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'pregled' ? null : tab, q: null, uloga: null, stranica: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
