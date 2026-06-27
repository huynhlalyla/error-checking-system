<template>
  <div class="alerts-view fade-in">
    <div class="view-header">
      <h2>Cảnh Báo Rủi Ro</h2>
      <div class="header-actions">
        <label class="toggle-label">
          <input type="checkbox" v-model="showUnread" @change="fetchAlerts" /> Chỉ chưa đọc
        </label>
        <button class="btn btn-ghost btn-sm" @click="markAll">Đọc tất cả</button>
      </div>
    </div>

    <div class="alert-list">
      <div v-if="loading" class="empty-state">Đang tải...</div>
      <div v-else-if="!alertsStore.alerts.length" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <p>Không có cảnh báo nào</p>
      </div>

      <div v-for="alert in alertsStore.alerts" :key="alert._id"
           class="alert-card card-sm"
           :class="[alert.severity, { unread: !alert.isRead }]"
           @click="readAlert(alert)">
        <div class="alert-left">
          <div class="alert-severity-icon" :class="alert.severity">
            <svg v-if="alert.severity === 'critical'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
          </div>
        </div>
        <div class="alert-body">
          <div class="alert-title">
            <span class="badge" :class="alert.severity === 'critical' ? 'badge-critical' : 'badge-medium'">
              {{ alert.severity === 'critical' ? 'Nghiêm Trọng' : 'Cảnh Báo' }}
            </span>
            <span v-if="alert.productionLine" class="line-tag">{{ alert.productionLine }}</span>
            <span v-if="!alert.isRead" class="unread-dot"></span>
          </div>
          <div class="alert-message">{{ alert.message }}</div>
          <div class="alert-time">{{ formatTime(alert.createdAt) }}</div>
          <div v-if="alert.type === 'model_retrain_needed'" style="margin-top: 10px;">
            <button class="btn btn-primary btn-sm" @click.stop="triggerRetrain(alert)">Khởi động huấn luyện lại</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAlertsStore } from '@/stores/alerts.store'
import http from '@/api/http'

const alertsStore = useAlertsStore()
const showUnread = ref(false)
const loading = ref(false)

async function fetchAlerts() {
  loading.value = true
  await alertsStore.fetchAlerts(showUnread.value)
  loading.value = false
}

async function readAlert(alert: any) {
  if (!alert.isRead) await alertsStore.markRead(alert._id)
}

async function triggerRetrain(alert: any) {
  if (confirm('Xác nhận tiến hành huấn luyện lại mô hình với dữ liệu mới nhất?')) {
    try {
      await http.post('/ai-model/trigger-training')
      alert('Đã khởi động quá trình huấn luyện lại mô hình ngầm thành công.')
      await readAlert(alert)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gọi huấn luyện')
    }
  }
}

async function markAll() {
  await alertsStore.markAllRead()
}

function formatTime(date: string) {
  return date ? new Date(date).toLocaleString('vi-VN') : '—'
}

onMounted(fetchAlerts)
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.view-header h2 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 16px; }
.toggle-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--color-text-muted); cursor: pointer; }
.btn-sm { padding: 6px 14px; }

.alert-list { display: flex; flex-direction: column; gap: 10px; }
.empty-state { text-align: center; padding: 60px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }

.alert-card { display: flex; align-items: flex-start; gap: 14px; cursor: pointer; transition: all 0.18s; border-left: 3px solid transparent; }
.alert-card.warning  { border-left-color: #f59e0b; }
.alert-card.critical { border-left-color: #ef4444; }
.alert-card.unread   { background: var(--color-surface); }
.alert-card:hover    { transform: translateX(2px); }

.alert-severity-icon {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.alert-severity-icon.warning  { background: rgba(245,158,11,.15); color: #f59e0b; }
.alert-severity-icon.critical { background: rgba(239,68,68,.15);  color: #ef4444; }

.alert-body { flex: 1; min-width: 0; }
.alert-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.line-tag { font-size: 0.72rem; background: var(--color-surface-2); border: 1px solid var(--color-border); padding: 2px 8px; border-radius: 4px; color: var(--color-text-muted); }
.unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); }
.alert-message { font-size: 0.85rem; color: var(--color-text); line-height: 1.5; margin-bottom: 4px; }
.alert-time { font-size: 0.72rem; color: var(--color-text-muted); }
</style>
