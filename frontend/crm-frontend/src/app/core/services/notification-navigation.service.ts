import type { Router } from '@angular/router';

export interface NavigableNotification {
  actionUrl?: string;
  type?: string;
  entityType?: string;
  entityId?: string | { _id?: string; id?: string } | null;
}

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  lead: (id) => `/sales/employee?feature=my-leads&recordId=${id}`,
  crmlead: (id) => `/sales/employee?feature=my-leads&recordId=${id}`,
  deal: (id) => `/sales/employee?feature=my-deals&recordId=${id}`,
  opportunity: (id) => `/sales/employee?feature=my-deals&recordId=${id}`,
  crmdeal: (id) => `/sales/employee?feature=my-deals&recordId=${id}`,
  task: (id) => `/sales/employee?feature=my-tasks&recordId=${id}`,
  activity: (id) => `/sales/employee?feature=my-tasks&recordId=${id}`,
  reminder: (id) => `/sales/employee?feature=my-tasks&recordId=${id}`,
  crmtask: (id) => `/sales/employee?feature=my-tasks&recordId=${id}`,
  message: (id) => `/sales/employee?feature=messages&recordId=${id}`,
  meeting: (id) => `/hr-dashboard?feature=meetings&recordId=${id}`,
  attendance: (id) => `/hr-dashboard?feature=attendance&recordId=${id}`,
  payroll: (id) => `/hr-dashboard?feature=payroll&recordId=${id}`,
  event: (id) => `/hr-dashboard?feature=events&recordId=${id}`,
  holiday: (id) => `/hr-dashboard?feature=holidays&recordId=${id}`,
  leave: (id) => `/hr-dashboard?feature=leave&recordId=${id}`,
  contact: (id) => `/dashboard?section=contacts&recordId=${id}`,
  crmcontact: (id) => `/dashboard?section=contacts&recordId=${id}`,
  account: (id) => `/dashboard?section=accounts&recordId=${id}`,
  crmaccount: (id) => `/dashboard?section=accounts&recordId=${id}`,
  ticket: (id) => `/dashboard?section=support-tickets&recordId=${id}`,
  supportticket: (id) => `/dashboard?section=support-tickets&recordId=${id}`,
  purchaserequest: (id) => `/purchase/purchase-requests/${id}`,
  purchaseorder: (id) => `/purchase/purchase-orders/${id}`,
  purchasequotation: (id) => `/purchase/quotations/${id}`,
  goodsreceipt: (id) => `/purchase/goods-receipts/${id}`,
  leaverequest: (id) => `/hr-dashboard?feature=leave&recordId=${id}`,
  hrmeeting: (id) => `/hr-dashboard?feature=meetings&recordId=${id}`,
  departmentinvoice: (id) => `/accounts/department-invoices?recordId=${id}`,
  platformannouncement: (id) => `/dashboard?section=notifications&recordId=${id}`,
};

/* ============================================================
   ROLE-BASED DASHBOARD ROUTING
   Har role ka apna dashboard hai — uske hisaab se route banao.
   ============================================================ */

const ROLE_DASHBOARD_MAP: Record<string, { prefix: string; style: 'feature' | 'section' }> = {
  hr:              { prefix: '/hr-dashboard',       style: 'feature' },
  companyadmin:    { prefix: '/dashboard',           style: 'section' },
  superadmin:      { prefix: '/dashboard',           style: 'section' },
  accounts:        { prefix: '/accounts/dashboard',  style: 'feature' },
  purchase:        { prefix: '/purchase/dashboard',  style: 'feature' },
  logistics:       { prefix: '/logistics/dashboard', style: 'feature' },
  warehouse:       { prefix: '/warehouse/employee',  style: 'feature' },
  sales:           { prefix: '/sales/employee',      style: 'feature' },
  employee:        { prefix: '/sales/employee',      style: 'feature' },
};

/* Feature name mapping per role style */
const FEATURE_NAME_BY_STYLE: Record<string, string> = {
  // HR/admin use short feature names
  'feature': '',
  'section': '',
};

