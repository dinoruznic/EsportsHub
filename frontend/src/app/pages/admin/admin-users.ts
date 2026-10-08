import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApi } from '../../core/api/admin-api';
import { toApiError } from '../../core/api/api-error';
import { AdminUser } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { sortRoles } from '../../core/auth/roles';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { formatDate } from '../../shared/format';
import { RoleChip } from '../../shared/role-chip/role-chip';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { UserRolesDrawer } from './user-roles-drawer';

export const PAGE_SIZE = 20;

export const ROLE_FILTERS = [
  { value: '', label: 'Sve', role: '' },
  { value: 'igraci', label: 'Igrači', role: 'PLAYER' },
  { value: 'organizatori', label: 'Organizatori', role: 'ORGANIZER' },
  { value: 'sudije', label: 'Sudije', role: 'REFEREE' },
  { value: 'admini', label: 'Admini', role: 'ADMIN' },
];

export function initials(user: AdminUser): string {
  const source = (user.displayName || user.username).trim();
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

@Component({
  selector: 'app-admin-users',
  imports: [RouterLink, EmptyState, ErrorState, RoleChip, Skeleton, TeamHex, UserRolesDrawer],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers {
  private readonly adminApi = inject(AdminApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly roleFilters = ROLE_FILTERS;
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly search = computed(() => this.params().get('q') ?? '');
  protected readonly roleFilter = computed(() => this.params().get('uloga') ?? '');
  protected readonly page = computed(() =>
    Math.max(1, Number.parseInt(this.params().get('stranica') ?? '1', 10) || 1),
  );

  protected readonly users = rxResource({
    params: () => ({
      query: this.search(),
      role: ROLE_FILTERS.find((f) => f.value === this.roleFilter())?.role ?? '',
      page: this.page() - 1,
      size: PAGE_SIZE,
    }),
    stream: ({ params }) => this.adminApi.users(params),
  });

  protected readonly editing = signal<AdminUser | null>(null);
  protected readonly totalPages = computed(() =>
    this.users.hasValue() ? Math.max(1, this.users.value().totalPages) : 1,
  );

  private readonly typed = new Subject<string>();

  constructor() {
    this.typed
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((value) => this.navigate({ q: value.trim() || null, stranica: null }));
  }

  protected onSearch(value: string): void {
    this.typed.next(value);
  }

  protected setRole(value: string): void {
    this.navigate({ uloga: value || null, stranica: null });
  }

  protected goTo(page: number): void {
    this.navigate({ stranica: page > 1 ? String(page) : null });
  }

  protected roles(user: AdminUser): string[] {
    return sortRoles(user.roles);
  }

  protected monogram(user: AdminUser): string {
    return initials(user);
  }

  protected since(user: AdminUser): string {
    return formatDate(user.createdAt);
  }

  protected loadError(): string {
    return toApiError(this.users.error()).message;
  }

  protected updated(user: AdminUser): void {
    this.users.update((page) =>
      page ? { ...page, content: page.content.map((u) => (u.id === user.id ? user : u)) } : page,
    );
    this.editing.set(user);
    if (user.username === this.auth.currentUser()?.username) {
      this.auth.refreshRoles();
    }
  }

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
