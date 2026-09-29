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
   WAREHOUSE GUARD

   ACCESS RULE:

   The Warehouse operational workspace belongs ONLY to employees
   assigned to the Warehouse (or Store / Inventory) department.

   HR / Company Admin / Super Admin are monitoring users.
   They must NOT enter the Warehouse employee workspace.

============================================================ */

export const warehouseGuard:
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

       HR monitors Warehouse from the HR Dashboard.
       HR must NOT enter /warehouse/dashboard.
    ======================================================== */

    if (
      role ===
      'hr'
    ) {

      return managementRedirect(
        router,
        '/hr-dashboard'
      );
    }


    /* ========================================================
       COMPANY ADMIN

       Company Admin monitors Warehouse from the Company
       Admin Dashboard. No operational Warehouse workspace.
    ======================================================== */

    if (
      role ===
      'company_admin'
    ) {

      return managementRedirect(
        router,
        '/dashboard'
      );
    }


    /* ========================================================
       SUPER ADMIN
    ======================================================== */

    if (
      role ===
      'super_admin'
    ) {

      return managementRedirect(
        router,
        '/super-admin/dashboard'
      );
    }


    /* ========================================================
       ONLY EMPLOYEE MAY ENTER WAREHOUSE WORKSPACE
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
      hasWarehouseDepartment(
        currentDepartmentValues
      )
    ) {

      return true;
    }


    /* ========================================================
       SECOND CHECK

       For employee accounts where department information was not
       included in current user/auth data, verify using the
       Employee Dashboard API.
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
               operational Warehouse workspace.
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
               WAREHOUSE EMPLOYEE
            ================================================= */

            if (
              hasWarehouseDepartment(
                values
              )
            ) {

              return true;
            }


            /* =================================================
               NORMAL EMPLOYEE BUT NOT WAREHOUSE
            ================================================= */

            return accessDeniedRedirect(
              router
            );
          }
        ),


        /* ====================================================
           API ERROR
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
  route: string
): UrlTree {

  return router
    .createUrlTree(
      [
        route
      ],
      {
        queryParams: {

          warehouse:
            'monitor-only'

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
        '/hr-dashboard'
      );


    case 'company_admin':

      return managementRedirect(
        router,
        '/dashboard'
      );


    case 'super_admin':

      return managementRedirect(
        router,
        '/super-admin/dashboard'
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

          warehouseAccess:
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
   CHECK WAREHOUSE DEPARTMENT
============================================================ */

function hasWarehouseDepartment(
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
            'warehouse' ||

          value ===
            'store' ||

          value ===
            'inventory' ||

          value ===
            'warehouse-department' ||

          value ===
            'warehouse department' ||

          /\bwarehouse\b/i
            .test(
              value
            ) ||

          /\bstore\b/i
            .test(
              value
            ) ||

          /\binventory\b/i
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