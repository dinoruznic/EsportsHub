import { Component, computed, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { AdminStats, TournamentStatus } from '../../core/api/models';
import { formatNumber } from '../../shared/format';

interface Tile {
  key: string;
  label: string;
  value: number;
  link: string;
  query: Params | null;
  live?: boolean;
}

interface StatusRow {
  status: TournamentStatus;
  label: string;
  count: number;
  query: Params | null;
  link: string | null;
}

const STATUS_ROWS: { status: TournamentStatus; label: string; filter: string | null }[] = [
  { status: 'PENDING', label: 'Na odobrenju', filter: null },
  { status: 'REGISTRATION', label: 'Prijave otvorene', filter: 'prijave' },
  { status: 'ONGOING', label: 'U toku', filter: 'u-toku' },
  { status: 'COMPLETED', label: 'Završeni', filter: 'zavrseni' },
  { status: 'REJECTED', label: 'Odbijeni', filter: null },
  { status: 'CANCELLED', label: 'Otkazani', filter: null },
];

@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink],
  template: `
    <ul class="tiles" aria-label="Pregled">
      @for (tile of tiles(); track tile.key) {
        <li>
          <a
            class="tile panel"
            [attr.data-tile]="tile.key"
            [routerLink]="tile.link"
            [queryParams]="tile.query"
          >
            <span class="eyebrow tile-label">
              @if (tile.live) {
                <span class="live-dot" aria-hidden="true"></span>
              }
              {{ tile.label }}
            </span>
            <span class="tile-value">{{ format(tile.value) }}</span>
          </a>
        </li>
      }
    </ul>

    <section class="panel statuses" aria-labelledby="statuses-title">
      <h2 class="section-title" id="statuses-title">Turniri po statusu</h2>
      <ul class="status-list">
        @for (row of statusRows(); track row.status) {
          <li class="status-row" [attr.data-status]="row.status">
            @if (row.link) {
              <a class="status-name" [routerLink]="row.link" [queryParams]="row.query">{{
                row.label
              }}</a>
            } @else {
              <span class="status-name">{{ row.label }}</span>
            }
            <span class="num status-count">{{ row.count }}</span>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: 20px;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .tile {
      display: grid;
      gap: 10px;
      height: 100%;
      padding: 16px 18px;
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s ease;

      &:hover {
        border-color: var(--gold);
      }

      &:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }
    }

    .tile-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .tile-value {
      color: var(--text);
      font: 800 44px/1 var(--display);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--live);
      box-shadow: 0 0 8px var(--live);
      animation: pulse 1.2s ease-in-out infinite;
    }

    .statuses {
      display: grid;
      gap: 12px;
      padding: 18px 20px;
    }

    .section-title {
      font: 700 18px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .status-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px 24px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--line-soft);
      font-size: 14px;
    }

    .status-name {
      color: var(--muted);
      text-decoration: none;
    }

    a.status-name:hover {
      color: var(--gold);
    }

    .status-count {
      color: var(--text);
      font-weight: 700;
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }

    @media (max-width: 1199.98px) {
      .tiles {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 719.98px) {
      .tiles,
      .status-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class AdminOverview {
  readonly stats = input.required<AdminStats>();

  protected readonly tiles = computed<Tile[]>(() => {
    const stats = this.stats();
    return [
      {
        key: 'users',
        label: 'Korisnici',
        value: stats.users,
        link: '/admin',
        query: { tab: 'korisnici' },
      },
      { key: 'teams', label: 'Timovi', value: stats.teams, link: '/timovi', query: null },
      {
        key: 'ongoing',
        label: 'Turniri u toku',
        value: stats.tournamentsByStatus.ONGOING ?? 0,
        link: '/turniri',
        query: { status: 'u-toku' },
      },
      {
        key: 'pending',
        label: 'Na odobrenju',
        value: stats.tournamentsByStatus.PENDING ?? 0,
        link: '/admin',
        query: { tab: 'na-cekanju' },
      },
      {
        key: 'live',
        label: 'Mečevi uživo',
        value: stats.liveMatches,
        link: '/uzivo',
        query: null,
        live: true,
      },
      {
        key: 'listings',
        label: 'Otvoreni oglasi',
        value: stats.openListings,
        link: '/market',
        query: null,
      },
    ];
  });

  protected readonly statusRows = computed<StatusRow[]>(() =>
    STATUS_ROWS.map((row) => ({
      status: row.status,
      label: row.label,
      count: this.stats().tournamentsByStatus[row.status] ?? 0,
      link: row.status === 'PENDING' ? '/admin' : row.filter ? '/turniri' : null,
      query:
        row.status === 'PENDING'
          ? { tab: 'na-cekanju' }
          : row.filter
            ? { status: row.filter }
            : null,
    })),
  );

  protected format(value: number): string {
    return formatNumber(value);
  }
}
