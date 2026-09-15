import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/* ============================================================
   SALES ACCESS GUARD

   HR users manage people from the HR workspace.
   They must not enter the operational Sales workspace.

   All existing non-HR access behaviour is preserved.
============================================================ */

export const salesAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const currentUser = auth.getCurrentUser() as {
    role?: string;
  } | null;

  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  const role = String(currentUser.role || '')
    .trim()
    .toLowerCase();

  if (role === 'hr') {
    return router.createUrlTree(
      ['/hr-dashboard'],
      {
        queryParams: {
          salesAccess: 'denied'
        }
      }
    );
  }

  return true;
};