/* Special leave naming — kuch dashboards me 'leave-history' use hota hai */
const LEAVE_FEATURE_BY_ROLE: Record<string, string> = {
  hr:           'leave',
  companyadmin: 'leave',
  superadmin:   'leave',
  accounts:     'leave',
  purchase:     'leave',
  logistics:    'leave',
  warehouse:    'leave-history',
  sales:        'leave-history',
  employee:     'leave-history',
};

export function resolveRoleBasedRoute(
  normalizedRole: string | undefined,
  feature: string,
  entityId: string
): string {
  const roleKey = normalizedRole || 'employee';
  const dashboard = ROLE_DASHBOARD_MAP[roleKey] || ROLE_DASHBOARD_MAP['employee'];

  // Special: leave feature name alag hai role ke hisaab se
  let featureName = feature;
  if (feature === 'leave') {
    featureName = LEAVE_FEATURE_BY_ROLE[roleKey] || 'leave-history';
  }

  if (dashboard.style === 'section') {
    return `${dashboard.prefix}?section=${featureName}&recordId=${entityId}`;
  }

  return `${dashboard.prefix}?feature=${featureName}&recordId=${entityId}`;
}

/* ============================================================
   CURRENT-URL-BASED DASHBOARD DETECTION
   Ye function user ke current URL se pata karta hai
   wo kis dashboard pe hai, aur usi dashboard ka
   base URL return karta hai.
   ============================================================ */
export function detectDashboardFromUrl(currentUrl: string): string | null {
  const url = currentUrl.toLowerCase();
  
  if (url.startsWith('/purchase'))   return '/purchase/dashboard';
  if (url.startsWith('/accounts'))   return '/accounts/dashboard';
  if (url.startsWith('/logistics'))  return '/logistics/dashboard';
  if (url.startsWith('/warehouse'))  return '/warehouse/dashboard';
  if (url.startsWith('/hr-dashboard')) return '/hr-dashboard';
  if (url.startsWith('/company'))    return '/dashboard';
  if (url.startsWith('/dashboard'))  return '/dashboard';
  if (url.startsWith('/sales'))      return '/sales/employee';
  if (url.startsWith('/employee'))   return '/sales/employee';
  
  return null;
}

/* ============================================================
   ENHANCED resolveRoleBasedRoute — currentUrl bhi use karta hai
   
   IMPORTANT: Accounts, Purchase, Logistics dashboards me
   leave/messages/meetings ke views NAHI hain. Un users ko
   /sales/employee (generic employee workspace) pe bhejna
   zaroori hai jaha saare features handle hote hain.
   ============================================================ */
