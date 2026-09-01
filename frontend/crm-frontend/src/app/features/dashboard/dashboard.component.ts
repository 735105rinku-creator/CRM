import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  ArcElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  DashboardActivity,
  DashboardResponse,
  DashboardService,
  RecentInvoice,
  RecentLead
} from './dashboard.service';

Chart.register(
  ArcElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

@Component({
  selector: 'app-dashboard',
  imports: [BaseChartDirective, CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly dashboard = signal<DashboardResponse | null>(null);

  protected readonly stats = computed(() => this.dashboard()?.stats);
  protected readonly recentLeads = computed<RecentLead[]>(() => this.dashboard()?.recentLeads ?? []);
  protected readonly recentInvoices = computed<RecentInvoice[]>(() => this.dashboard()?.recentInvoices ?? []);
  protected readonly activities = computed<DashboardActivity[]>(() => (this.dashboard()?.activities ?? []).slice(0, 10));

  protected readonly revenueChartData = computed<ChartData<'line'>>(() => ({
    labels: this.dashboard()?.revenueLastSixMonths.map((point) => point.month) ?? [],
    datasets: [
      {
        data: this.dashboard()?.revenueLastSixMonths.map((point) => point.revenue) ?? [],
        label: 'Revenue',
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.14)',
        fill: true,
        tension: 0.38,
        pointBackgroundColor: '#1a3c5e',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6
      }
    ]
  }));

  protected readonly leadSourceChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: this.dashboard()?.leadsBySource.map((point) => point.source) ?? [],
    datasets: [
      {
        data: this.dashboard()?.leadsBySource.map((point) => point.count) ?? [],
        backgroundColor: ['#1a3c5e', '#0d9488', '#16a34a', '#d97706', '#64748b'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  }));

  protected readonly lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => `Revenue: ${this.formatCurrency(Number(context.parsed.y))}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#64748b'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(100, 116, 139, 0.16)'
        },
        ticks: {
          color: '#64748b',
          callback: (value) => this.compactCurrency(Number(value))
        }
      }
    }
  };

  protected readonly doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '66%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          color: '#475569',
          usePointStyle: true
        }
      }
    }
  };

  constructor() {
    this.loadDashboard();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      currency: 'INR',
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(value);
  }

  protected compactCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      compactDisplay: 'short',
      currency: 'INR',
      maximumFractionDigits: 1,
      notation: 'compact',
      style: 'currency'
    }).format(value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short'
    }).format(new Date(value));
  }

  protected activityIcon(type: string): string {
    const icons: Record<string, string> = {
      deal: '$',
      invoice: 'I',
      lead: 'L',
      task: 'T'
    };

    return icons[type] ?? 'A';
  }

  protected avatarInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected sparklineHeight(value: number): number {
    const values = this.stats()?.revenueSparkline ?? [];
    const max = Math.max(...values, 1);
    return Math.max(18, Math.round((value / max) * 58));
  }

  private loadDashboard(): void {
    this.dashboardService
      .getDashboardStats()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.dashboard.set(response);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Unable to load dashboard data. Please try again.');
          this.isLoading.set(false);
        }
      });
  }
}
