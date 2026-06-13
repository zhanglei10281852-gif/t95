import request from '@/utils/request'

export interface SalesRankingItem {
  rank: number
  dishId: string
  dishName: string
  category: string
  totalQuantity: number
  totalSales: number
  orderCount: number
}

export interface CategoryStats {
  category: string
  categoryName: string
  totalQuantity: number
  totalSales: number
  quantityPercentage: string
  salesPercentage: string
  dishTypeCount: number
}

export interface CategoryStatsResponse {
  categories: CategoryStats[]
  totalQuantity: number
  totalSales: number
}

export interface SlowMovingDish {
  dishId: string
  dishName: string
  category: string
  categoryName: string
  price: number
  totalQuantity: number
  totalSales: number
  isSoft: boolean
}

export interface PreparationEstimate {
  dishId: string
  dishName: string
  category: string
  categoryName: string
  bookedQuantity: number
  avgHistoricalQuantity: number
  estimatedQuantity: number
  suggestionLevel: 'high' | 'medium' | 'low'
  suggestion: string
}

export interface PreparationEstimateResponse {
  date: string
  canteenId: string
  estimates: PreparationEstimate[]
  totalBooked: number
  totalEstimated: number
}

export function getSalesRanking(params?: {
  canteenId?: string
  startDate?: string
  endDate?: string
  category?: string
  limit?: number
}) {
  return request.get<any, SalesRankingItem[]>('/dish-stats/sales-ranking', { params })
}

export function getCategoryStats(params?: {
  canteenId?: string
  startDate?: string
  endDate?: string
}) {
  return request.get<any, CategoryStatsResponse>('/dish-stats/category-stats', { params })
}

export function getSlowMovingDishes(params?: {
  canteenId?: string
  startDate?: string
  endDate?: string
  threshold?: number
}) {
  return request.get<any, SlowMovingDish[]>('/dish-stats/slow-moving', { params })
}

export function getPreparationEstimate(params?: {
  canteenId?: string
  date?: string
}) {
  return request.get<any, PreparationEstimateResponse>('/dish-stats/preparation-estimate', { params })
}