export function resolveNotificationRouteWithContext(
  notification: NavigableNotification,
  role: string | null | undefined,
  currentUrl: string
): string | null {
  const entityId = typeof notification.entityId === 'string'
    ? notification.entityId
    : notification.entityId?._id || notification.entityId?.id;
  
  if (!entityId) return resolveNotificationRoute(notification, role);

  const entityType = notification.entityType?.toLowerCase().replace(/[^a-z\d]/g, '');
  const normalizedType = notification.type?.toLowerCase().replace(/[^a-z\d]/g, '');
  
  // Entity type nikaalo
  const entityKeyFor = (value?: string): string | undefined => {
    if (!value) return undefined;
    if (ENTITY_ROUTES[value]) return value;
    return Object.keys(ENTITY_ROUTES)
      .sort((a, b) => b.length - a.length)
      .find((c) => value.includes(c));
  };
  
  const entityKey = entityKeyFor(entityType) || entityKeyFor(normalizedType);
  const id = encodeURIComponent(entityId);
  
  // Current URL se dashboard detect karo
  const dashboardBase = detectDashboardFromUrl(currentUrl);
  
  // LEAVE notification — har role ke liye specific route
  if (entityKey === 'leave' || entityKey === 'leaverequest') {
    // HR dashboard
    if (dashboardBase === '/hr-dashboard') {
      return `/hr-dashboard?feature=leave&recordId=${id}`;
    }
    // Admin dashboard
    if (dashboardBase === '/dashboard') {
      return `/dashboard?section=leave&recordId=${id}`;
    }
    // Logistics — apne employee route pe bhejo
    if (dashboardBase === '/logistics/dashboard') {
      return `/logistics/employee?feature=leave-history&recordId=${id}`;
    }
    if (dashboardBase === '/warehouse/dashboard') {
      return `/warehouse/employee?feature=leave-history&recordId=${id}`;
    }
    // Purchase — apne employee route pe bhejo
    if (dashboardBase === '/purchase/dashboard') {
      return `/purchase/employee?feature=leave-history&recordId=${id}`;
    }
    // Accounts — apne employee route pe bhejo
    if (dashboardBase === '/accounts/dashboard') {
      return `/accounts/employee?feature=leave-history&recordId=${id}`;
    }
    // Sales / Employee dashboard
    if (dashboardBase === '/sales/employee') {
      return `/sales/employee?feature=leave-history&recordId=${id}`;
    }
    // Fallback
    return `/sales/employee?feature=leave-history&recordId=${id}`;
  }
  
  // MESSAGE notification
  if (entityKey === 'message') {
    if (dashboardBase === '/hr-dashboard') {
      return `/hr-dashboard?feature=messages&recordId=${id}`;
    }
    if (dashboardBase === '/dashboard') {
      return `/dashboard?section=messages&recordId=${id}`;
    }
    if (dashboardBase === '/logistics/dashboard') {
      return `/logistics/employee?feature=messages&recordId=${id}`;
    }
    if (dashboardBase === '/purchase/dashboard') {
      return `/purchase/employee?feature=messages&recordId=${id}`;
    }
    if (dashboardBase === '/accounts/dashboard') {
      return `/accounts/employee?feature=messages&recordId=${id}`;
    }
    return `/sales/employee?feature=messages&recordId=${id}`;
  }

  // MEETING notification
  if (entityKey === 'meeting' || entityKey === 'hrmeeting') {
    if (dashboardBase === '/hr-dashboard') {
      return `/hr-dashboard?feature=meetings&recordId=${id}`;
    }
    if (dashboardBase === '/dashboard') {
      return `/dashboard?section=meetings&recordId=${id}`;
    }
    if (dashboardBase === '/logistics/dashboard') {
      return `/logistics/employee?feature=meetings&recordId=${id}`;
    }
    if (dashboardBase === '/purchase/dashboard') {
      return `/purchase/employee?feature=meetings&recordId=${id}`;
    }
    if (dashboardBase === '/accounts/dashboard') {
      return `/accounts/employee?feature=meetings&recordId=${id}`;
    }
    return `/sales/employee?feature=meetings&recordId=${id}`;
  }

  // Fallback to original logic
  return resolveNotificationRoute(notification, role);
}
export function resolveNotificationRoute(
  notification: NavigableNotification,
  role?: string | null
): string | null {
  const actionUrl = notification.actionUrl?.trim();
  const rawId = typeof notification.entityId === 'string'
    ? notification.entityId
    : notification.entityId?._id || notification.entityId?.id;
  const entityId = rawId?.trim();
  const hasValidEntityId = Boolean(entityId && /^[a-f\d]{24}$/i.test(entityId));

  if (actionUrl && /^https?:\/\//i.test(actionUrl)) {
    try {
      const url = new URL(actionUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {
      return null;
    }
  }

  const staleMessageUrl = actionUrl && /^\/messages\/[^/?#]+(?:[?#].*)?$/i.test(actionUrl);

  // Backend sometimes generates role-specific dashboard URLs (/hr-dashboard, /dashboard, etc.)
  // even when the actual recipient has a different role. Do not trust those blindly.
  const roleSpecificPrefixes = ['/hr-dashboard', '/dashboard', '/sales/employee', '/company/dashboard'];
  const actionUrlIsRoleSpecific = Boolean(
    actionUrl && roleSpecificPrefixes.some((prefix) => actionUrl.startsWith(prefix))
  );

  const hasSpecificActionRecord = Boolean(
    actionUrl &&
    hasValidEntityId &&
    !staleMessageUrl &&
    !actionUrlIsRoleSpecific &&
    (
      new URLSearchParams(actionUrl.split('?')[1]?.split('#')[0] || '').get('recordId') === entityId ||
      new RegExp(`(?:^|/)${entityId!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`, 'i').test(actionUrl)
    )
  );
  if (hasSpecificActionRecord) return actionUrl!;

  const entityType = notification.entityType
    ?.toLowerCase()
    .replace(/[^a-z\d]/g, '');
  const normalizedType = notification.type
    ?.toLowerCase()
    .replace(/[^a-z\d]/g, '');
  const entityKeyFor = (value?: string): string | undefined => {
    if (!value) return undefined;
    if (ENTITY_ROUTES[value]) return value;
    return Object.keys(ENTITY_ROUTES)
      .sort((left, right) => right.length - left.length)
      .find((candidate) => value.includes(candidate));
  };
  const entityKey = entityKeyFor(entityType) || entityKeyFor(normalizedType);
  const normalizedRole = role?.toLowerCase().replace(/[^a-z\d]/g, '');
  if (hasValidEntityId && entityKey) {
    const id = encodeURIComponent(entityId!);
    if (entityKey === 'message') {
      return resolveRoleBasedRoute(normalizedRole, 'messages', id);
      // handled above
      // handled above
    }
    if (entityKey === 'meeting' || entityKey === 'hrmeeting') {
      return resolveRoleBasedRoute(normalizedRole, 'meetings', id);
      // handled above
      // handled above
    }
    if (entityKey === 'leave' || entityKey === 'leaverequest') {
      return resolveRoleBasedRoute(normalizedRole, 'leave', id);
      // handled above
      // handled above
    }
    if (entityKey === 'ticket' || entityKey === 'supportticket') {
      if (normalizedRole === 'hr') return `/hr-dashboard?feature=support-tickets&recordId=${id}`;
      if (normalizedRole === 'employee') return `/sales/employee?feature=support-tickets&recordId=${id}`;
      if (normalizedRole === 'superadmin') return `/super-admin?section=support-tickets&recordId=${id}`;
      return `/dashboard?section=support-tickets&recordId=${id}`;
    }
    if (entityKey === 'platformannouncement') {
      if (normalizedRole === 'hr') return `/hr-dashboard?feature=dashboard&recordId=${id}`;
      if (normalizedRole === 'employee') return `/sales/employee?feature=notifications&recordId=${id}`;
      return `/dashboard?section=notifications&recordId=${id}`;
    }
    if (entityKey === 'contact' || entityKey === 'crmcontact') {
      if (['companyadmin', 'superadmin'].includes(normalizedRole || '')) return `/dashboard?section=contacts&recordId=${id}`;
    }
    if (entityKey === 'account' || entityKey === 'crmaccount') {
      if (['companyadmin', 'superadmin'].includes(normalizedRole || '')) return `/dashboard?section=accounts&recordId=${id}`;
    }
  }
  const adminSectionByEntity: Record<string, string> = {
    lead: 'leads', crmlead: 'leads',
    deal: 'deals', opportunity: 'deals', crmdeal: 'deals',
    task: 'tasks', activity: 'tasks', reminder: 'tasks', crmtask: 'tasks'
  };
  const adminSection = entityKey ? adminSectionByEntity[entityKey] : undefined;
  if (
    hasValidEntityId &&
    adminSection &&
    ['companyadmin', 'superadmin'].includes(normalizedRole || '')
  ) {
    return `/dashboard?section=${adminSection}&recordId=${encodeURIComponent(entityId!)}`;
  }

  const routeForEntity = entityKey ? ENTITY_ROUTES[entityKey] : undefined;
  if (hasValidEntityId && routeForEntity) {
    return routeForEntity(encodeURIComponent(entityId!));
  }

  if (actionUrl?.startsWith('/') && !actionUrl.startsWith('//') && !staleMessageUrl) {
    return actionUrl;
  }
  return null;
}

export function navigateToNotification(
  router: Router,
  notification: NavigableNotification,
  role?: string | null
): void {
  // Current URL se dashboard context nikalo
  const currentUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Pehle context-based routing try karo
  let target = resolveNotificationRouteWithContext(notification, role, currentUrl);
  
  // Fallback to original
  if (!target) {
    target = resolveNotificationRoute(notification, role);
  }

  if (!target) {
    console.warn('[NotificationNav] No route resolved for notification:', notification);
    return;
  }

  console.debug('[NotificationNav] Navigating to:', target, 'for', notification, '| currentUrl:', currentUrl);

  if (/^https?:\/\//i.test(target)) {
    if (typeof window !== 'undefined') window.location.assign(target);
    return;
  }

  void router.navigateByUrl(target);
}





