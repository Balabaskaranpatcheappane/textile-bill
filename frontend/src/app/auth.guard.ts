import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/** Landing page for a signed-in user — admins get the dashboard,
 *  cashiers get the New Invoice screen (they mostly bill anyway). */
export function homeFor(role: string | undefined): string {
  return role === 'admin' ? '/' : '/invoices/new';
}

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (!auth.isAdmin())         return router.createUrlTree([homeFor(auth.user()?.role)]);
  return true;
};
