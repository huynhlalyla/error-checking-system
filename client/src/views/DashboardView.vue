<template>
  <div class="dashboard fade-in">
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <div class="kpi-label">Tổng Kiểm Tra</div>
        <div class="kpi-value">{{ stats?.total ?? '—' }}</div>
        <div class="kpi-sub">Hôm nay & 7 ngày qua</div>
        <div class="kpi-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-label">Sản Phẩm Lỗi</div>
        <div class="kpi-value">{{ stats?.defective ?? '—' }}</div>
        <div class="kpi-sub">Tỷ lệ: {{ defectRatePct }}%</div>
        <div class="kpi-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
      </div>
      <div class="kpi-card kpi-amber">
        <div class="kpi-label">Chờ Duyệt</div>
        <div class="kpi-value">{{ pendingCount ?? '—' }}</div>
        <div class="kpi-sub">Ảnh cần xét duyệt</div>
        <div class="kpi-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
        </div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-label">Cảnh Báo</div>
        <div class="kpi-value">{{ alertsStore.unreadCount }}</div>
        <div class="kpi-sub">Chưa đọc</div>
        <div class="kpi-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="charts-grid">
      <!-- Trend line chart -->
      <div class="card chart-card">
        <div class="chart-header">
          <h3>Xu Hướng Lỗi (7 Ngày)</h3>
        </div>
        <Line v-if="trendChartData" :data="trendChartData" :options="lineOptions" style="height: 220px;" />
        <div v-else class="chart-empty">Đang tải dữ liệu...</div>
      </div>

      <!-- Pie distribution -->
      <div class="card chart-card">
        <div class="chart-header">
          <h3>Phân Bổ Loại Lỗi</h3>
        </div>
        <Doughnut v-if="pieChartData" :data="pieChartData" :options="pieOptions" style="height: 220px;" />
        <div v-else class="chart-empty">Chưa có dữ liệu</div>
      </div>
    </div>

    <!-- Production lines + Recent alerts -->
    <div class="bottom-grid">
      <div class="card">
        <h3 class="section-title">Vị Trí Kiểm Tra</h3>
        <div class="line-list">
          <div v-for="line in stats?.byLine" :key="line._id" class="line-item">
            <div class="line-name">{{ line._id || 'Không xác định' }}</div>
            <div class="line-bar-wrap">
              <div class="line-bar" :style="{ width: lineRate(line) + '%', background: lineColor(line) }"></div>
            </div>
            <div class="line-stats">
              <span>{{ line.defective }}/{{ line.total }}</span>
              <span class="line-pct" :style="{ color: lineColor(line) }">{{ lineRate(line) }}%</span>
            </div>
          </div>
          <div v-if="!stats?.byLine?.length" class="empty-state">Không có dữ liệu</div>
        </div>
      </div>

      <div class="card">
        <h3 class="section-title">Cảnh Báo Gần Đây</h3>
        <div class="alert-list">
          <div v-for="alert in recentAlerts" :key="alert._id" class="alert-item" :class="alert.severity">
            <div class="alert-dot"></div>
            <div class="alert-body">
              <div class="alert-msg">{{ alert.message }}</div>
              <div class="alert-time">{{ formatTime(alert.createdAt) }}</div>
            </div>
          </div>
          <div v-if="!recentAlerts.length" class="empty-state">Không có cảnh báo</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import http from '@/api/http'
import { useAlertsStore } from '@/stores/alerts.store'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const alertsStore = useAlertsStore()
const stats = ref<any>(null)
const pendingCount = ref<number>(0)

const defectRatePct = computed(() =>
  stats.value ? ((stats.value.defectRate ?? 0) * 100).toFixed(1) : '0'
)

const recentAlerts = computed(() =>
  alertsStore.alerts.slice(0, 5)
)

// Line chart data
const trendChartData = computed(() => {
  if (!stats.value?.byDay?.length) return null
  const labels = stats.value.byDay.map((d: any) => d._id)
  return {
    labels,
    datasets: [
      {
        label: 'Tổng',
        data: stats.value.byDay.map((d: any) => d.total),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Lỗi',
        data: stats.value.byDay.map((d: any) => d.defective),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  }
})

const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } }, tooltip: { mode: 'index' as const } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1f2d45' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1f2d45' } },
  },
}

// Pie chart data
const COLORS = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4']
const pieChartData = computed(() => {
  if (!stats.value?.byDefectType?.length) return null
  return {
    labels: stats.value.byDefectType.map((d: any) => d.code ?? 'Unknown'),
    datasets: [{
      data: stats.value.byDefectType.map((d: any) => d.count),
      backgroundColor: COLORS,
      borderWidth: 0,
    }],
  }
})

const pieOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } },
  },
  cutout: '65%',
}

function lineRate(line: any) {
  return line.total > 0 ? ((line.defective / line.total) * 100).toFixed(1) : '0'
}
function lineColor(line: any) {
  const rate = line.total > 0 ? line.defective / line.total : 0
  if (rate >= 0.5) return '#ef4444'
  if (rate >= 0.3) return '#f59e0b'
  return '#10b981'
}

function formatTime(date: string) {
  return new Date(date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

onMounted(async () => {
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [statsData, pendingData]: [any, any] = await Promise.all([
    http.get('/inspections/stats', { params: { from } }),
    http.get('/images/pending', { params: { limit: 1 } }),
  ])
  stats.value = statsData
  pendingCount.value = pendingData.total ?? 0
})
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 20px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi-label { font-size: 0.75rem; font-weight: 500; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-value { font-size: 2rem; font-weight: 800; color: var(--color-text); margin: 6px 0 2px; }
.kpi-sub   { font-size: 0.72rem; color: var(--color-text-muted); }
.kpi-icon  { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); opacity: 0.15; }

.charts-grid  { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
.chart-card   { display: flex; flex-direction: column; }
.chart-header h3 { font-size: 0.875rem; font-weight: 600; color: var(--color-text); margin: 0 0 16px; }
.chart-empty  { color: var(--color-text-muted); font-size: 0.8rem; text-align: center; padding: 40px; }

.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.section-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); margin: 0 0 16px; }

.line-list   { display: flex; flex-direction: column; gap: 12px; }
.line-item   { display: grid; grid-template-columns: 120px 1fr 80px; align-items: center; gap: 12px; }
.line-name   { font-size: 0.8rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line-bar-wrap { background: var(--color-surface-2); border-radius: 4px; height: 6px; overflow: hidden; }
.line-bar    { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.line-stats  { display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; color: var(--color-text-muted); }
.line-pct    { font-weight: 700; }

.alert-list  { display: flex; flex-direction: column; gap: 10px; }
.alert-item  { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: var(--radius-sm); }
.alert-item.warning  { background: rgba(245,158,11,.05); border-left: 3px solid #f59e0b; }
.alert-item.critical { background: rgba(239,68,68,.05);  border-left: 3px solid #ef4444; }
.alert-dot   { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.alert-item.warning  .alert-dot { background: #f59e0b; }
.alert-item.critical .alert-dot { background: #ef4444; animation: pulse-ring 2s infinite; }
.alert-body  { flex: 1; min-width: 0; }
.alert-msg   { font-size: 0.8rem; color: var(--color-text); line-height: 1.4; }
.alert-time  { font-size: 0.7rem; color: var(--color-text-muted); margin-top: 3px; }

.empty-state { color: var(--color-text-muted); font-size: 0.8rem; text-align: center; padding: 24px; }

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .bottom-grid { grid-template-columns: 1fr; }
}
</style>
