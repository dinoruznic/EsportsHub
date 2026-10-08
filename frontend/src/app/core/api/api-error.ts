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
  forbidden: 'Nemaš dozvolu za ovu radnju.',
  notFound: 'Traženi podatak ne postoji.',
  conflict: 'Radnja trenutno nije moguća. Osvježi stranicu i pokušaj ponovo.',
  sessionExpired: 'Sesija je istekla. Prijavi se ponovo.',
};

const BACKEND_MESSAGES: Record<string, string> = {
  'turnir ne postoji': 'Turnir ne postoji.',
  'unknown game': 'Nepoznata igra.',
  'already have an account for this game': 'Već imaš nalog za ovu igru.',
  'ova igra koristi rank, ne rating': 'Ova igra koristi rang, a ne rating.',
  'ova igra koristi rating, ne rank': 'Ova igra koristi rating, a ne rang.',
  'ova igra nema rank': 'Ova igra nema ni rang ni rating.',
  'regija ne pripada igri': 'Izabrana regija ne pripada ovoj igri.',
  'pozicija ne pripada igri': 'Izabrana pozicija ne pripada ovoj igri.',
  'rank ne pripada igri': 'Izabrani rang ne pripada ovoj igri.',
  'nalog ne postoji': 'Nalog ne postoji.',
  'nije tvoj nalog': 'To nije tvoj nalog.',
  'vec je na trzistu': 'Nalog je već na transfer listi.',
  'oglas nije otvoren': 'Oglas više nije otvoren.',
  'oglas ne postoji': 'Oglas ne postoji.',
  'igrac ne postoji': 'Igrač ne postoji.',
  'team name taken': 'Naziv tima je već zauzet.',
  'team tag taken': 'Tag tima je već zauzet.',
  'already a member': 'Igrač je već član ovog tima.',
  'account game does not match team game': 'Nalog nije za igru ovog tima.',
  'samo kapiten moze mijenjati sastav tima': 'Samo kapiten može mijenjati sastav tima.',
  'clanstvo ne postoji': 'Član ne postoji.',
  'tim i igrac nisu ista igra': 'Tim i igrač nisu iz iste igre.',
  'ne mozes ponuditi na svoj oglas': 'Ne možeš poslati ponudu na svoj oglas.',
  'nisi vlasnik oglasa': 'Samo vlasnik oglasa to može.',
  'ponuda nije aktivna': 'Ponuda više nije aktivna.',
  'nije tvoja ponuda': 'To nije tvoja ponuda.',
  'ponuda ne postoji': 'Ponuda ne postoji.',
  'korisnik ne postoji': 'Igrač ne postoji.',
  'turnir nije u statusu pending': 'Turnir više ne čeka odobrenje.',
  'prijave nisu otvorene': 'Prijave za ovaj turnir nisu otvorene.',
  'tim ne postoji': 'Tim ne postoji.',
  'nisi kapiten tima': 'Samo kapiten tima može to uraditi.',
  'tim i turnir nisu ista igra': 'Tim nije iz iste igre kao turnir.',
  'tim je vec prijavljen': 'Tim je već prijavljen na turnir.',
  'turnir je pun': 'Turnir je popunjen.',
  'prijava ne postoji': 'Prijava ne postoji.',
  'ne mozes se povuci nakon zdrijeba': 'Nakon žrijeba se više ne možeš povući.',
  'samo organizator ili admin': 'Samo organizator ili admin može generisati bracket.',
  'turnir nije u fazi prijava': 'Turnir nije u fazi prijava.',
  'bracket vec postoji': 'Bracket je već generisan.',
  'premalo timova': 'Premalo prijavljenih timova za bracket.',
  'broj timova mora biti stepen dvojke (2,4,8,16...)': 'Broj timova mora biti 2, 4, 8 ili 16.',
  'nepodrzan format turnira': 'Format turnira nije podržan.',
};

const FIELD_MESSAGES: Record<string, Record<string, string>> = {
  username: { Size: 'Korisničko ime mora imati 3 do 30 znakova.' },
  email: { Email: 'Email nije ispravan.', Size: 'Email može imati najviše 120 znakova.' },
  password: { Size: 'Lozinka mora imati 8 do 72 znaka.' },
  displayName: { Size: 'Ime za prikaz može imati najviše 60 znakova.' },
  name: { Size: 'Naziv može imati najviše 80 znakova.' },
  inGameName: { Size: 'Ime u igri može imati najviše 60 znakova.' },
  tag: { Size: 'Tag može imati najviše 5 znakova.' },
  message: { Size: 'Poruka može imati najviše 255 znakova.' },
};

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { message: MESSAGES.generic, fieldErrors: {} };
  }

  const body = (typeof error.error === 'object' && error.error ? error.error : {}) as SpringErrorBody;

  const known = BACKEND_MESSAGES[(body.message ?? '').trim().toLowerCase()];
  if (known && error.status >= 400 && error.status < 500) {
    return { message: known, fieldErrors: {} };
  }

  const authRequest = (error.url ?? '').includes('/api/auth/');

  switch (error.status) {
    case 0:
      return { message: MESSAGES.offline, fieldErrors: {} };
    case 401:
      return { message: authRequest ? MESSAGES.badCredentials : MESSAGES.sessionExpired, fieldErrors: {} };
    case 403:
      return { message: MESSAGES.forbidden, fieldErrors: {} };
    case 404:
      return { message: MESSAGES.notFound, fieldErrors: {} };
    case 409:
      return authRequest ? duplicateError(body.message ?? '') : { message: MESSAGES.conflict, fieldErrors: {} };
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
