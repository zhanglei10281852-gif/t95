<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">今日菜单</h2>
        <span class="today-date">{{ todayDateStr }}</span>
      </div>
      <div class="header-right">
        <a-select
          v-model:value="selectedCanteenId"
          placeholder="请选择助餐点"
          style="width: 240px"
          @change="loadMenu"
        >
          <a-select-option v-for="c in canteenList" :key="c._id" :value="c._id">
            {{ c.name }}
          </a-select-option>
        </a-select>
        <a-date-picker
          v-model:value="selectedDate"
          style="width: 160px; margin-left: 12px"
          @change="handleDateChange"
        />
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <a-spin size="large" tip="加载中..." />
    </div>

    <div v-else class="menu-container">
      <div class="meal-section lunch-section">
        <div class="meal-header">
          <div class="meal-icon lunch-icon">
            <CoffeeOutlined />
          </div>
          <div class="meal-title">
            <h3>午餐</h3>
            <span>{{ getCanteenBusinessHours('lunch') }}</span>
          </div>
        </div>

        <div v-if="todayMenu.lunch.dishes.length === 0" class="empty-state">
          <a-empty description="暂未发布今日午餐菜单" />
        </div>

        <div v-else class="dish-categories">
          <div v-for="cat in getCategorizedDishes('lunch')" :key="cat.category" class="category-block">
            <div class="category-title">{{ cat.categoryName }}</div>
            <div class="dish-list">
              <div
                v-for="dish in cat.dishes"
                :key="dish.dishId"
                class="dish-card"
                :class="{ 'is-soft': dish.isSoft }"
              >
                <div class="dish-info">
                  <div class="dish-name">{{ dish.dishName }}</div>
                  <div class="dish-tags">
                    <a-tag v-if="dish.isSoft" color="green" size="small">
                      <SmileOutlined />
                      软质
                    </a-tag>
                  </div>
                </div>
                <div class="dish-price">¥{{ dish.price }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="meal-section dinner-section">
        <div class="meal-header">
          <div class="meal-icon dinner-icon">
            <StarOutlined />
          </div>
          <div class="meal-title">
            <h3>晚餐</h3>
            <span>{{ getCanteenBusinessHours('dinner') }}</span>
          </div>
        </div>

        <div v-if="todayMenu.dinner.dishes.length === 0" class="empty-state">
          <a-empty description="暂未发布今日晚餐菜单" />
        </div>

        <div v-else class="dish-categories">
          <div v-for="cat in getCategorizedDishes('dinner')" :key="cat.category" class="category-block">
            <div class="category-title">{{ cat.categoryName }}</div>
            <div class="dish-list">
              <div
                v-for="dish in cat.dishes"
                :key="dish.dishId"
                class="dish-card"
                :class="{ 'is-soft': dish.isSoft }"
              >
                <div class="dish-info">
                  <div class="dish-name">{{ dish.dishName }}</div>
                  <div class="dish-tags">
                    <a-tag v-if="dish.isSoft" color="green" size="small">
                      <SmileOutlined />
                      软质
                    </a-tag>
                  </div>
                </div>
                <div class="dish-price">¥{{ dish.price }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasSoftDishes" class="soft-tip">
      <a-alert
        type="success"
        show-icon
        message="贴心提示"
        description="标有「软质」标签的菜品，适合咀嚼能力较弱的老人食用。"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import dayjs, { Dayjs } from 'dayjs'
import {
  CoffeeOutlined,
  StarOutlined,
  SmileOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import { getCanteenList, CanteenItem } from '@/api/canteens'
import {
  getTodayMenu,
  MealType,
  MenuDishItem,
  DAY_MAP,
} from '@/api/menus'
import { CATEGORY_MAP } from '@/api/dishes'

const userStore = useUserStore()

const loading = ref(false)
const canteenList = ref<CanteenItem[]>([])
const selectedCanteenId = ref('')
const selectedDate = ref<Dayjs>(dayjs())
const todayMenu = reactive({
  lunch: { dishes: [] as MenuDishItem[] },
  dinner: { dishes: [] as MenuDishItem[] },
})

const todayDateStr = computed(() => {
  const dayOfWeek = selectedDate.value.day()
  const dayName = DAY_MAP[Object.keys(DAY_MAP)[dayOfWeek === 0 ? 6 : dayOfWeek - 1] as keyof typeof DAY_MAP] || ''
  return selectedDate.value.format('YYYY年MM月DD日') + ' ' + dayName
})

const hasSoftDishes = computed(() => {
  const allDishes = [...todayMenu.lunch.dishes, ...todayMenu.dinner.dishes]
  return allDishes.some(d => d.isSoft)
})

const currentCanteen = computed(() => {
  return canteenList.value.find(c => c._id === selectedCanteenId.value)
})

function getCanteenBusinessHours(mealType: MealType): string {
  if (!currentCanteen.value) return ''
  return currentCanteen.value.businessHours?.[mealType] || ''
}

function getCategorizedDishes(mealType: MealType) {
  const dishes = todayMenu[mealType].dishes
  const categoryOrder: string[] = ['meat', 'vegetable', 'staple', 'soup', 'porridge', 'fruit']
  const categories: Record<string, { category: string; categoryName: string; dishes: MenuDishItem[] }> = {}

  dishes.forEach(dish => {
    const cat = dish.category
    if (!categories[cat]) {
      categories[cat] = {
        category: cat,
        categoryName: (CATEGORY_MAP as any)[cat] || cat,
        dishes: [],
      }
    }
    categories[cat].dishes.push(dish)
  })

  return categoryOrder
    .filter(cat => categories[cat])
    .map(cat => categories[cat])
}

async function loadCanteens() {
  try {
    const res = await getCanteenList()
    canteenList.value = res
    
    if (userStore.userInfo?.role === 'canteen' && userStore.userInfo.canteenId) {
      selectedCanteenId.value = userStore.userInfo.canteenId as string
    } else if (res.length > 0) {
      selectedCanteenId.value = res[0]._id
    }
    
    if (selectedCanteenId.value) {
      loadMenu()
    }
  } catch (e) {
    console.error(e)
  }
}

async function loadMenu() {
  if (!selectedCanteenId.value) return

  loading.value = true
  try {
    const res = await getTodayMenu(
      selectedCanteenId.value,
      selectedDate.value.format('YYYY-MM-DD')
    )
    todayMenu.lunch.dishes = res.lunch.dishes || []
    todayMenu.dinner.dishes = res.dinner.dishes || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function handleDateChange(date: Dayjs | null) {
  if (date) {
    selectedDate.value = date
    loadMenu()
  }
}

onMounted(() => {
  loadCanteens()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #262626;
}

.today-date {
  color: #8c8c8c;
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.menu-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.meal-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.meal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.meal-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}

.lunch-icon {
  background: linear-gradient(135deg, #ff9a44, #fc6076);
}

.dinner-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.meal-title h3 {
  margin: 0;
  font-size: 20px;
  color: #262626;
}

.meal-title span {
  color: #8c8c8c;
  font-size: 13px;
}

.empty-state {
  padding: 40px 0;
}

.dish-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-title {
  font-size: 14px;
  font-weight: 500;
  color: #595959;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.dish-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.dish-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.dish-card:hover {
  background: #f0f5ff;
  border-color: #91d5ff;
}

.dish-card.is-soft {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.dish-info {
  flex: 1;
  min-width: 0;
}

.dish-name {
  font-size: 15px;
  color: #262626;
  font-weight: 500;
  margin-bottom: 6px;
}

.dish-tags {
  display: flex;
  gap: 6px;
}

.dish-price {
  font-size: 18px;
  color: #fa8c16;
  font-weight: 500;
  margin-left: 12px;
}

.soft-tip {
  margin-top: 24px;
}

@media (max-width: 1200px) {
  .menu-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dish-list {
    grid-template-columns: 1fr;
  }
}
</style>
