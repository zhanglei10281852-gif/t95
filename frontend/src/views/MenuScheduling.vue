<template>
  <div class="page">
    <div class="page-header">
      <a-form :model="queryForm" layout="inline">
        <a-form-item label="助餐点">
          <a-select
            v-model:value="queryForm.canteenId"
            placeholder="请选择助餐点"
            style="width: 220px"
            @change="handleCanteenChange"
          >
            <a-select-option v-for="c in canteenList" :key="c._id" :value="c._id">
              {{ c.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="选择周">
          <a-date-picker
            v-model:value="currentWeekDate"
            picker="week"
            style="width: 220px"
            @change="handleWeekChange"
          />
        </a-form-item>
        <a-form-item>
          <a-button @click="handleCopyLastWeek">
            <CopyOutlined />
            复制上周
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button @click="handleCheckConflicts">
            <ExclamationCircleOutlined />
            冲突检查
          </a-button>
        </a-form-item>
        <a-form-item style="float: right">
          <a-button @click="handleSave">保存</a-button>
          <a-button type="primary" @click="handlePublish" style="margin-left: 8px">
            发布菜单
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <div v-if="conflictWarnings.length > 0" class="warnings-section">
      <a-alert
        v-for="(warning, index) in conflictWarnings"
        :key="index"
        :message="warning.message"
        :type="warning.type === 'duplicate' ? 'warning' : 'info'"
        show-icon
        style="margin-bottom: 8px"
      />
    </div>

    <div class="week-calendar">
      <div class="calendar-header">
        <div class="week-header-cell header-cell">
          <div class="day-header-cell"></div>
          <div v-for="day in dayList" :key="day.key" class="day-header-cell">
            <div class="day-name">{{ day.name }}</div>
            <div class="day-date">{{ day.date }}</div>
          </div>
        </div>
      </div>
      <div class="calendar-body">
        <div class="meal-row">
          <div class="meal-label">午餐</div>
          <div v-for="day in dayList" :key="day.key + '-lunch'" class="day-cell" @click="openDishModal(day.key, 'lunch')">
            <div v-if="getDayDishes(day.key, 'lunch').length === 0" class="empty-hint">
              <PlusOutlined />
              添加菜品
            </div>
            <div v-else class="dish-list">
              <div
                v-for="dish in getDayDishes(day.key, 'lunch')"
                :key="dish.dishId"
                class="dish-item"
                :class="{ 'is-soft': dish.isSoft }"
              >
                <span class="dish-name">{{ dish.dishName }}</span>
                <span class="dish-price">¥{{ dish.price }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="meal-row">
          <div class="meal-label">晚餐</div>
          <div v-for="day in dayList" :key="day.key + '-dinner'" class="day-cell" @click="openDishModal(day.key, 'dinner')">
            <div v-if="getDayDishes(day.key, 'dinner').length === 0" class="empty-hint">
              <PlusOutlined />
              添加菜品
            </div>
            <div v-else class="dish-list">
              <div
                v-for="dish in getDayDishes(day.key, 'dinner')"
                :key="dish.dishId"
                class="dish-item"
                :class="{ 'is-soft': dish.isSoft }"
              >
                <span class="dish-name">{{ dish.dishName }}</span>
                <span class="dish-price">¥{{ dish.price }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      v-model:open="dishModalVisible"
      :title="modalTitle"
      width="700px"
      @ok="handleConfirmDishes"
      @cancel="dishModalVisible = false"
      :mask-closable="false"
    >
      <div class="dish-selector">
        <div class="category-tabs">
          <a-radio-group v-model:value="selectedCategory" button-style="solid">
            <a-radio-button value="">全部</a-radio-button>
            <a-radio-button v-for="cat in categoryList" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </a-radio-button>
          </a-radio-group>
        </div>
        <div class="dish-grid">
          <div
            v-for="dish in filteredDishes"
            :key="dish._id"
            class="dish-card"
            :class="{ selected: isDishSelected(dish._id) }"
            @click="toggleDish(dish)"
          >
            <div class="dish-card-name">{{ dish.name }}</div>
            <div class="dish-card-info">
              <span class="dish-card-price">¥{{ dish.price }}</span>
              <a-tag v-if="dish.isSoft" color="green" size="small">软质</a-tag>
            </div>
          </div>
        </div>
      </div>
      <div class="selected-section">
        <div class="selected-title">已选菜品 ({{ selectedDishes.length }}道)</div>
        <div class="selected-list">
          <a-tag
            v-for="dish in selectedDishes"
            :key="dish._id"
            closable
            @close="removeSelectedDish(dish._id)"
          >
            {{ dish.name }}
          </a-tag>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  CopyOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import dayjs, { Dayjs } from 'dayjs'
import { useUserStore } from '@/stores/user'
import { getCanteenList, CanteenItem } from '@/api/canteens'
import {
  getWeeklyMenu,
  saveWeeklyMenu,
  copyFromLastWeek,
  checkMenuConflicts,
  publishWeeklyMenu,
  DayOfWeek,
  MealType,
  MenuDishItem,
  DayMenu,
  MealSlot,
  ConflictWarning,
  DAY_MAP,
} from '@/api/menus'
import {
  getAllDishes,
  DishItem,
  CATEGORY_MAP,
} from '@/api/dishes'

const userStore = useUserStore()

const canteenList = ref<CanteenItem[]>([])
const allDishes = ref<DishItem[]>([])
const currentWeekDate = ref<Dayjs>(dayjs())
const menuData = ref<DayMenu[]>([])
const conflictWarnings = ref<ConflictWarning[]>([])

const queryForm = reactive({
  canteenId: '',
})

const dishModalVisible = ref(false)
const selectedCategory = ref('')
const selectedDishes = ref<DishItem[]>([])
const currentDay = ref<DayOfWeek>('monday')
const currentMeal = ref<MealType>('lunch')

const modalTitle = computed(() => {
  return `${DAY_MAP[currentDay.value]}${currentMeal.value === 'lunch' ? '午餐' : '晚餐'} - 选择菜品`
})

const categoryList = computed(() => {
  return Object.entries(CATEGORY_MAP).map(([value, label]) => ({ value, label }))
})

const dayList = computed(() => {
  const weekStart = currentWeekDate.value.startOf('week').add(1, 'day')
  const days: { key: DayOfWeek; name: string; date: string }[] = []
  const dayKeys: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  
  for (let i = 0; i < 7; i++) {
    const date = weekStart.add(i, 'day')
    days.push({
      key: dayKeys[i],
      name: DAY_MAP[dayKeys[i]],
      date: date.format('MM/DD'),
    })
  }
  return days
})

const filteredDishes = computed(() => {
  if (!selectedCategory.value) {
    return allDishes.value
  }
  return allDishes.value.filter(d => d.category === selectedCategory.value)
})

function getDayDishes(day: DayOfWeek, mealType: MealType): MenuDishItem[] {
  const dayMenu = menuData.value.find(d => d.day === day)
  if (!dayMenu) return []
  return dayMenu[mealType].dishes || []
}

function isDishSelected(dishId: string): boolean {
  return selectedDishes.value.some(d => d._id === dishId)
}

function toggleDish(dish: DishItem) {
  const index = selectedDishes.value.findIndex(d => d._id === dish._id)
  if (index > -1) {
    selectedDishes.value.splice(index, 1)
  } else {
    selectedDishes.value.push(dish)
  }
}

function removeSelectedDish(dishId: string) {
  const index = selectedDishes.value.findIndex(d => d._id === dishId)
  if (index > -1) {
    selectedDishes.value.splice(index, 1)
  }
}

async function loadCanteens() {
  try {
    const res = await getCanteenList()
    canteenList.value = res
    if (userStore.userInfo?.role === 'canteen' && userStore.userInfo.canteenId) {
      queryForm.canteenId = userStore.userInfo.canteenId as string
    } else if (res.length > 0) {
      queryForm.canteenId = res[0]._id
    }
    if (queryForm.canteenId) {
      loadMenu()
    }
  } catch (e) {
    console.error(e)
  }
}

async function loadAllDishes() {
  try {
    const res = await getAllDishes({ status: 'on_shelf' })
    allDishes.value = res
  } catch (e) {
    console.error(e)
  }
}

async function loadMenu() {
  if (!queryForm.canteenId) return

  try {
    const res = await getWeeklyMenu(queryForm.canteenId, currentWeekDate.value.format('YYYY-MM-DD'))
    menuData.value = res.days || []
    conflictWarnings.value = []
  } catch (e: any) {
    message.error(e?.message || '加载菜单失败')
  }
}

function handleCanteenChange() {
  loadMenu()
}

function handleWeekChange(date: Dayjs | null) {
  if (date) {
    currentWeekDate.value = date
    loadMenu()
  }
}

function openDishModal(day: DayOfWeek, mealType: MealType) {
  currentDay.value = day
  currentMeal.value = mealType
  selectedCategory.value = ''
  
  const currentDishes = getDayDishes(day, mealType)
  selectedDishes.value = currentDishes.map(d => ({
    _id: d.dishId,
    name: d.dishName,
    category: d.category as any,
    price: d.price,
    costPrice: 0,
    tasteTags: [],
    isSoft: d.isSoft,
    status: 'on_shelf',
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  }))
  
  dishModalVisible.value = true
}

function handleConfirmDishes() {
  dishModalVisible.value = false
  
  const dishItems: MenuDishItem[] = selectedDishes.value.map(d => ({
    dishId: d._id,
    dishName: d.name,
    category: d.category,
    price: d.price,
    isSoft: d.isSoft,
  }))

  const dayIndex = menuData.value.findIndex(d => d.day === currentDay.value)
  if (dayIndex > -1) {
    menuData.value[dayIndex][currentMeal.value].dishes = dishItems
  }
}

async function handleSave() {
  if (!queryForm.canteenId) {
    message.warning('请选择助餐点')
    return
  }

  try {
    await saveWeeklyMenu({
      canteenId: queryForm.canteenId,
      weekDate: currentWeekDate.value.format('YYYY-MM-DD'),
      days: menuData.value,
    })
    message.success('保存成功')
  } catch (e: any) {
    message.error(e?.message || '保存失败')
  }
}

async function handleCopyLastWeek() {
  if (!queryForm.canteenId) {
    message.warning('请选择助餐点')
    return
  }

  try {
    const res = await copyFromLastWeek({
      canteenId: queryForm.canteenId,
      targetWeekDate: currentWeekDate.value.format('YYYY-MM-DD'),
    })
    menuData.value = res.days || []
    message.success('复制成功')
  } catch (e: any) {
    message.error(e?.message || '复制失败')
  }
}

async function handleCheckConflicts() {
  try {
    const res = await checkMenuConflicts(menuData.value)
    conflictWarnings.value = res.warnings
    if (res.warnings.length === 0) {
      message.success('检查通过，没有发现问题')
    } else {
      message.warning(`发现 ${res.warnings.length} 个提醒`)
    }
  } catch (e: any) {
    message.error(e?.message || '检查失败')
  }
}

async function handlePublish() {
  if (!queryForm.canteenId) {
    message.warning('请选择助餐点')
    return
  }

  try {
    await publishWeeklyMenu({
      canteenId: queryForm.canteenId,
      weekDate: currentWeekDate.value.format('YYYY-MM-DD'),
    })
    message.success('发布成功')
  } catch (e: any) {
    message.error(e?.message || '发布失败')
  }
}

onMounted(() => {
  loadCanteens()
  loadAllDishes()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.warnings-section {
  margin-bottom: 16px;
}

.week-calendar {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-header {
  background: #fafafa;
}

.week-header-row {
  display: flex;
}

.day-header-cell {
  flex: 1;
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
}

.day-header-cell:last-child {
  border-right: none;
}

.day-header-cell:first-child {
  flex: 0 0 100px;
  background: #f5f5f5;
}

.day-name {
  font-size: 16px;
  font-weight: 500;
  color: #262626;
}

.day-date {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.calendar-body {
  min-height: 300px;
}

.meal-row {
  display: flex;
  min-height: 120px;
}

.meal-label {
  flex: 0 0 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  background: #fafafa;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  color: #595959;
}

.day-cell {
  flex: 1;
  padding: 12px;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
  min-height: 120px;
}

.day-cell:hover {
  background: #f9f9f9;
}

.day-cell:last-child {
  border-right: none;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 80px;
  color: #bfbfbf;
  font-size: 13px;
  flex-direction: column;
  gap: 8px;
}

.dish-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dish-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
}

.dish-item.is-soft {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.dish-name {
  color: #262626;
}

.dish-price {
  color: #fa8c16;
  font-size: 12px;
}

.dish-selector {
  margin-bottom: 16px;
}

.category-tabs {
  margin-bottom: 16px;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}

.dish-card {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.dish-card:hover {
  border-color: #1890ff;
}

.dish-card.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.dish-card-name {
  font-size: 14px;
  color: #262626;
  margin-bottom: 8px;
}

.dish-card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dish-card-price {
  color: #fa8c16;
  font-weight: 500;
}

.selected-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.selected-title {
  font-size: 14px;
  color: #595959;
  margin-bottom: 12px;
}

.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
