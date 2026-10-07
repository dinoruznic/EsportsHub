import { AUTH_STORAGE_KEY, AuthUser } from '../core/auth/auth.service';

export const TEST_USER: AuthUser = { userId: 1, username: 'admin', roles: ['ADMIN'] };

function encode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function fakeJwt(expiresInSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'admin', exp })}.signature`;
}

export function storeSession(expiresInSeconds = 3600, user: AuthUser = TEST_USER): string {
  const token = fakeJwt(expiresInSeconds);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  return token;
}
