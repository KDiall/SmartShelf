export type StockStatus = 'ok' | 'low' | 'critical' | 'out';
export type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired';

export interface Medicine {
  id: string;
  name: string;
  image?: string | null;
  unit: string;
  currentStock: number;
  reorderThreshold: number;
  reorderQuantity: number;
  expiryDate: string;
  costPerUnit: number;
  isBig5: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  medicineId: string;
  quantity: number;
  soldAt: string;
  synced: boolean;
  userId?: string;
}

export interface StockAlert {
  medicineId: string;
  medicineName: string;
  type: 'stockout' | 'expiry';
  severity: 'warning' | 'critical';
  daysRemaining: number;
  currentStock: number;
  estimatedLossLeones?: number;
}

export interface RestockItem {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  reorderQuantity: number;
  unit: string;
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  verified: boolean;
  createdAt: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  verified: boolean;
  createdAt: string;
  createdBy: string | null;
}
