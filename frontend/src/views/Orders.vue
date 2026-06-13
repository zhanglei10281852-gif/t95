<template>
  <div class="page">
    <div class="page-header">
      <a-form :model="queryForm" layout="inline">
        <a-form-item label="状态筛选">
          <a-select
            v-model:value="queryForm.status"
            placeholder="全部状态"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="ordered">已下单</a-select-option>
            <a-select-option value="confirmed">已确认</a-select-option>
            <a-select-option value="preparing">制作中</a-select-option>
            <a-select-option value="ready">待取/待送</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="助餐点">
          <a-select
            v-model:value="queryForm.canteenId"
            placeholder="全部助餐点"
            style="width: 180px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option v-for="c in canteenList" :key="c._id" :value="c._id">
              {{ c.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日期">
          <a-range-picker
            v-model:value="dateRange"
            style="width: 260px"
            @change="handleDateChange"
          />
        </a-form-item>
        <a-form-item>
          <a-button @click="handleReset">重置</a-button>
        </a-form-item>
        <a-form-item style="float: right">
          <a-button type="primary" @click="handleAdd" v-if="canCreateOrder">
            <PlusOutlined />
            新建订单
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <a-tab-pane key="all" tab="全部订单" />
      <a-tab-pane key="ordered" tab="已下单" />
      <a-tab-pane key="confirmed" tab="已确认" />
      <a-tab-pane key="preparing" tab="制作中" />
      <a-tab-pane key="ready" tab="待取/待送" />
      <a-tab-pane key="completed" tab="已完成" />
    </a-tabs>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination"
      :loading="loading"
      row-key="_id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'elderly'">
          <div>
            <div>{{ record.elderlyId?.name || '-' }}</div>
            <div style="color: #999; font-size: 12px">
              {{ record.elderlyId?.age }}岁 · {{ getSubsidyText(record.elderlyId?.subsidyCategory) }}
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'canteen'">
          {{ record.canteenId?.name || '-' }}
        </template>
        <template v-else-if="column.key === 'mealInfo'">
          <div>
            <div>
              {{ record.mealType === 'lunch' ? '午餐' : '晚餐' }}
              · {{ record.mealStandard }}餐
              · ¥{{ record.mealPrice }}
            </div>
            <div style="color: #999; font-size: 12px">
              {{ formatDate(record.mealDate) }}
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'subsidy'">
          <div>
            <div style="color: #52c41a">补贴: ¥{{ record.subsidyAmount }}</div>
            <div style="color: #fa8c16; font-size: 12px">自付: ¥{{ record.selfPayAmount }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'deliveryType'">
          <div>
            {{ record.deliveryType === 'pickup' ? '到店取餐' : '送餐到家' }}
            <template v-if="record.deliveryType === 'delivery' && record.deliveryInfo">
              <div style="color: #999; font-size: 12px">
              {{ record.deliveryInfo.volunteerName }}
              · {{ record.deliveryInfo.estimatedTime }}
            </div>
            </template>
          </div>
        </template>
        <template v-else-if="column.key === 'action'">
          <template v-if="record.status !== 'cancelled' && record.status !== 'completed'">
            <a-dropdown v-if="canManageOrder(record)">
              <a-button type="link" size="small">
              状态操作
              <DownOutlined />
            </a-button>
              <template #overlay>
                <a-menu @click="({ key }: { key: string }) => handleStatusChange(record, key)">
                  <a-menu-item v-if="record.status === 'ordered'" key="confirmed">确认接单</a-menu-item>
                  <a-menu-item v-if="record.status === 'confirmed'" key="preparing">开始制作</a-menu-item>
                  <a-menu-item v-if="record.status === 'preparing'" key="ready">制作完成</a-menu-item>
                  <a-menu-item v-if="record.status === 'ready'" key="completed">完成配送/取餐</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
            <a-button
              v-if="record.deliveryType === 'delivery' && record.status !== 'completed'"
              type="link"
              size="small"
              @click="handleSetDelivery(record)"
            >
              设置配送
            </a-button>
          </template>
          <a-popconfirm
            v-if="record.status === 'ordered' && canCancelOrder"
            title="确定取消该订单？"
            @confirm="handleCancel(record)"
          >
            <a-button type="link" size="small" danger>取消订单</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="orderModalVisible"
      title="新建订单"
      width="800px"
      @ok="handleSubmitOrder"
      @cancel="orderModalVisible = false"
      :confirm-loading="submitLoading"
      :mask-closable="false"
    >
      <a-form :model="orderForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="选择老人"
              :rules="[{ required: true, message: '请选择老人' }]"
            >
              <a-select
                v-model:value="orderForm.elderlyId"
                placeholder="请选择老人"
                show-search
                :filter-option="filterOption"
              >
                <a-select-option
                  v-for="e in elderlyList"
                  :key="e._id"
                  :value="e._id"
                >
                  {{ e.name }} ({{ e.age }}岁, {{ e.community }})
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="助餐点"
              :rules="[{ required: true, message: '请选择助餐点' }]"
            >
              <a-select
                v-model:value="orderForm.canteenId"
                placeholder="请选择助餐点"
                @change="loadMenu"
              >
                <a-select-option v-for="c in canteenList" :key="c._id" :value="c._id">
                  {{ c.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="用餐日期"
              :rules="[{ required: true, message: '请选择日期' }]"
            >
              <a-date-picker
                v-model:value="orderForm.mealDate"
                style="width: 100%"
                :disabled-date="disabledDate"
                @change="loadMenu"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="餐次"
              :rules="[{ required: true, message: '请选择餐次' }]"
            >
              <a-select
                v-model:value="orderForm.mealType"
                placeholder="请选择"
                @change="loadMenu"
              >
                <a-select-option value="lunch">午餐</a-select-option>
                <a-select-option value="dinner">晚餐</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="点餐方式">
          <a-radio-group v-model:value="orderForm.orderMode">
            <a-radio value="standard">按餐标</a-radio>
            <a-radio value="dishes">按菜品</a-radio>
          </a-radio-group>
        </a-form-item>

        <div v-if="orderForm.orderMode === 'standard'">
          <a-form-item
            label="餐标"
            :rules="[{ required: true, message: '请选择餐标' }]"
          >
            <a-radio-group v-model:value="orderForm.mealStandard">
              <a-radio value="A">A餐 - ¥12</a-radio>
              <a-radio value="B">B餐 - ¥15</a-radio>
              <a-radio value="C">C餐 - ¥18</a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <div v-else class="dish-selection-section">
          <div class="section-title">
            选择菜品
            <span v-if="menuLoading" class="loading-text">
              <a-spin size="small" /> 加载菜单中...
            </span>
          </div>
          <div v-if="menuDishes.length === 0 && !menuLoading" class="empty-menu">
            <a-empty description="该助餐点当日此餐次暂无菜单" />
          </div>
          <div v-else class="dish-grid">
            <div
              v-for="dish in menuDishes"
              :key="dish.dishId"
              class="dish-item-card"
              :class="{ selected: isDishSelected(dish.dishId), 'is-soft': dish.isSoft }"
              @click="toggleDish(dish)"
            >
              <div class="dish-name">{{ dish.dishName }}</div>
              <div class="dish-info">
                <span class="dish-price">¥{{ dish.price }}</span>
                <a-tag v-if="dish.isSoft" color="green" size="small">软质</a-tag>
              </div>
            </div>
          </div>

          <div v-if="orderForm.selectedDishes.length > 0" class="selected-section">
            <div class="selected-title">已选菜品 ({{ orderForm.selectedDishes.length }}道)</div>
            <div class="selected-list">
              <div
                v-for="dish in orderForm.selectedDishes"
                :key="dish.dishId"
                class="selected-item"
              >
                <span class="selected-name">{{ dish.dishName }}</span>
                <div class="quantity-control">
                  <a-button size="small" @click.stop="updateDishQuantity(dish.dishId, -1)">-</a-button>
                  <span class="quantity">{{ dish.quantity }}</span>
                  <a-button size="small" @click.stop="updateDishQuantity(dish.dishId, 1)">+</a-button>
                </div>
                <span class="selected-price">¥{{ (dish.price * dish.quantity).toFixed(2) }}</span>
                <a-button type="text" size="small" danger @click.stop="removeDish(dish.dishId)">
                  <CloseOutlined />
                </a-button>
              </div>
            </div>
          </div>
        </div>

        <a-form-item label="取餐方式">
          <a-radio-group v-model:value="orderForm.deliveryType">
            <a-radio value="pickup">到店取餐</a-radio>
            <a-radio value="delivery">送餐到家</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="orderForm.remark"
            placeholder="忌口、特殊需求等"
            :rows="2"
          />
        </a-form-item>
      </a-form>
      <div class="order-summary">
        <span>合计金额：</span>
        <span class="total-price">¥{{ totalPrice.toFixed(2) }}</span>
      </div>
    </a-modal>

    <a-modal
      v-model:open="deliveryModalVisible"
      title="设置配送信息"
      width="400px"
      @ok="handleSubmitDelivery"
      @cancel="deliveryModalVisible = false"
      :confirm-loading="deliveryLoading"
    >
      <a-form :model="deliveryForm" layout="vertical">
        <a-form-item label="志愿者姓名">
          <a-input v-model:value="deliveryForm.volunteerName" placeholder="请输入志愿者姓名" />
        </a-form-item>
        <a-form-item label="预计送达时间">
          <a-time-picker
            v-model:value="deliveryForm.estimatedTime"
            style="width: 100%"
            format="HH:mm"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, ref as vueRef } from 'vue'
import { message } from 'ant-design-vue'
import dayjs, { Dayjs } from 'dayjs'
import {
  PlusOutlined,
  DownOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getOrderList,
  createOrder,
  updateOrderStatus,
  setDeliveryInfo,
  cancelOrder,
  OrderItem,
  OrderStatus,
  MealType,
  MealStandard,
  DeliveryType,
} from '@/api/orders'
import { getElderlyList, ElderlyItem } from '@/api/elderly'
import { getCanteenList, CanteenItem } from '@/api/canteens'
import { getTodayMenu, MenuDishItem, MEAL_TYPE_MAP } from '@/api/menus'

const userStore = useUserStore()

const loading = ref(false)
const dataSource = ref<OrderItem[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

const activeTab = ref('all')
const dateRange = ref<[Dayjs | null, Dayjs | null]>([null, null])

const queryForm = reactive({
  status: undefined as string | undefined,
  canteenId: undefined as string | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  mealType: undefined as string | undefined,
})

const canteenList = ref<CanteenItem[]>([])
const elderlyList = ref<ElderlyItem[]>([])

const canCreateOrder = computed(() => {
  return userStore.userInfo?.role === 'admin' || userStore.userInfo?.role === 'worker'
})

const canCancelOrder = computed(() => {
  return userStore.userInfo?.role === 'admin' || userStore.userInfo?.role === 'worker'
})

function canManageOrder(record: OrderItem): boolean {
  const role = userStore.userInfo?.role
  if (role === 'admin') return true
  if (role === 'canteen') return true
  return false
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    ordered: '已下单',
    confirmed: '已确认',
    preparing: '制作中',
    ready: '待取/待送',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ordered: 'blue',
    confirmed: 'cyan',
    preparing: 'orange',
    ready: 'gold',
    completed: 'green',
    cancelled: 'default',
  }
  return map[status] || 'default'
}

function getSubsidyText(category?: string): string {
  const map: Record<string, string> = {
    low_income_full: '全额补贴',
    low_income: '低收入',
    normal: '普通补贴',
  }
  return map[category || ''] || ''
}

function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD')
}

const columns = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
  { title: '老人信息', key: 'elderly', width: 180 },
  { title: '助餐点', key: 'canteen', width: 160 },
  { title: '餐食信息', key: 'mealInfo', width: 200 },
  { title: '配送方式', key: 'deliveryType', width: 160 },
  { title: '补贴/自付', key: 'subsidy', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

async function loadData() {
  loading.value = true
  try {
    const status = activeTab.value === 'all' ? undefined : activeTab.value
    const res = await getOrderList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      status,
      canteenId: queryForm.canteenId,
      startDate: queryForm.startDate,
      endDate: queryForm.endDate,
      mealType: queryForm.mealType,
    })
    dataSource.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

async function loadCanteens() {
  try {
    const res = await getCanteenList()
    canteenList.value = res
  } catch (e) {
    console.error(e)
  }
}

async function loadElderly() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 100 })
    elderlyList.value = res.list
  } catch (e) {
    console.error(e)
  }
}

