import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { MatchesApi } from '../../core/api/matches-api';
import { RefereeMatch } from '../../core/api/models';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { MatchStatus } from '../../shared/match-status/match-status';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { roundLabel } from '../turniri/bracket/bracket-layout';

export interface MatchGroup {
  key: string;
  title: string;
  matches: RefereeMatch[];
}

export function groupRefereeMatches(matches: RefereeMatch[]): MatchGroup[] {
  const hasTeams = (m: RefereeMatch) => !!m.teamA && !!m.teamB;
  const byId = (a: RefereeMatch, b: RefereeMatch) => a.matchId - b.matchId;
  const finished = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? '') || b.matchId - a.matchId)
    .slice(0, 10);
  return [
    { key: 'live', title: 'Uživo', matches: matches.filter((m) => m.status === 'LIVE').sort(byId) },
    {
      key: 'next',
      title: 'Sljedeći',
      matches: matches.filter((m) => m.status === 'SCHEDULED' && hasTeams(m)).sort(byId),
    },
    {
      key: 'waiting',
      title: 'Čeka timove',
      matches: matches.filter((m) => m.status === 'SCHEDULED' && !hasTeams(m)).sort(byId),
    },
    { key: 'finished', title: 'Završeni', matches: finished },
  ].filter((group) => group.matches.length > 0);
}

@Component({
  selector: 'app-sudija',
  imports: [RouterLink, EmptyState, ErrorState, GameBadge, MatchStatus, Skeleton, TeamHex],
  templateUrl: './sudija.html',
  styleUrl: './sudija.scss',
})
export default class Sudija {
  private readonly matchesApi = inject(MatchesApi);
  private readonly gamesApi = inject(GamesApi);

  protected readonly matches = rxResource({ stream: () => this.matchesApi.refereeMatches() });
  private readonly games = rxResource({ stream: () => this.gamesApi.list() });
  protected readonly gameNames = computed<Record<string, string>>(() =>
    Object.fromEntries(
      (this.games.hasValue() ? this.games.value() : []).map((g) => [g.code, g.name]),
    ),
  );
  protected readonly groups = computed(() =>
    groupRefereeMatches(this.matches.hasValue() ? this.matches.value() : []),
  );

  protected loadError(): string {
    return toApiError(this.matches.error()).message;
  }

  protected round(match: RefereeMatch): string {
    return match.roundName ? roundLabel(match.roundName, match.roundNumber ?? 0) : '';
  }
}
