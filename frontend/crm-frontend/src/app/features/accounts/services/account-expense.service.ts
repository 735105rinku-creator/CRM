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


  getExpenses():
    Observable<AccountExpenseRecord[]> {

    return this.api
      .get<AccountExpenseResponse>(
        '/accounting/expenses'
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
}