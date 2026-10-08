import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { MeApi } from '../../core/api/me-api';
import { Me } from '../../core/api/models';
import { PlayersApi } from '../../core/api/players-api';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { ProfileHeader } from './profile-header';

@Component({
  selector: 'app-profil',
  imports: [ErrorState, Skeleton, ProfileHeader],
  templateUrl: './profil.html',
  styleUrl: './profil.scss',
})
export default class Profil {
  private readonly meApi = inject(MeApi);
  private readonly playersApi = inject(PlayersApi);

  protected readonly meResource = rxResource({ stream: () => this.meApi.get() });
  private readonly renamed = signal<Me | null>(null);
  protected readonly me = computed(
    () => this.renamed() ?? (this.meResource.hasValue() ? this.meResource.value() : null),
  );

  protected readonly profile = rxResource({
    params: () => this.me()?.username,
    stream: ({ params }) => this.playersApi.get(params).pipe(catchError(() => of(null))),
  });
  protected readonly teams = computed(() =>
    this.profile.hasValue() ? (this.profile.value()?.teams ?? []) : [],
  );

  protected loadError(): string {
    return toApiError(this.meResource.error()).message;
  }

  protected onRenamed(me: Me): void {
    this.renamed.set(me);
  }
}
