import { HttpErrorResponse } from '@angular/common/http';
import { MESSAGES, toApiError } from './api-error';

function httpError(
  status: number,
  error: unknown = null,
  url = '/api/auth/register',
): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, url });
}

describe('toApiError', () => {
  it('reports an unreachable server', () => {
    expect(toApiError(httpError(0)).message).toBe(MESSAGES.offline);
  });

  it('reports wrong credentials on 401', () => {
    expect(toApiError(httpError(401)).message).toBe(MESSAGES.badCredentials);
  });

  it('tells a taken username from a taken email', () => {
    const username = toApiError(httpError(409, { message: 'Korisnicko ime je vec zauzeto' }));
    const email = toApiError(httpError(409, { message: 'Email je vec registrovan' }));

    expect(username.fieldErrors).toEqual({ username: MESSAGES.usernameTaken });
    expect(email.fieldErrors).toEqual({ email: MESSAGES.emailTaken });
    expect(toApiError(httpError(409)).message).toBe(MESSAGES.duplicate);
  });

  it('maps backend validation errors to fields', () => {
    const error = toApiError(
      httpError(400, {
        errors: [
          { field: 'email', code: 'Email' },
          { field: 'password', code: 'Size' },
          { field: 'username', code: 'NotBlank' },
        ],
      }),
    );

    expect(error.message).toBe(MESSAGES.invalidFields);
    expect(error.fieldErrors).toEqual({
      email: 'Email nije ispravan.',
      password: 'Lozinka mora imati 8 do 72 znaka.',
      username: 'Obavezno polje.',
    });
  });

  it('translates short backend messages about tournaments', () => {
    const url = '/api/tournaments/3/registrations';

    expect(toApiError(httpError(409, { message: 'turnir je pun' }, url)).message).toBe(
      'Turnir je popunjen.',
    );
    expect(toApiError(httpError(409, { message: 'tim je vec prijavljen' }, url)).message).toBe(
      'Tim je već prijavljen na turnir.',
    );
    expect(
      toApiError(httpError(400, { message: 'tim i turnir nisu ista igra' }, url)).message,
    ).toBe('Tim nije iz iste igre kao turnir.');
  });

  it('uses auth-only messages only for auth endpoints', () => {
    const url = '/api/tournaments/3/bracket';

    expect(toApiError(httpError(409, { message: 'nesto drugo' }, url)).message).toBe(
      MESSAGES.conflict,
    );
    expect(toApiError(httpError(401, null, url)).message).toBe(MESSAGES.sessionExpired);
    expect(toApiError(httpError(403, null, url)).message).toBe(MESSAGES.forbidden);
  });

  it('falls back to a generic message', () => {
    expect(toApiError(httpError(500)).message).toBe(MESSAGES.generic);
    expect(toApiError(new Error('x')).message).toBe(MESSAGES.generic);
  });
});
