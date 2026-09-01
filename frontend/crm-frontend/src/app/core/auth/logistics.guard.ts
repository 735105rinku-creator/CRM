import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';

import {
  catchError,
  map,
  of
} from 'rxjs';

import {
  AuthService
} from './auth.service';

import {
  ApiService
} from '../services/api.service';


/* ============================================================
   TYPES
============================================================ */

interface DepartmentRef {
  _id?: string;
  id?: string;

  departmentName?: string;
  departmentCode?: string;

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
      DepartmentRef |
      string |
      null;

  } | null;


  user?: {

    role?: string;

    department?: string;

    departmentRef?:
      DepartmentRef |
      string |
      null;

  } | null;
}


/* ============================================================
   LOGISTICS GUARD

   IMPORTANT ACCESS RULE:

   Logistics operational workspace belongs ONLY to employees
   assigned to the Logistics department.

   HR / Company Admin / Super Admin are monitoring users.
   They must NOT enter the Logistics employee workspace.

============================================================ */

export const logisticsGuard:
  CanActivateFn =
  () => {

    const auth =
      inject(AuthService);

    const api =
      inject(ApiService);

    const router =
      inject(Router);


    /* ========================================================
       CURRENT LOGGED-IN USER
    ======================================================== */

    const currentUser =
      auth.getCurrentUser() as {

        role?: string;

        department?: string;

        departmentRef?:
          DepartmentRef |
          string |
          null;

      } | null;


    const role =
      normalize(
        currentUser?.role
      );


    

    const managementRoles = [
      'hr',
      'company_admin',
      'super_admin',
      'manager',
      'department_head',
      'team_leader'
    ];
/* ========================================================
       NOT LOGGED IN

       authGuard normally handles authentication before this,
       but keeping this makes the guard safe independently.
    ======================================================== */

    if (!currentUser) {

      return router
        .createUrlTree(
          [
            '/login'
          ]
        );
    }


    

    if (managementRoles.includes(role)) {
      return true;
    }
/* ========================================================
       HR

       HR can monitor Logistics from HR Dashboard.

       HR must NOT enter:
       /logistics/dashboard
       /logistics/air-cargo
       /logistics/invoices
       etc.
    ======================================================== */

    if (
      role ===
      'hr'
    ) {

      return managementRedirect(
        router,
        '/hr-dashboard',
        'monitor-only'
      );
    }


    /* ========================================================
       COMPANY ADMIN

       Company Admin gets Logistics monitoring inside
       Company Admin Dashboard.

       No operational Logistics workspace.
    ======================================================== */

    if (
      role ===
      'company_admin'
    ) {

      return managementRedirect(
        router,
        '/dashboard',
        'monitor-only'
      );
    }


    /* ========================================================
       SUPER ADMIN

       Super Admin stays inside Super Admin workspace.

       If later you want Super Admin operational override,
       we can add a separate permission instead of giving
       automatic employee Logistics access.
    ======================================================== */

    if (
      role ===
      'super_admin'
    ) {

      return managementRedirect(
        router,
        '/super-admin/dashboard',
        'monitor-only'
      );
    }


    /* ========================================================
       ONLY EMPLOYEE MAY ENTER LOGISTICS WORKSPACE
    ======================================================== */

    if (
      role !==
      'employee'
    ) {

      return accessDeniedRedirect(
        router
      );
    }


    /* ========================================================
       FIRST CHECK

       Sometimes login/current-user already contains
       department information.

       If featureKey/name/code shows Logistics,
       allow immediately.
    ======================================================== */

    const currentDepartmentValues:
      unknown[] =
      [

        currentUser
          ?.department,

        ...departmentRefValues(
          currentUser
            ?.departmentRef
        )

      ];


    if (
      hasLogisticsDepartment(
        currentDepartmentValues
      )
    ) {

      return true;
    }


    /* ========================================================
       SECOND CHECK

       For employee accounts where department information
       was not included in current user/auth data,
       verify using Employee Dashboard API.
    ======================================================== */

    return api

      .get<EmployeeDashboardResponse>(
        '/hr/employees/dashboard'
      )

      .pipe(

        map(
          (
            response:
              EmployeeDashboardResponse
          ) => {

            const employeeDepartment =
              response
                ?.employee
                ?.departmentId;


            const responseUser =
              response
                ?.user;


            /* =================================================
               SECURITY CHECK

               Even if API unexpectedly returns another role,
               management roles must still not enter the
               operational Logistics workspace.
            ================================================= */

            const responseRole =
              normalize(
                responseUser?.role
              );


            if (
              responseRole ===
                'hr' ||

              responseRole ===
                'company_admin' ||

              responseRole ===
                'super_admin'
            ) {

              return roleRedirect(
                router,
                responseRole
              );
            }


            /* =================================================
               COLLECT ALL POSSIBLE DEPARTMENT VALUES
            ================================================= */

            const values:
              unknown[] =
              [

                currentUser
                  ?.department,

                ...departmentRefValues(
                  currentUser
                    ?.departmentRef
                ),


                ...departmentRefValues(
                  employeeDepartment
                ),


                responseUser
                  ?.department,

                ...departmentRefValues(
                  responseUser
                    ?.departmentRef
                )

              ];


            /* =================================================
               LOGISTICS EMPLOYEE
            ================================================= */

            if (
              hasLogisticsDepartment(
                values
              )
            ) {

              return true;
            }


            /* =================================================
               NORMAL EMPLOYEE BUT NOT LOGISTICS
            ================================================= */

            return accessDeniedRedirect(
              router
            );
          }
        ),


        /* ====================================================
           API ERROR

           Never allow Logistics access when employee
           department cannot be verified.
        ==================================================== */

        catchError(
          () =>
            of(
              accessDeniedRedirect(
                router
              )
            )
        )
      );
  };


