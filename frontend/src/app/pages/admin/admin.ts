import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApi } from '../../core/api/admin-api';
import { toApiError } from '../../core/api/api-error';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { AdminOverview } from './admin-overview';
import { AdminUsers } from './admin-users';

export type AdminTab = 'pregled' | 'korisnici';

const TABS: { value: AdminTab; label: string }[] = [
  { value: 'pregled', label: 'Pregled' },
  { value: 'korisnici', label: 'Korisnici' },
];

@Component({
  selector: 'app-admin',
  imports: [AdminOverview, AdminUsers, ErrorState, Skeleton],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export default class Admin {
  private readonly adminApi = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly tab = computed<AdminTab>(() => {
    const value = this.params().get('tab');
    return TABS.some((t) => t.value === value) ? (value as AdminTab) : 'pregled';
  });

  protected readonly stats = rxResource({ stream: () => this.adminApi.stats() });

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
