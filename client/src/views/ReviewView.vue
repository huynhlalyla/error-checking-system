<template>
  <div class="review-view fade-in">
    <div class="view-header">
      <h2>Duyệt & Gắn Nhãn Ảnh</h2>
      <div class="header-meta">
        <span class="badge badge-pending">{{ total }} ảnh chờ duyệt</span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Đang tải...</div>

    <div v-else-if="images.length === 0" class="empty-view">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
      </svg>
      <p>Không có ảnh nào chờ duyệt</p>
    </div>

    <div v-else class="image-grid">
      <div v-for="img in images" :key="img._id" class="image-item">
        <div class="image-wrap" @click="openModal(img)">
          <img :src="`/${img.filePath?.replace(/\\/g,'/')}`" :alt="img._id" class="preview-img" @error="onImgError" />
          <div class="image-overlay">
            <span class="overlay-text">Bấm để duyệt</span>
            <div class="overlay-meta">
              <div class="meta-row">
                <span class="meta-label">Người gửi:</span>
                <span class="meta-value">{{ img.uploadedBy?.username || 'Không rõ' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Sản phẩm:</span>
                <span class="meta-value">{{ img.productId || 'N/A' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Vị trí:</span>
                <span class="meta-value">{{ img.location || 'N/A' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Vai trò:</span>
                <span class="badge" :class="getRoleClass(img.uploadedBy?.role)">{{ img.uploadedBy?.role || 'N/A' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Trạng thái:</span>
                <span class="badge" :class="getStatusClass(img.status)">{{ getStatusText(img.status) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Thời gian:</span>
                <span class="meta-value">{{ formatTime(img.createdAt) }}</span>
              </div>
              <div class="meta-row" v-if="img.predictedLabel">
                <span class="meta-label">Dự đoán:</span>
                <span class="meta-value">{{ img.predictedLabel?.code }} ({{ (img.confidence * 100).toFixed(0) }}%)</span>
              </div>
              <div class="meta-row" v-if="img.isUnknown">
                <span class="badge badge-unknown" style="margin-top: 4px;">Không xác định</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-ghost btn-sm" :disabled="page === 1" @click="page--; fetchImages()">← Trước</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost btn-sm" :disabled="page === totalPages" @click="page++; fetchImages()">Sau →</button>
    </div>

    <!-- Approve Modal -->
    <Teleport to="body">
      <div v-if="modalImage" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box fade-in">
          <div class="modal-header">
            <h3>Duyệt Ảnh</h3>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <img :src="`/${modalImage.filePath?.replace(/\\/g,'/')}`" class="modal-img" @error="onImgError" />
            <div class="modal-info">
              <div v-if="modalImage.predictedLabel" class="info-row">
                <span>Model dự đoán:</span>
                <strong>{{ modalImage.predictedLabel?.code }} — {{ (modalImage.confidence * 100).toFixed(1) }}%</strong>
              </div>
              <div v-if="modalImage.isUnknown" class="info-row">
                <span class="badge badge-unknown">Lỗi không xác định</span>
              </div>
              <div class="field">
                <label>Gắn nhãn loại lỗi</label>
                <select id="label-select" v-model="selectedLabel" class="input">
                  <option value="">— Không phải lỗi —</option>
                  <option v-for="dt in defectTypes" :key="dt._id" :value="dt.code">
                    {{ dt.code }} — {{ dt.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger" @click="submitReject" :disabled="submitting">Từ Chối</button>
            <button class="btn btn-success" @click="submitApprove" :disabled="submitting">
              {{ submitting ? 'Đang lưu...' : 'Xác Nhận & Duyệt' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'

const images = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const modalImage = ref<any>(null)
const selectedLabel = ref('')
const submitting = ref(false)
const defectTypes = ref<any[]>([])

const LIMIT = 12
const totalPages = computed(() => Math.ceil(total.value / LIMIT))

async function fetchImages() {
  loading.value = true
  const data: any = await http.get('/images/pending', { params: { page: page.value, limit: LIMIT } })
  images.value = data.data
  total.value = data.total
  loading.value = false
}

function openModal(img: any) {
  modalImage.value = img
  selectedLabel.value = img.predictedLabel?.code ?? ''
}
function closeModal() { modalImage.value = null; selectedLabel.value = '' }

async function submitApprove() {
  if (!modalImage.value) return
  submitting.value = true
  try {
    await http.post(`/review/${modalImage.value._id}/approve`, {
      defectTypeCode: selectedLabel.value || null,
    })
    images.value = images.value.filter((i) => i._id !== modalImage.value!._id)
    total.value--
    closeModal()
  } finally {
    submitting.value = false
  }
}

async function submitReject() {
  if (!modalImage.value) return
  submitting.value = true
  try {
    await http.post(`/review/${modalImage.value._id}/reject`, {})
    images.value = images.value.filter((i) => i._id !== modalImage.value!._id)
    total.value--
    closeModal()
  } finally {
    submitting.value = false
  }
}

async function quickReject(id: string) {
  await http.post(`/review/${id}/reject`, {})
  images.value = images.value.filter((i) => i._id !== id)
  total.value--
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%231a2235"/><text x="50" y="55" text-anchor="middle" fill="%2364748b" font-size="12">No Image</text></svg>'
}

function formatTime(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getRoleClass(role: string) {
  if (role === 'admin') return 'badge-danger';
  if (role === 'inspector') return 'badge-success';
  if (role === 'device') return 'badge-warning';
  return 'badge-unknown';
}

function getStatusText(status: string) {
  if (status === 'pending') return 'Chờ duyệt';
  if (status === 'approved') return 'Đã duyệt';
  if (status === 'rejected') return 'Từ chối';
  return 'Chờ duyệt';
}

function getStatusClass(status: string) {
  if (status === 'pending') return 'badge-warning';
  if (status === 'approved') return 'badge-success';
  if (status === 'rejected') return 'badge-danger';
  return 'badge-warning';
}

onMounted(async () => {
  fetchImages()
  const dt: any = await http.get('/defect-types', { params: { active: 'true' } })
  defectTypes.value = Array.isArray(dt) ? dt : dt.data ?? []
})
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.view-header h2 { font-size: 1.1rem; font-weight: 700; margin: 0; }

.loading-state, .empty-view {
  text-align: center; padding: 60px; color: var(--color-text-muted);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}

.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }

.image-item { display: flex; flex-direction: column; transition: transform 0.18s; border-radius: 8px; overflow: hidden; }
.image-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

.image-wrap { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 4/3; cursor: pointer; background: var(--color-bg); }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.image-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.6);
  opacity: 0; transition: opacity 0.2s;
}
.image-wrap:hover .image-overlay { opacity: 1; }
.overlay-text { 
  position: absolute; top: 12px; left: 0; right: 0; 
  text-align: center; color: white; font-size: 0.8rem; font-weight: 600; 
}

.overlay-meta {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 30px 12px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  display: flex; flex-direction: column; gap: 6px;
}
.meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; }
.meta-label { color: rgba(255,255,255,0.7); }
.meta-value { color: #fff; font-weight: 500; }


.btn-sm { padding: 6px 12px; font-size: 0.8rem; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-info { font-size: 0.85rem; color: var(--color-text-muted); }

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
  width: 100%; max-width: 700px;
  max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 1.1rem; }

.modal-body { padding: 20px 24px; display: flex; gap: 20px; }
.modal-img { width: 280px; height: 210px; object-fit: cover; border-radius: 10px; flex-shrink: 0; }
.modal-info { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--color-text-muted); }
.info-row strong { color: var(--color-text); }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.8rem; color: var(--color-text-muted); }
select.input { cursor: pointer; }

.modal-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}
</style>
