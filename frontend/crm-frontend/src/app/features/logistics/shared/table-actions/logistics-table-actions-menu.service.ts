import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LogisticsTableActionsMenuService {
  readonly openRowId = signal<string | null>(null);

  open(rowId: string): void { this.openRowId.set(rowId); }
  close(): void { this.openRowId.set(null); }
  toggle(rowId: string): void { this.openRowId.update((current) => current === rowId ? null : rowId); }
  isOpen(rowId: string): boolean { return this.openRowId() === rowId; }
}
