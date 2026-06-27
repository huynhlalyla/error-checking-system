<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
        </div>
        <div>
          <div class="logo-title">AOI System</div>
          <div class="logo-sub">Error Checking</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink v-for="item in navItems" :key="item.path" :to="item.path" class="nav-item" active-class="active">
          <span class="nav-icon" v-html="item.icon"></span>
          {{ item.label }}
          <template v-if="item.path === '/defect-types' && progressStore.uploadProgress !== null && !route.path.startsWith('/defect-types')">
            <div class="nav-progress">
              <div class="nav-progress-fill" :style="{ width: progressStore.uploadProgress + '%' }">
                <span class="nav-progress-badge" style="color: var(--color-success)">{{ progressStore.uploadProgress }}%</span>
              </div>
            </div>
          </template>
          <template v-if="item.path === '/model' && progressStore.trainingProgress !== null && !route.path.startsWith('/model')">
            <div class="nav-progress">
              <div class="nav-progress-fill nav-progress-training" :style="{ width: progressStore.trainingProgress + '%' }">
                <span class="nav-progress-badge" style="color: var(--color-primary)">{{ progressStore.trainingProgress }}%</span>
              </div>
            </div>
          </template>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ user?.username?.[0]?.toUpperCase() }}</div>
          <div>
            <div class="user-name">{{ user?.username }}</div>
            <div class="user-role">{{ user?.role }}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="main-wrapper">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-title">{{ currentPageTitle }}</div>
        <div class="topbar-actions">
          <!-- WebSocket status -->
          <div class="ws-indicator" :class="{ connected }">
            <span class="ws-dot"></span>
            {{ connected ? 'Live' : 'Offline' }}
          </div>
          <!-- Theme Toggle -->
          <button class="theme-toggle-btn" @click="toggleDark" :title="isDark ? 'Giao diện Sáng' : 'Giao diện Tối'">
            <svg v-if="isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          </button>
          <!-- Alert bell -->
          <RouterLink to="/alerts" class="bell-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span v-if="alertsStore.unreadCount > 0" class="bell-badge">{{ alertsStore.unreadCount }}</span>
          </RouterLink>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAlertsStore } from '@/stores/alerts.store'
import { useProgressStore } from '@/stores/progress.store'
import { useSocket } from '@/composables/useSocket'

const auth = useAuthStore()
const alertsStore = useAlertsStore()
const progressStore = useProgressStore()
const route = useRoute()
const router = useRouter()
const { connected, connect } = useSocket()

const user = computed(() => auth.user)

const navItems = [
  { path: '/dashboard',    label: 'Dashboard',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
  { path: '/inspections',  label: 'Kiểm Tra',     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>' },
  { path: '/review',       label: 'Duyệt Ảnh',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M14 10l7-7M8 21H3v-6M10 14l-7 7"/></svg>' },
  { path: '/defect-types', label: 'Loại Lỗi',     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>' },
  { path: '/accounts',     label: 'Tài Khoản',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>' },
  { path: '/alerts',       label: 'Cảnh Báo',     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>' },
  { path: '/model',        label: 'AI Model',      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>' },
]

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard Tổng Quan',
  inspections: 'Lịch Sử Kiểm Tra',
  review: 'Duyệt & Gắn Nhãn Ảnh',
  'defect-types': 'Quản Lý Loại Lỗi',
  accounts: 'Quản Lý Tài Khoản',
  alerts: 'Cảnh Báo Rủi Ro',
  model: 'Quản Lý AI Model',
}

const currentPageTitle = computed(() => pageTitles[route.name as string] ?? 'AOI System')

const isDark = ref(true)

function toggleDark() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'light') {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  } else {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }

  connect()
  alertsStore.fetchAlerts()
  progressStore.startPolling()
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8px;
}
.logo-icon {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: white;
  flex-shrink: 0;
}
.logo-title { font-size: 0.95rem; font-weight: 700; color: var(--color-text); }
.logo-sub   { font-size: 0.7rem; color: var(--color-text-muted); }

.sidebar-nav { flex: 1; padding: 4px 0; overflow-y: auto; }
.nav-icon { display: flex; align-items: center; flex-shrink: 0; }

.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; margin-bottom: 4px;
  color: var(--color-text-muted); text-decoration: none;
  border-radius: var(--radius-md); font-size: 0.95rem; font-weight: 500;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.nav-item:hover { background: var(--color-surface-2); color: var(--color-text); }
.nav-item.active { background: rgba(59,130,246,0.1); color: var(--color-primary); font-weight: 600; }
.nav-icon { display: flex; align-items: center; opacity: 0.8; }
.nav-item.active .nav-icon { opacity: 1; }

.nav-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: transparent;
}
.nav-progress-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.3s ease;
}
.nav-progress-training {
  background: var(--color-primary);
}

.sidebar-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  gap: 8px;
}
.user-info { display: flex; align-items: center; gap: 10px; min-width: 0; }
.user-avatar {
  width: 34px; height: 34px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; color: white;
  flex-shrink: 0;
}
.user-name  { font-size: 0.8rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role  { font-size: 0.68rem; color: var(--color-text-muted); text-transform: capitalize; }
.btn-sm     { padding: 6px 10px; }

.main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.topbar-title { font-size: 1rem; font-weight: 600; color: var(--color-text); }
.topbar-actions { display: flex; align-items: center; gap: 16px; }

.ws-indicator {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.72rem; font-weight: 500; color: var(--color-text-muted);
}
.ws-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--color-text-muted);
  transition: background 0.3s;
}
.ws-indicator.connected .ws-dot { background: var(--color-success); box-shadow: 0 0 6px var(--color-success); }
.ws-indicator.connected { color: var(--color-success); }

.bell-btn {
  position: relative;
  display: flex; align-items: center;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.18s;
  text-decoration: none;
}
.bell-btn:hover { color: var(--color-text); }
.bell-badge {
  position: absolute; top: -6px; right: -8px;
  background: var(--color-danger);
  color: white; font-size: 0.6rem; font-weight: 700;
  width: 18px; height: 18px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.theme-toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.18s;
  padding: 4px;
}
.theme-toggle-btn:hover { color: var(--color-text); }
</style>
