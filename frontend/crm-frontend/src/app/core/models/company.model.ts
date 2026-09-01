export type CompanyStatus = 'active' | 'suspended' | 'blocked' | 'trial' | 'inactive' | 'pending_verification';
export type SubscriptionPlan = 'free' | 'basic' | 'standard' | 'business' | 'starter' | 'professional' | 'enterprise';

export interface CompanyAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface CompanyBilling {
  gstNumber?: string;
  panNumber?: string;
  currency: 'INR' | 'USD' | 'EUR' | string;
  plan: SubscriptionPlan;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

export interface CompanySettings {
  timezone: string;
  dateFormat: string;
  financialYearStartMonth: number;
  invoicePrefix: string;
  leadAutoAssignment: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  logoUrl?: string;
  industry?: string;
  status: CompanyStatus;
  ownerUserId: string;
  address?: CompanyAddress;
  billing: CompanyBilling;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}
