import { AfterViewInit, Component, NgZone, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly dismissedNotificationKey = 'opas.dismissed.notifications';
  private observer?: MutationObserver;
  private routeSubscription?: { unsubscribe: () => void };

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.enhanceUiSoon();
      this.observer = new MutationObserver(() => this.enhanceUiSoon());
      this.observer.observe(document.body, { childList: true, subtree: true });
    });

    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.enhanceUiSoon());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.routeSubscription?.unsubscribe();
  }

  private enhanceUiSoon(): void {
    window.setTimeout(() => {
      this.enhanceLists();
      this.enhanceButtons();
      this.enhanceNotificationPanels();
    }, 80);
  }

  private enhanceLists(): void {
    const wrappers = Array.from(document.querySelectorAll<HTMLElement>('.table-wrap, .shipment-table-wrap'));

    for (const wrapper of wrappers) {
      const table = wrapper.querySelector<HTMLTableElement>('table');
      if (!table) continue;
      if (wrapper.dataset['listEnhanced'] === 'true') {
        (wrapper as HTMLElement & { __neoListSync?: () => void }).__neoListSync?.();
        continue;
      }

      const body = table.tBodies.item(0);
      if (!body) continue;

      wrapper.dataset['listEnhanced'] = 'true';
      wrapper.classList.add('neo-list-card');
      this.createListControls(wrapper, table, body);
    }
  }

  private enhanceButtons(): void {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));

    for (const button of buttons) {
      if (button.classList.contains('punch-ring') || button.dataset['intentColored'] === 'true') continue;
      const label = `${button.textContent || ''} ${button.className || ''}`.toLowerCase();
      const intent = this.buttonIntent(label);
      if (!intent) continue;
      button.dataset['intentColored'] = 'true';
      button.classList.add(`neo-btn-${intent}`);
    }
  }

  private buttonIntent(label: string): string {
    if (/delete|remove|trash|reject|block|inactive|deactivate|cancel/.test(label)) return 'danger';
    if (/save|create|add|submit|send|publish|approve|activate|upload|generate|process|pay/.test(label)) return 'success';
    if (/edit|update|change|view|open|refresh|reload|search|filter|download|export/.test(label)) return 'primary';
    if (/back|close|clear|reset|draft|prev|next/.test(label)) return 'neutral';
    return '';
  }

  private enhanceNotificationPanels(): void {
    const panels = Array.from(document.querySelectorAll<HTMLElement>('.notification-tray, .notification-panel, .super-notification-panel, .app-notification-popover'));
    const overlayHost = this.notificationOverlayHost();

    for (const panel of panels) {
      if (panel.parentElement !== overlayHost) overlayHost.append(panel);
      panel.classList.add('neo-notification-vertical');
      this.applyDismissedNotifications(panel);
      if (panel.dataset['clearEnhanced'] === 'true') continue;

      const header = panel.querySelector<HTMLElement>('header');
      if (!header) continue;
      if (header.querySelector('.neo-notification-clear')) {
        panel.dataset['clearEnhanced'] = 'true';
        continue;
      }

      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'neo-notification-clear neo-btn-neutral';
      clearButton.textContent = 'Clear';
      clearButton.addEventListener('click', () => this.clearNotificationPanel(panel));
      header.append(clearButton);
      panel.dataset['clearEnhanced'] = 'true';
    }
  }

  private notificationOverlayHost(): HTMLElement {
    let host = document.querySelector<HTMLElement>('.notification-overlay-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'notification-overlay-host';
      document.body.append(host);
    }
    return host;
  }

  private clearNotificationPanel(panel: HTMLElement): void {
    const dismissed = this.dismissedNotificationFingerprints();
    const lists = panel.querySelectorAll<HTMLElement>('.notification-tray-list, .notification-list, .super-notification-list');

    for (const list of lists) {
      list.querySelectorAll<HTMLElement>('article').forEach((item) => {
        dismissed.add(this.notificationFingerprint(item));
        item.remove();
      });
      this.ensureNotificationEmptyState(list);
    }

    this.saveDismissedNotificationFingerprints(dismissed);
    panel.querySelectorAll<HTMLElement>('[class*="count"], small, em, span').forEach((item) => {
      if (/notification|updates|latest/i.test(item.textContent || '')) item.textContent = '0 updates';
    });
  }

  private applyDismissedNotifications(panel: HTMLElement): void {
    const dismissed = this.dismissedNotificationFingerprints();
    if (!dismissed.size) return;

    const lists = panel.querySelectorAll<HTMLElement>('.notification-tray-list, .notification-list, .super-notification-list');
    for (const list of lists) {
      list.querySelectorAll<HTMLElement>('article').forEach((item) => {
        if (dismissed.has(this.notificationFingerprint(item))) item.remove();
      });
      this.ensureNotificationEmptyState(list);
    }
  }

  private ensureNotificationEmptyState(list: HTMLElement): void {
    if (list.querySelector('article') || list.querySelector('.empty, .empty-state')) return;
    const empty = document.createElement('span');
    empty.className = 'empty-state';
    empty.textContent = 'No notifications yet.';
    list.append(empty);
  }

  private notificationFingerprint(item: HTMLElement): string {
    return String(item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private dismissedNotificationFingerprints(): Set<string> {
    try {
      const rows = JSON.parse(localStorage.getItem(this.dismissedNotificationKey) || '[]');
      return new Set(Array.isArray(rows) ? rows.map((row) => String(row || '')) : []);
    } catch {
      return new Set();
    }
  }

  private saveDismissedNotificationFingerprints(rows: Set<string>): void {
    localStorage.setItem(this.dismissedNotificationKey, JSON.stringify(Array.from(rows).slice(-200)));
  }

  private createListControls(wrapper: HTMLElement, table: HTMLTableElement, body: HTMLTableSectionElement): void {
    let page = 1;
    let pageSize = 10;

    const toolbar = document.createElement('div');
    toolbar.className = 'neo-list-toolbar';

    const searchLabel = document.createElement('label');
    searchLabel.className = 'neo-list-search';
    searchLabel.innerHTML = '<span>Search</span>';

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search this list...';
    searchLabel.append(search);

    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.className = 'neo-list-page-size';
    pageSizeLabel.innerHTML = '<span>Rows</span>';

    const sizeSelect = document.createElement('select');
    for (const size of [10, 25, 50, 100]) {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = String(size);
      sizeSelect.append(option);
    }
    pageSizeLabel.append(sizeSelect);

    const count = document.createElement('span');
    count.className = 'neo-list-count';

    toolbar.append(searchLabel, pageSizeLabel, count);
    wrapper.prepend(toolbar);

    const pager = document.createElement('div');
    pager.className = 'neo-list-pagination';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.textContent = 'Prev';

    const status = document.createElement('span');

    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Next';

    pager.append(previous, status, next);
    wrapper.append(pager);

    const sync = () => {
      const query = search.value.trim().toLowerCase();
      const allRows = Array.from(body.rows);
      const dataRows = allRows.filter((row) => !row.querySelector('.empty, .empty-state'));
      const matchedRows = dataRows.filter((row) => !query || row.textContent?.toLowerCase().includes(query));
      const totalPages = Math.max(1, Math.ceil(matchedRows.length / pageSize));
      page = Math.min(Math.max(page, 1), totalPages);
      const start = (page - 1) * pageSize;
      const visibleRows = new Set(matchedRows.slice(start, start + pageSize));

      for (const row of allRows) {
        const isEmptyRow = Boolean(row.querySelector('.empty, .empty-state'));
        row.style.display = isEmptyRow ? (matchedRows.length ? 'none' : '') : visibleRows.has(row) ? '' : 'none';
      }

      count.textContent = `${matchedRows.length} records`;
      status.textContent = `Page ${page} / ${totalPages}`;
      previous.disabled = page <= 1;
      next.disabled = page >= totalPages;
      table.style.minWidth = table.style.minWidth || '980px';
    };

    search.addEventListener('input', () => { page = 1; sync(); });
    sizeSelect.addEventListener('change', () => { pageSize = Number(sizeSelect.value || 10); page = 1; sync(); });
    previous.addEventListener('click', () => { page -= 1; sync(); });
    next.addEventListener('click', () => { page += 1; sync(); });

    (wrapper as HTMLElement & { __neoListSync?: () => void }).__neoListSync = sync;
    sync();
  }
}




