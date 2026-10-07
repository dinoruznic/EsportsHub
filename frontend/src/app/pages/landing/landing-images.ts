export interface LandingImage {
  src: string;
  game: string;
  position?: string;
}

export const LANDING_IMAGES: readonly LandingImage[] = [
  { src: '/landing/lol.webp', game: 'League of Legends', position: '25% top' },
  { src: '/landing/valorant.webp', game: 'Valorant' },
  { src: '/landing/cs2.webp', game: 'Counter-Strike 2' },
  { src: '/landing/dota2.webp', game: 'Dota 2' },
];
