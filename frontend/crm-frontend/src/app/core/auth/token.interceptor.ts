import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { API_BASE_URL, apiUrl } from '../config/api.config';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accessToken = authService.getAccessToken();
  const credentialRequest = request.url.startsWith(API_BASE_URL) ? request.clone({ withCredentials: true }) : request;
  const authRequest = accessToken ? addToken(credentialRequest, accessToken) : credentialRequest;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint(request.url)
      ) {
        return handleUnauthorizedError(authRequest, next, authService, router);
      }

      return throwError(() => error);
    })
  );
};

function addToken(request: Parameters<HttpInterceptorFn>[0], token: string): Parameters<HttpInterceptorFn>[0] {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handleUnauthorizedError(
  request: Parameters<HttpInterceptorFn>[0],
  next: Parameters<HttpInterceptorFn>[1],
  authService: AuthService,
  router: Router
) {
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => Boolean(token)),
      take(1),
      switchMap((token) => next(addToken(request, token)))
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authService.refreshToken().pipe(
    switchMap((response) => {
      isRefreshing = false;
      const token = response.accessToken || authService.getAccessToken();
      refreshTokenSubject.next(token);
      return next(token ? addToken(request, token) : request);
    }),
    catchError((refreshError: unknown) => {
      isRefreshing = false;
      refreshTokenSubject.next(null);
      authService.logout(false);
      void router.navigate(['/login']);
      return throwError(() => refreshError);
    })
  );
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(apiUrl('/auth/login')) ||
    url.includes(apiUrl('/auth/register-company')) ||
    url.includes(apiUrl('/auth/refresh-token')) ||
    url.includes(apiUrl('/auth/forgot-password')) ||
    url.includes(apiUrl('/auth/reset-password')) ||
    url.includes(apiUrl('/auth/verify-email'))
  );
}
