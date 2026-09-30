import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveNotificationRouteWithContext,
} from '../src/app/core/services/notification-navigation.service.ts';

test('Warehouse leave notification opens the existing Warehouse leave-history page', () => {
  const target = resolveNotificationRouteWithContext(
    {
      type: 'leave',
      entityType: 'leave_request',
      entityId: '507f1f77bcf86cd799439011',
      actionUrl:
        '/sales/employee?feature=leave-history&recordId=507f1f77bcf86cd799439011',
    },
    'warehouse',
    '/warehouse/dashboard',
  );

  assert.equal(
    target,
    '/warehouse/employee?feature=leave-history&recordId=507f1f77bcf86cd799439011',
  );
});
