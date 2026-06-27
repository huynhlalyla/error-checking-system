import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<any[]>([])
  const unreadCount = ref(0)
  const total = ref(0)

  async function fetchAlerts(unreadOnly = false) {
    const data: any = await http.get('/alerts', { params: { limit: 50, unread: unreadOnly } })
    alerts.value = data.data
    total.value = data.total
    unreadCount.value = data.data.filter((a: any) => !a.isRead).length
  }

  function addAlert(alert: any) {
    alerts.value.unshift(alert)
    unreadCount.value++
  }

  async function markRead(id: string) {
    await http.put(`/alerts/${id}/read`)
    const a = alerts.value.find((x) => x._id === id)
    if (a) { a.isRead = true; unreadCount.value = Math.max(0, unreadCount.value - 1) }
  }

  async function markAllRead() {
    await http.put('/alerts/read-all')
    alerts.value.forEach((a) => (a.isRead = true))
    unreadCount.value = 0
  }

  return { alerts, unreadCount, total, fetchAlerts, addAlert, markRead, markAllRead }
})
