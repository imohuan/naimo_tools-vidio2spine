/**
 * 抠图工具函数
 */

/**
 * 创建高斯核
 */
export function createGaussianKernel(radius: number): number[] {
  const size = radius * 2 + 1;
  const kernel = new Array(size);
  const sigma = radius / 2;
  const twoSigmaSquare = 2 * sigma * sigma;
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / twoSigmaSquare);
    sum += kernel[i];
  }

  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

/**
 * 应用高斯模糊
 */
export function applyGaussianBlur(
  mask: Float32Array,
  width: number,
  height: number,
  radius: number
): void {
  const kernel = createGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfSize = Math.floor(kernelSize / 2);

  // 水平模糊
  const tempMask = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;

      for (let k = 0; k < kernelSize; k++) {
        const sampleX = x + k - halfSize;
        if (sampleX >= 0 && sampleX < width) {
          const idx = y * width + sampleX;
          sum += mask[idx] * kernel[k];
          weightSum += kernel[k];
        }
      }

      tempMask[y * width + x] = sum / weightSum;
    }
  }

  // 垂直模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;

      for (let k = 0; k < kernelSize; k++) {
        const sampleY = y + k - halfSize;
        if (sampleY >= 0 && sampleY < height) {
          const idx = sampleY * width + x;
          sum += tempMask[idx] * kernel[k];
          weightSum += kernel[k];
        }
      }

      mask[y * width + x] = sum / weightSum;
    }
  }
}

/**
 * 应用形态学操作
 */
export function applyMorphology(
  mask: Float32Array,
  width: number,
  height: number,
  iterations: number
): void {
  const isErosion = iterations < 0;
  const absIterations = Math.abs(iterations);

  for (let iter = 0; iter < absIterations; iter++) {
    const tempMask = new Float32Array(mask);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        const neighbors = [
          tempMask[idx - width - 1],
          tempMask[idx - width],
          tempMask[idx - width + 1],
          tempMask[idx - 1],
          tempMask[idx],
          tempMask[idx + 1],
          tempMask[idx + width - 1],
          tempMask[idx + width],
          tempMask[idx + width + 1],
        ];

        if (isErosion) {
          mask[idx] = Math.min(...neighbors);
        } else {
          mask[idx] = Math.max(...neighbors);
        }
      }
    }
  }
}

/**
 * 计算颜色距离
 */
export function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

/**
 * 形状类型定义
 */
export interface Shape {
  type: "rect" | "circle" | "polygon";
  points: Array<{ x: number; y: number }>;
}

/**
 * 应用遮罩区域删除
 * 将指定形状区域内的像素 alpha 设置为 0
 */
export function applyMaskShapes(
  imageData: ImageData,
  shapes: Shape[] | undefined
): void {
  if (!shapes || shapes.length === 0) return;

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // 创建离屏 Canvas 用于渲染遮罩
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) return;

  // 绘制所有形状到遮罩 Canvas
  maskCtx.fillStyle = 'white';
  for (const shape of shapes) {
    maskCtx.beginPath();

    if (shape.type === 'rect' && shape.points.length >= 2) {
      const x1 = Math.min(shape.points[0].x, shape.points[1].x);
      const y1 = Math.min(shape.points[0].y, shape.points[1].y);
      const x2 = Math.max(shape.points[0].x, shape.points[1].x);
      const y2 = Math.max(shape.points[0].y, shape.points[1].y);
      maskCtx.rect(x1, y1, x2 - x1, y2 - y1);
    } else if (shape.type === 'circle' && shape.points.length >= 2) {
      const cx = (shape.points[0].x + shape.points[1].x) / 2;
      const cy = (shape.points[0].y + shape.points[1].y) / 2;
      const rx = Math.abs(shape.points[1].x - shape.points[0].x) / 2;
      const ry = Math.abs(shape.points[1].y - shape.points[0].y) / 2;

      // 绘制椭圆
      maskCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (shape.type === 'polygon' && shape.points.length >= 3) {
      maskCtx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        maskCtx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      maskCtx.closePath();
    }

    maskCtx.fill();
  }

  // 获取遮罩数据
  const maskData = maskCtx.getImageData(0, 0, width, height).data;

  // 应用遮罩：如果遮罩像素的 alpha > 0，则将原图对应像素的 alpha 设为 0
  for (let i = 0; i < data.length; i += 4) {
    const maskAlpha = maskData[i + 3];
    if (maskAlpha > 0) {
      data[i + 3] = 0;
    }
  }
}

