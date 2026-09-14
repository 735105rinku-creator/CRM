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


    const hasDirectAccountsMatch =
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


    if (hasDirectAccountsMatch) {
      return true;
    }


    if (
      Array.isArray(
        department.accessModules
      )
    ) {

      return department.accessModules.some(
        (module) => {

          const normalized =
            String(module || '')
              .trim()
              .toLowerCase();


          return (
            normalized === 'accounts' ||
            normalized === 'account' ||
            normalized === 'accounting'
          );

        }
      );

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

  return values
    .flatMap((value) => {

      if (!value) {
        return [];
      }


      if (typeof value === 'string') {
        return [value];
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


      return [
        department.featureKey,
        department.dashboardKey,
        department.code,
        department.slug,
        department.name,
        department.departmentName,

        ...(
          Array.isArray(
            department.accessModules
          )
            ? department.accessModules
            : []
        )
      ];

    })
    .map(
      (value) =>
        String(value || '')
          .trim()
          .toLowerCase()
    )
    .filter(Boolean)
    .some(
      (value) =>
        value === 'purchase' ||
        value === 'purchases' ||
        value === 'purchasing' ||
        value === 'purchase-department' ||
        value === 'purchase department' ||
        value === 'purchase_department' ||
        /\bpurchas(e|ing|es)?\b/i.test(value)
    );
}


/* ============================================================
   SALES DEPARTMENT
============================================================ */

function hasSalesDepartment(
  values: Array<
    DepartmentRef |
    string |
    null |
    undefined
  >
): boolean {

  return values
    .flatMap((value) => {

      if (!value) {
        return [];
      }


      if (typeof value === 'string') {
        return [value];
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


      return [
        department.featureKey,
        department.dashboardKey,
        department.code,
        department.slug,
        department.name,
        department.departmentName,

        ...(
          Array.isArray(
            department.accessModules
          )
            ? department.accessModules
            : []
        )
      ];

    })
    .map(
      (value) =>
        String(value || '')
          .trim()
          .toLowerCase()
    )
    .filter(Boolean)
    .some(
      (value) =>
        value === 'sales' ||
        value === 'sale' ||
        value === 'sales-crm' ||
        value === 'sales_crm' ||
        value === 'sales crm' ||
        value === 'sales-department' ||
        value === 'sales department' ||
        value === 'sales_department' ||
        value === 'crm-sales' ||
        value === 'crm sales' ||
        /\bsales?\b/i.test(value)
    );
}


/* ============================================================
   EMPLOYEE DASHBOARD GUARD
============================================================ */

export const employeeDashboardGuard: CanActivateFn = () => {

  const auth =
    inject(AuthService);

  const api =
    inject(ApiService);

  const router =
    inject(Router);


  const currentUser =
    auth.getCurrentUser();


  /* ==========================================================
     NOT LOGGED IN
  ========================================================== */

  if (!currentUser) {

    return router.createUrlTree([
      '/login'
    ]);

  }


  /* ==========================================================
     LOGISTICS FAST PATH

     Preserve existing Logistics routing exactly.
  ========================================================== */

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


  /* ==========================================================
     NON EMPLOYEE

     Guard only resolves department workspace for employees.
  ========================================================== */

  if (
    role !== 'employee'
  ) {

    return true;

  }


  /* ==========================================================
     EMPLOYEE DEPARTMENT RESOLUTION
  ========================================================== */

  return api
    .get<EmployeeDashboardResponse>(
      '/hr/employees/dashboard'
    )
    .pipe(

      map((response) => {

        const departmentValues: Array<
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


        /* ====================================================
           PRIORITY 1
           LOGISTICS
        ==================================================== */

        if (
          auth.hasLogisticsDepartment(
            departmentValues
          )
        ) {

          return router.createUrlTree([
            '/logistics/dashboard'
          ]);

        }


        /* ====================================================
           PRIORITY 2
           PURCHASE
        ==================================================== */

        if (
          hasPurchaseDepartment(
            departmentValues
          )
        ) {

          return router.createUrlTree([
            '/purchase/dashboard'
          ]);

        }


        /* ====================================================
           PRIORITY 3
           ACCOUNTS
        ==================================================== */

        if (
          hasAccountsDepartment(
            departmentValues
          )
        ) {

          return router.createUrlTree([
            '/accounts/dashboard'
          ]);

        }


        /* ====================================================
           PRIORITY 4
           SALES
        ==================================================== */

        if (
          hasSalesDepartment(
            departmentValues
          )
        ) {

          return router.createUrlTree([
            '/sales/dashboard'
          ]);

        }


        /* ====================================================
           OTHER EMPLOYEES

           Continue using generic Employee Dashboard.
        ==================================================== */

        return true;

      }),


      catchError(
        () =>
          of(true)
      )

    );

};