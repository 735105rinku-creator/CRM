import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Authenticated application routes render in the browser so their API
  // requests can use the browser's HttpOnly cookies.
  {
    path: 'meeting-room/:code',
    renderMode: RenderMode.Client
  },
  {
    path: 'logistics/cha/master/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'logistics/warehouse/master/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'purchase/purchase-requests/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'purchase/vendor-enquiries/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'purchase/quotations/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'purchase/purchase-orders/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'purchase/goods-receipts/:id',
    renderMode: RenderMode.Client
  },

  // The application contains protected routes with browser-only sessions.
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
