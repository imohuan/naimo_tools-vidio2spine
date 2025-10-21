/**
 * 抠图插件类型定义
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Shape {
  type: "rect" | "circle" | "polygon";
  points: Array<{ x: number; y: number }>; // 画布坐标
}

export interface PluginContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  originalImage: HTMLImageElement;
  pickedColors: RGB[];
  maskShapes?: Shape[]; // 需要删除的遮罩区域
  setStatus: (message: string) => void;
  yieldToUI: () => Promise<void>;
}

export interface PluginProcessResult {
  success: boolean;
  message?: string;
  imageData?: ImageData;
}

export interface CutoutPlugin {
  id: string;
  name: string;
  description: string;
  process: (
    context: PluginContext,
    config: Record<string, any>
  ) => Promise<PluginProcessResult>;
}

