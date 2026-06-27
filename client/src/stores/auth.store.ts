import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'

interface User {
  _id: string
  username: string
  role: 'admin' | 'inspector' | 'device'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') ?? 'null'))

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isLoggedIn = computed(() => !!token.value)

  async function login(username: string, password: string) {
    const data: any = await http.post('/auth/login', { username, password })
    token.value = data.access_token
    user.value = data.user
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAdmin, isLoggedIn, login, logout }
})
