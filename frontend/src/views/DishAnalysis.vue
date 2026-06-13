<template>
  <div class="page">
    <div class="page-header">
      <a-form :model="queryForm" layout="inline">
        <a-form-item label="助餐点">
          <a-select
            v-model:value="queryForm.canteenId"
            placeholder="全部助餐点"
            style="width: 200px"
            allow-clear
            @change="loadAllData"
          >
            <a-select-option v-for="c in canteenList" :key="c._id" :value="c._id">
              {{ c.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日期范围">
          <a-range-picker
            v-model:value="dateRange"
            style="width: 280px"
            @change="handleDateChange"
          />
        </a-form-item>
        <a-form-item>
          <a-button @click="handleRefresh">
            <ReloadOutlined />
            刷新
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-row :gutter="16" class="stats-cards">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="总销量（份）"
            :value="totalStats.totalQuantity"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <FireOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="总销售额（元）"
            :value="totalStats.totalSales"
            :precision="2"
            :value-style="{ color: '#fa8c16' }"
          >
            <template #prefix>
              <DollarOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="在售菜品数"
            :value="dishCount"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>
              <CoffeeOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="滞销菜品数"
            :value="slowMovingCount"
            :value-style="{ color: '#ff4d4f' }"
          >
            <template #prefix>
              <ExclamationCircleOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="charts-section">
      <a-col :span="14">
        <a-card title="销量排行榜 TOP15" class="chart-card">
          <div ref="rankingChartRef" class="chart-container"></div>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="分类销量占比" class="chart-card">
          <div ref="categoryChartRef" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="滞销菜品清单" class="slow-moving-section">
      <a-table
        :columns="slowMovingColumns"
        :data-source="slowMovingDishes"
        :pagination="false"
        :loading="slowMovingLoading"
        row-key="dishId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'category'">
            <a-tag color="blue">{{ record.categoryName }}</a-tag>
          </template>
          <template v-else-if="column.key === 'totalQuantity'">
            <span :style="{ color: record.totalQuantity === 0 ? '#ff4d4f' : '#fa8c16' }">
              {{ record.totalQuantity }} 份
            </span>
          </template>
          <template v-else-if="column.key === 'isSoft'">
            <a-tag v-if="record.isSoft" color="green">软质</a-tag>
            <span v-else style="color: #999">-</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small">查看详情</a-button>
          </template>
        </template>
      </a-table>
      <div class="suggestion-text">
        <StarOutlined style="color: #faad14" />
        <span>建议：销量低于5份的菜品可考虑下架或调整菜品口味，增加宣传推广。</span>
      </div>
    </a-card>

    <a-card title="备餐量预估（明日）" class="preparation-section" v-if="canViewPreparation">
      <a-table
        :columns="preparationColumns"
        :data-source="preparationEstimates"
        :pagination="false"
        :loading="preparationLoading"
        row-key="dishId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'category'">
            <a-tag>{{ record.categoryName }}</a-tag>
          </template>
          <template v-else-if="column.key === 'bookedQuantity'">
            {{ record.bookedQuantity }} 份
          </template>
          <template v-else-if="column.key === 'avgHistoricalQuantity'">
            {{ record.avgHistoricalQuantity }} 份
          </template>
          <template v-else-if="column.key === 'estimatedQuantity'">
            <span style="font-weight: 600; color: #1890ff">
              {{ record.estimatedQuantity }} 份
            </span>
          </template>
          <template v-else-if="column.key === 'suggestionLevel'">
            <a-tag :color="getSuggestionColor(record.suggestionLevel)">
              {{ record.suggestion }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import {
  ReloadOutlined,
  FireOutlined,
  DollarOutlined,
  CoffeeOutlined,
  ExclamationCircleOutlined,
  StarOutlined,
} from '@ant-design/icons-vue'
import dayjs, { Dayjs } from 'dayjs'
import * as echarts from 'echarts'
import { useUserStore } from '@/stores/user'
import { getCanteenList, CanteenItem } from '@/api/canteens'
import {
  getSalesRanking,
  getCategoryStats,
  getSlowMovingDishes,
  getPreparationEstimate,
  SalesRankingItem,
  CategoryStats,
  SlowMovingDish,
  PreparationEstimate,
} from '@/api/dishStats'

const userStore = useUserStore()

const canteenList = ref<CanteenItem[]>([])
const dateRange = ref<[Dayjs | null, Dayjs | null]>([
  dayjs().subtract(30, 'day'),
  dayjs(),
])

const queryForm = reactive({
  canteenId: undefined as string | undefined,
  startDate: '',
  endDate: '',
})

const rankingChartRef = ref<HTMLElement>()
const categoryChartRef = ref<HTMLElement>()

let rankingChart: echarts.ECharts | null = null
let categoryChart: echarts.ECharts | null = null

const salesRanking = ref<SalesRankingItem[]>([])
const categoryStats = ref<CategoryStats[]>([])
const slowMovingDishes = ref<SlowMovingDish[]>([])
const preparationEstimates = ref<PreparationEstimate[]>([])

const slowMovingLoading = ref(false)
const preparationLoading = ref(false)

const totalStats = computed(() => {
  const totalQuantity = salesRanking.value.reduce((sum, item) => sum + item.totalQuantity, 0)
  const totalSales = salesRanking.value.reduce((sum, item) => sum + item.totalSales, 0)
  return { totalQuantity, totalSales }
})

const dishCount = computed(() => salesRanking.value.length)
const slowMovingCount = computed(() => slowMovingDishes.value.length)

const canViewPreparation = computed(() => {
  return userStore.userInfo?.role === 'admin' || userStore.userInfo?.role === 'canteen'
})

const slowMovingColumns = [
  { title: '排名', dataIndex: 'index', key: 'index', width: 60, customRender: ({ index }: any) => index + 1 },
  { title: '菜品名称', dataIndex: 'dishName', key: 'dishName', width: 180 },
  { title: '分类', key: 'category', width: 100 },
  { title: '售价', dataIndex: 'price', key: 'price', width: 100, customRender: ({ record }: any) => `¥${record.price}` },
  { title: '销量', key: 'totalQuantity', width: 100 },
  { title: '软质', key: 'isSoft', width: 80 },
  { title: '操作', key: 'action', width: 100 },
]

const preparationColumns = [
  { title: '菜品名称', dataIndex: 'dishName', key: 'dishName', width: 180 },
  { title: '分类', key: 'category', width: 100 },
  { title: '已预订', key: 'bookedQuantity', width: 100 },
  { title: '历史均量', key: 'avgHistoricalQuantity', width: 100 },
  { title: '预估备餐量', key: 'estimatedQuantity', width: 120 },
  { title: '建议', key: 'suggestionLevel', width: 180 },
]

function getSuggestionColor(level: string): string {
  const colorMap: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'green',
  }
  return colorMap[level] || 'default'
}

async function loadCanteens() {
  try {
    const res = await getCanteenList()
    canteenList.value = res
    
    if (userStore.userInfo?.role === 'canteen' && userStore.userInfo.canteenId) {
      queryForm.canteenId = userStore.userInfo.canteenId as string
    }
  } catch (e) {
    console.error(e)
  }
}

async function loadSalesRanking() {
  try {
    const res = await getSalesRanking({
      canteenId: queryForm.canteenId,
      startDate: queryForm.startDate,
      endDate: queryForm.endDate,
      limit: 15,
    })
    salesRanking.value = res
    nextTick(() => {
      renderRankingChart()
    })
  } catch (e) {
    console.error(e)
  }
}

async function loadCategoryStats() {
  try {
    const res = await getCategoryStats({
      canteenId: queryForm.canteenId,
      startDate: queryForm.startDate,
      endDate: queryForm.endDate,
    })
    categoryStats.value = res.categories
    nextTick(() => {
      renderCategoryChart()
    })
  } catch (e) {
    console.error(e)
  }
}

async function loadSlowMovingDishes() {
  slowMovingLoading.value = true
  try {
    const res = await getSlowMovingDishes({
      canteenId: queryForm.canteenId,
      startDate: queryForm.startDate,
      endDate: queryForm.endDate,
      threshold: 5,
    })
    slowMovingDishes.value = res
  } catch (e) {
    console.error(e)
  } finally {
    slowMovingLoading.value = false
  }
}

async function loadPreparationEstimate() {
  if (!canViewPreparation.value) return
  
  preparationLoading.value = true
  try {
    const res = await getPreparationEstimate({
      canteenId: queryForm.canteenId,
    })
    preparationEstimates.value = res.estimates
  } catch (e) {
    console.error(e)
  } finally {
    preparationLoading.value = false
  }
}

function renderRankingChart() {
  if (!rankingChartRef.value) return

  if (!rankingChart) {
    rankingChart = echarts.init(rankingChartRef.value)
  }

  const data = [...salesRanking.value].reverse()

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        const originalIndex = data.length - item.dataIndex - 1
        return `
          <div>${item.name}</div>
          <div>销量：${item.value} 份</div>
          <div>销售额：¥${salesRanking.value[originalIndex]?.totalSales?.toFixed(2) || 0}</div>
        `
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} 份' },
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.dishName),
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        name: '销量',
        type: 'bar',
        data: data.map(item => item.totalQuantity),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
          ]),
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: 16,
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: '#666',
        },
      },
    ],
  }

  rankingChart.setOption(option)
}

