import { ref } from 'vue'

export interface ProgressInfo {
  text: string
  percent: number
}

export interface FrameInfo {
  url: string
  blob: Blob
  index: number
}

export function useCanvasFrameExtractor() {
  const progress = ref<ProgressInfo>({ text: '', percent: 0 })

  const extractFrames = (videoBlob: Blob, fps: number): Promise<FrameInfo[]> => {
    return new Promise((resolve, reject) => {
      const frames: FrameInfo[] = []
      const videoUrl = URL.createObjectURL(videoBlob)

      // 先用探测 video 获取时长与尺寸
      const probe = document.createElement('video')
      probe.src = videoUrl
      probe.muted = true
      probe.preload = 'auto'

      const onProbeError = (e: any) => {
        URL.revokeObjectURL(videoUrl)
        reject(new Error(`视频加载失败: ${e?.message}`))
      }

      probe.addEventListener('error', onProbeError)
      probe.addEventListener('loadedmetadata', () => {
        const width = probe.videoWidth
        const height = probe.videoHeight
        const duration = probe.duration
        const targetCount = Math.max(1, Math.round(duration * fps))

        // 根据硬件并发选择并发视频数量（2-4）
        const hw = typeof navigator !== 'undefined' ? (navigator as any).hardwareConcurrency || 8 : 8
        const videoConcurrency = Math.min(4, Math.max(2, Math.floor(hw / 4)))

        // 准备并发视频与各自的画布
        const videoPool: HTMLVideoElement[] = []
        const canvases: HTMLCanvasElement[] = []
        const contexts: (CanvasRenderingContext2D | null)[] = []
        const offHandlers: Array<() => void> = []
        for (let i = 0; i < videoConcurrency; i++) {
          const v = document.createElement('video')
          v.src = videoUrl
          v.muted = true
          v.preload = 'auto'
          videoPool.push(v)

          const c = document.createElement('canvas')
          c.width = width
          c.height = height
          canvases.push(c)
          contexts.push(c.getContext('2d'))
        }

        const step = 1 / fps
        let nextIndex = 0
        let pendingEncodes = 0
        let activeVideos = videoConcurrency
        let finalized = false
        let lastReported = 0

        const allocateNext = (): { time: number, index: number } | null => {
          const time = nextIndex * step
          if (time >= duration + (step / 2)) return null
          const index = nextIndex
          nextIndex++
          return { time, index }
        }

        const cleanupAll = () => {
          offHandlers.forEach(off => off())
          activeVideos = 0
        }

        const finalizeMaybe = () => {
          if (finalized) return
          const allDoneByCount = frames.length >= targetCount && pendingEncodes === 0
          if ((activeVideos === 0 && pendingEncodes === 0) || allDoneByCount) {
            finalized = true
            URL.revokeObjectURL(videoUrl)
            progress.value = { text: '', percent: 0 }
            // 按 index 排序
            frames.sort((a, b) => a.index - b.index)
            resolve(frames)
          }
        }

        // 为每个视频绑定 seeked 处理
        videoPool.forEach((v, i) => {
          const ctx = contexts[i]
          const canvas = canvases[i]
          if (!ctx) return

          const onError = (e: any) => {
            console.warn('视频解码错误', e)
            // 当作该 worker 完成，避免阻塞
            v.removeEventListener('seeked', onSeeked)
            v.removeEventListener('error', onError)
            activeVideos--
            finalizeMaybe()
          }

          const onSeeked = () => {
            requestAnimationFrame(() => {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
              const capturedIndex = Math.max(0, Math.round(v.currentTime * fps))

              pendingEncodes++
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob)
                  frames.push({ url, blob, index: capturedIndex })
                }
                pendingEncodes--
                // 以得到帧数量为准进行进度展示，避免任务全部分配但编码未完成时显示100%
                const current = Math.min(100, Math.floor((frames.length / targetCount) * 100))
                if (current !== lastReported) {
                  lastReported = current
                  progress.value = { text: `正在提取帧 ${frames.length}/${targetCount}`, percent: current }
                }
                finalizeMaybe()
              }, 'image/jpeg', 0.95)

              const slot = allocateNext()
              if (slot) {
                v.currentTime = slot.time
              } else {
                // 本 worker 完成
                v.removeEventListener('seeked', onSeeked)
                v.removeEventListener('error', onError)
                activeVideos--
                finalizeMaybe()
              }
            })
          }

          v.addEventListener('error', onError)
          v.addEventListener('seeked', onSeeked)
          offHandlers.push(() => {
            v.removeEventListener('error', onError)
            v.removeEventListener('seeked', onSeeked)
          })

          // 分配首个任务
          const first = allocateNext()
          if (first) {
            v.currentTime = first.time
          } else {
            // 没有任务就直接标记完成
            v.removeEventListener('seeked', onSeeked)
            v.removeEventListener('error', onError)
            activeVideos--
            finalizeMaybe()
          }
        })

        // 安全兜底：若所有任务都分配完很久仍未完成，进行清理后按已完成帧返回
        setTimeout(() => {
          if (!finalized && Math.min(nextIndex * step, duration) >= duration) {
            cleanupAll()
            finalizeMaybe()
          }
        }, 5000)
      })

      // 启动元数据加载
      probe.load()
    })
  }

  return {
    progress,
    extractFrames
  }
}
