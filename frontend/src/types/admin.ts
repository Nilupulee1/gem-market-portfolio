export interface DashboardStats {
  totalUsers: number;
  totalGems: number;
  pendingGems: number;
  approvedGems: number;
  totalAuctions: number;
  activeAuctions: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}