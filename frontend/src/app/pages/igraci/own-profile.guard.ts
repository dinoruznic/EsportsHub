import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

export const ownProfileGuard: CanActivateFn = (route) => {
  const username = route.paramMap.get('username');
  const me = inject(AuthService).currentUser()?.username;
  return me && username === me ? inject(Router).createUrlTree(['/profil']) : true;
};
