import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
  
  export interface LogisticsImportResult {
    module: string;
  
    totalRows: number;
  
    imported: number;
  
    skipped: number;
  
    failed: number;
  
    errors: Array<{
      row: number;
      message: string;
    }>;
  }
  
  
  @Injectable({
    providedIn: 'root'
  })
  export class LogisticsImportExportService {
  
    private readonly http =
      inject(HttpClient);
  
  
    /*
     * IMPORTANT:
     *
     * Put here the SAME backend base URL
     * that your existing CRM frontend is using.
     *
     * Example:
     *
     * https://api.opasbizz.co.in
     *
     * OR
     *
     * https://yourdomain.com/api
     *
     * Do NOT add /logistics here.
     */
    private readonly apiUrl =
      'https://YOUR-BACKEND-DOMAIN';
  
  
    /* ============================================================
       IMPORT FILE
    ============================================================ */
  
    importFile(
      moduleName: string,
      file: File
    ): Observable<any> {
  
      const formData =
        new FormData();
  
  
      formData.append(
        'file',
        file
      );
  
  
      return this.http.post(
        `${this.apiUrl}/logistics/import-export/import/${encodeURIComponent(moduleName)}`,
        formData,
        {
          withCredentials: true
        }
      );
    }
  
  
    /* ============================================================
       DOWNLOAD IMPORT TEMPLATE
    ============================================================ */
  
    downloadTemplate(
      moduleName: string,
      format:
        'xlsx' |
        'csv' =
        'xlsx'
    ): void {
  
      const url =
        `${this.apiUrl}/logistics/import-export/template/${encodeURIComponent(moduleName)}?format=${format}`;
  
  
      const fileName =
        `${moduleName}-import-template.${format}`;
  
  
      this.download(
        url,
        fileName
      );
    }
  
  
    /* ============================================================
       EXPORT MODULE DATA
    ============================================================ */
  
    exportModule(
      moduleName: string,
      format:
        'xlsx' |
        'csv' =
        'xlsx'
    ): void {
  
      const url =
        `${this.apiUrl}/logistics/import-export/export/${encodeURIComponent(moduleName)}?format=${format}`;
  
  
      const fileName =
        `${moduleName}-export.${format}`;
  
  
      this.download(
        url,
        fileName
      );
    }
  
  
    /* ============================================================
       GENERIC FILE DOWNLOAD
    ============================================================ */
  
    private download(
      url: string,
      fileName: string
    ): void {
  
      this.http
        .get(
          url,
          {
            responseType: 'blob',
  
            withCredentials: true
          }
        )
        .subscribe({
  
          next: (
            blob: Blob
          ) => {
  
            const objectUrl =
              URL.createObjectURL(
                blob
              );
  
  
            const link =
              document.createElement(
                'a'
              );
  
  
            link.href =
              objectUrl;
  
  
            link.download =
              fileName;
  
  
            document.body
              .appendChild(
                link
              );
  
  
            link.click();
  
  
            link.remove();
  
  
            URL.revokeObjectURL(
              objectUrl
            );
          },
  
  
          error: (
            error
          ) => {
  
            console.error(
              'Logistics Import/Export download failed:',
              error
            );
  
  
            window.alert(
              error?.error?.message ||
              'Unable to download file.'
            );
          }
  
        });
    }
  
  }