import { Routes } from '@angular/router';

import { EmployeeDashboardComponent } from '../employee/employee-dashboard.component';
import { NotFound } from '../not-found/not-found';

import { WarehouseMasterComponent } from './warehouse-master/warehouse-master.component';

import { warehouseGuard } from '../../core/auth/warehouse.guard';
import { authGuard } from '../../core/auth/auth.guard';

import { WarehouseLayoutComponent } from './warehouse-layout/warehouse-layout.component';
import { WarehouseDashboardComponent } from './dashboard/warehouse-dashboard.component';
import { WarehouseInventoryComponent } from './inventory/inventory.component';
import { WarehouseIncomingGoodsComponent } from './incoming-goods/incoming-goods.component';
import { WarehouseOutgoingGoodsComponent } from './outgoing-goods/outgoing-goods.component';
import { WarehouseStockTransferComponent } from './stock-transfer/stock-transfer.component';
import { WarehouseDamagedGoodsComponent } from './damaged-goods/damaged-goods.component';
import { WarehouseMyTasksComponent } from './my-tasks/my-tasks.component';
import { WarehouseActivityComponent } from './activity/activity.component';

export const WAREHOUSE_ROUTES: Routes = [

  {
    path: '',

    component: WarehouseLayoutComponent,

    canActivate: [
      authGuard,
      warehouseGuard
    ],

    children: [

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },


     {
        path: 'dashboard',

        component: WarehouseDashboardComponent,

        data: {
          title: 'Warehouse Dashboard',
          section: 'Warehouse'
        }
      },

            {
        path: 'employee',

        component: EmployeeDashboardComponent,

        data: {
          title: 'Warehouse Employee Workspace',
          section: 'Warehouse'
        }
      },
      {
        path: 'warehouse-master',

        component: WarehouseMasterComponent,

        data: {
          title: 'Warehouse Master',
          section: 'Warehouse',
          baseRoute: '/warehouse/warehouse-master'
        }
      },


      {
        path: 'warehouse-master/new',

        component: WarehouseMasterComponent,

        data: {
          title: 'Add Warehouse',
          section: 'Warehouse',
          baseRoute: '/warehouse/warehouse-master'
        }
      },


      {
        path: 'warehouse-master/:id',

        component: WarehouseMasterComponent,

        data: {
          title: 'Warehouse Details',
          section: 'Warehouse',
          baseRoute: '/warehouse/warehouse-master'
        }
      },

            {
        path: 'inventory',

        component: WarehouseInventoryComponent,

        data: {
          title: 'Inventory',
          section: 'Warehouse'
        }
      },


      {
        path: 'inventory/new',

        component: WarehouseInventoryComponent,

        data: {
          title: 'Add Item',
          section: 'Warehouse'
        }
      },


      {
        path: 'inventory/:id',

        component: WarehouseInventoryComponent,

        data: {
          title: 'Item Details',
          section: 'Warehouse'
        }
      },
            {
        path: 'incoming-goods',

        component: WarehouseIncomingGoodsComponent,

        data: {
          title: 'Incoming Goods',
          section: 'Warehouse'
        }
      },


      {
        path: 'incoming-goods/new',

        component: WarehouseIncomingGoodsComponent,

        data: {
          title: 'Add Incoming Goods',
          section: 'Warehouse'
        }
      },


      {
        path: 'incoming-goods/:id',

        component: WarehouseIncomingGoodsComponent,

        data: {
          title: 'Incoming Goods Details',
          section: 'Warehouse'
        }
      },
            {
        path: 'outgoing-goods',

        component: WarehouseOutgoingGoodsComponent,

        data: {
          title: 'Outgoing Goods',
          section: 'Warehouse'
        }
      },


      {
        path: 'outgoing-goods/new',

        component: WarehouseOutgoingGoodsComponent,

        data: {
          title: 'Add Outgoing Goods',
          section: 'Warehouse'
        }
      },


      {
        path: 'outgoing-goods/:id',

        component: WarehouseOutgoingGoodsComponent,

        data: {
          title: 'Outgoing Goods Details',
          section: 'Warehouse'
        }
      },
            {
        path: 'stock-transfer',

        component: WarehouseStockTransferComponent,

        data: {
          title: 'Stock Transfer',
          section: 'Warehouse'
        }
      },


      {
        path: 'stock-transfer/new',

        component: WarehouseStockTransferComponent,

        data: {
          title: 'New Stock Transfer',
          section: 'Warehouse'
        }
      },


      {
        path: 'stock-transfer/:id',

        component: WarehouseStockTransferComponent,

        data: {
          title: 'Transfer Details',
          section: 'Warehouse'
        }
      },
            {
        path: 'damaged-goods',

        component: WarehouseDamagedGoodsComponent,

        data: {
          title: 'Damaged Goods',
          section: 'Warehouse'
        }
      },


      {
        path: 'damaged-goods/new',

        component: WarehouseDamagedGoodsComponent,

        data: {
          title: 'Report Damaged Goods',
          section: 'Warehouse'
        }
      },


      {
        path: 'damaged-goods/:id',

        component: WarehouseDamagedGoodsComponent,

        data: {
          title: 'Damage Report Details',
          section: 'Warehouse'
        }
      },
            {
        path: 'my-tasks',

        component: WarehouseMyTasksComponent,

        data: {
          title: 'My Tasks',
          section: 'Operations'
        }
      },


      {
        path: 'my-tasks/new',

        component: WarehouseMyTasksComponent,

        data: {
          title: 'New Task',
          section: 'Operations'
        }
      },


      {
        path: 'my-tasks/:id',

        component: WarehouseMyTasksComponent,

        data: {
          title: 'Task Details',
          section: 'Operations'
        }
      },
            {
        path: 'activity',

        component: WarehouseActivityComponent,

        data: {
          title: 'Warehouse Activity',
          section: 'Operations'
        }
      },


      {
        path: '**',
        component: NotFound
      }
    ]
  }
];