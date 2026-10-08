import { Listing, MyOffer, Offer, Team } from '../core/api/models';

export function teamOf(overrides: Partial<Team> = {}): Team {
  return {
    id: 10,
    name: 'Sarajevo Lions',
    tag: 'SL',
    logoUrl: null,
    region: 'EUW',
    gameCode: 'LOL',
    captainUsername: 'kapiten',
    budget: 0,
    memberCount: 2,
    createdAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

export function listingOf(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 5,
    gameAccountId: 50,
    ownerUsername: 'igrac',
    gameCode: 'LOL',
    inGameName: 'zvijezda#EUW',
    rank: 'DIAMOND',
    position: 'MID',
    rating: null,
    askingPrice: null,
    status: 'OPEN',
    createdAt: '2026-10-05T10:00:00Z',
    offerCount: 0,
    ...overrides,
  };
}

export function offerOf(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    listingId: 5,
    fromTeamId: 10,
    fromTeamName: 'Sarajevo Lions',
    amount: 1500,
    message: 'Treba nam mid.',
    status: 'PENDING',
    createdAt: '2026-10-06T10:00:00Z',
    respondedAt: null,
    ...overrides,
  };
}

export function myOfferOf(overrides: Partial<MyOffer> = {}): MyOffer {
  return {
    id: 1,
    listingId: 5,
    listingStatus: 'OPEN',
    teamId: 10,
    teamName: 'Sarajevo Lions',
    teamTag: 'SL',
    gameAccountId: 50,
    inGameName: 'zvijezda#EUW',
    gameCode: 'LOL',
    ownerUsername: 'igrac',
    amount: 1500,
    message: null,
    status: 'PENDING',
    createdAt: '2026-10-06T10:00:00Z',
    respondedAt: null,
    ...overrides,
  };
}
