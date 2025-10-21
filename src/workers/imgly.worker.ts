/**
 * ImgLy Background Removal Worker
 * 在独立线程中处理图片抠图，避免阻塞主线程
 */

import { removeBackground, Config } from "@imgly/background-removal";

interface WorkerRequest {
  type: "process";
  imageBlob: Blob;
  config: {
    model: "isnet_fp16" | "isnet_quint8" | "isnet";
    debug?: boolean;
  };
}

interface WorkerResponse {
  type: "progress" | "success" | "error";
  data?: Blob;
  progress?: {
    key: string;
    current: number;
    total: number;
    percentage: number;
  };
  error?: string;
}

// Worker 消息处理
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, imageBlob, config } = event.data;

  if (type === "process") {
    try {
      // 配置 ImgLy
      const imglyConfig: Config = {
        debug: config.debug || false,
        model: config.model || "isnet_fp16",
        output: {
          format: "image/png",
          quality: 1,
        },
        progress: (key, current, total) => {
          const percentage = Math.round((current / total) * 100);
          const response: WorkerResponse = {
            type: "progress",
            progress: { key, current, total, percentage },
          };
          self.postMessage(response);
        },
      };

      // 执行背景移除
      const resultBlob = await removeBackground(imageBlob, imglyConfig);

      // 返回结果
      const response: WorkerResponse = {
        type: "success",
        data: resultBlob,
      };
      self.postMessage(response);
    } catch (error: any) {
      // 返回错误
      const response: WorkerResponse = {
        type: "error",
        error: error.message || "未知错误",
      };
      self.postMessage(response);
    }
  }
};

