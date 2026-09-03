import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { apiUrl } from '../config/api.config';
import { ApiResponse } from '../auth/auth.service';


export type QueryParams =
  Record<
    string,
    string |
    number |
    boolean |
    null |
    undefined
  >;


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly http =
    inject(HttpClient);


  /* ============================================================
     GET
  ============================================================ */

  get<T>(
    endpoint: string,
    query?: QueryParams
  ): Observable<T> {

    return this.http
      .get<ApiResponse<T> | T>(
        this.url(endpoint),
        {
          params:
            this.params(query),

          withCredentials:
            true
        }
      )
      .pipe(
        map(
          response =>
            this.unwrap(response)
        )
      );
  }


  /* ============================================================
     POST
  ============================================================ */

  post<T>(
    endpoint: string,
    body: unknown
  ): Observable<T> {

    return this.http
      .post<ApiResponse<T> | T>(
        this.url(endpoint),
        body,
        {
          withCredentials:
            true
        }
      )
      .pipe(
        map(
          response =>
            this.unwrap(response)
        )
      );
  }


  /* ============================================================
     PATCH
  ============================================================ */

  patch<T>(
    endpoint: string,
    body: unknown
  ): Observable<T> {

    return this.http
      .patch<ApiResponse<T> | T>(
        this.url(endpoint),
        body,
        {
          withCredentials:
            true
        }
      )
      .pipe(
        map(
          response =>
            this.unwrap(response)
        )
      );
  }


  /* ============================================================
     PUT
  ============================================================ */

  put<T>(
    endpoint: string,
    body: unknown
  ): Observable<T> {

    return this.http
      .put<ApiResponse<T> | T>(
        this.url(endpoint),
        body,
        {
          withCredentials:
            true
        }
      )
      .pipe(
        map(
          response =>
            this.unwrap(response)
        )
      );
  }


  /* ============================================================
     DELETE
  ============================================================ */

  delete<T>(
    endpoint: string
  ): Observable<T> {

    return this.http
      .delete<ApiResponse<T> | T>(
        this.url(endpoint),
        {
          withCredentials:
            true
        }
      )
      .pipe(
        map(
          response =>
            this.unwrap(response)
        )
      );
  }


  /* ============================================================
     BLOB DOWNLOAD

     Used for authenticated file/report downloads.

     Important:
     This uses apiUrl(), so local requests go to :8080
     and production requests go to api.opasbizz.co.in.
  ============================================================ */

  getBlob(
    endpoint: string,
    query?: QueryParams
  ): Observable<Blob> {

    return this.http.get(
      this.url(endpoint),
      {
        params:
          this.params(query),

        responseType:
          'blob',

        withCredentials:
          true
      }
    );
  }


  /* ============================================================
     API URL
  ============================================================ */

  private url(
    endpoint: string
  ): string {

    return apiUrl(
      endpoint
    );
  }


  /* ============================================================
     QUERY PARAMS
  ============================================================ */

  private params(
    query?: QueryParams
  ): HttpParams {

    let params =
      new HttpParams();


    Object.entries(
      query ?? {}
    )
      .forEach(
        (
          [
            key,
            value
          ]
        ) => {

          if (
            value !== null &&
            value !== undefined &&
            value !== ''
          ) {

            params =
              params.set(
                key,
                String(value)
              );
          }
        }
      );


    return params;
  }


  /* ============================================================
     RESPONSE UNWRAP
  ============================================================ */

  private unwrap<T>(
    response:
      ApiResponse<T> |
      T
  ): T {

    if (
      response &&
      typeof response ===
        'object' &&
      'data' in response
    ) {

      return (
        response as
          ApiResponse<T>
      ).data;
    }


    return response as T;
  }
}