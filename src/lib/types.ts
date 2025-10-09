export interface MercadoLivreAccount {
  id: string
  nickname: string
  email: string
  status: 'active' | 'inactive' | 'suspended'
  reputation: number
  sales: number
  products: number
  lastSync: string
  accessToken?: string
  refreshToken?: string
  userId?: string
}

export interface Product {
  id: string
  title: string
  price: number
  stock: number
  status: 'active' | 'paused' | 'ended'
  account: string
  views: number
  sales: number
  category?: string
  images?: string[]
  description?: string
  mlId?: string
}

export interface Sale {
  id: string
  productId: string
  accountId: string
  buyerNickname: string
  quantity: number
  totalAmount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  shippingStatus?: string
}

export interface Analytics {
  totalSales: number
  totalRevenue: number
  conversionRate: number
  averageTicket: number
  topProducts: Product[]
  salesByAccount: { accountId: string; sales: number; revenue: number }[]
}

export interface MLApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface AccountMetrics {
  accountId: string
  views: number
  questions: number
  sales: number
  revenue: number
  period: string
}