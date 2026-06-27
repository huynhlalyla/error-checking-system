<template>
  <div class="inspections-view fade-in">
    <div class="view-header">
      <h2>Lịch Sử Kiểm Tra</h2>
      <div class="filters">
        <input v-model="filterLine" class="input filter-input" placeholder="Vị trí..." @change="fetchData" />
        <select v-model="filterDefective" class="input filter-input" @change="fetchData">
          <option value="">Tất cả</option>
          <option value="true">Có lỗi</option>
          <option value="false">Không lỗi</option>
        </select>
        <input v-model="filterFrom" type="date" class="input filter-input" @change="fetchData" />
        <input v-model="filterTo"   type="date" class="input filter-input" @change="fetchData" />
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">Ảnh</th>
              <th>Sản Phẩm</th>
              <th>Vị Trí</th>
              <th>Kết Quả</th>
              <th>Độ Tin Cậy</th>
              <th>Loại Lỗi</th>
              <th>Model</th>
              <th>Thời Gian</th>
              <th style="width: 80px; text-align: center;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="9" style="text-align:center;color:var(--color-text-muted)">Đang tải...</td></tr>
            <tr v-else-if="!items.length"><td colspan="9" style="text-align:center;color:var(--color-text-muted)">Không có dữ liệu</td></tr>
            <tr v-for="item in items" :key="item._id" class="clickable-row" :class="{ 'incorrect-row': item.isIncorrect }">
              <td style="text-align: center; position: relative;" @click="openModal(item)">
                <img v-if="item.imageId?.filePath" :src="`/${item.imageId.filePath.replace(/\\/g,'/')}`" class="thumb-img" @error="onImgError" />
                <span v-else>—</span>
                <div v-if="item.isIncorrect" class="incorrect-stamp">SAI SÓT</div>
              </td>
              <td @click="openModal(item)"><span class="mono">{{ item.productId ?? '—' }}</span></td>
              <td @click="openModal(item)">{{ item.location ?? '—' }}</td>
              <td @click="openModal(item)">
                <div v-if="item.status === 'processing'" class="loader-spinner" style="margin: 0 auto;"></div>
                <span v-else-if="item.isUnknown" class="badge badge-unknown">Không xác định</span>
                <span v-else-if="item.isDefective" class="badge badge-high">Có lỗi</span>
                <span v-else class="badge badge-approved">Đạt</span>
              </td>
              <td @click="openModal(item)">
                <div v-if="item.status === 'processing'" class="loader-spinner" style="margin: 0 auto;"></div>
                <span v-else>{{ item.imageId?.confidence ? (item.imageId.confidence * 100).toFixed(1) + '%' : '—' }}</span>
              </td>
              <td @click="openModal(item)">
                <div v-if="item.status === 'processing'" class="loader-spinner" style="margin: 0 auto;"></div>
                <span v-else-if="item.defectType">
                  <span class="badge" :class="`badge-${item.defectType.severity}`">{{ item.defectType.code }}</span>
                </span>
                <span v-else class="text-muted">—</span>
              </td>
              <td @click="openModal(item)">
                <div v-if="item.status === 'processing'" class="loader-spinner" style="margin: 0 auto;"></div>
                <span v-else class="mono">{{ item.modelVersion ?? '—' }}</span>
              </td>
              <td class="text-muted" @click="openModal(item)">{{ formatTime(item.inspectedAt) }}</td>
              <td style="text-align: center;">
                <button v-if="item.status !== 'processing' && !item.isIncorrect && !item.isUnknown" class="btn btn-icon btn-incorrect" title="Đánh dấu sai sót" @click.stop="markIncorrect(item)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="text-muted">Tổng: {{ total }} bản ghi</span>
        <div class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="page === 1" @click="page--; fetchData()">←</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="page >= totalPages" @click="page++; fetchData()">→</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="modalItem" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box fade-in">
          <div class="modal-header">
            <h3>Chi Tiết Kiểm Tra</h3>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-img-wrap">
              <img v-if="modalItem.imageId?.filePath" :src="`/${modalItem.imageId.filePath.replace(/\\/g,'/')}`" class="modal-img" @error="onImgError" />
            </div>
            <div class="modal-info">
              <div class="info-row">
                <span class="info-label">Sản phẩm:</span>
                <span class="info-value mono">{{ modalItem.productId || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Vị trí:</span>
                <span class="info-value">{{ modalItem.location || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Kết quả:</span>
                <span v-if="modalItem.isUnknown" class="badge badge-unknown">Không xác định</span>
                <span v-else-if="modalItem.isDefective" class="badge badge-high">Có lỗi</span>
                <span v-else class="badge badge-approved">Đạt</span>
              </div>
              <div class="info-row" v-if="modalItem.defectType">
                <span class="info-label">Loại lỗi:</span>
                <span class="badge" :class="`badge-${modalItem.defectType.severity}`">{{ modalItem.defectType.code }} - {{ modalItem.defectType.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Thời gian:</span>
                <span class="info-value">{{ formatTime(modalItem.inspectedAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Nguồn gửi:</span>
                <span class="info-value">{{ modalItem.imageId?.source === 'aoi_machine' ? 'Máy quét tự động' : 'Nhân viên' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phiên bản Model:</span>
                <span class="info-value mono">{{ modalItem.modelVersion || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'
import { useSocket } from '@/composables/useSocket'

const { getSocket } = useSocket()

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const filterLine = ref('')
const filterDefective = ref('')
const filterFrom = ref('')
const filterTo = ref('')
const LIMIT = 20
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))

const modalItem = ref<any>(null)

async function fetchData() {
  loading.value = true
  const params: any = { page: page.value, limit: LIMIT }
  if (filterLine.value) params.location = filterLine.value
  if (filterDefective.value !== '') params.isDefective = filterDefective.value
  if (filterFrom.value) params.from = filterFrom.value
  if (filterTo.value) params.to = filterTo.value
  try {
    const res: any = await http.get('/inspections', { params })
    items.value = res.data || []
    total.value = res.total || 0
  } catch (err) {
    console.error(err)
    items.value = []
    total.value = 0
  }
  loading.value = false
}

async function markIncorrect(item: any) {
  if (!confirm('Bạn có chắc chắn đánh dấu nhận diện sai cho ảnh này? Ảnh sẽ được chuyển về hàng chờ duyệt.')) return
  try {
    await http.post(`/inspections/${item._id}/incorrect`)
    item.isIncorrect = true
    item.isUnknown = true
    item.isDefective = false
    alert('Đã đánh dấu sai sót và chuyển về chờ duyệt.')
    await fetchData()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Có lỗi xảy ra')
  }
}

function formatTime(date: string) {
  return date ? new Date(date).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) : '—'
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%231a2235"/><text x="50" y="55" text-anchor="middle" fill="%2364748b" font-size="12">No Image</text></svg>'
}

function openModal(item: any) {
  modalItem.value = item
}

function closeModal() {
  modalItem.value = null
}

onMounted(() => {
  fetchData()
  
  const socket = getSocket()
  if (!socket) return

  // Listen for new image uploads
  socket.on('imageProcessing', (newImage: any) => {
    const dummyInspection = {
      _id: 'temp-' + newImage._id,
      imageId: newImage,
      productId: newImage.productId,
      location: newImage.location,
      status: 'processing',
      inspectedAt: newImage.createdAt
    }
    items.value.unshift(dummyInspection)
    total.value++
    if (items.value.length > LIMIT) {
      items.value.pop()
    }
  })

  // Listen for real-time inspection events
  socket.on('inspectionResult', (newInspection: any) => {
    // Find if we have a temporary processing item and replace it
    const index = items.value.findIndex(item => item.imageId?._id === newInspection.imageId?._id)
    if (index !== -1) {
      items.value[index] = newInspection
    } else {
      items.value.unshift(newInspection)
      total.value++
      if (items.value.length > LIMIT) {
        items.value.pop()
      }
    }
  })
})
</script>

<style scoped>
.loader-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-bottom-color: var(--color-primary);
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}
@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.view-header h2 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.filters { display: flex; gap: 10px; flex-wrap: wrap; }
.filter-input { width: 160px; }
.mono { font-family: monospace; font-size: 0.8rem; }
.text-muted { color: var(--color-text-muted); font-size: 0.8rem; }
.table-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 0 0; }
.pagination { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--color-text-muted); }
.btn-sm { padding: 5px 10px; }

.clickable-row { cursor: pointer; transition: background-color 0.15s; }
.clickable-row:hover { background-color: var(--color-surface-2); }
.thumb-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border); }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  width: 100%; max-width: 600px;
  max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 1.2rem; }

.modal-body { padding: 24px; display: flex; gap: 24px; }
.modal-img-wrap { flex-shrink: 0; }
.modal-img { width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border); }
.incorrect-row {
  opacity: 0.6;
  text-decoration: line-through;
  background: rgba(239, 68, 68, 0.05);
  pointer-events: none; /* Prevent click modal */
}
.incorrect-row td {
  color: var(--color-text-muted);
}
.incorrect-stamp {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  font-weight: 800;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  border: 2px solid white;
  z-index: 10;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}
.btn-incorrect {
  color: #ef4444;
  opacity: 0.5;
}
.btn-incorrect:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.1);
}
</style>
