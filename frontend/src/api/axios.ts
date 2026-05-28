import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

// API functions
export const authAPI = {
  register: (data: { name: string; email: string; password: string; role: string }) =>
    axiosInstance.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    axiosInstance.post('/auth/login', data),
  forgotPassword: (data: { email: string }) =>
    axiosInstance.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; password: string }) =>
    axiosInstance.post('/auth/reset-password', data),
};

export const gemAPI = {
  createGem: (formData: FormData) =>
    axiosInstance.post('/gems', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyGems: () => axiosInstance.get('/gems/my-gems'),
  getApprovedGems: (params?: Record<string, string | number>) =>
  axiosInstance.get('/gems/approved', { params }),
  getGemById: (id: string) => axiosInstance.get(`/gems/${id}`),
  updateGem: (id: string, data: Partial<{
    type: string;
    carat: number;
    cut: string;
    clarity: string;
    color: string;
    origin: string;
    description: string;
  }>) => axiosInstance.patch(`/gems/${id}`, data),
  deleteGem: (id: string) => axiosInstance.delete(`/gems/${id}`),
};

export const auctionAPI = {
  createAuction: (data: Record<string, unknown>) =>
  axiosInstance.post('/auctions', data),

  initiatePayHereCheckout: (data: Record<string, unknown>) =>
    axiosInstance.post('/auctions/payhere/initiate', data),

  updateAuctionStatus: (id: string, data: { status: string }) =>
    axiosInstance.patch(`/auctions/${id}/status`, data),

  placeBid: (data: { auctionId: string; amount: number }) =>
    axiosInstance.post('/auctions/bid', data),
  getActiveAuctions: () => axiosInstance.get('/auctions/active'),
  getMyAuctions: () => axiosInstance.get('/auctions/my-auctions'),
  getAuctionById: (id: string) => axiosInstance.get(`/auctions/${id}`),
  deleteAuction: (id: string) => axiosInstance.delete(`/auctions/${id}`),
};

export const adminAPI = {
  getPendingGems: () => axiosInstance.get('/admin/gems/pending'),
  reviewGem: (data: { gemId: string; status: string; feedback?: string }) =>
    axiosInstance.post('/admin/gems/review', data),
  getAllUsers: () => axiosInstance.get('/admin/users'),
  getStatistics: () => axiosInstance.get('/admin/statistics'),
  getAllAuctions: () => axiosInstance.get('/admin/auctions'),
  getActivity: () => axiosInstance.get('/admin/activity'),
};

export const buyerAPI = {
  getDashboard: () => axiosInstance.get('/buyer/dashboard'),
  getBidHistory: () => axiosInstance.get('/buyer/bid-history'),
  getActiveBids: () => axiosInstance.get('/buyer/active-bids'),
  getWonAuctions: () => axiosInstance.get('/buyer/won-auctions'),
};