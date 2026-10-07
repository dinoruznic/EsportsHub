import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Bracket } from '../../../core/api/models';
import { buildBracket } from './bracket-layout';

interface Connector {
  key: string;
  d: string;
  decided: boolean;
}

@Component({
  selector: 'app-bracket-view',
  templateUrl: './bracket-view.html',
  styleUrl: './bracket-view.scss',
})
export class BracketView {
  readonly bracket = input.required<Bracket>();
  readonly seeds = input<Record<number, number>>({});

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inner = viewChild.required<ElementRef<HTMLElement>>('inner');

  protected readonly columns = computed(() => buildBracket(this.bracket(), this.seeds()));
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
    const rectOf = (id: number) => inner.querySelector(`[data-match-id="${id}"]`)?.getBoundingClientRect() ?? null;
    const lines: Connector[] = [];

    for (const column of this.columns()) {
      for (const match of column.matches) {
        if (match.nextMatchId === null) {
          continue;
        }
        const from = rectOf(match.id);
        const to = rectOf(match.nextMatchId);
        if (!from || !to) {
          continue;
        }
        const x1 = from.right - origin.left;
        const y1 = from.top + from.height / 2 - origin.top;
        const x2 = to.left - origin.left;
        const y2 = to.top + to.height / 2 - origin.top;
        const mid = (x1 + x2) / 2;
        lines.push({
          key: `${match.id}-${match.nextMatchId}`,
          d: `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`,
          decided: match.decided,
        });
      }
    }

    this.connectors.set(lines);
  }
}
