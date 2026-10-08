import { Game, GameAccount, GameOption, Me } from '../core/api/models';

export const PROFILE_GAMES: Game[] = [
  { id: 1, code: 'LOL', name: 'League of Legends', hasLiveApi: true, rankType: 'TIER' },
  { id: 2, code: 'CS2', name: 'Counter-Strike 2', hasLiveApi: false, rankType: 'NUMERIC' },
  { id: 5, code: 'CHESS', name: 'Šah', hasLiveApi: false, rankType: 'NONE' },
];

export const ME: Me = {
  id: 7,
  username: 'yueen',
  email: 'yueen@esportshub.local',
  displayName: 'Dino Ruznic',
  roles: ['PLAYER'],
  createdAt: '2026-10-01T10:00:00Z',
};

export function account(overrides: Partial<GameAccount> = {}): GameAccount {
  return {
    id: 1,
    ownerUsername: 'yueen',
    gameCode: 'LOL',
    gameName: 'League of Legends',
    inGameName: 'yueen8#EUW',
    region: 'EUW',
    position: 'MID',
    rank: 'DIAMOND',
    rating: null,
    marketStatus: 'INACTIVE',
    createdAt: '2026-10-02T10:00:00Z',
    ...overrides,
  };
}

export function cs2Account(overrides: Partial<GameAccount> = {}): GameAccount {
  return account({
    id: 2,
    gameCode: 'CS2',
    gameName: 'Counter-Strike 2',
    inGameName: 'yueen8',
    region: 'EU',
    position: 'AWP',
    rank: null,
    rating: 18450,
    ...overrides,
  });
}

export const LOL_OPTIONS: Record<string, GameOption[]> = {
  regions: [
    { id: 1, code: 'EUW', label: 'EUW' },
    { id: 2, code: 'EUNE', label: 'EUNE' },
  ],
  positions: [
    { id: 3, code: 'MID', label: 'MID' },
    { id: 4, code: 'ADC', label: 'ADC' },
  ],
  ranks: [
    { id: 6, code: 'EMERALD', label: 'EMERALD' },
    { id: 7, code: 'DIAMOND', label: 'DIAMOND' },
  ],
};

export const CS2_OPTIONS: Record<string, GameOption[]> = {
  regions: [{ id: 18, code: 'EU', label: 'EU' }],
  positions: [{ id: 12, code: 'AWP', label: 'AWP' }],
  ranks: [],
};
