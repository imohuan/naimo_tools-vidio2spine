<template>
  <div class="h-full flex flex-col relative">
    <CompareCanvas
      ref="canvasRef"
      :original-url="originalUrl"
      :result-image-data="resultImageData"
      :enable-pick="enablePick"
      @pick="(color) => $emit('pick', color)"
      @pick-multiple="(colors) => $emit('pickMultiple', colors)"
      @transform-change="handleTransformChange"
      @canvas-ready="handleCanvasReady"
    />

    <DrawMaskOverlay
      v-if="canvasTransform"
      :transform="canvasTransform"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      @update:shapes="handleShapesUpdate"
      @update:transform="handleTransformUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import CompareCanvas from "../CompareCanvas.vue";
import DrawMaskOverlay from "./DrawMaskOverlay.vue";

interface Shape {
  id: string;
  type: "rect" | "circle" | "polygon";
  points: Array<{ x: number; y: number }>;
}

defineProps<{
  originalUrl: string;
  resultImageData?: ImageData | null;
  enablePick?: boolean;
}>();

const emit = defineEmits<{
  (e: "pick", color: { r: number; g: number; b: number }): void;
  (e: "pickMultiple", colors: Array<{ r: number; g: number; b: number }>): void;
  (
    e: "shapesUpdate",
    shapes: Array<{
      type: "rect" | "circle" | "polygon";
      points: Array<{ x: number; y: number }>;
    }>
  ): void;
}>();

const canvasRef = ref<InstanceType<typeof CompareCanvas>>();
const canvasTransform = ref<{ x: number; y: number; scale: number } | null>(
  null
);
const canvasWidth = ref(0);
const canvasHeight = ref(0);

function handleShapesUpdate(shapes: Shape[]) {
  emit("shapesUpdate", shapes);
}

function handleTransformChange(transform: {
  x: number;
  y: number;
  scale: number;
}) {
  // 从 CompareCanvas 接收 transform 变化
  canvasTransform.value = { ...transform };
}

function handleCanvasReady(info: { width: number; height: number }) {
  // 从 CompareCanvas 接收画布尺寸
  canvasWidth.value = info.width;
  canvasHeight.value = info.height;
}

function handleTransformUpdate(transform: {
  x: number;
  y: number;
  scale: number;
}) {
  // 从 DrawMaskOverlay 接收 transform 更新，同步到 CompareCanvas
  if (canvasRef.value) {
    const canvas = canvasRef.value as any;
    if (canvas.transform) {
      canvas.transform.x = transform.x;
      canvas.transform.y = transform.y;
      canvas.transform.scale = transform.scale;
    }
  }
}
</script>
