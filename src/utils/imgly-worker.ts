/**
 * ImgLy Worker 封装
 * 提供简单的接口来使用 Worker 处理图片
 */

export interface ImglyWorkerConfig {
  model?: "isnet_fp16" | "isnet_quint8" | "isnet";
  debug?: boolean;
}

export interface ImglyWorkerProgress {
  key: string;
  current: number;
  total: number;
  percentage: number;
}

export class ImglyWorker {
  private worker: Worker | null = null;

  /**
   * 初始化 Worker
   */
  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../workers/imgly.worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    return this.worker;
  }

  /**
   * 处理图片抠图
   */
  async removeBackground(
    imageBlob: Blob,
    config: ImglyWorkerConfig = {},
    onProgress?: (progress: ImglyWorkerProgress) => void
  ): Promise<Blob> {
    const worker = this.ensureWorker();

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        const { type, data, progress, error } = event.data;

        switch (type) {
          case "progress":
            if (onProgress && progress) {
              onProgress(progress);
            }
            break;

          case "success":
            worker.removeEventListener("message", handleMessage);
            if (data) {
              resolve(data);
            } else {
              reject(new Error("Worker 返回结果为空"));
            }
            break;

          case "error":
            worker.removeEventListener("message", handleMessage);
            reject(new Error(error || "Worker 处理失败"));
            break;
        }
      };

      worker.addEventListener("message", handleMessage);

      // 发送处理请求
      worker.postMessage({
        type: "process",
        imageBlob,
        config: {
          model: config.model || "isnet_fp16",
          debug: config.debug || false,
        },
      });
    });
  }

  /**
   * 销毁 Worker
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// 单例模式
let workerInstance: ImglyWorker | null = null;

/**
 * 获取全局 Worker 实例
 */
export function getImglyWorker(): ImglyWorker {
  if (!workerInstance) {
    workerInstance = new ImglyWorker();
  }
  return workerInstance;
}

/**
 * 销毁全局 Worker 实例
 */
export function destroyImglyWorker() {
  if (workerInstance) {
    workerInstance.destroy();
    workerInstance = null;
  }
}

