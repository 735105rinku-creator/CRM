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


/* ============================================================
   ACCOUNTS DEPARTMENT
============================================================ */

function hasAccountsDepartment(
  values: Array<
    DepartmentRef |
    string |
    null |
    undefined
  >
): boolean {

  return values.some((value) => {

    if (!value) {
      return false;
    }

    if (typeof value === 'string') {

      const normalized =
        value
          .trim()
          .toLowerCase();

      return (
        normalized === 'accounts' ||
        normalized === 'account' ||
        normalized === 'accounting' ||
        normalized.includes('accounts')
      );
    }

    const department =
      value as DepartmentRef & {
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

    const hasDirectMatch =
      directValues.some((item) => {

        if (!item) {
          return false;
        }

        const normalized =
          String(item)
            .trim()
            .toLowerCase();

        return (
          normalized === 'accounts' ||
          normalized === 'account' ||
          normalized === 'accounting' ||
          normalized.includes('accounts')
        );
      });

    if (hasDirectMatch) {
      return true;
    }

    if (
      Array.isArray(
        department.accessModules
      )
    ) {

      return department.accessModules
        .some((module) => {

          const normalized =
            String(module || '')
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


/* ============================================================
   PURCHASE DEPARTMENT
============================================================ */

function hasPurchaseDepartment(
  values: Array<
    DepartmentRef |
    string |
    null |
    undefined
  >
): boolean {

  return values.some((value) => {

    if (!value) {
      return false;
    }


    /* --------------------------------------------------------
       Plain department string
    -------------------------------------------------------- */

    if (typeof value === 'string') {

      const normalized =
        value
          .trim()
          .toLowerCase();

      return (
        normalized === 'purchase' ||
        normalized === 'purchases' ||
        normalized === 'purchasing' ||
        normalized === 'purchase department' ||
        normalized === 'purchase-department' ||
        normalized === 'purchase_department'
      );
    }


    /* --------------------------------------------------------
       Populated department object
    -------------------------------------------------------- */

    const department =
      value as DepartmentRef & {
        name?: string;
        departmentName?: string;
        code?: string;
        departmentCode?: string;
        slug?: string;
        featureKey?: string;
        dashboardKey?: string;
        accessModules?: string[];
      };


    const directValues = [
      department.featureKey,
      department.dashboardKey,
      department.code,
      department.departmentCode,
      department.slug,
      department.name,
      department.departmentName
    ];


    const hasDirectMatch =
      directValues.some((item) => {

        if (!item) {
          return false;
        }

        const normalized =
          String(item)
            .trim()
            .toLowerCase();

        return (
          normalized === 'purchase' ||
          normalized === 'purchases' ||
          normalized === 'purchasing' ||
          normalized === 'purchase department' ||
          normalized === 'purchase-department' ||
          normalized === 'purchase_department'
        );
      });


    if (hasDirectMatch) {
      return true;
    }


    /* --------------------------------------------------------
       accessModules compatibility
    -------------------------------------------------------- */

    if (
      Array.isArray(
        department.accessModules
      )
    ) {

      return department.accessModules
        .some((module) => {

          const normalized =
            String(module || '')
              .trim()
              .toLowerCase();

          return (
            normalized === 'purchase' ||
            normalized === 'purchases' ||
            normalized === 'purchasing'
          );
        });
    }


    return false;
  });
}


/* ============================================================
   EMPLOYEE DASHBOARD ROUTING
============================================================ */

export const employeeDashboardGuard:
  CanActivateFn = () => {

    const auth =
      inject(AuthService);

    const api =
      inject(ApiService);

    const router =
      inject(Router);


    const currentUser =
      auth.getCurrentUser();


    /* ========================================================
       NOT LOGGED IN
    ======================================================== */

    if (!currentUser) {

      return router.createUrlTree([
        '/login'
      ]);
    }


    /* ========================================================
       EXISTING LOGISTICS FAST PATH

       Preserve existing working Logistics behavior.
    ======================================================== */

    if (
      auth.isLogisticsUser(
        currentUser
      )
    ) {

      return router.createUrlTree([
        '/logistics/dashboard'
      ]);
    }


    const role =
      String(
        'role' in currentUser
          ? currentUser.role || ''
          : ''
      )
        .trim()
        .toLowerCase();


    /* ========================================================
       ONLY EMPLOYEE ROLE NEEDS DEPARTMENT WORKSPACE ROUTING
    ======================================================== */

    if (role !== 'employee') {

      return true;
    }


    /* ========================================================
       RESOLVE ASSIGNED DEPARTMENT

       Reuse existing HR employee dashboard/profile API.
       No new auth flow or role is introduced.
    ======================================================== */

    return api
      .get<EmployeeDashboardResponse>(
        '/hr/employees/dashboard'
      )
      .pipe(

        map((response) => {

          const departmentValues:
            Array<
              DepartmentRef |
              string |
              null |
              undefined
            > = [

              response
                ?.employee
                ?.departmentId,

              response
                ?.user
                ?.department,

              response
                ?.user
                ?.departmentRef
            ];


          /* ================================================
             PRIORITY 1 — LOGISTICS

             Existing behavior remains unchanged.
          ================================================ */

          if (
            auth.hasLogisticsDepartment(
              departmentValues
            )
          ) {

            return router.createUrlTree([
              '/logistics/dashboard'
            ]);
          }


          /* ================================================
             PRIORITY 2 — ACCOUNTS

             Existing Accountant routing remains unchanged.
          ================================================ */

          if (
            hasAccountsDepartment(
              departmentValues
            )
          ) {

            return router.createUrlTree([
              '/accounts/dashboard'
            ]);
          }


          /* ================================================
             PRIORITY 3 — PURCHASE

             role remains employee.
             Department assignment controls workspace.
          ================================================ */

          if (
            hasPurchaseDepartment(
              departmentValues
            )
          ) {

            return router.createUrlTree([
              '/purchase/dashboard'
            ]);
          }


          /* ================================================
             OTHER EMPLOYEES

             Keep existing generic employee dashboard.
          ================================================ */

          return true;
        }),


        /* ==================================================
           PRESERVE EXISTING FAILURE BEHAVIOR

           If department lookup fails, don't break login.
        ================================================== */

        catchError(() =>
          of(true)
        )
      );
  };