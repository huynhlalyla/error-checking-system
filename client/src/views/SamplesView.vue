<template>
  <div class="samples-view fade-in">
    <div class="view-header">
      <h2>Quản Lý Mẫu Vật</h2>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-success" @click="openCreate('PRODUCT')">+ Thêm Thành Phẩm</button>
        <button class="btn btn-danger" @click="openCreate('DEFECT')">+ Thêm Lỗi Mới</button>
      </div>
    </div>

    <!-- Bảng Thành Phẩm -->
    <div class="card" style="margin-bottom: 20px;">
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 1.05rem;">Danh Sách Thành Phẩm</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Mô Tả</th>
              <th>Mẫu Ảnh</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!productSamples.length"><td colspan="6" style="text-align:center;color:var(--color-text-muted)">Chưa có thành phẩm nào</td></tr>
            <tr v-for="item in productSamples" :key="item._id">
              <td><code class="code-tag">{{ item.code }}</code></td>
              <td>{{ item.name }}</td>
              <td class="desc-cell">{{ item.description || '—' }}</td>
              <td>{{ item.sampleCount }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="item.isActive" @change="toggleStatus(item, $event)" />
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-ghost btn-xs" @click="openEdit(item)">Sửa</button>
                  <button class="btn btn-danger btn-xs" @click="remove(item._id)">Xoá</button>
                  <RouterLink :to="`/samples/${item.code}`" class="btn btn-primary btn-xs" title="Xem chi tiết">→</RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bảng Lỗi -->
    <div class="card">
      <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 1.05rem;">Danh Sách Lỗi</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Sản Phẩm Đích</th>
              <th>Mô Tả</th>
              <th>Mẫu Ảnh</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!defectSamples.length"><td colspan="7" style="text-align:center;color:var(--color-text-muted)">Chưa có lỗi nào</td></tr>
            <tr v-for="item in defectSamples" :key="item._id">
              <td><code class="code-tag">{{ item.code }}</code></td>
              <td>{{ item.name }}</td>
              <td>{{ item.targetProductId ? (item.targetProductId.name || item.targetProductId.code) : '—' }}</td>
              <td class="desc-cell">{{ item.description || '—' }}</td>
              <td>{{ item.sampleCount }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="item.isActive" @change="toggleStatus(item, $event)" />
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-ghost btn-xs" @click="openEdit(item)">Sửa</button>
                  <button class="btn btn-danger btn-xs" @click="remove(item._id)">Xoá</button>
                  <RouterLink :to="`/samples/${item.code}`" class="btn btn-primary btn-xs" title="Xem chi tiết">→</RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
        <div class="modal-box fade-in" style="max-width:480px">
          <div class="modal-header">
            <h3>{{ editItem ? 'Sửa Mẫu Vật' : 'Thêm Mẫu Vật Mới' }}</h3>
            <button class="close-btn" @click="closeForm">✕</button>
          </div>
          <div class="modal-body" style="flex-direction:column">
            <div class="field">
              <label>Tên mẫu vật <span style="color:#ef4444">*</span></label>
              <input id="s-name" v-model="form.name" class="input" :placeholder="form.type === 'PRODUCT' ? 'VD: Chai nhựa nguyên vẹn' : 'VD: Trầy xước bề mặt'" />
            </div>
            <div class="field">
              <label>Mô tả</label>
              <input id="s-desc" v-model="form.description" class="input" placeholder="Mô tả ngắn gọn..." />
            </div>
            <div class="field" v-if="form.type === 'DEFECT'">
              <label>Sản Phẩm Đích <span style="color:#ef4444">*</span></label>
              <select id="s-targetProductId" v-model="form.targetProductId" class="input">
                <option disabled value="">-- Chọn sản phẩm đích --</option>
                <option v-for="product in productSamples" :key="product._id" :value="product._id">{{ product.code }} - {{ product.name }}</option>
              </select>
            </div>
            <div v-if="editItem" class="field">
              <label><input type="checkbox" v-model="form.isActive" /> Đang hoạt động</label>
            </div>
            <div v-if="formError" class="error-msg">{{ formError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeForm">Huỷ</button>
            <button class="btn btn-primary" @click="submitForm" :disabled="submitting">
              {{ submitting ? 'Đang lưu...' : 'Lưu' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import http from '@/api/http'

const items = ref<any[]>([])
const showForm = ref(false)
const editItem = ref<any>(null)
const submitting = ref(false)
const formError = ref('')

const form = reactive({ type: 'DEFECT' as 'PRODUCT' | 'DEFECT', name: '', description: '', targetProductId: '', isActive: true })

const productSamples = computed(() => items.value.filter(i => i.type === 'PRODUCT'))
const defectSamples = computed(() => items.value.filter(i => i.type === 'DEFECT'))

async function fetchItems() {
  const data: any = await http.get('/samples')
  items.value = Array.isArray(data) ? data : data.data ?? []
}

function openCreate(type: 'PRODUCT' | 'DEFECT') { 
  Object.assign(form, { type, name: '', description: '', targetProductId: '', isActive: true })
  editItem.value = null
  showForm.value = true 
}

function openEdit(item: any) { Object.assign(form, item); editItem.value = item; showForm.value = true }
function closeForm() { showForm.value = false; formError.value = '' }

async function submitForm() {
  formError.value = ''
  if (form.type === 'DEFECT' && !form.targetProductId) {
    formError.value = 'Vui lòng chọn sản phẩm đích cho lỗi này.'
    return
  }
  
  submitting.value = true
  try {
    const payload = { ...form }
    if (!payload.targetProductId) delete (payload as any).targetProductId

    if (editItem.value) {
      const { name, description, targetProductId, isActive } = payload
      await http.put(`/samples/${editItem.value._id}`, { name, description, targetProductId, isActive })
    } else {
      const { isActive: _ia, ...createPayload } = payload
      await http.post('/samples', createPayload)
    }
    closeForm()
    fetchItems()
  } catch (e: any) {
    formError.value = e?.message ?? 'Có lỗi xảy ra'
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(item: any, event: Event) {
  const isChecked = (event.target as HTMLInputElement).checked
  try {
    await http.put(`/samples/${item._id}`, { isActive: isChecked })
    item.isActive = isChecked
  } catch (e: any) {
    (event.target as HTMLInputElement).checked = !isChecked
    alert(e?.message ?? 'Lỗi khi cập nhật trạng thái')
  }
}

async function remove(id: string) {
  if (!confirm('Bạn có chắc muốn xoá mẫu vật này?')) return
  await http.delete(`/samples/${id}`)
  fetchItems()
}

onMounted(fetchItems)
</script>

<style scoped>
.view-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.view-header h2 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.code-tag { font-family: monospace; font-size: 0.78rem; background: var(--color-surface-2); padding: 2px 6px; border-radius: 4px; }
.desc-cell { font-size: 0.8rem; color: var(--color-text-muted); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.action-btns { display: flex; gap: 6px; }
.btn-xs { padding: 4px 10px; font-size: 0.72rem; }
.modal-body { flex-direction: column !important; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.8rem; color: var(--color-text-muted); }
.error-msg { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #f87171; border-radius: var(--radius-sm); padding: 8px 12px; font-size: 0.8rem; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-box { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border); }
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 1.1rem; }
.modal-body { padding: 20px 24px; display: flex; gap: 20px; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--color-border); }

/* Switch */
.switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: var(--color-surface-2); border: 1px solid var(--color-border); transition: .2s; border-radius: 22px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: var(--color-text-muted); transition: .2s; border-radius: 50%; }
input:checked + .slider { background-color: var(--color-success); border-color: var(--color-success); }
input:checked + .slider:before { transform: translateX(18px); background-color: white; }
</style>
