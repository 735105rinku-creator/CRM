import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
} from 'rxjs';

import {
  ApiService,
} from '../../../core/services/api.service';

import {
  CreateJournalEntryPayload,
  JournalEntry,
  JournalEntryQuery,
  UpdateJournalEntryPayload,
  VoidJournalEntryPayload,
} from '../models/accounts.models';


@Injectable({
  providedIn: 'root',
})
export class JournalEntryService {

  private readonly api =
    inject(ApiService);


  readonly basePath =
    '/accounting/journal-entries';


  /* =========================================================
     GET ALL JOURNAL ENTRIES
  ========================================================= */

  getAll(
    query: JournalEntryQuery = {}
  ): Observable<JournalEntry[]> {

    return this.api.get<JournalEntry[]>(
      this.basePath,
      {
        ...query,
      }
    );

  }


  /* =========================================================
     GET JOURNAL ENTRY BY ID
  ========================================================= */

  getById(
    id: string
  ): Observable<JournalEntry> {

    return this.api.get<JournalEntry>(
      `${this.basePath}/${id}`
    );

  }


  /* =========================================================
     CREATE DRAFT JOURNAL
  ========================================================= */

  create(
    payload: CreateJournalEntryPayload
  ): Observable<JournalEntry> {

    return this.api.post<JournalEntry>(
      this.basePath,
      payload
    );

  }


  /* =========================================================
     UPDATE DRAFT JOURNAL
  ========================================================= */

  update(
    id: string,
    payload: UpdateJournalEntryPayload
  ): Observable<JournalEntry> {

    return this.api.patch<JournalEntry>(
      `${this.basePath}/${id}`,
      payload
    );

  }


  /* =========================================================
     POST JOURNAL

     Workflow:
       draft -> posted
  ========================================================= */

  post(
    id: string
  ): Observable<JournalEntry> {

    return this.api.post<JournalEntry>(
      `${this.basePath}/${id}/post`,
      {}
    );

  }


  /* =========================================================
     VOID JOURNAL

     Workflow:
       posted -> void
  ========================================================= */

  void(
    id: string,
    payload: VoidJournalEntryPayload
  ): Observable<JournalEntry> {

    return this.api.post<JournalEntry>(
      `${this.basePath}/${id}/void`,
      payload
    );

  }

}