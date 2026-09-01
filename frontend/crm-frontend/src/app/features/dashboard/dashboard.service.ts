import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { apiUrl } from '../../core/config/api.config';

export interface DashboardStats {
  totalLeadsThisMonth: number;
  leadsChangePercent: number;
  dealsWon: number;
  dealsWonRevenue: number;
  pendingInvoices: number;
  pendingInvoicesAmount: number;
  monthlyRevenue: number;
  revenueSparkline: number[];
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface LeadSourcePoint {
  source: 'Website' | 'Referral' | 'Cold Call' | 'Social Media' | 'Other' | string;
  count: number;
}

export interface RecentLead {
  id: string;
  name: string;
  company: string;
  status: string;
  assignedTo: string;
  date: string;
}

export interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  client: string;
  amount: number;
  status: string;
  dueDate: string;
}

export interface DashboardActivity {
  id: string;
  type: 'lead' | 'deal' | 'invoice' | 'task' | string;
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

export interface DashboardResponse {
  stats: DashboardStats;
  revenueLastSixMonths: RevenuePoint[];
  leadsBySource: LeadSourcePoint[];
  recentLeads: RecentLead[];
  recentInvoices: RecentInvoice[];
  activities: DashboardActivity[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private readonly http: HttpClient) {}

  getDashboardStats(): Observable<DashboardResponse> {
    return this.http
      .get<DashboardResponse>(apiUrl('/dashboard/stats'), { withCredentials: true })
      .pipe(catchError(() => of(this.getMockDashboard())));
  }

  private getMockDashboard(): DashboardResponse {
    return {
      stats: {
        totalLeadsThisMonth: 128,
        leadsChangePercent: 18,
        dealsWon: 24,
        dealsWonRevenue: 842000,
        pendingInvoices: 16,
        pendingInvoicesAmount: 356000,
        monthlyRevenue: 1240000,
        revenueSparkline: [42, 55, 48, 68, 72, 91, 84, 104]
      },
      revenueLastSixMonths: [
        { month: 'Jan', revenue: 640000 },
        { month: 'Feb', revenue: 720000 },
        { month: 'Mar', revenue: 690000 },
        { month: 'Apr', revenue: 940000 },
        { month: 'May', revenue: 1080000 },
        { month: 'Jun', revenue: 1240000 }
      ],
      leadsBySource: [
        { source: 'Website', count: 44 },
        { source: 'Referral', count: 31 },
        { source: 'Cold Call', count: 22 },
        { source: 'Social Media', count: 19 },
        { source: 'Other', count: 12 }
      ],
      recentLeads: [
        { id: 'lead_1', name: 'Rohit Mehta', company: 'Apex Traders', status: 'New', assignedTo: 'Priya', date: '2026-06-28' },
        { id: 'lead_2', name: 'Sneha Kapoor', company: 'Bluewave Tech', status: 'Qualified', assignedTo: 'Amit', date: '2026-06-27' },
        { id: 'lead_3', name: 'Vikram Jain', company: 'Nexus Retail', status: 'Follow Up', assignedTo: 'Neha', date: '2026-06-26' },
        { id: 'lead_4', name: 'Anita Rao', company: 'Prime Health', status: 'Proposal', assignedTo: 'Rahul', date: '2026-06-25' }
      ],
      recentInvoices: [
        { id: 'inv_1', invoiceNumber: 'OPB-1008', client: 'Apex Traders', amount: 84000, status: 'Pending', dueDate: '2026-07-05' },
        { id: 'inv_2', invoiceNumber: 'OPB-1007', client: 'Bluewave Tech', amount: 126000, status: 'Paid', dueDate: '2026-07-02' },
        { id: 'inv_3', invoiceNumber: 'OPB-1006', client: 'Prime Health', amount: 56000, status: 'Overdue', dueDate: '2026-06-24' }
      ],
      activities: [
        {
          id: 'act_1',
          type: 'lead',
          title: 'New lead added',
          description: 'Rohit Mehta was added from website enquiry.',
          timestamp: '2026-06-29T10:15:00+05:30',
          user: { name: 'Priya Shah' }
        },
        {
          id: 'act_2',
          type: 'deal',
          title: 'Deal won',
          description: 'Bluewave Tech deal closed for INR 1.26L.',
          timestamp: '2026-06-29T09:40:00+05:30',
          user: { name: 'Amit Verma' }
        },
        {
          id: 'act_3',
          type: 'invoice',
          title: 'Invoice paid',
          description: 'OPB-1007 payment marked as received.',
          timestamp: '2026-06-28T17:20:00+05:30',
          user: { name: 'Neha Singh' }
        },
        {
          id: 'act_4',
          type: 'task',
          title: 'Task completed',
          description: 'Follow-up call completed for Nexus Retail.',
          timestamp: '2026-06-28T15:05:00+05:30',
          user: { name: 'Rahul Sharma' }
        }
      ]
    };
  }
}
