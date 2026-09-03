import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

import {
  AccountNature,
  AccountStatus,
  ChartOfAccount,
  ChartOfAccountsSummary,
  CreateChartOfAccountPayload,
  UpdateChartOfAccountPayload
} from '../models/accounts.models';

@Injectable({
  providedIn: 'root'
})
export class ChartOfAccountsService {
  private readonly api = inject(ApiService);
  private readonly basePath = '/accounting/chart-of-accounts';

  getSummary(): Observable<ChartOfAccountsSummary> {
    return this.api.get<ChartOfAccountsSummary>(
      `${this.basePath}/summary`
    );
  }

  getAccounts(
    query: {
      search?: string;
      nature?: AccountNature;
      status?: AccountStatus;
      parentAccountId?: string | null;
    } = {}
  ): Observable<ChartOfAccount[]> {
    return this.api.get<ChartOfAccount[]>(this.basePath, {
      search: query.search?.trim() || undefined,
      nature: query.nature,
      status: query.status,
      parentAccountId: query.parentAccountId || undefined
    });
  }

  getAccount(accountId: string): Observable<ChartOfAccount> {
    return this.api.get<ChartOfAccount>(
      `${this.basePath}/${this.encodeId(accountId)}`
    );
  }

  createAccount(
    payload: CreateChartOfAccountPayload
  ): Observable<ChartOfAccount> {
    return this.api.post<ChartOfAccount>(
      this.basePath,
      this.normalizeCreatePayload(payload)
    );
  }

  updateAccount(
    accountId: string,
    payload: UpdateChartOfAccountPayload
  ): Observable<ChartOfAccount> {
    return this.api.patch<ChartOfAccount>(
      `${this.basePath}/${this.encodeId(accountId)}`,
      this.normalizeUpdatePayload(payload)
    );
  }

  activateAccount(accountId: string): Observable<ChartOfAccount> {
    return this.updateAccount(accountId, { status: 'active' });
  }

  deactivateAccount(accountId: string): Observable<ChartOfAccount> {
    return this.updateAccount(accountId, { status: 'inactive' });
  }

  getActiveAccounts(): Observable<ChartOfAccount[]> {
    return this.getAccounts({ status: 'active' });
  }

  getAccountsByNature(nature: AccountNature): Observable<ChartOfAccount[]> {
    return this.getAccounts({ nature, status: 'active' });
  }

  getAssetAccounts(): Observable<ChartOfAccount[]> {
    return this.getAccountsByNature('asset');
  }

  getLiabilityAccounts(): Observable<ChartOfAccount[]> {
    return this.getAccountsByNature('liability');
  }

  getEquityAccounts(): Observable<ChartOfAccount[]> {
    return this.getAccountsByNature('equity');
  }

  getIncomeAccounts(): Observable<ChartOfAccount[]> {
    return this.getAccountsByNature('income');
  }

  getExpenseAccounts(): Observable<ChartOfAccount[]> {
    return this.getAccountsByNature('expense');
  }

  private normalizeCreatePayload(
    payload: CreateChartOfAccountPayload
  ): CreateChartOfAccountPayload {
    return {
      accountCode: payload.accountCode.trim().toUpperCase(),
      accountName: payload.accountName.trim(),
      description: payload.description?.trim() || undefined,
      nature: payload.nature,
      accountType: payload.accountType,
      parentAccountId: payload.parentAccountId || null,
      openingBalance: Number(payload.openingBalance || 0),
      openingBalanceType: payload.openingBalanceType,
      status: payload.status || 'active'
    };
  }

  private normalizeUpdatePayload(
    payload: UpdateChartOfAccountPayload
  ): UpdateChartOfAccountPayload {
    const normalized: UpdateChartOfAccountPayload = {};

    if (payload.accountName !== undefined) {
      normalized.accountName = payload.accountName.trim();
    }

    if (payload.description !== undefined) {
      normalized.description = payload.description.trim();
    }

    if (payload.accountType !== undefined) {
      normalized.accountType = payload.accountType;
    }

    if (payload.parentAccountId !== undefined) {
      normalized.parentAccountId = payload.parentAccountId || null;
    }

    if (payload.status !== undefined) {
      normalized.status = payload.status;
    }

    return normalized;
  }

  private encodeId(value: string): string {
    return encodeURIComponent(value.trim());
  }
}
