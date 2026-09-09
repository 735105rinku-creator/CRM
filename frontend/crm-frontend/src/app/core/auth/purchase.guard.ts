import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  catchError,
  map,
  of
} from 'rxjs';

import { AuthService } from './auth.service';
import { ApiService } from '../services/api.service';


/* ============================================================
   TYPES
============================================================ */

interface DepartmentRef {
  _id?: string;
  id?: string;

  name?: string;
  departmentName?: string;

  code?: string;
  departmentCode?: string;

  slug?: string;

  featureKey?: string;
  dashboardKey?: string;

  accessModules?: string[];
}


interface EmployeeDashboardResponse {
  employee?: {
    _id?: string;
    id?: string;

    employeeCode?: string;

    departmentId?:
      | DepartmentRef
      | string
      | null;
  } | null;

  user?: {
    role?: string;

    department?: string;

    departmentRef?:
      | DepartmentRef
      | string
      | null;
  } | null;
}


/* ============================================================
   PURCHASE GUARD
============================================================ */

export const purchaseGuard: CanActivateFn = () => {

  const auth =
    inject(AuthService);

  const api =
    inject(ApiService);

  const router =
    inject(Router);


  const currentUser =
    auth.getCurrentUser() as {
      role?: string;

      department?: string;

      departmentRef?:
        | DepartmentRef
        | string
        | null;

      profile?: {
        department?: string;
      };
    } | null;


  /* ==========================================================
     AUTH CHECK
  ========================================================== */

  if (!currentUser) {

    return router.createUrlTree([
      '/login'
    ]);
  }


  const role =
    normalize(
      currentUser.role
    );


  /* ==========================================================
     CURRENT USER DEPARTMENT

     If department information is already present in auth data,
     avoid making another request.
  ========================================================== */

  const directValues: unknown[] = [

    currentUser.department,

    currentUser.profile?.department,

    ...departmentRefValues(
      currentUser.departmentRef
    )
  ];


  if (
    hasPurchaseAccess(
      directValues
    )
  ) {

    return true;
  }


  /* ==========================================================
     EMPLOYEE DEPARTMENT LOOKUP

     Follow the same existing pattern used by Logistics:
     employee department is resolved from the existing
     /hr/employees/dashboard endpoint.
  ========================================================== */

  if (role !== 'employee') {

    return accessDenied(
      router
    );
  }


  return api
    .get<EmployeeDashboardResponse>(
      '/hr/employees/dashboard'
    )
    .pipe(

      map((response) => {

        const employeeDepartment =
          response?.employee?.departmentId;

        const responseUser =
          response?.user;


        const values: unknown[] = [

          currentUser.department,

          currentUser.profile?.department,

          ...departmentRefValues(
            currentUser.departmentRef
          ),

          ...departmentRefValues(
            employeeDepartment
          ),

          responseUser?.department,

          ...departmentRefValues(
            responseUser?.departmentRef
          )
        ];


        if (
          hasPurchaseAccess(
            values
          )
        ) {

          return true;
        }


        return accessDenied(
          router
        );
      }),


      /* ======================================================
         FAIL CLOSED

         If department lookup fails, do not allow Purchase access.
      ====================================================== */

      catchError(() =>
        of(
          accessDenied(
            router
          )
        )
      )
    );
};


/* ============================================================
   DEPARTMENT VALUE EXTRACTION
============================================================ */

function departmentRefValues(
  value?:
    | DepartmentRef
    | string
    | null
): unknown[] {

  if (!value) {

    return [];
  }


  if (
    typeof value === 'string'
  ) {

    return [
      value
    ];
  }


  return [

    value.name,

    value.departmentName,

    value.code,

    value.departmentCode,

    value.slug,

    value.featureKey,

    value.dashboardKey,

    ...(Array.isArray(
      value.accessModules
    )
      ? value.accessModules
      : [])
  ];
}


/* ============================================================
   PURCHASE DEPARTMENT MATCH
============================================================ */

function hasPurchaseAccess(
  values: unknown[]
): boolean {

  return values

    .flatMap((value) => {

      if (
        value &&
        typeof value === 'object'
      ) {

        return departmentRefValues(
          value as DepartmentRef
        );
      }


      return [
        value
      ];
    })

    .map(
      normalize
    )

    .filter(
      Boolean
    )

    .some((value) => {

      return (

        value === 'purchase' ||

        value === 'purchases' ||

        value === 'purchasing' ||

        value === 'purchase-department' ||

        value === 'purchase department' ||

        value === 'purchase_department' ||

        /\bpurchas(e|ing|es)?\b/i.test(
          value
        )
      );
    });
}


/* ============================================================
   ACCESS DENIED
============================================================ */

function accessDenied(
  router: Router
) {

  return router.createUrlTree(
    [
      '/employee-dashboard'
    ],
    {
      queryParams: {
        purchaseAccess:
          'denied'
      }
    }
  );
}


/* ============================================================
   NORMALIZER
============================================================ */

function normalize(
  value: unknown
): string {

  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase();
}
