import { Component, input } from '@angular/core';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { ChampionInfo } from './bracket/bracket-layout';

@Component({
  selector: 'app-champion-banner',
  imports: [TeamHex],
  template: `
    @let c = info();
    <svg class="trophy" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3.6 2.9" />
      <path d="M17 6h3v1a3 3 0 0 1-3.6 2.9" />
      <path d="M12 14v4" />
      <path d="M8 20h8" />
    </svg>
    <app-team-hex [teamId]="c.champion.id" [label]="c.champion.tag || c.champion.name" [size]="56" />
    <div class="text">
      <p class="eyebrow">Prvak</p>
      <p class="name">{{ c.champion.name }}</p>
      <p class="line">
        Pobijedio u finalu <span class="num">{{ c.championScore }} : {{ c.finalistScore }}</span>
        @if (c.finalist) {
          protiv {{ c.finalist.name }}
        }
      </p>
    </div>
  `,
  host: { class: 'panel', role: 'status' },
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 22px;
      padding: 22px 28px;
      border-color: rgb(226 177 84 / 0.4);
      background:
        radial-gradient(ellipse at 12% 50%, rgb(226 177 84 / 0.16), transparent 55%),
        var(--panel);
    }

    .trophy {
      width: 44px;
      height: 44px;
      flex: none;
      fill: none;
      stroke: var(--gold);
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
      filter: drop-shadow(0 0 10px rgb(226 177 84 / 0.45));
    }

    .text {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .eyebrow {
      color: var(--gold);
    }

    .name {
      overflow-wrap: anywhere;
      color: var(--gold);
      font: 800 clamp(32px, 4vw, 48px) / 1 var(--display);
      letter-spacing: 0.01em;
      text-transform: uppercase;
      text-shadow: 0 0 24px rgb(226 177 84 / 0.25);
    }

    .line {
      color: var(--muted);
      font-size: 14px;
    }

    @media (max-width: 599.98px) {
      :host {
        flex-wrap: wrap;
        padding: 18px;
      }
    }
  `,
})
export class ChampionBanner {
  readonly info = input.required<ChampionInfo>();
}
