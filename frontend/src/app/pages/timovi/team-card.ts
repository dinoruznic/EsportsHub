import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Team } from '../../core/api/models';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { membersLabel } from './team-format';

@Component({
  selector: 'app-team-card',
  imports: [RouterLink, GameBadge, TeamHex],
  template: `
    @let t = team();
    <a class="card" [routerLink]="['/timovi', t.id]" [attr.data-team-id]="t.id">
      <div class="top">
        <app-team-hex [teamId]="t.id" [label]="t.tag" [size]="52" />
        <div class="title">
          <h3 class="name">{{ t.name }}</h3>
          <span class="num tag">{{ t.tag }}</span>
        </div>
      </div>
      <div class="meta">
        <app-game-badge [code]="t.gameCode" [name]="gameName()" />
        @if (t.region) {
          <span class="num region">{{ t.region }}</span>
        }
      </div>
      <div class="bottom">
        <span class="members">{{ members() }}</span>
        <span class="captain">
          {{ t.captainUsername }}
          <span class="c" title="Kapiten">C</span>
        </span>
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .card {
      display: grid;
      gap: 14px;
      height: 100%;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      color: inherit;
      text-decoration: none;
      transition:
        transform 0.15s ease,
        border-color 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: #3a4757;
      }

      &:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }
    }

    .top {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .title {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .name {
      overflow-wrap: anywhere;
      font: 800 24px/1 var(--display);
      letter-spacing: 0.01em;
      text-transform: uppercase;
    }

    .tag {
      color: var(--muted);
      font-size: 12px;
    }

    .meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .region {
      padding: 3px 7px;
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--muted);
      font-size: 11px;
    }

    .bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid var(--line-soft);
      color: var(--muted);
      font-size: 13px;
    }

    .captain {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
      font-weight: 600;
    }

    .c {
      display: grid;
      place-items: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--gold);
      color: var(--ink);
      font: 800 10px/1 var(--mono);
    }
  `,
})
export class TeamCard {
  readonly team = input.required<Team>();
  readonly gameName = input<string | null>(null);
  protected readonly members = computed(() => membersLabel(this.team().memberCount));
}