function renderCategoryChart() {
  if (!categoryChartRef.value) return

  if (!categoryChart) {
    categoryChart = echarts.init(categoryChartRef.value)
  }

  const data = categoryStats.value.map(item => ({
    name: item.categoryName,
    value: item.totalQuantity,
  }))

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 份 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
    },
    series: [
      {
        name: '分类销量',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data,
        color: colors,
      },
    ],
  }

  categoryChart.setOption(option)
}

function loadAllData() {
  loadSalesRanking()
  loadCategoryStats()
  loadSlowMovingDishes()
  loadPreparationEstimate()
}

function handleDateChange(dates: [Dayjs | null, Dayjs | null] | null) {
  if (dates && dates[0] && dates[1]) {
    queryForm.startDate = dates[0].format('YYYY-MM-DD')
    queryForm.endDate = dates[1].format('YYYY-MM-DD')
  } else {
    queryForm.startDate = ''
    queryForm.endDate = ''
  }
  loadAllData()
}

function handleRefresh() {
  loadAllData()
}

function handleResize() {
  rankingChart?.resize()
  categoryChart?.resize()
}

onMounted(() => {
  loadCanteens().then(() => {
    if (dateRange.value[0] && dateRange.value[1]) {
      queryForm.startDate = dateRange.value[0].format('YYYY-MM-DD')
      queryForm.endDate = dateRange.value[1].format('YYYY-MM-DD')
    }
    loadAllData()
  })

  window.addEventListener('resize', handleResize)
})

watch(
  () => queryForm.canteenId,
  () => {
    loadAllData()
  }
)
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.stats-cards {
  margin-bottom: 16px;
}

.charts-section {
  margin-bottom: 16px;
}

.chart-card {
  height: 420px;
}

.chart-container {
  width: 100%;
  height: 340px;
}

.slow-moving-section {
  margin-bottom: 16px;
}

.suggestion-text {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fffbe6;
  border-radius: 4px;
  color: #d48806;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preparation-section {
  margin-bottom: 16px;
}
</style>
