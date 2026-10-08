import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Bracket } from '../../../core/api/models';
import { TeamHex } from '../../../shared/team-hex/team-hex';
import { MatchCard, buildBracket, findChampion } from './bracket-layout';

interface Connector {
  key: string;
  d: string;
  decided: boolean;
  champion: boolean;
}

interface Box {
  left: number;
  right: number;
  middle: number;
}

@Component({
  selector: 'app-bracket-view',
  imports: [NgTemplateOutlet, RouterLink, TeamHex],
  templateUrl: './bracket-view.html',
  styleUrl: './bracket-view.scss',
  host: { '[class.preview]': 'preview()', '[class.assigning]': 'canAssignReferee()' },
})
export class BracketView {
  readonly bracket = input.required<Bracket>();
  readonly seeds = input<Record<number, number>>({});
  readonly preview = input(false);
  readonly flash = input<number[]>([]);
  readonly canAssignReferee = input(false);
  readonly assignReferee = output<MatchCard>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inner = viewChild.required<ElementRef<HTMLElement>>('inner');

  protected readonly columns = computed(() =>
    buildBracket(this.bracket(), this.seeds(), this.preview()),
  );
  protected readonly champion = computed(() => findChampion(this.bracket()));
  protected readonly connectors = signal<Connector[]>([]);

  constructor() {
    afterRenderEffect(() => {
      this.columns();
      this.measure();
    });

    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.host.nativeElement);
      observer.observe(this.inner().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private measure(): void {
    const inner = this.inner().nativeElement;
    const origin = inner.getBoundingClientRect();
    const boxOf = (selector: string): Box | null => {
      const rect = inner.querySelector(selector)?.getBoundingClientRect();
      return rect
        ? {
            left: rect.left - origin.left,
            right: rect.right - origin.left,
            middle: rect.top + rect.height / 2 - origin.top,
          }
        : null;
    };
    const lines: Connector[] = [];
    const link = (
      key: string,
      from: Box | null,
      to: Box | null,
      decided: boolean,
      champion: boolean,
    ) => {
      if (!from || !to) {
        return;
      }
      const mid = (from.right + to.left) / 2;
      lines.push({
        key,
        decided,
        champion,
        d: `M ${from.right} ${from.middle} H ${mid} V ${to.middle} H ${to.left}`,
      });
    };

    for (const column of this.columns()) {
      for (const match of column.matches) {
        const from = boxOf(`[data-match-id="${match.id}"]`);
        if (match.nextMatchId === null) {
          link(
            `${match.id}-prvak`,
            from,
            boxOf('[data-champion]'),
            match.decided,
            match.championPath,
          );
        } else {
          const to = boxOf(`[data-match-id="${match.nextMatchId}"]`);
          link(`${match.id}-${match.nextMatchId}`, from, to, match.decided, match.championPath);
        }
      }
    }

    this.connectors.set(lines);
  }
}
