<template>
  <div class="defect-detail-view fade-in">
    <!-- Header -->
    <div class="view-header" v-if="defect">
      <div class="header-left">
        <RouterLink to="/defect-types" class="back-btn">← Quay lại</RouterLink>
        <div class="title-wrap">
          <h2>{{ defect.name }}</h2>
          <code class="code-tag">{{ defect.code }}</code>
        </div>
      </div>
      <div class="header-right">
        <button class="btn btn-ghost icon-btn" @click="openSettings" title="Cài đặt lỗi">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Info Card -->
    <div class="card info-card" v-if="defect">
      <div class="info-row">
        <span class="info-label">Trạng thái:</span>
        <span class="badge" :class="defect.isActive ? 'badge-active' : 'badge-archived'">
          {{ defect.isActive ? 'Hoạt động' : 'Tắt' }}
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Mức độ:</span>
        <span class="badge" :class="`badge-${defect.severity}`">{{ defect.severity }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Mô tả:</span>
        <span class="info-value">{{ defect.description || 'Chưa có mô tả' }}</span>
      </div>
    </div>

    <!-- Samples Section -->
    <div class="samples-section" v-if="defect">
      <div class="section-header">
        <h3>Ảnh Mẫu Lỗi ({{ samples.length }})</h3>
        <button class="btn btn-primary" @click="triggerUpload">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          Tải ảnh lên
        </button>
        <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="handleUpload" multiple />
      </div>

      <div v-if="uploadingTotal > 0" class="upload-progress-wrap">
        <div class="progress-info">
          <span>Đang tải lên {{ uploadedCount }} / {{ uploadingTotal }} ảnh...</span>
          <span>{{ Math.round((uploadedCount / uploadingTotal) * 100) }}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: (uploadedCount / uploadingTotal * 100) + '%' }"></div>
        </div>
      </div>

      <div v-if="loadingSamples" class="loading-state">Đang tải ảnh mẫu...</div>
      
      <div v-else-if="samples.length === 0" class="empty-view">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        <p>Chưa có ảnh mẫu nào cho lỗi này.</p>
        <button class="btn btn-ghost btn-sm" @click="triggerUpload">Bắt đầu tải lên</button>
      </div>

      <div v-else class="image-grid">
        <div v-for="(sample, index) in samples" :key="index" class="image-card">
          <div class="image-wrap">
            <img :src="`/${(sample.filePath || sample).replace(/\\/g,'/')}`" class="preview-img" @error="onImgError" />
            <div class="image-overlay">
              <button class="btn btn-danger btn-icon delete-btn" @click="deleteSample(sample.filePath || sample)" title="Xoá ảnh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              
              <div class="overlay-meta">
                <div class="meta-row">
                  <span class="meta-label">Người gửi:</span>
                  <span class="meta-value">{{ sample.uploadedBy?.username || 'Không rõ' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Vai trò:</span>
                  <span class="badge" :class="getRoleClass(sample.uploadedBy?.role)">{{ sample.uploadedBy?.role || 'N/A' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Thời gian:</span>
                  <span class="meta-value">{{ formatTime(sample.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!defect && !loading" class="empty-view">
      <h3>Không tìm thấy loại lỗi</h3>
      <RouterLink to="/defect-types" class="btn btn-primary">Quay lại danh sách</RouterLink>
    </div>

    <!-- Edit Modal (Reused logic) -->
    <Teleport to="body">
      <div v-if="showEdit" class="modal-backdrop" @click.self="closeEdit">
        <div class="modal-box fade-in" style="max-width:480px">
          <div class="modal-header">
            <h3>Cài Đặt Loại Lỗi</h3>
            <button class="close-btn" @click="closeEdit">✕</button>
          </div>
          <div class="modal-body" style="flex-direction:column; gap:14px; padding: 20px 24px;">
            <div class="field">
              <label>Mã lỗi (Không thể sửa)</label>
              <input v-model="editForm.code" class="input" disabled />
            </div>
            <div class="field">
              <label>Tên lỗi <span style="color:#ef4444">*</span></label>
              <input v-model="editForm.name" class="input" />
            </div>
            <div class="field">
              <label>Mô tả</label>
              <input v-model="editForm.description" class="input" />
            </div>
            <div class="field">
              <label>Mức độ nghiêm trọng</label>
              <select v-model="editForm.severity" class="input">
                <option value="low">Low — Thấp</option>
                <option value="medium">Medium — Trung bình</option>
                <option value="high">High — Cao</option>
                <option value="critical">Critical — Nghiêm trọng</option>
              </select>
            </div>
            <div class="field" style="margin-top: 10px;">
              <button class="btn btn-danger" @click="removeDefect" style="width:100%">Xoá Loại Lỗi Này</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeEdit">Huỷ</button>
            <button class="btn btn-primary" @click="saveEdit" :disabled="submitting">Lưu</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import { useProgressStore } from '@/stores/progress.store'

const progressStore = useProgressStore()
const route = useRoute()
const router = useRouter()
const defectCode = route.params.code as string

const defect = ref<any>(null)
const loading = ref(true)
const samples = ref<any[]>([])
const loadingSamples = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const showEdit = ref(false)
const submitting = ref(false)
const editForm = reactive({ code: '', name: '', description: '', severity: 'medium' })

async function fetchDefect() {
  loading.value = true
  try {
    const data: any = await http.get('/defect-types')
    const list = Array.isArray(data) ? data : data.data ?? []
    defect.value = list.find((d: any) => d.code === defectCode)
    if (defect.value) {
      await fetchSamples()
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function fetchSamples() {
  loadingSamples.value = true
  try {
    const data: any = await http.get(`/defect-types/${defectCode}/samples`)
    samples.value = data
  } catch (e) {
    console.error('Failed to load samples', e)
  }
  loadingSamples.value = false
}

function triggerUpload() {
  fileInput.value?.click()
}

const uploadingTotal = ref(0)
const uploadedCount = ref(0)

async function handleUpload(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files || files.length === 0) return

  uploadingTotal.value = files.length
  uploadedCount.value = 0

  // Upload in chunks of 3 to avoid overwhelming the browser/server
  const concurrency = 3;
  let active = 0;
  let index = 0;

  return new Promise<void>((resolve) => {
    const next = async () => {
      if (index >= files.length) {
        if (active === 0) {
          uploadingTotal.value = 0;
          progressStore.uploadProgress = null;
          fetchSamples();
          resolve();
        }
        return;
      }

      const file = files[index++];
      active++;

      const formData = new FormData();
      formData.append('image', file);

      try {
        await http.post(`/defect-types/${defectCode}/samples`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (e) {
        console.error('Upload failed', e);
      } finally {
        uploadedCount.value++;
        progressStore.uploadProgress = Math.round((uploadedCount.value / uploadingTotal.value) * 100);
        active--;
        next();
      }
    };

    for (let i = 0; i < concurrency; i++) next();
  });
}

async function deleteSample(samplePath: string) {
  if (!confirm('Bạn có chắc muốn xoá ảnh này?')) return
  try {
    const filename = samplePath.split('/').pop()
    await http.delete(`/defect-types/${defectCode}/samples/${filename}`)
    fetchSamples()
  } catch (e) {
    console.error('Delete failed', e)
  }
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

function openSettings() {
  Object.assign(editForm, defect.value)
  showEdit.value = true
}

function closeEdit() { showEdit.value = false }

async function saveEdit() {
  submitting.value = true
  try {
    await http.put(`/defect-types/${defect.value._id}`, editForm)
    Object.assign(defect.value, editForm)
    closeEdit()
  } catch (e) {
    alert('Lỗi khi lưu')
  }
  submitting.value = false
}

async function removeDefect() {
  if (!confirm('Bạn có chắc xoá hoàn toàn loại lỗi này? Hành động này không thể hoàn tác.')) return
  submitting.value = true
  try {
    await http.delete(`/defect-types/${defect.value._id}`)
    router.push('/defect-types')
  } catch (e) {
    alert('Lỗi khi xoá')
  }
  submitting.value = false
}

onMounted(fetchDefect)
</script>

<style scoped>
.defect-detail-view {
  max-width: 1000px;
  margin: 0 auto;
}
.view-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px;
}
.header-left { display: flex; flex-direction: column; gap: 8px; }
.back-btn {
  color: var(--color-text-muted); text-decoration: none; font-size: 0.85rem;
  transition: color 0.2s; display: inline-flex; align-items: center;
}
.back-btn:hover { color: var(--color-primary); }
.title-wrap { display: flex; align-items: center; gap: 12px; }
.title-wrap h2 { margin: 0; font-size: 1.4rem; font-weight: 700; }
.code-tag { font-family: monospace; font-size: 0.9rem; background: var(--color-surface-2); padding: 4px 8px; border-radius: 6px; }

.info-card {
  display: flex; gap: 24px; padding: 20px 24px; margin-bottom: 32px;
  background: var(--color-surface);
}
.info-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
.info-label { color: var(--color-text-muted); }
.info-value { color: var(--color-text); font-weight: 500; }

.samples-section { display: flex; flex-direction: column; gap: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }

.upload-progress-wrap { background: var(--color-surface); padding: 16px 20px; border-radius: 8px; border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 10px; }
.progress-info { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; }
.progress-bar-bg { width: 100%; height: 6px; background: var(--color-surface-2); border-radius: 3px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: var(--color-primary); transition: width 0.2s ease; }

.image-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;
}
.image-card {
  display: flex; flex-direction: column; gap: 8px;
}
.image-wrap {
  position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1;
  background: var(--color-surface-2); border: 1px solid var(--color-border);
}
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.image-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.6);
  opacity: 0; transition: opacity 0.2s;
}
.image-wrap:hover .image-overlay { opacity: 1; }

.delete-btn {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
}

.overlay-meta {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 20px 12px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  display: flex; flex-direction: column; gap: 6px;
}
.meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; }
.meta-label { color: rgba(255,255,255,0.7); }
.meta-value { color: #fff; font-weight: 500; }

.loading-state, .empty-view {
  text-align: center; padding: 60px; color: var(--color-text-muted);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: var(--color-surface); border-radius: 12px; border: 1px dashed var(--color-border);
}

.icon-btn { padding: 6px; display: flex; align-items: center; justify-content: center; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-box { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border); }
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 1.1rem; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--color-border); }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.8rem; color: var(--color-text-muted); }
</style>
