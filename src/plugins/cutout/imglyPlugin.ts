/**
 * ImgLy Background Removal 插件
 * 使用 Web Worker 在独立线程中处理，避免阻塞主线程
 */

import type {
  CutoutPlugin,
  PluginContext,
  PluginProcessResult,
} from "../../types/cutout";
import {
  applyGaussianBlur,
  applyMorphology,
  applyMaskShapes,
} from "../../utils/cutout-utils";
import { getImglyWorker } from "../../utils/imgly-worker";

export const imglyPlugin: CutoutPlugin = {
  id: "imgly",
  name: "ImgLy Background Removal",
  description: "基于 ONNX Runtime 的高精度 AI 抠图",

  async process(
    context: PluginContext,
    config: Record<string, any>
  ): Promise<PluginProcessResult> {
    const { canvas, ctx, originalImage, setStatus, yieldToUI } = context;

    try {
      setStatus("ImgLy 正在分析图片...");
      await yieldToUI();

      // 将 HTMLImageElement 转换为 Blob
      setStatus("正在准备图像数据...");
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = originalImage.width;
      tempCanvas.height = originalImage.height;
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(originalImage, 0, 0);

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("无法转换图像为 Blob"));
        }, "image/png");
      });
      await yieldToUI();

      // 使用 Worker 处理抠图（避免阻塞主线程）
      setStatus("ImgLy 正在处理...");
      const worker = getImglyWorker();

      const blob = await worker.removeBackground(
        imageBlob,
        {
          model: config.model || "isnet_fp16",
          debug: false,
        },
        (progress) => {
          setStatus(`ImgLy 处理中: ${progress.key} - ${progress.percentage}%`);
        }
      );

      await yieldToUI();

      // 将结果转换为 Image
      setStatus("正在应用处理结果...");
      const resultUrl = URL.createObjectURL(blob);
      const resultImage = new Image();

      await new Promise<void>((resolve, reject) => {
        resultImage.onload = () => resolve();
        resultImage.onerror = () => reject(new Error("结果图片加载失败"));
        resultImage.src = resultUrl;
      });

      // 绘制结果到画布
      canvas.width = resultImage.width;
      canvas.height = resultImage.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(resultImage, 0, 0);

      // 清理临时 URL
      URL.revokeObjectURL(resultUrl);

      // 获取图像数据进行后处理
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 提取 alpha 通道到浮点数组
      const mask = new Float32Array(canvas.width * canvas.height);
      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        mask[pixelIndex] = data[i + 3] / 255;
      }

      await yieldToUI();

      // 应用形态学操作
      if (config.morph !== 0) {
        setStatus("正在调整边缘...");
        applyMorphology(mask, canvas.width, canvas.height, config.morph);
        await yieldToUI();
      }

      // 边缘羽化
      if (config.feather > 0) {
        setStatus("正在羽化边缘...");
        applyGaussianBlur(mask, canvas.width, canvas.height, config.feather);
        await yieldToUI();
      }

      // 重新绘制原图并应用处理后的遮罩
      setStatus("正在生成最终结果...");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

      const finalImageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      const finalData = finalImageData.data;

      const pixelsPerChunk = canvas.width * 100;
      for (let i = 0; i < finalData.length; i += 4) {
        if (i > 0 && i / 4 % pixelsPerChunk === 0) {
          await yieldToUI();
        }

        const pixelIndex = i / 4;
        let alpha = mask[pixelIndex];

        // 应用阈值
        if (alpha < config.threshold) {
          alpha = 0;
        } else {
          alpha = (alpha - config.threshold) / (1 - config.threshold);
        }

        // 应用不透明度
        alpha = Math.min(1, Math.max(0, alpha * (config.opacity / 100)));
        finalData[i + 3] = Math.round(alpha * 255);
      }

      await yieldToUI();

      // 应用遮罩区域删除
      if (context.maskShapes && context.maskShapes.length > 0) {
        setStatus("正在删除遮罩区域...");
        applyMaskShapes(finalImageData, context.maskShapes);
        await yieldToUI();
      }

      ctx.putImageData(finalImageData, 0, 0);

      const resultImageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      return {
        success: true,
        message: "ImgLy 处理完成",
        imageData: resultImageData,
      };
    } catch (error: any) {
      console.error("ImgLy 处理失败:", error);
      return {
        success: false,
        message: `处理失败: ${error.message}`,
      };
    }
  },
};

