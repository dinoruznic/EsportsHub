import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  message: string;
  fieldErrors: Record<string, string>;
}

interface SpringFieldError {
  field?: string;
  code?: string;
}

interface SpringErrorBody {
  message?: string;
  errors?: SpringFieldError[];
}

export const MESSAGES = {
  offline: 'Server nije dostupan. Provjeri da li backend radi.',
  badCredentials: 'Pogrešno korisničko ime ili lozinka.',
  duplicate: 'Korisničko ime ili email je već zauzet.',
  usernameTaken: 'Korisničko ime je već zauzeto.',
  emailTaken: 'Email je već registrovan.',
  invalidFields: 'Provjeri označena polja.',
  generic: 'Nešto nije u redu. Pokušaj ponovo.',
};

const FIELD_MESSAGES: Record<string, Record<string, string>> = {
  username: { Size: 'Korisničko ime mora imati 3 do 30 znakova.' },
  email: { Email: 'Email nije ispravan.', Size: 'Email može imati najviše 120 znakova.' },
  password: { Size: 'Lozinka mora imati 8 do 72 znaka.' },
  displayName: { Size: 'Ime za prikaz može imati najviše 60 znakova.' },
};

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { message: MESSAGES.generic, fieldErrors: {} };
  }

  const body = (typeof error.error === 'object' && error.error ? error.error : {}) as SpringErrorBody;

  switch (error.status) {
    case 0:
      return { message: MESSAGES.offline, fieldErrors: {} };
    case 401:
      return { message: MESSAGES.badCredentials, fieldErrors: {} };
    case 409:
      return duplicateError(body.message ?? '');
    case 400:
      return validationError(body.errors ?? []);
    default:
      return { message: MESSAGES.generic, fieldErrors: {} };
  }
}

function duplicateError(message: string): ApiError {
  const normalized = message.toLowerCase();
  if (normalized.startsWith('korisnicko ime') || normalized.startsWith('korisničko ime')) {
    return { message: MESSAGES.usernameTaken, fieldErrors: { username: MESSAGES.usernameTaken } };
  }
  if (normalized.startsWith('email')) {
    return { message: MESSAGES.emailTaken, fieldErrors: { email: MESSAGES.emailTaken } };
  }
  return { message: MESSAGES.duplicate, fieldErrors: {} };
}

function validationError(errors: SpringFieldError[]): ApiError {
  const fieldErrors: Record<string, string> = {};
  for (const { field, code } of errors) {
    if (!field || fieldErrors[field]) {
      continue;
    }
    fieldErrors[field] =
      code === 'NotBlank' || code === 'NotNull'
        ? 'Obavezno polje.'
        : (FIELD_MESSAGES[field]?.[code ?? ''] ?? 'Neispravna vrijednost.');
  }
  const message = Object.keys(fieldErrors).length > 0 ? MESSAGES.invalidFields : MESSAGES.generic;
  return { message, fieldErrors };
}
