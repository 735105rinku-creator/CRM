import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { Component, inject, input, output } from '@angular/core';

import { LogisticsTableActionsMenuService } from './logistics-table-actions-menu.service';

export interface LogisticsSecondaryAction {
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-logistics-table-actions',
  standalone: true,
  imports: [CdkOverlayOrigin, CdkConnectedOverlay],
  templateUrl: './logistics-table-actions.component.html',
  styleUrl: './logistics-table-actions.component.scss'
})
export class LogisticsTableActionsComponent {
  private readonly overlay = inject(Overlay);
  protected readonly menu = inject(LogisticsTableActionsMenuService);

  readonly rowId = input.required<string>();
  readonly rowLabel = input('record');
  readonly showView = input(true);
  readonly showEdit = input(true);
  readonly viewDisabled = input(false);
  readonly editDisabled = input(false);
  readonly secondaryActions = input<readonly LogisticsSecondaryAction[]>([]);

  readonly view = output<string>();
  readonly edit = output<string>();
  readonly secondaryAction = output<{ rowId: string; actionKey: string }>();

  protected readonly scrollStrategy = this.overlay.scrollStrategies.reposition();
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }
  ];

  protected selectPrimary(action: 'view' | 'edit'): void {
    this.menu.close();
    (action === 'view' ? this.view : this.edit).emit(this.rowId());
  }

  protected selectSecondary(action: LogisticsSecondaryAction): void {
    if (action.disabled) return;
    this.menu.close();
    this.secondaryAction.emit({ rowId: this.rowId(), actionKey: action.key });
  }
}
