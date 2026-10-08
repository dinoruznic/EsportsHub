import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { toApiError } from '../../core/api/api-error';
import { MatchesApi } from '../../core/api/matches-api';
import { agentCommand, agentStatus } from './referee-format';

@Component({
  selector: 'app-agent-card',
  templateUrl: './agent-card.html',
  styleUrl: './agent-card.scss',
  host: { class: 'panel' },
})
export class AgentCard {
  private readonly matchesApi = inject(MatchesApi);

  readonly matchId = input.required<number>();
  readonly live = input(false);
  readonly lastSnapshotAt = input<number | null>(null);
  readonly now = input(Date.now());

  private readonly code = viewChild<ElementRef<HTMLElement>>('code');

  protected readonly key = signal<string | null>(null);
  protected readonly revealed = signal(false);
  protected readonly demo = signal(true);
  protected readonly copied = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly simulating = signal(false);
  protected readonly simulated = signal(false);
  protected readonly loadingKey = signal(false);

  protected readonly shownKey = computed(() => {
    const key = this.key();
    return key && this.revealed() ? key : '••••••••••••';
  });
  protected readonly command = computed(() => agentCommand(this.shownKey(), this.demo()));
  protected readonly status = computed(() => agentStatus(this.lastSnapshotAt(), this.now()));

  protected toggleReveal(): void {
    if (this.revealed()) {
      this.revealed.set(false);
      return;
    }
    this.withKey(() => this.revealed.set(true));
  }

  protected copy(): void {
    this.withKey((key) => {
      const command = agentCommand(key, this.demo());
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
      if (clipboard?.writeText) {
        clipboard.writeText(command).then(
          () => this.copied.set('Komanda je kopirana.'),
          () => this.selectFallback(),
        );
      } else {
        this.selectFallback();
      }
    });
  }

  protected simulate(): void {
    this.simulating.set(true);
    this.error.set(null);
    this.matchesApi.simulateSnapshot(this.matchId()).subscribe({
      next: () => {
        this.simulating.set(false);
        this.simulated.set(true);
        setTimeout(() => this.simulated.set(false), 2000);
      },
      error: (error: unknown) => {
        this.simulating.set(false);
        this.error.set(toApiError(error).message);
      },
    });
  }

  private withKey(done: (key: string) => void): void {
    const key = this.key();
    if (key) {
      done(key);
      return;
    }
    this.loadingKey.set(true);
    this.error.set(null);
    this.matchesApi.agentKey(this.matchId()).subscribe({
      next: ({ matchKey }) => {
        this.loadingKey.set(false);
        this.key.set(matchKey);
        done(matchKey);
      },
      error: (error: unknown) => {
        this.loadingKey.set(false);
        this.error.set(toApiError(error).message);
      },
    });
  }

  private selectFallback(): void {
    this.revealed.set(true);
    setTimeout(() => {
      const element = this.code()?.nativeElement;
      const selection = typeof window !== 'undefined' ? window.getSelection() : null;
      if (element && selection) {
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      this.copied.set('Komanda je označena, kopiraj je sa Ctrl+C.');
    });
  }
}
