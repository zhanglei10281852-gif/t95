import request from '@/utils/request'

export type DishCategory = 'staple' | 'meat' | 'vegetable' | 'soup' | 'porridge' | 'fruit'
export type TasteTag = 'light' | 'moderate' | 'heavy'
export type DishStatus = 'on_shelf' | 'off_shelf'

export interface DishItem {
  _id: string
  name: string
  category: DishCategory
  price: number
  costPrice: number
  tasteTags: TasteTag[]
  isSoft: boolean
  imageUrl?: string
  description?: string
  status: DishStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface DishQueryParams {
  page?: number
  pageSize?: number
  category?: string
  status?: string
  keyword?: string
}

export interface DishListResponse {
  total: number
  list: DishItem[]
  page: number
  pageSize: number
}

export interface CreateDishParams {
  name: string
  category: DishCategory
  price: number
  costPrice: number
  tasteTags?: TasteTag[]
  isSoft?: boolean
  imageUrl?: string
  description?: string
  status?: DishStatus
  sortOrder?: number
}

export function getDishList(params: DishQueryParams) {
  return request.get<any, DishListResponse>('/dishes', { params })
}

export function getAllDishes(params?: { category?: string; status?: string }) {
  return request.get<any, DishItem[]>('/dishes/all', { params })
}

export function getDishDetail(id: string) {
  return request.get<any, DishItem>(`/dishes/${id}`)
}

export function createDish(data: CreateDishParams) {
  return request.post<any, DishItem>('/dishes', data)
}

export function updateDish(id: string, data: Partial<CreateDishParams>) {
  return request.put<any, DishItem>(`/dishes/${id}`, data)
}

export function deleteDish(id: string) {
  return request.delete<any, { message: string }>(`/dishes/${id}`)
}

export function updateDishStatus(id: string, status: DishStatus) {
  return request.patch<any, DishItem>(`/dishes/${id}/status`, { status })
}

export const CATEGORY_MAP: Record<DishCategory, string> = {
  staple: '主食',
  meat: '荤菜',
  vegetable: '素菜',
  soup: '汤品',
  porridge: '粥点',
  fruit: '水果',
}

export const TASTE_TAG_MAP: Record<TasteTag, string> = {
  light: '清淡',
  moderate: '适中',
  heavy: '重口',
}

export const STATUS_MAP: Record<DishStatus, string> = {
  on_shelf: '上架',
  off_shelf: '下架',
}
