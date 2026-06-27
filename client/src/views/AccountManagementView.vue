<template>
  <div class="accounts-view fade-in">
    <div class="view-header">
      <h2>Quản lý Tài khoản & Token</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openCreateUserModal">Tạo Tài khoản</button>
        <button class="btn btn-secondary" @click="openCreateTokenModal">Tạo Token</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Đang tải danh sách tài khoản...</div>

    <div class="table-container" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>Tên đăng nhập / Thiết bị</th>
            <th>Phân quyền</th>
            <th>Trạng thái</th>
            <th>Hạn sử dụng</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user._id">
            <td>
              <div class="username-cell">
                <strong>{{ user.username }}</strong>
                <span v-if="user.role === 'device' && user.apiKey" class="api-key-badge" @click="copyApiKey(user.apiKey)" title="Copy API Key">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px; vertical-align:text-bottom"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Token
                </span>
              </div>
            </td>
            <td>
              <span class="badge" :class="getRoleClass(user.role)">{{ user.role }}</span>
            </td>
            <td>
              <span class="badge" :class="getStatusClass(user)">{{ getStatusText(user) }}</span>
            </td>
            <td>
              <span :class="{ 'expired-text': isExpired(user) }">
                {{ user.expiresAt ? formatDate(user.expiresAt) : 'Vĩnh viễn' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-ghost" @click="toggleFreeze(user)" :title="user.isFrozen ? 'Mở khoá' : 'Đóng băng'">
                  <svg v-if="user.isFrozen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </button>
                <button class="btn btn-sm btn-ghost" @click="openExtendModal(user)" title="Gia hạn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </button>
                <button class="btn btn-sm btn-ghost danger-text" @click="deleteUser(user)" title="Xoá">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create User Modal -->
    <Teleport to="body">
      <div v-if="showUserModal" class="modal-backdrop" @click.self="closeModals">
        <div class="modal-box fade-in">
          <div class="modal-header">
            <h3>Tạo Tài khoản User mới</h3>
            <button class="close-btn" @click="closeModals">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Tên đăng nhập *</label>
              <input v-model="userForm.username" type="text" class="input" placeholder="Nhập username" />
            </div>
            <div class="field">
              <label>Mật khẩu *</label>
              <input v-model="userForm.password" type="password" class="input" placeholder="Mật khẩu (ít nhất 6 ký tự)" />
            </div>
            <div class="field">
              <label>Vai trò *</label>
              <select v-model="userForm.role" class="input">
                <option value="inspector">Inspector (Nhân viên)</option>
                <option value="admin">Admin (Quản trị viên)</option>
              </select>
            </div>
            <div class="field">
              <label>Thời hạn hoạt động</label>
              <select v-model="userForm.duration" class="input">
                <option value="1">1 ngày</option>
                <option value="7">7 ngày</option>
                <option value="30">30 ngày</option>
                <option value="permanent">Vĩnh viễn</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModals">Hủy</button>
            <button class="btn btn-primary" @click="submitUser" :disabled="submitting">Lưu</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Token Modal -->
    <Teleport to="body">
      <div v-if="showTokenModal" class="modal-backdrop" @click.self="closeModals">
        <div class="modal-box fade-in">
          <div class="modal-header">
            <h3>Tạo Token Máy (Device)</h3>
            <button class="close-btn" @click="closeModals">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Tên máy / Thiết bị *</label>
              <input v-model="tokenForm.username" type="text" class="input" placeholder="Ví dụ: AOI_Machine_01" />
            </div>
            <div class="field">
              <label>Thời hạn Token (Tối đa 14 ngày)</label>
              <select v-model="tokenForm.duration" class="input">
                <option value="1">1 ngày</option>
                <option value="7">7 ngày</option>
                <option value="14">14 ngày</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModals">Hủy</button>
            <button class="btn btn-secondary" @click="submitToken" :disabled="submitting">Tạo Token</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Extend Modal -->
    <Teleport to="body">
      <div v-if="showExtendModal" class="modal-backdrop" @click.self="closeModals">
        <div class="modal-box fade-in">
          <div class="modal-header">
            <h3>Gia hạn Tài khoản</h3>
            <button class="close-btn" @click="closeModals">✕</button>
          </div>
          <div class="modal-body">
            <p>Gia hạn cho: <strong>{{ extendingUser?.username }}</strong></p>
            <div class="field">
              <label>Chọn thời gian gia hạn</label>
              <select v-model="extendDuration" class="input">
                <option value="1">Thêm 1 ngày</option>
                <option value="7">Thêm 7 ngày</option>
                <option v-if="extendingUser?.role !== 'device'" value="30">Thêm 30 ngày</option>
                <option v-if="extendingUser?.role !== 'device'" value="permanent">Đổi thành vĩnh viễn</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeModals">Hủy</button>
            <button class="btn btn-success" @click="submitExtend" :disabled="submitting">Xác nhận Gia hạn</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import http from '@/api/http'

const users = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)

const showUserModal = ref(false)
const showTokenModal = ref(false)
const showExtendModal = ref(false)

const userForm = ref({ username: '', password: '', role: 'inspector', duration: 'permanent' })
const tokenForm = ref({ username: '', duration: '14' })

const extendingUser = ref<any>(null)
const extendDuration = ref('7')

async function fetchUsers() {
  loading.value = true
  try {
    const res: any = await http.get('/users')
    users.value = res || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

function openCreateUserModal() {
  userForm.value = { username: '', password: '', role: 'inspector', duration: 'permanent' }
  showUserModal.value = true
}

function openCreateTokenModal() {
  tokenForm.value = { username: '', duration: '14' }
  showTokenModal.value = true
}

function openExtendModal(user: any) {
  extendingUser.value = user
  extendDuration.value = user.role === 'device' ? '7' : '30'
  showExtendModal.value = true
}

function closeModals() {
  showUserModal.value = false
  showTokenModal.value = false
  showExtendModal.value = false
  extendingUser.value = null
}

function getExpiresAt(durationStr: string) {
  if (durationStr === 'permanent') return null
  const d = new Date()
  d.setDate(d.getDate() + parseInt(durationStr))
  return d.toISOString()
}

async function submitUser() {
  if (!userForm.value.username || !userForm.value.password) return alert('Vui lòng nhập đầy đủ!')
  submitting.value = true
  try {
    await http.post('/users', {
      username: userForm.value.username,
      password: userForm.value.password,
      role: userForm.value.role,
      expiresAt: getExpiresAt(userForm.value.duration)
    })
    closeModals()
    fetchUsers()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Lỗi tạo user')
  } finally {
    submitting.value = false
  }
}

async function submitToken() {
  if (!tokenForm.value.username) return alert('Vui lòng nhập tên máy!')
  submitting.value = true
  try {
    const res: any = await http.post('/users', {
      username: tokenForm.value.username,
      role: 'device',
      expiresAt: getExpiresAt(tokenForm.value.duration)
    })
    closeModals()
    fetchUsers()
    setTimeout(() => {
      alert('Tạo Token thành công!\nAPI KEY:\n\n' + res.apiKey + '\n\nHãy copy lưu lại ngay vì key sẽ bị ẩn đi một phần.')
    }, 500)
  } catch (e: any) {
    alert(e.response?.data?.message || 'Lỗi tạo token')
  } finally {
    submitting.value = false
  }
}

async function toggleFreeze(user: any) {
  if (!confirm(`Bạn muốn ${user.isFrozen ? 'mở khoá' : 'đóng băng'} ${user.username}?`)) return
  await http.put(`/users/${user._id}/freeze`)
  fetchUsers()
}

async function deleteUser(user: any) {
  if (!confirm(`Xoá vĩnh viễn ${user.username}? Không thể hoàn tác!`)) return
  await http.delete(`/users/${user._id}`)
  fetchUsers()
}

async function submitExtend() {
  if (!extendingUser.value) return
  submitting.value = true
  let newDate = null
  if (extendDuration.value !== 'permanent') {
    const baseDate = isExpired(extendingUser.value) || !extendingUser.value.expiresAt 
      ? new Date() 
      : new Date(extendingUser.value.expiresAt)
    baseDate.setDate(baseDate.getDate() + parseInt(extendDuration.value))
    newDate = baseDate.toISOString()
  }
  
  try {
    await http.put(`/users/${extendingUser.value._id}/extend`, { expiresAt: newDate })
    closeModals()
    fetchUsers()
  } catch (e) {
    alert('Lỗi gia hạn')
  } finally {
    submitting.value = false
  }
}

function copyApiKey(key: string) {
  navigator.clipboard.writeText(key)
  alert('Đã copy API Key: ' + key)
}

function isExpired(user: any) {
  if (!user.expiresAt) return false
  return new Date(user.expiresAt) < new Date()
}

function getStatusText(user: any) {
  if (user.isFrozen) return 'Đã đóng băng'
  if (isExpired(user)) return 'Đã hết hạn'
  return 'Hoạt động'
}

function getStatusClass(user: any) {
  if (user.isFrozen) return 'badge-danger'
  if (isExpired(user)) return 'badge-warning'
  return 'badge-success'
}

function getRoleClass(role: string) {
  if (role === 'admin') return 'badge-danger'
  if (role === 'inspector') return 'badge-success'
  if (role === 'device') return 'badge-unknown'
  return 'badge-unknown'
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.accounts-view { display: flex; flex-direction: column; gap: 20px; }
.view-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }

.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td {
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}
.data-table th { color: var(--color-text-muted); font-weight: 600; font-size: 0.85rem; }
.data-table tr:last-child td { border-bottom: none; }

.username-cell { display: flex; align-items: center; gap: 10px; }
.api-key-badge {
  font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.1); cursor: pointer; color: #a1a1aa;
}
.api-key-badge:hover { background: rgba(255,255,255,0.2); color: #fff; }

.action-buttons { display: flex; gap: 5px; }
.danger-text { color: #f43f5e !important; }
.danger-text:hover { background: rgba(244, 63, 94, 0.1) !important; }
.expired-text { color: #f59e0b; font-weight: 500; }

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-box {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); width: 100%; max-width: 450px;
}
.modal-header {
  padding: 16px 20px; display: flex; justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--color-text-muted); }
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 0.85rem; color: var(--color-text-muted); }
.modal-footer {
  padding: 16px 20px; border-top: 1px solid var(--color-border);
  display: flex; justify-content: flex-end; gap: 10px;
}
</style>
