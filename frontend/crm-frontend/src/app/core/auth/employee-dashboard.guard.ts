import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from './auth.service';
import { ApiService } from '../services/api.service';
import { DepartmentRef } from '../models/user.model';

interface EmployeeDashboardResponse {
  employee?: {
    departmentId?: DepartmentRef | string | null;
  } | null;
  user?: {
    role?: string;
    department?: string;
    departmentRef?: DepartmentRef | string | null;
  } | null;
}

export const employeeDashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const api = inject(ApiService);
  const router = inject(Router);
  const currentUser = auth.getCurrentUser();

  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isLogisticsUser(currentUser)) {
    return router.createUrlTree(['/logistics/dashboard']);
  }

  const role = String('role' in currentUser ? currentUser.role || '' : '').trim().toLowerCase();

  if (role !== 'employee') {
    return true;
  }

  return api.get<EmployeeDashboardResponse>('/hr/employees/dashboard').pipe(
    map((response) => {
      const values = [
        response?.employee?.departmentId,
        response?.user?.department,
        response?.user?.departmentRef
      ];

      return auth.hasLogisticsDepartment(values)
        ? router.createUrlTree(['/logistics/dashboard'])
        : true;
    }),
    catchError(() => of(true))
  );
};
