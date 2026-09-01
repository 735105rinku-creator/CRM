import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url
      }
    });
  }

  const requiredRole = route.data['role'] as string | undefined;
  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (requiredRole && !authService.hasRole(requiredRole)) {
    return router.createUrlTree(['/login']);
  }

  if (requiredRoles?.length && !requiredRoles.some((role) => authService.hasRole(role))) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
