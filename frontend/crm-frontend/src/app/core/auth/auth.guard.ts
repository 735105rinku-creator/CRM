import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isLoggedIn()) {
    return checkRoles(authService, router, route);
  }

  return authService.restoreSession().pipe(
    map((response) => {
      if (!response) {
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url }
        });
      }
      return checkRoles(authService, router, route);
    }),
    catchError(() =>
      of(router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      }))
    )
  );
};

function checkRoles(authService: AuthService, router: Router, route: any) {
  const requiredRole = route.data['role'] as string | undefined;
  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (requiredRole && !authService.hasRole(requiredRole)) {
    return router.createUrlTree(['/login']);
  }

  if (requiredRoles?.length && !requiredRoles.some((role) => authService.hasRole(role))) {
    return router.createUrlTree(['/login']);
  }

  return true;
}
