import { HttpErrorResponse } from '@angular/common/http';
import { MESSAGES, toApiError } from './api-error';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, url: '/api/auth/register' });
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

  it('falls back to a generic message', () => {
    expect(toApiError(httpError(500)).message).toBe(MESSAGES.generic);
    expect(toApiError(new Error('x')).message).toBe(MESSAGES.generic);
  });
});
