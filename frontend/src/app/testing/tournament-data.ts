import { Bracket, BracketMatch, Game, Registration, Team, Tournament } from '../core/api/models';

export const GAMES: Game[] = [
  { id: 1, code: 'LOL', name: 'League of Legends', hasLiveApi: true, rankType: 'TIER' },
  { id: 2, code: 'CS2', name: 'Counter-Strike 2', hasLiveApi: false, rankType: 'NUMERIC' },
];

export function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 1,
    name: 'Balkan Kup',
    gameCode: 'LOL',
    format: 'SINGLE_ELIMINATION',
    maxTeams: 8,
    status: 'REGISTRATION',
    prizePool: 1500,
    startDate: null,
    organizerUsername: 'org',
    createdAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

export function registration(id: number, teamId: number, overrides: Partial<Registration> = {}): Registration {
  return {
    id,
    tournamentId: 1,
    teamId,
    teamName: `Tim ${teamId}`,
    teamTag: `T${teamId}`,
    status: 'REGISTERED',
    seed: null,
    registeredAt: `2026-10-02T10:00:0${teamId % 10}Z`,
    ...overrides,
  };
}

export function team(id: number, captainUsername: string, overrides: Partial<Team> = {}): Team {
  return {
    id,
    name: `Tim ${id}`,
    tag: `T${id}`,
    logoUrl: null,
    region: 'EUW',
    gameCode: 'LOL',
    captainUsername,
    budget: 0,
    memberCount: 5,
    createdAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

function brief(id: number) {
  return { id, name: `Tim ${id}`, tag: `T${id}` };
}

function match(id: number, overrides: Partial<BracketMatch> = {}): BracketMatch {
  return {
    id,
    status: 'SCHEDULED',
    teamA: null,
    teamB: null,
    scoreA: 0,
    scoreB: 0,
    winnerTeamId: null,
    nextMatchId: null,
    ...overrides,
  };
}

export function fourTeamBracket(): Bracket {
  return {
    tournamentId: 1,
    tournamentName: 'Balkan Kup',
    status: 'ONGOING',
    rounds: [
      {
        roundNumber: 1,
        name: 'Polufinale',
        matches: [
          match(10, {
            status: 'FINISHED',
            teamA: brief(1),
            teamB: brief(4),
            scoreA: 2,
            scoreB: 1,
            winnerTeamId: 1,
            nextMatchId: 12,
          }),
          match(11, { status: 'LIVE', teamA: brief(2), teamB: brief(3), scoreA: 1, scoreB: 0, nextMatchId: 12 }),
        ],
      },
      {
        roundNumber: 2,
        name: 'Finale',
        matches: [match(12, { teamA: brief(1) })],
      },
    ],
  };
}

export function emptyBracket(): Bracket {
  return { tournamentId: 1, tournamentName: 'Balkan Kup', status: 'REGISTRATION', rounds: [] };
}
