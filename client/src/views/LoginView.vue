<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-card fade-in">
      <div class="login-header">
        <div class="login-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
        </div>
        <h1>AOI Error Checking</h1>
        <p>Hệ thống kiểm tra lỗi tự động</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label>Tên đăng nhập</label>
          <input id="login-username" v-model="username" type="text" class="input" placeholder="Nhập username" autocomplete="username" required />
        </div>
        <div class="field">
          <label>Mật khẩu</label>
          <input id="login-password" v-model="password" type="password" class="input" placeholder="Nhập mật khẩu" autocomplete="current-password" required />
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button id="login-submit" type="submit" class="btn btn-primary w-full" :disabled="loading">
          <span v-if="loading">Đang đăng nhập...</span>
          <span v-else>Đăng nhập</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.message ?? 'Đăng nhập thất bại'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 60%);
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}
.login-logo {
  width: 64px; height: 64px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem;
  color: white;
  box-shadow: 0 8px 24px rgba(59,130,246,0.4);
}
.login-header h1 {
  font-size: 1.4rem; font-weight: 700;
  color: var(--color-text); margin: 0 0 4px;
}
.login-header p { color: var(--color-text-muted); font-size: 0.875rem; margin: 0; }

.login-form { display: flex; flex-direction: column; gap: 1.25rem; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.8rem; font-weight: 500; color: var(--color-text-muted); }

.error-msg {
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.3);
  color: #f87171;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 0.85rem;
}

.w-full { width: 100%; justify-content: center; padding: 12px; font-size: 0.95rem; }
</style>
