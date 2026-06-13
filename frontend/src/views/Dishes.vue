<template>
  <div class="page">
    <div class="page-header">
      <a-form :model="queryForm" layout="inline">
        <a-form-item label="分类筛选">
          <a-select
            v-model:value="queryForm.category"
            placeholder="全部分类"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option v-for="item in categoryOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="queryForm.status"
            placeholder="全部状态"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="on_shelf">上架</a-select-option>
            <a-select-option value="off_shelf">下架</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关键词">
          <a-input
            v-model:value="queryForm.keyword"
            placeholder="菜品名称"
            style="width: 180px"
            allow-clear
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item>
          <a-button @click="handleSearch" type="primary">
            <SearchOutlined />
            搜索
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button @click="handleReset">重置</a-button>
        </a-form-item>
        <a-form-item style="float: right">
          <a-button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增菜品
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="pagination"
      :loading="loading"
      row-key="_id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="dish-name-cell">
            <div class="dish-name">{{ record.name }}</div>
            <div v-if="record.description" class="dish-desc">{{ record.description }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'category'">
          <a-tag :color="getCategoryColor(record.category)">
            {{ CATEGORY_MAP[record.category] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'price'">
          <span class="price">¥{{ record.price }}</span>
        </template>
        <template v-else-if="column.key === 'costPrice'">
          <span>¥{{ record.costPrice }}</span>
        </template>
        <template v-else-if="column.key === 'tasteTags'">
          <div class="taste-tags">
            <a-tag v-for="tag in record.tasteTags" :key="tag" color="blue">
              {{ TASTE_TAG_MAP[tag] }}
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'isSoft'">
          <a-tag v-if="record.isSoft" color="green">
            <SmileOutlined />
            软质
          </a-tag>
          <span v-else style="color: #999">-</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 'on_shelf' ? 'green' : 'default'">
            {{ STATUS_MAP[record.status] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleEdit(record)">
            编辑
          </a-button>
          <a-button
            type="link"
            size="small"
            @click="handleToggleStatus(record)"
          >
            {{ record.status === 'on_shelf' ? '下架' : '上架' }}
          </a-button>
          <a-popconfirm
            title="确定删除该菜品？"
            @confirm="handleDelete(record)"
          >
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑菜品' : '新增菜品'"
      width="600px"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
      :confirm-loading="submitLoading"
      :mask-closable="false"
    >
      <a-form :model="formData" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="菜品名称"
              :rules="[{ required: true, message: '请输入菜品名称' }]"
            >
              <a-input v-model:value="formData.name" placeholder="请输入菜品名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="菜品分类"
              :rules="[{ required: true, message: '请选择菜品分类' }]"
            >
              <a-select v-model:value="formData.category" placeholder="请选择分类">
                <a-select-option v-for="item in categoryOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="售价（元）"
              :rules="[{ required: true, message: '请输入售价' }]"
            >
              <a-input-number
                v-model:value="formData.price"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入售价"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="成本价（元）"
              :rules="[{ required: true, message: '请输入成本价' }]"
            >
              <a-input-number
                v-model:value="formData.costPrice"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入成本价"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="口味标签">
              <a-checkbox-group v-model:value="formData.tasteTags">
                <a-checkbox value="light">清淡</a-checkbox>
                <a-checkbox value="moderate">适中</a-checkbox>
                <a-checkbox value="heavy">重口</a-checkbox>
              </a-checkbox-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="是否软质">
              <a-switch v-model:checked="formData.isSoft" checked-children="是" un-checked-children="否" />
              <span style="margin-left: 12px; color: #999; font-size: 12px">
                适合咀嚼弱的老人
              </span>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="状态">
          <a-radio-group v-model:value="formData.status">
            <a-radio value="on_shelf">上架</a-radio>
            <a-radio value="off_shelf">下架</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number
            v-model:value="formData.sortOrder"
            :min="0"
            style="width: 120px"
            placeholder="数字越小越靠前"
          />
        </a-form-item>
        <a-form-item label="菜品描述">
          <a-textarea
            v-model:value="formData.description"
            :rows="3"
            placeholder="请输入菜品描述（选填）"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  SmileOutlined,
} from '@ant-design/icons-vue'
import {
  getDishList,
  createDish,
  updateDish,
  deleteDish,
  updateDishStatus,
  DishItem,
  DishCategory,
  DishStatus,
  TasteTag,
  CATEGORY_MAP,
  TASTE_TAG_MAP,
  STATUS_MAP,
} from '@/api/dishes'

const loading = ref(false)
const dataSource = ref<DishItem[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

const queryForm = reactive({
  category: undefined as string | undefined,
  status: undefined as string | undefined,
  keyword: undefined as string | undefined,
})

const categoryOptions = computed(() => {
  return Object.entries(CATEGORY_MAP).map(([value, label]) => ({ value, label }))
})

const columns = [
  { title: '菜品名称', dataIndex: 'name', key: 'name', width: 180 },
  { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
  { title: '售价', dataIndex: 'price', key: 'price', width: 100 },
  { title: '成本价', dataIndex: 'costPrice', key: 'costPrice', width: 100 },
  { title: '口味', dataIndex: 'tasteTags', key: 'tasteTags', width: 160 },
  { title: '软质', dataIndex: 'isSoft', key: 'isSoft', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const modalVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const editingId = ref('')

const defaultFormData = {
  name: '',
  category: '' as DishCategory | '',
  price: 0,
  costPrice: 0,
  tasteTags: [] as TasteTag[],
  isSoft: false,
  status: 'on_shelf' as DishStatus,
  sortOrder: 0,
  description: '',
}

const formData = reactive({ ...defaultFormData })

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    staple: 'gold',
    meat: 'red',
    vegetable: 'green',
    soup: 'blue',
    porridge: 'orange',
    fruit: 'purple',
  }
  return colorMap[category] || 'default'
}

async function loadData() {
  loading.value = true
  try {
    const res = await getDishList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      category: queryForm.category,
      status: queryForm.status,
      keyword: queryForm.keyword,
    })
    dataSource.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  loadData()
}

function handleReset() {
  queryForm.category = undefined
  queryForm.status = undefined
  queryForm.keyword = undefined
  pagination.current = 1
  loadData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function handleAdd() {
  isEdit.value = false
  editingId.value = ''
  Object.assign(formData, defaultFormData)
  modalVisible.value = true
}

function handleEdit(record: DishItem) {
  isEdit.value = true
  editingId.value = record._id
  Object.assign(formData, {
    name: record.name,
    category: record.category,
    price: record.price,
    costPrice: record.costPrice,
    tasteTags: [...record.tasteTags],
    isSoft: record.isSoft,
    status: record.status,
    sortOrder: record.sortOrder,
    description: record.description || '',
  })
  modalVisible.value = true
}

async function handleSubmit() {
  if (!formData.name || !formData.category) {
    message.warning('请填写必填项')
    return
  }

  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateDish(editingId.value, formData as any)
      message.success('更新成功')
    } else {
      await createDish(formData as any)
      message.success('创建成功')
    }
    modalVisible.value = false
    loadData()
  } catch (e: any) {
    message.error(e?.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleToggleStatus(record: DishItem) {
  try {
    const newStatus: DishStatus = record.status === 'on_shelf' ? 'off_shelf' : 'on_shelf'
    await updateDishStatus(record._id, newStatus)
    message.success(newStatus === 'on_shelf' ? '已上架' : '已下架')
    loadData()
  } catch (e: any) {
    message.error(e?.message || '操作失败')
  }
}

async function handleDelete(record: DishItem) {
  try {
    await deleteDish(record._id)
    message.success('删除成功')
    loadData()
  } catch (e: any) {
    message.error(e?.message || '删除失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.dish-name-cell {
  display: flex;
  flex-direction: column;
}

.dish-name {
  font-weight: 500;
  color: #262626;
}

.dish-desc {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.price {
  color: #fa8c16;
  font-weight: 500;
}

.taste-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
