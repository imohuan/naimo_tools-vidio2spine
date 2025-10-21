/**
 * 颜色抠图插件
 */

import type {
  CutoutPlugin,
  PluginContext,
  PluginProcessResult,
} from "../../types/cutout";
import {
  applyGaussianBlur,
  applyMorphology,
  colorDistance,
  applyMaskShapes,
} from "../../utils/cutout-utils";

export const colorPlugin: CutoutPlugin = {
  id: "color",
  name: "颜色抠图",
  description: "通过拾取颜色并基于颜色相似度进行抠图，适合纯色或渐变背景",

  async process(
    context: PluginContext,
    config: Record<string, any>
  ): Promise<PluginProcessResult> {
    const { canvas, ctx, originalImage, pickedColors, setStatus, yieldToUI } =
      context;

    if (!pickedColors || pickedColors.length === 0) {
      return {
        success: false,
        message: "请先拾取要处理的颜色",
      };
    }

    try {
      setStatus("正在优化颜色列表...");

      // 优化颜色列表：去除被其他颜色覆盖的冗余颜色
      const tolerance = config.tolerance || 30;
      const optimizedColors: Array<{ r: number; g: number; b: number }> = [];

      for (const color of pickedColors) {
        // 检查当前颜色是否已被优化列表中的某个颜色覆盖
        let isCovered = false;
        for (const existingColor of optimizedColors) {
          const distance = colorDistance(
            color.r,
            color.g,
            color.b,
            existingColor.r,
            existingColor.g,
            existingColor.b
          );
          if (distance <= tolerance) {
            isCovered = true;
            break;
          }
        }

        // 如果当前颜色未被覆盖，添加到优化列表
        if (!isCovered) {
          optimizedColors.push(color);
        }
      }

      await yieldToUI();

      setStatus(`正在进行颜色抠图（使用 ${optimizedColors.length} 个颜色）...`);

      // 绘制原图
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const mask = new Float32Array(canvas.width * canvas.height);

      // 创建遮罩 - 使用并发分块处理
      setStatus("正在分析颜色...");

      // 计算分块数量（每块处理约10万像素）
      const totalPixels = canvas.width * canvas.height;
      const pixelsPerChunk = 100000;
      const chunkCount = Math.ceil(totalPixels / pixelsPerChunk);

      // 并发处理所有块
      const processChunk = async (chunkIndex: number) => {
        const startPixel = chunkIndex * pixelsPerChunk;
        const endPixel = Math.min(startPixel + pixelsPerChunk, totalPixels);

        for (let pixelIndex = startPixel; pixelIndex < endPixel; pixelIndex++) {
          const i = pixelIndex * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          let isMatched = false;
          for (const color of optimizedColors) {
            const distance = colorDistance(r, g, b, color.r, color.g, color.b);
            if (distance <= tolerance) {
              isMatched = true;
              break;
            }
          }

          // 根据模式设置遮罩
          if (config.mode === "remove") {
            mask[pixelIndex] = isMatched ? 0.0 : 1.0;
          } else {
            mask[pixelIndex] = isMatched ? 1.0 : 0.0;
          }
        }
      };

      // 批量并发处理（每次处理4个块）
      const concurrency = 4;
      for (let i = 0; i < chunkCount; i += concurrency) {
        const batch = [];
        for (let j = 0; j < concurrency && i + j < chunkCount; j++) {
          batch.push(processChunk(i + j));
        }
        await Promise.all(batch);
        setStatus(`正在分析颜色... ${Math.round((i + batch.length) / chunkCount * 100)}%`);
        await yieldToUI();
      }

      await yieldToUI();

      // 应用膨胀/腐蚀
      if (config.expand !== 0) {
        setStatus("正在调整边缘...");
        applyMorphology(mask, canvas.width, canvas.height, config.expand);
        await yieldToUI();
      }

      // 应用羽化
      if (config.feather > 0) {
        setStatus("正在羽化边缘...");
        applyGaussianBlur(mask, canvas.width, canvas.height, config.feather);
        await yieldToUI();
      }

      // 应用遮罩到图像 - 使用并发分块处理
      setStatus("正在生成最终结果...");

      const applyMaskChunk = async (chunkIndex: number) => {
        const startPixel = chunkIndex * pixelsPerChunk;
        const endPixel = Math.min(startPixel + pixelsPerChunk, totalPixels);

        for (let pixelIndex = startPixel; pixelIndex < endPixel; pixelIndex++) {
          const i = pixelIndex * 4;
          const alpha = mask[pixelIndex];
          data[i + 3] = Math.round(alpha * 255);
        }
      };

      // 批量并发应用遮罩
      for (let i = 0; i < chunkCount; i += concurrency) {
        const batch = [];
        for (let j = 0; j < concurrency && i + j < chunkCount; j++) {
          batch.push(applyMaskChunk(i + j));
        }
        await Promise.all(batch);
        setStatus(`正在生成最终结果... ${Math.round((i + batch.length) / chunkCount * 100)}%`);
        await yieldToUI();
      }

      await yieldToUI();

      // 应用遮罩区域删除
      if (context.maskShapes && context.maskShapes.length > 0) {
        setStatus("正在删除遮罩区域...");
        applyMaskShapes(imageData, context.maskShapes);
        await yieldToUI();
      }

      ctx.putImageData(imageData, 0, 0);

      const resultImageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      return {
        success: true,
        message: "颜色抠图处理完成",
        imageData: resultImageData,
      };
    } catch (error: any) {
      console.error("颜色抠图处理失败:", error);
      return {
        success: false,
        message: `处理失败: ${error.message}`,
      };
    }
  },
};

