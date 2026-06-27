<template>
  <div class="model-view fade-in">
    <div class="view-header">
      <h2>Quản Lý AI Model</h2>
      <button class="btn btn-primary" @click="triggerTraining" :disabled="triggering || isTraining">
        <svg v-if="!triggering && !isTraining" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 3l14 9-14 9V3z"/>
        </svg>
        <span v-if="triggering">Đang kích hoạt...</span>
        <span v-else-if="isTraining">Đang huấn luyện...</span>
        <span v-else>Huấn Luyện Thủ Công</span>
      </button>
    </div>

    <!-- Training Progress -->
    <div v-if="isTraining && progressData" class="card progress-card fade-in">
      <div class="progress-header">
        <div class="progress-title">
          <div class="spinner"></div>
          <h3>Tiến Độ Huấn Luyện</h3>
        </div>
        <span class="progress-percent">{{ progressData.progress }}%</span>
      </div>
      <div class="progress-message">{{ progressData.message || 'Đang thiết lập...' }}</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressData.progress + '%' }"></div>
      </div>
    </div>

    <!-- Skipped Classes Warning -->
    <div v-if="progressStore.skippedClasses.length" class="card skipped-warning fade-in">
      <div class="skipped-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <strong>Một số class đã bị bỏ qua khi huấn luyện</strong>
      </div>
      <p class="skipped-desc">Các loại lỗi sau đây có quá ít ảnh (<b>cần ít nhất 5 ảnh/class</b>) nên không được đưa vào training:</p>
      <div class="skipped-chips">
        <span v-for="cls in progressStore.skippedClasses" :key="cls.label" class="skipped-chip">
          <b>{{ cls.label }}</b> — {{ cls.count }} ảnh
        </span>
      </div>
      <p class="skipped-hint">→ Thêm thêm ảnh huấn luyện cho các class này trong <b>Quản Lý Loại Lỗi</b> rồi kích hoạt training lại.</p>
    </div>

    <div class="card current-model-card" v-if="currentModel">
      <div class="current-header">
        <div class="current-badge">
          <div class="pulse-dot"></div>
          Model Đang Hoạt Động
        </div>
        <span class="badge badge-active">Active</span>
      </div>
      <div class="current-body">
        <div class="model-version">{{ currentModel.version }}</div>
        <div class="model-meta-grid">
          <div class="meta-item">
            <span class="meta-key">Độ chính xác</span>
            <span class="meta-val accent">{{ currentModel.accuracy != null ? (currentModel.accuracy * 100).toFixed(1) + '%' : 'N/A' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-key">Số ảnh train</span>
            <span class="meta-val">{{ currentModel.trainedOn ?? 'N/A' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-key">Kích hoạt</span>
            <span class="meta-val">{{ formatTime(currentModel.activatedAt) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-key">Số loại lỗi</span>
            <span class="meta-val">{{ currentModel.defectTypes?.length ?? 0 }}</span>
          </div>
        </div>
        <div class="defect-chips" v-if="currentModel.defectTypes?.length">
          <span v-for="dt in currentModel.defectTypes" :key="dt._id" class="chip">{{ dt.code }}</span>
        </div>
      </div>
    </div>
    <div v-else class="card no-model">
      <p>Chưa có model nào đang hoạt động</p>
    </div>

    <!-- History -->
    <div class="card">
      <h3 class="section-title">Lịch Sử Huấn Luyện</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Version</th><th>Trạng Thái</th><th>Độ Chính Xác</th><th>Số Ảnh</th><th>Bắt Đầu</th><th>Hoàn Thành</th><th>Thao Tác</th></tr>
          </thead>
          <tbody>
            <tr v-if="!history.length"><td colspan="7" style="text-align:center;color:var(--color-text-muted)">Chưa có lịch sử</td></tr>
            <tr v-for="m in history" :key="m._id">
              <td><code class="code-tag">{{ m.version }}</code></td>
              <td>
                <span class="badge" :class="`badge-${m.status}`">{{ m.status }}</span>
                <div v-if="m.status === 'archived' && m.reason" class="error-hint" :title="m.reason">ⓘ Lỗi</div>
                <div v-if="m.status === 'training' && m.retryCount > 0" class="retry-hint">Thử lại: {{ m.retryCount }}/2</div>
              </td>
              <td>{{ m.accuracy != null ? (m.accuracy * 100).toFixed(1) + '%' : '—' }}</td>
              <td>{{ m.trainedOn ?? '—' }}</td>
              <td class="text-muted">{{ formatTime(m.trainStartedAt) }}</td>
              <td class="text-muted">{{ formatTime(m.trainCompletedAt) }}</td>
              <td>
                <button v-if="m.status === 'training'" class="btn btn-sm btn-danger" @click="cancelTraining(m._id)" style="padding: 2px 8px; font-size: 0.75rem;">Dừng</button>
                <button v-if="m.status === 'archived'" class="btn btn-sm btn-outline-danger" @click="deleteModel(m._id)" style="padding: 2px 8px; font-size: 0.75rem;">Xoá</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import http from '@/api/http'

import { useProgressStore } from '@/stores/progress.store'

const progressStore = useProgressStore()
const currentModel = ref<any>(null)
const history = ref<any[]>([])
const triggering = ref(false)

const isTraining = computed(() => {
  return history.value.some(m => m.status === 'training')
})

const progressData = computed(() => ({
  is_training: progressStore.trainingProgress !== null,
  progress: progressStore.trainingProgress || 0,
  message: progressStore.trainingMessage
}))

async function fetchData() {
  const [cur, hist]: [any, any] = await Promise.all([
    http.get('/ai-model/current'),
    http.get('/ai-model/history'),
  ])
  currentModel.value = cur
  history.value = hist.data ?? []
}

import { watch } from 'vue'

watch(() => progressStore.trainingProgress, (newVal, oldVal) => {
  if (oldVal !== null && newVal === null) {
    setTimeout(fetchData, 1000)
  }
})

async function triggerTraining() {
  if (!confirm('Kích hoạt huấn luyện model mới? Model hiện tại sẽ tiếp tục chạy cho đến khi training xong.')) return
  triggering.value = true
  try {
    await http.post('/ai-model/trigger-training')
    alert('Đã kích hoạt training! Bạn sẽ xem được tiến độ trên màn hình.')
    progressStore.startPolling()
    await fetchData()
  } finally {
    triggering.value = false
  }
}

async function cancelTraining(id: string) {
  if (!confirm('Bạn có chắc chắn muốn DỪNG tiến trình huấn luyện này?')) return
  try {
    await http.post(`/ai-model/${id}/cancel`)
    alert('Đã gửi yêu cầu dừng huấn luyện.')
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Có lỗi xảy ra khi dừng huấn luyện')
  }
}

async function deleteModel(id: string) {
  if (!confirm('Bạn có chắc chắn muốn XOÁ lịch sử huấn luyện này? Không thể khôi phục!')) return
  try {
    await http.delete(`/ai-model/${id}`)
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Có lỗi xảy ra khi xoá model')
  }
}

function formatTime(date: string) {
  return date ? new Date(date).toLocaleString('vi-VN') : '—'
}

onMounted(() => {
  fetchData()
  progressStore.pollTrainingProgress()
})
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.view-header h2 { font-size: 1.1rem; font-weight: 700; margin: 0; }

.current-model-card {
  background: linear-gradient(135deg, var(--color-surface), rgba(59,130,246,0.05));
  border-color: rgba(59,130,246,0.3);
  margin-bottom: 20px;
}
.current-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.current-badge { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); }
.pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-success); box-shadow: 0 0 8px var(--color-success); animation: pulse-ring 2s infinite; }

.model-version { font-size: 1.8rem; font-weight: 800; font-family: monospace; color: var(--color-text); margin-bottom: 16px; }

.model-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.meta-item { display: flex; flex-direction: column; gap: 4px; }
.meta-key { font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.meta-val { font-size: 0.95rem; font-weight: 600; color: var(--color-text); }
.meta-val.accent { color: var(--color-success); }

.defect-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 0.7rem; font-family: monospace; background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.2); color: #60a5fa; padding: 2px 8px; border-radius: 4px; }

.no-model { text-align: center; color: var(--color-text-muted); padding: 40px; margin-bottom: 20px; }
.section-title { font-size: 0.875rem; font-weight: 600; margin: 0 0 16px; }
.code-tag { font-family: monospace; font-size: 0.78rem; background: var(--color-surface-2); padding: 2px 6px; border-radius: 4px; }
.text-muted { font-size: 0.8rem; color: var(--color-text-muted); }

/* Progress Card */
.progress-card {
  margin-bottom: 20px;
  background: linear-gradient(to right, rgba(59,130,246,0.1), rgba(16,185,129,0.05));
  border-left: 4px solid var(--color-primary);
}
.progress-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.progress-title { display: flex; align-items: center; gap: 12px; }
.progress-title h3 { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-primary); }
.progress-percent { font-size: 1.2rem; font-weight: 700; color: var(--color-primary); }
.progress-message { font-size: 0.9rem; color: var(--color-text); margin-bottom: 12px; }

.progress-bar-bg { width: 100%; height: 8px; background: var(--color-surface-2); border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: var(--color-primary); transition: width 0.3s ease; }

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(59,130,246,0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-hint { font-size: 0.7rem; color: #ef4444; margin-top: 4px; cursor: help; font-weight: 600; }
.retry-hint { font-size: 0.7rem; color: #f59e0b; margin-top: 4px; font-weight: 600; }

/* Skipped Classes Warning */
.skipped-warning {
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05));
  border-left: 4px solid #f59e0b;
}
.skipped-header {
  display: flex; align-items: center; gap: 10px;
  color: #f59e0b; margin-bottom: 8px;
}
.skipped-desc { font-size: 0.85rem; color: var(--color-text-muted); margin: 0 0 10px; }
.skipped-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.skipped-chip {
  font-size: 0.78rem; font-family: monospace;
  background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
  color: #fbbf24; padding: 3px 10px; border-radius: 6px;
}
.skipped-hint { font-size: 0.8rem; color: var(--color-text-muted); margin: 0; }
</style>
