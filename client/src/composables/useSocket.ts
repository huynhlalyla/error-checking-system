import { ref, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useAlertsStore } from '@/stores/alerts.store'
import { useProgressStore } from '@/stores/progress.store'

let socket: Socket | null = null

export function useSocket() {
  const connected = ref(false)
  const alertsStore = useAlertsStore()

  function connect() {
    if (socket?.connected) return
    socket = io('/', { transports: ['websocket'] })

    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })

    socket.on('alert_created', (alert: any) => {
      alertsStore.addAlert(alert)
    })

    socket.on('model_updated', (model: any) => {
      console.info('Model updated:', model.version)
      const progressStore = useProgressStore()
      if (model.status === 'training') {
        progressStore.startPolling()
      } else {
        progressStore.stopPolling()
      }
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  function getSocket() {
    return socket
  }

  onUnmounted(disconnect)

  return { connected, connect, disconnect, getSocket }
}