/* ============================================================
   MANAGEMENT REDIRECT
============================================================ */

function managementRedirect(
  router: Router,
  route: string,
  reason:
    string
): UrlTree {

  return router
    .createUrlTree(
      [
        route
      ],
      {
        queryParams: {

          logistics:
            reason

        }
      }
    );
}


/* ============================================================
   REDIRECT MANAGEMENT ROLE
============================================================ */

function roleRedirect(
  router: Router,
  role: string
): UrlTree {

  switch (
    role
  ) {

    case 'hr':

      return managementRedirect(
        router,
        '/hr-dashboard',
        'monitor-only'
      );


    case 'company_admin':

      return managementRedirect(
        router,
        '/dashboard',
        'monitor-only'
      );


    case 'super_admin':

      return managementRedirect(
        router,
        '/super-admin/dashboard',
        'monitor-only'
      );


    default:

      return accessDeniedRedirect(
        router
      );
  }
}


/* ============================================================
   EMPLOYEE ACCESS DENIED
============================================================ */

function accessDeniedRedirect(
  router: Router
): UrlTree {

  return router
    .createUrlTree(
      [
        '/employee-dashboard'
      ],
      {
        queryParams: {

          logisticsAccess:
            'denied'

        }
      }
    );
}


/* ============================================================
   GET POSSIBLE DEPARTMENT IDENTIFIERS
============================================================ */

function departmentRefValues(
  value?:
    DepartmentRef |
    string |
    null
): unknown[] {

  if (!value) {

    return [];
  }


  if (
    typeof value ===
    'string'
  ) {

    return [
      value
    ];
  }


  return [

    value.departmentName,

    value.departmentCode,

    value.featureKey,

    value.dashboardKey,

    ...(Array.isArray(value.accessModules) ? value.accessModules : [])

  ];
}


/* ============================================================
   CHECK LOGISTICS DEPARTMENT
============================================================ */

function hasLogisticsDepartment(
  values:
    unknown[]
): boolean {

  return values

    .map(
      normalize
    )

    .filter(
      Boolean
    )

    .some(
      (
        value
      ) => {

        return (

          value ===
            'logistics' ||

          value ===
            'logistic' ||

          value ===
            'logistics-department' ||

          value ===
            'logistics department' ||

          /\blogistics?\b/i
            .test(
              value
            )

        );
      }
    );
}


/* ============================================================
   NORMALIZE
============================================================ */

function normalize(
  value:
    unknown
): string {

  return String(
    value ??
    ''
  )
    .trim()
    .toLowerCase();
}
