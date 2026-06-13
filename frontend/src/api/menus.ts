import request from '@/utils/request'

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type MealType = 'lunch' | 'dinner'

export interface MenuDishItem {
  dishId: string
  dishName: string
  category: string
  price: number
  isSoft: boolean
}

export interface SetMealItem {
  name: string
  standard: 'A' | 'B' | 'C'
  price: number
  dishIds: string[]
  dishes: MenuDishItem[]
}

export interface MealSlot {
  mealType: MealType
  dishes: MenuDishItem[]
  setMeals: SetMealItem[]
}

export interface DayMenu {
  day: DayOfWeek
  lunch: MealSlot
  dinner: MealSlot
}

export interface WeeklyMenuData {
  _id?: string
  canteenId: string
  weekStartDate: string
  weekEndDate: string
  days: DayMenu[]
  status: 'draft' | 'published'
  createdBy?: string
}

export interface ConflictWarning {
  type: 'duplicate' | 'no_soft'
  day: DayOfWeek
  dayName: string
  mealType?: MealType
  mealName?: string
  message: string
  dishes?: string[]
}

export function getWeeklyMenu(canteenId: string, weekDate?: string) {
  return request.get<any, WeeklyMenuData>('/menus', {
    params: { canteenId, weekDate },
  })
}

export function getTodayMenu(canteenId: string, date?: string) {
  return request.get<any, {
    date: string
    day: DayOfWeek
    lunch: MealSlot
    dinner: MealSlot
  }>('/menus/today', {
    params: { canteenId, date },
  })
}

export function saveWeeklyMenu(data: {
  canteenId: string
  weekDate: string
  days: DayMenu[]
  status?: 'draft' | 'published'
}) {
  return request.post<any, WeeklyMenuData>('/menus/save', data)
}

export function copyFromLastWeek(data: {
  canteenId: string
  targetWeekDate: string
}) {
  return request.post<any, WeeklyMenuData>('/menus/copy-from-last-week', data)
}

export function checkMenuConflicts(days: DayMenu[]) {
  return request.post<any, { warnings: ConflictWarning[] }>('/menus/check-conflicts', { days })
}

export function publishWeeklyMenu(data: {
  canteenId: string
  weekDate: string
}) {
  return request.post<any, WeeklyMenuData>('/menus/publish', data)
}

export const DAY_MAP: Record<DayOfWeek, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
}

export const MEAL_TYPE_MAP: Record<MealType, string> = {
  lunch: '午餐',
  dinner: '晚餐',
}
