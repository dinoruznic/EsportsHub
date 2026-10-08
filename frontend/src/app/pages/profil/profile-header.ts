import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { MeApi } from '../../core/api/me-api';
import { Me, PlayerTeam } from '../../core/api/models';
import { formatDate } from '../../shared/format';
import { TeamHex } from '../../shared/team-hex/team-hex';

export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0] ?? '').slice(0, 2).toUpperCase();
}

export function usernameSeed(username: string): number {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

const MAX_NAME = 60;

@Component({
  selector: 'app-profile-header',
  imports: [RouterLink, TeamHex],
  templateUrl: './profile-header.html',
  styleUrl: './profile-header.scss',
  host: { class: 'panel' },
})
export class ProfileHeader {
  private readonly meApi = inject(MeApi);

  readonly username = input.required<string>();
  readonly displayName = input<string | null>(null);
  readonly roles = input<string[]>([]);
  readonly createdAt = input<string | null>(null);
  readonly teams = input<PlayerTeam[]>([]);
  readonly editable = input(false);
  readonly renamed = output<Me>();

  protected readonly shownName = computed(() => this.displayName()?.trim() || this.username());
  protected readonly seed = computed(() => usernameSeed(this.username()));
  protected readonly initials = computed(() => personInitials(this.shownName()));
  protected readonly since = computed(() => {
    const created = this.createdAt();
    return created ? formatDate(created) : null;
  });

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly tooLong = computed(() => this.draft().trim().length > MAX_NAME);
  protected readonly error = computed(() =>
    this.tooLong() ? `Ime za prikaz može imati najviše ${MAX_NAME} znakova.` : this.serverError(),
  );

  protected startEdit(): void {
    this.draft.set(this.displayName() ?? '');
    this.submitted.set(false);
    this.serverError.set(null);
    this.editing.set(true);
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.tooLong() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    this.meApi.updateDisplayName(this.draft().trim()).subscribe({
      next: (me) => {
        this.saving.set(false);
        this.editing.set(false);
        this.renamed.emit(me);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.serverError.set(toApiError(error).message);
      },
    });
  }
}
