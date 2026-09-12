import {
  Injectable,
  inject
} from '@angular/core';

import {
  Observable,
  map
} from 'rxjs';

import {
  ApiService
} from '../../../core/services/api.service';


export interface AccountExpenseAttachment {
  _id?: string;

  originalName: string;

  storedName?: string;

  fileUrl: string;

  storageKey?: string;

  mimeType: string;

  fileSize: number;

  uploadedBy?: string | null;

  uploadedAt?: string | null;
}


export interface AccountExpenseRecord {
  _id: string;

  title: string;

  category: string;

  expenseType: string;

  businessCategory: string;

  routeType: string;

  amount: number;

  expenseDate: string | null;

  status: string;

  notes: string;

  attachments: AccountExpenseAttachment[];

  assignedUserId?: string | null;

  assignedEmployeeCode: string;

  createdAt?: string;

  updatedAt?: string;
}


interface AccountExpenseResponse {
  expenses?: AccountExpenseRecord[];

  data?: AccountExpenseRecord[];
}


@Injectable({
  providedIn: 'root'
})
export class AccountExpenseService {

  private readonly api =
    inject(ApiService);

  private readonly basePath =
    '/accounting/expenses';


  getExpenses():
    Observable<AccountExpenseRecord[]> {

    return this.api
      .get<AccountExpenseResponse>(
        this.basePath
      )
      .pipe(
        map(
          (response) => {

            if (
              Array.isArray(response)
            ) {
              return response;
            }

            if (
              Array.isArray(
                response?.expenses
              )
            ) {
              return response.expenses;
            }

            if (
              Array.isArray(
                response?.data
              )
            ) {
              return response.data;
            }

            return [];
          }
        )
      );
  }


  uploadAttachments(
    expenseId: string,
    files: File[]
  ): Observable<AccountExpenseRecord> {

    const formData =
      new FormData();

    for (
      const file of files
    ) {
      formData.append(
        'proofFiles',
        file,
        file.name
      );
    }

    return this.api.post<AccountExpenseRecord>(
      `${this.basePath}/${this.encodeId(expenseId)}/attachments`,
      formData
    );
  }


  removeAttachment(
    expenseId: string,
    attachmentId: string
  ): Observable<AccountExpenseRecord> {

    return this.api.delete<AccountExpenseRecord>(
      `${this.basePath}/${this.encodeId(expenseId)}/attachments/${this.encodeId(attachmentId)}`
    );
  }


  private encodeId(
    value: string
  ): string {

    return encodeURIComponent(
      value.trim()
    );
  }

}