function handleTabChange(key: string) {
  activeTab.value = key
  pagination.current = 1
  loadData()
}

function handleDateChange(dates: [Dayjs | null, Dayjs | null] | null) {
  if (dates && dates[0] && dates[1]) {
    queryForm.startDate = dates[0].format('YYYY-MM-DD')
    queryForm.endDate = dates[1].format('YYYY-MM-DD')
  } else {
    queryForm.startDate = undefined
    queryForm.endDate = undefined
  }
  pagination.current = 1
  loadData()
}

function handleSearch() {
  pagination.current = 1
  loadData()
}

function handleReset() {
  queryForm.status = undefined
  queryForm.canteenId = undefined
  queryForm.startDate = undefined
  queryForm.endDate = undefined
  queryForm.mealType = undefined
  dateRange.value = [null, null]
  activeTab.value = 'all'
  pagination.current = 1
  loadData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

const orderModalVisible = ref(false)
const submitLoading = ref(false)

const defaultOrderForm = {
  elderlyId: '',
  canteenId: '',
  mealDate: null as Dayjs | null,
  mealType: 'lunch' as MealType,
  mealStandard: 'B' as MealStandard,
  deliveryType: 'pickup' as DeliveryType,
  remark: '',
  orderMode: 'standard' as 'standard' | 'dishes',
  selectedDishes: [] as { dishId: string; dishName: string; price: number; quantity: number; category: string; isSoft: boolean }[],
}

const orderForm = reactive({ ...defaultOrderForm })

const menuDishes = ref<MenuDishItem[]>([])
const menuLoading = ref(false)

function handleAdd() {
  Object.assign(orderForm, defaultOrderForm)
  orderModalVisible.value = true
}

function disabledDate(current: Dayjs) {
  return current && current < dayjs().endOf('day')
}

function filterOption(input: string, option: any) {
  return option.children && option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const totalPrice = computed(() => {
  if (orderForm.orderMode === 'standard') {
    const prices: Record<string, number> = { A: 12, B: 15, C: 18 }
    return prices[orderForm.mealStandard] || 0
  } else {
    return orderForm.selectedDishes.reduce((sum, d) => sum + d.price * d.quantity, 0)
  }
})

async function loadMenu() {
  if (!orderForm.canteenId || !orderForm.mealDate || !orderForm.mealType) {
    menuDishes.value = []
    return
  }

  menuLoading.value = true
  try {
    const res = await getTodayMenu(
      orderForm.canteenId,
      orderForm.mealDate.format('YYYY-MM-DD')
    )
    if (orderForm.mealType === 'lunch') {
      menuDishes.value = res.lunch.dishes || []
    } else {
      menuDishes.value = res.dinner.dishes || []
    }
    orderForm.selectedDishes = orderForm.selectedDishes.filter(d =>
      menuDishes.value.some(md => md.dishId === d.dishId)
    )
  } catch (e) {
    console.error(e)
    message.warning('获取当日菜单失败，可能该助餐点未发布菜单')
    menuDishes.value = []
  } finally {
    menuLoading.value = false
  }
}

function isDishSelected(dishId: string): boolean {
  return orderForm.selectedDishes.some(d => d.dishId === dishId)
}

function toggleDish(dish: MenuDishItem) {
  const index = orderForm.selectedDishes.findIndex(d => d.dishId === dish.dishId)
  if (index > -1) {
    orderForm.selectedDishes.splice(index, 1)
  } else {
    orderForm.selectedDishes.push({
      dishId: dish.dishId,
      dishName: dish.dishName,
      price: dish.price,
      quantity: 1,
      category: dish.category,
      isSoft: dish.isSoft,
    })
  }
}

function updateDishQuantity(dishId: string, delta: number) {
  const dish = orderForm.selectedDishes.find(d => d.dishId === dishId)
  if (dish) {
    dish.quantity = Math.max(1, dish.quantity + delta)
  }
}

function removeDish(dishId: string) {
  const index = orderForm.selectedDishes.findIndex(d => d.dishId === dishId)
  if (index > -1) {
    orderForm.selectedDishes.splice(index, 1)
  }
}

async function handleSubmitOrder() {
  if (!orderForm.elderlyId || !orderForm.canteenId || !orderForm.mealDate || !orderForm.mealType) {
    message.warning('请填写完整订单信息')
    return
  }
  
  if (orderForm.orderMode === 'dishes' && orderForm.selectedDishes.length === 0) {
    message.warning('请选择至少一道菜品')
    return
  }
  
  submitLoading.value = true
  try {
    const orderData: any = {
      elderlyId: orderForm.elderlyId,
      canteenId: orderForm.canteenId,
      mealDate: orderForm.mealDate.format('YYYY-MM-DD'),
      mealType: orderForm.mealType,
      mealStandard: orderForm.mealStandard,
      remark: orderForm.remark,
      deliveryType: orderForm.deliveryType,
    }
    
    if (orderForm.orderMode === 'dishes' && orderForm.selectedDishes.length > 0) {
      orderData.orderDishes = orderForm.selectedDishes.map(d => ({
        dishId: d.dishId,
        quantity: d.quantity,
      }))
    }
    
    await createOrder(orderData)
    message.success('订单创建成功')
    orderModalVisible.value = false
    loadData()
  } finally {
    submitLoading.value = false
  }
}

async function handleStatusChange(record: OrderItem, status: string) {
  try {
    await updateOrderStatus(record._id, status as OrderStatus)
    message.success('状态更新成功')
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const deliveryModalVisible = ref(false)
const deliveryLoading = ref(false)
const deliveryForm = reactive({
  volunteerName: '',
  estimatedTime: '' as any,
})
const deliveryOrderId = ref('')

function handleSetDelivery(record: OrderItem) {
  deliveryOrderId.value = record._id
  deliveryForm.volunteerName = record.deliveryInfo?.volunteerName || ''
  deliveryForm.estimatedTime = record.deliveryInfo?.estimatedTime
    ? dayjs(record.deliveryInfo.estimatedTime, 'HH:mm')
    : null
  deliveryModalVisible.value = true
}

async function handleSubmitDelivery() {
  if (!deliveryForm.volunteerName || !deliveryForm.estimatedTime) {
    message.warning('请填写完整配送信息')
    return
  }
  
  deliveryLoading.value = true
  try {
    await setDeliveryInfo(deliveryOrderId.value, {
      volunteerName: deliveryForm.volunteerName,
      estimatedTime: dayjs(deliveryForm.estimatedTime).format('HH:mm'),
    })
    message.success('配送信息设置成功')
    deliveryModalVisible.value = false
    loadData()
  } finally {
    deliveryLoading.value = false
  }
}

async function handleCancel(record: OrderItem) {
  try {
    await cancelOrder(record._id)
    message.success('订单已取消')
    loadData()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadData()
  loadCanteens()
  if (canCreateOrder.value) {
    loadElderly()
  }
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.dish-selection-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 12px;
}

.loading-text {
  margin-left: 12px;
  font-weight: normal;
  color: #999;
  font-size: 12px;
}

.empty-menu {
  padding: 24px 0;
  text-align: center;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.dish-item-card {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.dish-item-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.dish-item-card.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.dish-item-card.is-soft {
  border-color: #b7eb8f;
}

.dish-item-card.is-soft.selected {
  background: #f6ffed;
  border-color: #52c41a;
}

.dish-item-card .dish-name {
  font-size: 13px;
  color: #262626;
  margin-bottom: 6px;
  font-weight: 500;
}

.dish-item-card .dish-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dish-item-card .dish-price {
  color: #fa8c16;
  font-weight: 500;
  font-size: 13px;
}

.selected-section {
  border-top: 1px dashed #d9d9d9;
  padding-top: 12px;
}

.selected-title {
  font-size: 13px;
  color: #595959;
  margin-bottom: 10px;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
}

.selected-name {
  flex: 1;
  font-size: 13px;
  color: #262626;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity {
  min-width: 24px;
  text-align: center;
  font-size: 13px;
}

.selected-price {
  color: #fa8c16;
  font-weight: 500;
  min-width: 60px;
  text-align: right;
}

.order-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
  font-size: 16px;
}

.total-price {
  color: #fa8c16;
  font-size: 20px;
  font-weight: bold;
  margin-left: 8px;
}
</style>
