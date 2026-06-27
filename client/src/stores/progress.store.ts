import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api/http'

export const useProgressStore = defineStore('progress', () => {
  const trainingProgress = ref<number | null>(null)
  const trainingMessage = ref('')
  const uploadProgress = ref<number | null>(null)
  const skippedClasses = ref<{ label: string; count: number }[]>([])
  
  let pollInterval: any = null

  async function pollTrainingProgress() {
    try {
      const data: any = await http.get('/ai-model/progress')
      if (data.is_training) {
        trainingProgress.value = data.progress
        trainingMessage.value = data.message || ''
        skippedClasses.value = data.skipped_classes || []
      } else {
        trainingProgress.value = null
        trainingMessage.value = ''
        skippedClasses.value = data.skipped_classes || []
        stopPolling()
      }
    } catch (e) {
      console.error('Lỗi khi lấy tiến độ AI', e)
      trainingProgress.value = null
      trainingMessage.value = ''
      stopPolling()
    }
  }

  function startPolling() {
    if (!pollInterval) {
      pollTrainingProgress()
      pollInterval = setInterval(pollTrainingProgress, 2000)
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    trainingProgress.value = null
  }

  return { trainingProgress, uploadProgress, trainingMessage, skippedClasses, startPolling, stopPolling, pollTrainingProgress }
})
