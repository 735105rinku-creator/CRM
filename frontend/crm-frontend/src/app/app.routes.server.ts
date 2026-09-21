import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes with :id or :code — server-side render
  {
    path: 'meeting-room/:code',
    renderMode: RenderMode.Server
  },
  {
    path: 'logistics/cha/master/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'logistics/warehouse/master/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'purchase/purchase-requests/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'purchase/vendor-enquiries/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'purchase/quotations/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'purchase/purchase-orders/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'purchase/goods-receipts/:id',
    renderMode: RenderMode.Server
  },

  // Everything else — prerender (static HTML)
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
