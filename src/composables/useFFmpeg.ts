import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export interface ProgressInfo {
  text: string
  percent: number
}

export function useFFmpeg() {
  const ffmpeg = new FFmpeg()
  const isLoaded = ref(false)
  const useMultiThread = ref(false)
  const progress = ref<ProgressInfo>({ text: '', percent: 0 })

  // 检测是否支持跨域隔离
  const checkCrossOriginIsolation = () => {
    return typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true
  }

  // 初始化 FFmpeg
  const init = async () => {
    if (isLoaded.value) return

    try {
      const isCrossOriginIsolated = checkCrossOriginIsolation()
      useMultiThread.value = isCrossOriginIsolated

      const mode = useMultiThread.value ? '多线程' : '单线程'
      progress.value = { text: `初始化 FFmpeg ${mode}模式（首次加载约需30秒）...`, percent: 0 }

      console.log(`FFmpeg 运行模式: ${mode}`)
      if (!isCrossOriginIsolated) {
        console.warn('警告: 当前环境不支持跨域隔离，将使用单线程模式。性能可能较慢。')
      }

      // 添加日志监听
      ffmpeg.on('log', ({ type, message }) => {
        console.log(`FFmpeg [${type}]:`, message)
      })

      ffmpeg.on('progress', (event: any) => {
        console.log('FFmpeg progress event 完整数据:', JSON.stringify(event))

        // 只在编码视频时更新进度
        if (!progress.value.text.startsWith('正在编码视频')) {
          return
        }

        // FFmpeg progress 的值应该是 0-1 之间的小数
        let p = typeof event.progress === 'number' ? event.progress : 0

        // 如果 progress 值异常（小于0或大于1），尝试归一化或使用保守值
        if (p < 0 || !isFinite(p)) {
          console.warn(`FFmpeg progress 值无效: ${p}`)
          return
        }

        if (p > 1) {
          // 如果大于1，可能是百分比形式（0-100），尝试除以100
          if (p <= 100) {
            console.log(`FFmpeg progress 看起来是百分比形式，归一化: ${p} -> ${p / 100}`)
            p = p / 100
          } else {
            console.warn(`FFmpeg progress 值异常且无法归一化: ${p}`)
            return
          }
        }

        // 确保在 0-1 范围内
        p = Math.max(0, Math.min(1, p))
        const progressPercent = Math.round(p * 100)

        console.log(`更新 FFmpeg 进度: ${progressPercent}%`)

        // 更新进度值
        progress.value = {
          text: `正在编码视频 ${progressPercent}%`,
          percent: 50 + (p * 40)
        }
      })

      console.log('开始加载FFmpeg资源...')

      if (useMultiThread.value) {
        // 多线程模式（需要跨域隔离）
        const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
        })
      } else {
        // 单线程模式（不需要跨域隔离）
        const baseURL = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        })
      }

      console.log('FFmpeg加载成功！')
      isLoaded.value = true
      progress.value = { text: '', percent: 0 }
    } catch (error: any) {
      console.error('FFmpeg加载失败:', error)
      let errorMsg = 'FFmpeg初始化失败: ' + error.message

      if (error.message.includes('Worker') || error.message.includes('SharedArrayBuffer')) {
        errorMsg += '\n\n解决方案:\n1. 当前使用单线程模式，但仍然失败\n2. 请检查网络连接\n3. 尝试使用其他浏览器（Chrome、Edge）\n4. 清除浏览器缓存后重试'
      } else {
        errorMsg += '\n\n请确保: \n1. 网络连接正常\n2. 浏览器支持WebAssembly\n3. 尝试刷新页面重试'
      }

      throw new Error(errorMsg)
    }
  }

  // 裁剪视频
  const trimVideo = async (videoFile: File, startTime: number, duration: number): Promise<Blob> => {
    try {
      await init()

      progress.value = { text: '正在裁剪视频...', percent: 10 }

      const inputData = new Uint8Array(await videoFile.arrayBuffer())
      await ffmpeg.writeFile('input.mp4', inputData)
      progress.value = { text: '正在裁剪视频...', percent: 30 }


      // 慢速但精确的裁剪，并强制重置时间戳为恒定30fps
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-an', // 无音频
        '-avoid_negative_ts', 'make_zero',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-r', '30', // 强制输出为30fps
        '-fps_mode', 'cfr', // 使用推荐的参数保证恒定帧率
        'output.mp4'
      ])
      progress.value = { text: '正在裁剪视频...', percent: 80 }

      const data = await ffmpeg.readFile('output.mp4') as Uint8Array
      progress.value = { text: '正在裁剪视频...', percent: 90 }

      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })
      progress.value = { text: '', percent: 0 }

      return blob
    } catch (error) {
      progress.value = { text: '', percent: 0 }
      throw error
    }
  }

  // 提取帧（直接从裁剪后的视频blob，不依赖时间戳）
  const extractFrames = async (videoBlob: Blob, fps: number): Promise<Array<{ url: string, blob: Blob, index: number }>> => {
    try {
      console.log('开始提取帧...')
      await init()

      progress.value = { text: '正在提取帧...', percent: 0 }

      console.log('写入视频文件...')
      const inputData = new Uint8Array(await videoBlob.arrayBuffer())
      await ffmpeg.writeFile('input.mp4', inputData)
      progress.value = { text: '正在提取帧...', percent: 20 }

      const files = await ffmpeg.listDir('/')
      console.log('虚拟文件系统中的文件:', files)


      console.log('执行 FFmpeg 命令，参数:', [
        '-i', 'input.mp4',
        '-vf', `fps=${fps}`,
        '-frame_pts', '1',
        '-q:v', '2',
        'frame_%d.jpg'
      ])

      // 采纳参考文章的方案，使用 frame_pts
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', `fps=${fps}`,
        '-frame_pts', '1',
        '-q:v', '2',
        'frame_%d.jpg'
      ])

      console.log('FFmpeg 命令执行完成')

      // 列出虚拟文件系统中的所有文件
      try {
        const files = await ffmpeg.listDir('/')
        console.log('虚拟文件系统中的文件:', files)
      } catch (e) {
        console.warn('无法列出文件:', e)
      }

      progress.value = { text: '正在读取帧...', percent: 50 }

      // 并发读取 FFmpeg 虚拟文件系统中的图片帧
      const allEntries = await ffmpeg.listDir('/') as any[]
      const frameFiles = allEntries
        .map((e: any) => e?.name || e)
        .filter((name: string) => typeof name === 'string' && name.startsWith('frame_') && name.endsWith('.jpg'))
        .sort((a: string, b: string) => {
          const ma = a.match(/frame_(\d+)\.jpg/)
          const mb = b.match(/frame_(\d+)\.jpg/)
          const na = ma ? parseInt(ma[1], 10) : 0
          const nb = mb ? parseInt(mb[1], 10) : 0
          return na - nb
        })

      const total = frameFiles.length
      const concurrency = Math.min(12, Math.max(4, navigator.hardwareConcurrency || 8))
      let completed = 0

      const runWithConcurrencyLimit = async <T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> => {
        const results: R[] = new Array(items.length)
        let nextIndex = 0

        const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
          while (true) {
            const current = nextIndex++
            if (current >= items.length) break
            results[current] = await task(items[current], current)
          }
        })
        await Promise.all(workers)
        return results
      }

      const frames = await runWithConcurrencyLimit<string, { url: string, blob: Blob, index: number }>(
        frameFiles,
        concurrency,
        async (fileName, idx) => {
          const data = await ffmpeg.readFile(fileName) as Uint8Array
          const blob = new Blob([data.buffer as ArrayBuffer], { type: 'image/jpeg' })
          const url = URL.createObjectURL(blob)

          completed++
          // 进度区间：50% -> 98%
          if (completed % 2 === 0 || completed === total) {
            const percent = 50 + Math.min(48, Math.floor((completed / Math.max(1, total)) * 48))
            progress.value = { text: `正在读取帧 (${completed}/${total})...`, percent }
          }

          const match = fileName.match(/frame_(\d+)\.jpg/)
          const index = match ? parseInt(match[1], 10) - 1 : idx
          return { url, blob, index }
        }
      )

      // 保证顺序按 index 升序
      frames.sort((a, b) => a.index - b.index)

      console.log('提取帧完成')
      progress.value = { text: '', percent: 0 }
      return frames
    } catch (error) {
      console.error('提取帧错误:', error)
      progress.value = { text: '', percent: 0 }
      throw error
    }
  }

  // 生成视频
  const generateVideo = async (frames: Array<{ blob: Blob }>, fps: number): Promise<Blob> => {
    const fileNames: string[] = []
    try {
      await init()

      progress.value = { text: '正在生成视频...', percent: 0 }

      // 检测第一帧的格式，决定使用的文件扩展名
      const firstMimeType = frames[0]?.blob?.type || 'image/jpeg'
      const isJpeg = firstMimeType.includes('jpeg') || firstMimeType.includes('jpg')
      const ext = isJpeg ? 'jpg' : 'png'

      console.log(`输入帧格式: ${firstMimeType}, 使用扩展名: ${ext}`)

      // 写入选中的帧
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]
        const fileName = `out_${String(i).padStart(4, '0')}.${ext}`
        fileNames.push(fileName)
        const data = new Uint8Array(await frame.blob.arrayBuffer())
        await ffmpeg.writeFile(fileName, data)
        progress.value = { text: '正在写入帧...', percent: (i / frames.length) * 50 }
      }

      progress.value = { text: '正在编码视频...', percent: 50 }
      console.log('开始执行 FFmpeg 编码，帧数:', frames.length, 'FPS:', fps)

      try {
        // 使用最简单的命令，添加尺寸调整确保为偶数
        await ffmpeg.exec([
          '-framerate', fps.toString(),
          '-i', `out_%04d.${ext}`,
          '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-preset', 'ultrafast',
          'output.mp4'
        ])

        console.log('FFmpeg 编码完成')
      } catch (execError) {
        console.error('FFmpeg exec 执行失败:', execError)
        throw execError
      }

      progress.value = { text: '正在读取视频...', percent: 90 }
      const data = await ffmpeg.readFile('output.mp4') as Uint8Array
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })

      // 清理临时文件
      for (const fileName of fileNames) {
        try {
          await ffmpeg.deleteFile(fileName)
        } catch (e) {
          console.warn(`清理文件失败: ${fileName}`, e)
        }
      }
      try {
        await ffmpeg.deleteFile('output.mp4')
      } catch (e) {
        console.warn('清理输出文件失败', e)
      }

      progress.value = { text: '', percent: 0 }
      return blob
    } catch (error) {
      progress.value = { text: '', percent: 0 }
      // 清理临时文件（即使出错也要清理）
      for (const fileName of fileNames) {
        try {
          await ffmpeg.deleteFile(fileName)
        } catch (e) {
          // 忽略清理错误
        }
      }
      throw error
    }
  }

  return {
    isLoaded,
    useMultiThread,
    progress,
    init,
    trimVideo,
    extractFrames,
    generateVideo
  }
}

