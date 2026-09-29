import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface WarehouseRecord {
  _id?: string;
  code?: string;
  name?: string;
}

interface WarehouseListResponse {
  data?: WarehouseRecord[];
}

interface TaskRecord {
  _id?: string;
  warehouseId?: string | null;
  title?: string;
  description?: string;
  assignedToEmployeeId?: string | null;
  assignedByUserId?: string | null;
  priority?: string;
  dueDate?: string | null;
  status?: string;
  completedAt?: string | null;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  createdByEmployeeId?: string | null;
}

interface TaskPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TaskListResponse {
  data?: TaskRecord[];
  pagination?: TaskPagination;
}

const PRIORITIES = [
  'low',
  'normal',
  'high',
  'urgent'
];

const STATUSES = [
  'open',
  'in_progress',
  'completed',
  'cancelled'
];

@Component({
  selector: 'app-warehouse-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './my-tasks.component.html',
  styleUrl:
    './my-tasks.component.scss'
})
export class WarehouseMyTasksComponent
  implements OnInit {

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly priorities = PRIORITIES;
  protected readonly statuses = STATUSES;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isActing = signal(false);

  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly actionError = signal('');

  protected readonly records =
    signal<TaskRecord[]>([]);

  protected readonly pagination =
    signal<TaskPagination | null>(null);

  protected readonly selected =
    signal<TaskRecord | null>(null);

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly mode =
    signal<'list' | 'create' | 'view' | 'edit'>('list');

  protected readonly listScope =
    signal<'mine' | 'all'>('mine');

  protected readonly listSearch = signal('');
  protected readonly listStatus = signal('');
  protected readonly listPriority = signal('');
  protected readonly listWarehouseId = signal('');
  protected readonly listOverdue = signal(false);

  protected readonly form =
    this.fb.nonNullable.group({
      warehouseId: [''],
      title: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200)
      ]],
      description: [''],
      priority: ['normal', [
        Validators.required
      ]],
      dueDate: [''],
      remarks: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'New Task';
      case 'view':
        return 'Task Details';
      case 'edit':
        return 'Edit Task';
      default:
        return this.listScope() === 'mine'
          ? 'My Tasks'
          : 'All Tasks';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Create a warehouse task.';
      case 'view':
        return 'View and progress this task.';
      case 'edit':
        return 'Update task details.';
      default:
        return this.listScope() === 'mine'
          ? 'Tasks assigned to you or open to the team.'
          : 'All warehouse tasks for this company.';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url =
      this.route.snapshot.routeConfig?.path || '';

    this.loadWarehouses();

    if (id) {
      this.mode.set('view');
      this.loadTask(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.resetCreateForm();
      return;
    }

    this.mode.set('list');
    this.loadTaskList();
  }

  protected loadWarehouses(): void {
    this.api
      .get<WarehouseListResponse>(
        '/warehouse/warehouses',
        {
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc'
        }
      )
      .subscribe({
        next: (response) => {
          this.warehouses.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );
        },
        error: () => {
          this.warehouses.set([]);
        }
      });
  }

  protected loadTaskList(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    const params = {
      page,
      limit: 20,
      search: this.listSearch(),
      status: this.listStatus(),
      priority: this.listPriority(),
      warehouseId: this.listWarehouseId(),
      overdue: this.listOverdue()
    };

    if (this.listScope() === 'mine') {
      this.api
        .get<TaskListResponse>(
          '/warehouse/tasks/mine',
          params
        )
        .pipe(
          finalize(() => this.isLoading.set(false))
        )
        .subscribe({
          next: (response) => {
            this.records.set(
              Array.isArray(response?.data)
                ? response.data
                : []
            );
            this.pagination.set(
              response?.pagination || null
            );
          },
          error: (error: any) => {
            if (error?.status === 403) {
              this.listScope.set('all');
              this.loadTaskList(page);
              return;
            }

            this.records.set([]);
            this.pagination.set(null);
            this.loadError.set(
              error?.error?.message ||
              'Unable to load tasks.'
            );
          }
        });

      return;
    }

    this.api
      .get<TaskListResponse>(
        '/warehouse/tasks',
        params
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.records.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );
          this.pagination.set(
            response?.pagination || null
          );
        },
        error: (error: any) => {
          this.records.set([]);
          this.pagination.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load tasks.'
          );
        }
      });
  }

  protected loadTask(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');
    this.actionError.set('');

    this.api
      .get<TaskRecord>(
        `/warehouse/tasks/${id}`
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);

          if (record) {
            this.form.patchValue({
              warehouseId: record.warehouseId || '',
              title: record.title || '',
              description: record.description || '',
              priority: record.priority || 'normal',
              dueDate: record.dueDate || '',
              remarks: record.remarks || ''
            });
          }
        },
        error: (error: any) => {
          this.selected.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load task.'
          );
        }
      });
  }

  protected reloadCurrent(): void {
    const current = this.selected();

    if (
      this.mode() === 'view' ||
      this.mode() === 'edit'
    ) {
      if (current?._id) {
        this.loadTask(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadTaskList(
        this.pagination()?.page || 1
      );
    }
  }

  protected applyFilters(): void {
    this.loadTaskList(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listPriority.set('');
    this.listWarehouseId.set('');
    this.listOverdue.set(false);
    this.loadTaskList(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/my-tasks/new'
    );
  }

  protected openView(record: TaskRecord): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/my-tasks/${record._id}`
    );
  }

  protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/my-tasks'
    );
  }

  protected switchToEdit(): void {
    this.mode.set('edit');
    this.saveError.set('');
    this.saveSuccess.set('');
  }

  protected cancelEdit(): void {
    const current = this.selected();

    if (current) {
      this.form.patchValue({
        warehouseId: current.warehouseId || '',
        title: current.title || '',
        description: current.description || '',
        priority: current.priority || 'normal',
        dueDate: current.dueDate || '',
        remarks: current.remarks || ''
      });
    }

    this.mode.set('view');
    this.saveError.set('');
    this.saveSuccess.set('');
  }

  protected submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .post<TaskRecord>(
        '/warehouse/tasks',
        {
          warehouseId: value.warehouseId || null,
          title: value.title,
          description: value.description,
          priority: value.priority,
          dueDate: value.dueDate || null,
          remarks: value.remarks
        }
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Task created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/my-tasks/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/my-tasks'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create task.'
          );
        }
      });
  }

  protected submitUpdate(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const payload = {
      warehouseId: value.warehouseId || null,
      title: value.title,
      description: value.description,
      priority: value.priority,
      dueDate: value.dueDate || null,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .patch<TaskRecord>(
        `/warehouse/tasks/${current._id}`,
        payload
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || current);
          this.mode.set('view');
          this.saveSuccess.set(
            'Task updated successfully.'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to update task.'
          );
        }
      });
  }

  protected startTask(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        `Start task "${current.title || ''}"?`
      )
    ) {
      return;
    }

    this.runAction(
      `/warehouse/tasks/${current._id}/start`,
      'Task started.'
    );
  }

  protected completeTask(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        `Mark task "${current.title || ''}" as completed?`
      )
    ) {
      return;
    }

    this.runAction(
      `/warehouse/tasks/${current._id}/complete`,
      'Task completed.'
    );
  }

  protected cancelTask(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        `Cancel task "${current.title || ''}"?`
      )
    ) {
      return;
    }

    this.runAction(
      `/warehouse/tasks/${current._id}/cancel`,
      'Task cancelled.'
    );
  }

  protected deleteTask(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        `Delete task "${current.title || ''}"?`
      )
    ) {
      return;
    }

    this.isActing.set(true);
    this.actionError.set('');

    this.api
      .delete<unknown>(
        `/warehouse/tasks/${current._id}`
      )
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/warehouse/my-tasks'
          );
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to delete task.'
          );
        }
      });
  }

  private runAction(
    endpoint: string,
    successMessage: string
  ): void {
    this.isActing.set(true);
    this.actionError.set('');
    this.saveSuccess.set('');

    this.api
      .post<TaskRecord>(endpoint, {})
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);
          this.saveSuccess.set(successMessage);
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to perform the action.'
          );
        }
      });
  }

  protected resetCreateForm(): void {
    this.form.reset({
      warehouseId: '',
      title: '',
      description: '',
      priority: 'normal',
      dueDate: '',
      remarks: ''
    });
  }

  protected warehouseLabel(
    warehouseId?: string | null
  ): string {
    if (!warehouseId) {
      return 'Company-wide';
    }

    const match = this.warehouses().find(
      (item) => item._id === warehouseId
    );

    if (!match) {
      return '-';
    }

    return `${match.name || '-'} (${match.code || '-'})`;
  }

  protected priorityLabel(value?: string): string {
    switch (value) {
      case 'low':
        return 'Low';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'High';
      case 'urgent':
        return 'Urgent';
      default:
        return this.statusLabel(value);
    }
  }

  protected statusLabel(value?: string): string {
    switch (value) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return String(value || '')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  protected statusBadgeClass(value?: string): string {
    switch (value) {
      case 'open':
        return 'open';
      case 'in_progress':
        return 'in-progress';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'open';
    }
  }

  protected priorityBadgeClass(value?: string): string {
    switch (value) {
      case 'low':
        return 'priority-low';
      case 'normal':
        return 'priority-normal';
      case 'high':
        return 'priority-high';
      case 'urgent':
        return 'priority-urgent';
      default:
        return 'priority-normal';
    }
  }

  protected isOverdue(record: TaskRecord): boolean {
    if (!record.dueDate) {
      return false;
    }

    if (
      record.status !== 'open' &&
      record.status !== 'in_progress'
    ) {
      return false;
    }

    return new Date(record.dueDate).getTime() < Date.now();
  }

  protected formatDate(value?: string | null): string {
    return value
      ? new Intl.DateTimeFormat('en-IN').format(
          new Date(value)
        )
      : '-';
  }

  protected formatNumber(value?: number): string {
    return new Intl.NumberFormat('en-IN').format(
      Number(value || 0)
    );
  }
}