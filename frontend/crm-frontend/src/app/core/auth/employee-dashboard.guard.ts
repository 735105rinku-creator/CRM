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

/**
 * Checks whether any supplied department reference belongs to Accounts.
 *
 * Supports:
 * - Plain string department values
 * - Populated department objects
 * - featureKey
 * - dashboardKey
 * - code
 * - name
 * - slug
 * - accessModules
 */
function hasAccountsDepartment(
  values: Array<DepartmentRef | string | null | undefined>
): boolean {
  return values.some((value) => {
    if (!value) {
      return false;
    }

    /*
     * Sometimes backend can return department directly as a string.
     *
     * Examples:
     * "accounts"
     * "Accounts"
     * "ACCOUNT"
     * "Accounting"
     */
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      return (
        normalized === 'accounts' ||
        normalized === 'account' ||
        normalized === 'accounting' ||
        normalized.includes('accounts')
      );
    }

    /*
     * DepartmentRef may contain additional properties depending
     * on whether the department was populated by the backend.
     *
     * We intentionally read the common department-routing fields
     * defensively so existing DepartmentRef typing does not need
     * to be changed.
     */
    const department = value as DepartmentRef & {
      name?: string;
      departmentName?: string;
      code?: string;
      slug?: string;
      featureKey?: string;
      dashboardKey?: string;
      accessModules?: string[];
    };

    const directValues = [
      department.featureKey,
      department.dashboardKey,
      department.code,
      department.slug,
      department.name,
      department.departmentName
    ];

    const hasDirectAccountsMatch = directValues.some((item) => {
      if (!item) {
        return false;
      }

      const normalized = String(item).trim().toLowerCase();

      return (
        normalized === 'accounts' ||
        normalized === 'account' ||
        normalized === 'accounting' ||
        normalized.includes('accounts')
      );
    });

    if (hasDirectAccountsMatch) {
      return true;
    }

    /*
     * HR department configuration can also expose Accounts
     * through accessModules.
     */
    if (Array.isArray(department.accessModules)) {
      return department.accessModules.some((module) => {
        const normalized = String(module || '')
          .trim()
          .toLowerCase();

        return (
          normalized === 'accounts' ||
          normalized === 'account' ||
          normalized === 'accounting'
        );
      });
    }

    return false;
  });
}

function hasPurchaseDepartment(
  values: Array<DepartmentRef | string | null | undefined>
): boolean {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === 'string') return [value];

      const department = value as DepartmentRef & {
        name?: string;
        departmentName?: string;
        code?: string;
        slug?: string;
        featureKey?: string;
        dashboardKey?: string;
        accessModules?: string[];
      };

      return [
        department.featureKey,
        department.dashboardKey,
        department.code,
        department.slug,
        department.name,
        department.departmentName,
        ...(Array.isArray(department.accessModules)
          ? department.accessModules
          : [])
      ];
    })
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .some((value) =>
      value === 'purchase' ||
      value === 'purchases' ||
      value === 'purchasing' ||
      value === 'purchase-department' ||
      value === 'purchase department' ||
      value === 'purchase_department' ||
      /\bpurchas(e|ing|es)?\b/i.test(value)
    );
}

export const employeeDashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const api = inject(ApiService);
  const router = inject(Router);

  const currentUser = auth.getCurrentUser();

  /*
   * No logged-in user:
   * send back to login.
   */
  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  /*
   * Preserve the existing Logistics flow exactly.
   *
   * If AuthService can already identify the current user
   * as a Logistics user, redirect immediately.
   */
  if (auth.isLogisticsUser(currentUser)) {
    return router.createUrlTree(['/logistics/dashboard']);
  }

  const role = String(
    'role' in currentUser ? currentUser.role || '' : ''
  )
    .trim()
    .toLowerCase();

  /*
   * This guard is specifically resolving Employee dashboard routing.
   *
   * Existing non-employee behaviour remains unchanged.
   */
  if (role !== 'employee') {
    return true;
  }

  /*
   * For an Employee, fetch the employee dashboard/profile data
   * so we can determine the actual assigned department.
   */
  return api
    .get<EmployeeDashboardResponse>('/hr/employees/dashboard')
    .pipe(
      map((response) => {
        const departmentValues: Array<
          DepartmentRef | string | null | undefined
        > = [
          response?.employee?.departmentId,
          response?.user?.department,
          response?.user?.departmentRef
        ];

        /*
         * Priority 1:
         * Preserve existing Logistics employee routing.
         */
        if (auth.hasLogisticsDepartment(departmentValues)) {
          return router.createUrlTree([
            '/logistics/dashboard'
          ]);
        }

        /*
         * Priority 2:
         * Purchase employees keep their dedicated Purchase workspace.
         */
        if (hasPurchaseDepartment(departmentValues)) {
          return router.createUrlTree([
            '/purchase/dashboard'
          ]);
        }

        /*
         * Priority 3:
         * Accounts employee / Accountant employee.
         */
        if (hasAccountsDepartment(departmentValues)) {
          return router.createUrlTree([
            '/accounts/dashboard'
          ]);
        }

        /*
         * Any other Employee keeps using the existing
         * generic employee dashboard.
         */
        return true;
      }),

      /*
       * Existing behaviour is preserved:
       * if employee dashboard/profile API fails,
       * don't block the generic employee dashboard.
       */
      catchError(() => of(true))
    );
};
