<template>
  <div
    class="w-full h-full relative bg-gray-50 rounded-lg overflow-hidden"
    ref="containerRef"
  >
    <!-- 画布容器 -->
    <div
      class="absolute inset-0 overflow-hidden"
      :class="
        enablePick && !isSpacePressed ? 'cursor-crosshair' : 'cursor-move'
      "
      @mousedown="handleMouseDown"
      @wheel.prevent="handleWheel"
      @click="handleClick"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <canvas
        ref="canvasRef"
        class="absolute"
        :style="{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'top left',
          imageRendering: transform.scale > 2 ? 'pixelated' : 'auto',
        }"
      />

      <!-- 框选矩形 -->
      <div
        v-if="isSelecting"
        class="absolute border-2 border-blue-500 pointer-events-none"
        :style="{
          left: `${Math.min(selectStart.x, selectEnd.x)}px`,
          top: `${Math.min(selectStart.y, selectEnd.y)}px`,
          width: `${Math.abs(selectEnd.x - selectStart.x)}px`,
          height: `${Math.abs(selectEnd.y - selectStart.y)}px`,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        }"
      />
    </div>

    <!-- 竖向参考线 -->
    <div
      v-if="hasResult"
      class="absolute top-0 bottom-0 w-0.5 bg-blue-500 cursor-ew-resize z-10 shadow-lg"
      :style="{ left: `${dividerPosition * 100}%` }"
      @mousedown.stop="handleDividerMouseDown"
    >
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <svg
          class="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      </div>
    </div>

    <!-- 右上角居中按钮 -->
    <button
      @click="resetView"
      class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg hover:bg-gray-100 transition-colors shadow border border-gray-200 z-20"
      title="居中画布"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      </svg>
    </button>

    <!-- 右下角缩放显示 -->
    <div
      class="absolute bottom-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-medium text-gray-600 shadow border border-gray-200 z-20"
    >
      {{ Math.round(transform.scale * 100) }}%
    </div>

    <!-- 鼠标跟随颜色显示 -->
    <div
      v-if="enablePick && hoverColor"
      class="absolute pointer-events-none z-30"
      :style="{
        left: `${hoverPosition.x + 15}px`,
        top: `${hoverPosition.y + 15}px`,
      }"
    >
      <div
        class="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-300 p-2 flex items-center gap-2"
      >
        <div
          class="w-8 h-8 rounded border-2 border-gray-300 shadow-sm"
          :style="{
            background: `rgb(${hoverColor.r}, ${hoverColor.g}, ${hoverColor.b})`,
          }"
        ></div>
        <div class="text-xs font-mono">
          <div class="font-semibold text-gray-700">RGB</div>
          <div class="text-gray-600">
            {{ hoverColor.r }}, {{ hoverColor.g }}, {{ hoverColor.b }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";

const props = defineProps<{
  originalUrl: string;
  resultImageData?: ImageData | null;
  enablePick?: boolean;
}>();

const emit = defineEmits<{
  (e: "pick", color: { r: number; g: number; b: number }): void;
  (e: "pickMultiple", colors: Array<{ r: number; g: number; b: number }>): void;
  (
    e: "transformChange",
    transform: { x: number; y: number; scale: number }
  ): void;
  (e: "canvasReady", info: { width: number; height: number }): void;
}>();

const containerRef = ref<HTMLElement>();
const canvasRef = ref<HTMLCanvasElement>();

const transform = ref({ scale: 1, x: 0, y: 0 });
const dividerPosition = ref(0.5); // 参考线相对于容器的位置（0-1）

const isDraggingCanvas = ref(false);
const isDraggingDivider = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const isSpacePressed = ref(false);

const originalImage = ref<HTMLImageElement | null>(null);

// 框选拾取相关
const isSelecting = ref(false);
const selectStart = ref({ x: 0, y: 0 });
const selectEnd = ref({ x: 0, y: 0 });

// 鼠标悬停颜色显示
const hoverColor = ref<{ r: number; g: number; b: number } | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });

const hasResult = computed(() => !!props.resultImageData);

// 加载图片
watch(
  () => props.originalUrl,
  async (url) => {
    if (!url) return;
    try {
      const img = await loadImage(url);
      originalImage.value = img;
      await nextTick();
      draw();
      resetView();
    } catch (error) {
      console.error("加载图片失败:", error);
    }
  },
  { immediate: true }
);

// 当结果改变时重新绘制
watch(
  () => props.resultImageData,
  () => {
    draw();
  }
);

// 当分割线位置改变时重新绘制
watch(dividerPosition, () => {
  // 只有在对比模式下才需要重绘（因为分割点依赖transform计算）
  if (hasResult.value) {
    draw();
  }
});

// 对比模式下，transform变化时需要重绘（使用RAF优化）
let rafId: number | null = null;
watch(
  () => transform.value,
  (newTransform) => {
    // 发出 transform 变化事件
    emit("transformChange", { ...newTransform });

    // 只有在对比模式下才需要重绘
    if (!hasResult.value) return;

    // 使用 requestAnimationFrame 优化，避免重复重绘
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      draw();
      rafId = null;
    });
  },
  { deep: true }
);

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function draw() {
  const canvas = canvasRef.value;
  const img = originalImage.value;
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 设置画布尺寸为原图尺寸
  canvas.width = img.width;
  canvas.height = img.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (props.resultImageData) {
    // 对比模式：基于容器位置计算分割点
    const container = containerRef.value;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dividerScreenX = rect.width * dividerPosition.value;

    // 将容器坐标转换为画布坐标
    const canvasX =
      (dividerScreenX - transform.value.x) / transform.value.scale;
    const splitX = Math.max(0, Math.min(canvas.width, Math.floor(canvasX)));

    // 绘制左侧原图
    ctx.drawImage(
      img,
      0,
      0,
      splitX,
      canvas.height,
      0,
      0,
      splitX,
      canvas.height
    );

    // 绘制右侧结果
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(props.resultImageData, 0, 0);
    ctx.drawImage(
      tempCanvas,
      splitX,
      0,
      canvas.width - splitX,
      canvas.height,
      splitX,
      0,
      canvas.width - splitX,
      canvas.height
    );
  } else {
    // 仅原图模式
    ctx.drawImage(img, 0, 0);
  }

  // 发出画布准备就绪事件
  emit("canvasReady", {
    width: canvas.width,
    height: canvas.height,
  });
}

// 缩放和平移
function resetView() {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const containerRect = container.getBoundingClientRect();
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // 计算适应容器的缩放比例
  const scaleX = (containerRect.width - 40) / canvasWidth;
  const scaleY = (containerRect.height - 80) / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  // 居中
  const x = (containerRect.width - canvasWidth * scale) / 2;
  const y = (containerRect.height - canvasHeight * scale) / 2;

  transform.value = { scale, x, y };
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();

  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(Math.max(transform.value.scale * delta, 0.1), 10);
  const scaleRatio = newScale / transform.value.scale;

  transform.value.x = mouseX - (mouseX - transform.value.x) * scaleRatio;
  transform.value.y = mouseY - (mouseY - transform.value.y) * scaleRatio;
  transform.value.scale = newScale;
}

// 画布拖拽
function handleMouseDown(e: MouseEvent) {
  if (isDraggingDivider.value) return;

  // 如果按住空格，或者不在拾取模式，进行平移
  if (isSpacePressed.value || !props.enablePick) {
    isDraggingCanvas.value = true;
    dragStart.value = {
      x: e.clientX - transform.value.x,
      y: e.clientY - transform.value.y,
    };

    window.addEventListener("mousemove", handleCanvasMouseMove);
    window.addEventListener("mouseup", handleCanvasMouseUp);
    return;
  }

  // 如果是拾取模式，开始框选
  if (props.enablePick) {
    const container = containerRef.value;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isSelecting.value = true;
    selectStart.value = { x, y };
    selectEnd.value = { x, y };

    window.addEventListener("mousemove", handleSelectMouseMove);
    window.addEventListener("mouseup", handleSelectMouseUp);
    return;
  }
}

function handleCanvasMouseMove(e: MouseEvent) {
  if (!isDraggingCanvas.value) return;
  transform.value.x = e.clientX - dragStart.value.x;
  transform.value.y = e.clientY - dragStart.value.y;
}

function handleCanvasMouseUp() {
  isDraggingCanvas.value = false;
  // 移除 window 上的事件监听
  window.removeEventListener("mousemove", handleCanvasMouseMove);
  window.removeEventListener("mouseup", handleCanvasMouseUp);
}

// 框选拾取
function handleSelectMouseMove(e: MouseEvent) {
  if (!isSelecting.value) return;
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  selectEnd.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function handleSelectMouseUp() {
  if (!isSelecting.value) return;

  // 如果框选区域太小（小于5x5），当作单点拾取
  const width = Math.abs(selectEnd.value.x - selectStart.value.x);
  const height = Math.abs(selectEnd.value.y - selectStart.value.y);

  if (width < 5 && height < 5) {
    // 单点拾取逻辑已在 handleClick 中处理
  } else {
    // 区域拾取
    pickColorsFromRegion();
  }

  isSelecting.value = false;
  window.removeEventListener("mousemove", handleSelectMouseMove);
  window.removeEventListener("mouseup", handleSelectMouseUp);
}

function pickColorsFromRegion() {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 将容器坐标转换为画布坐标
  const minX = Math.min(selectStart.value.x, selectEnd.value.x);
  const minY = Math.min(selectStart.value.y, selectEnd.value.y);
  const maxX = Math.max(selectStart.value.x, selectEnd.value.x);
  const maxY = Math.max(selectStart.value.y, selectEnd.value.y);

  const canvasMinX = Math.max(
    0,
    Math.floor((minX - transform.value.x) / transform.value.scale)
  );
  const canvasMinY = Math.max(
    0,
    Math.floor((minY - transform.value.y) / transform.value.scale)
  );
  const canvasMaxX = Math.min(
    canvas.width,
    Math.ceil((maxX - transform.value.x) / transform.value.scale)
  );
  const canvasMaxY = Math.min(
    canvas.height,
    Math.ceil((maxY - transform.value.y) / transform.value.scale)
  );

  const width = canvasMaxX - canvasMinX;
  const height = canvasMaxY - canvasMinY;

  if (width <= 0 || height <= 0) return;

  const imageData = ctx.getImageData(canvasMinX, canvasMinY, width, height);
  const colors = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();

  // 完全采样所有像素，不跳过任何像素
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const a = imageData.data[idx + 3];

      // 忽略透明像素
      if (a < 128) continue;

      const key = `${r},${g},${b}`;
      if (colors.has(key)) {
        colors.get(key)!.count++;
      } else {
        colors.set(key, { r, g, b, count: 1 });
      }
    }
  }

  // 按出现次数排序，获取所有颜色（最多100个）
  const sortedColors = Array.from(colors.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 100)
    .map(({ r, g, b }) => ({ r, g, b }));

  if (sortedColors.length > 0) {
    emit("pickMultiple", sortedColors);
  }
}

// 分割线拖拽
function handleDividerMouseDown(e: MouseEvent) {
  e.stopPropagation();
  isDraggingDivider.value = true;

  // 在 window 上绑定 mousemove 和 mouseup 事件
  window.addEventListener("mousemove", handleDividerMouseMove);
  window.addEventListener("mouseup", handleDividerMouseUp);
}

function handleDividerMouseMove(e: MouseEvent) {
  if (!isDraggingDivider.value) return;
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;

  // 参考线相对于容器的位置
  dividerPosition.value = Math.max(0, Math.min(1, x / rect.width));
}

function handleDividerMouseUp() {
  isDraggingDivider.value = false;
  // 移除 window 上的事件监听
  window.removeEventListener("mousemove", handleDividerMouseMove);
  window.removeEventListener("mouseup", handleDividerMouseUp);
}

// 鼠标移动显示颜色
function handleMouseMove(e: MouseEvent) {
  if (!props.enablePick || isSelecting.value) return;

  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 保存鼠标位置
  hoverPosition.value = { x: mouseX, y: mouseY };

  // 转换到画布坐标
  const canvasX = (mouseX - transform.value.x) / transform.value.scale;
  const canvasY = (mouseY - transform.value.y) / transform.value.scale;

  if (
    canvasX < 0 ||
    canvasX >= canvas.width ||
    canvasY < 0 ||
    canvasY >= canvas.height
  ) {
    hoverColor.value = null;
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pixel = ctx.getImageData(
    Math.floor(canvasX),
    Math.floor(canvasY),
    1,
    1
  ).data;

  hoverColor.value = { r: pixel[0], g: pixel[1], b: pixel[2] };
}

function handleMouseLeave() {
  hoverColor.value = null;
}

// 点击拾色
function handleClick(e: MouseEvent) {
  if (!props.enablePick || isDraggingCanvas.value || isSelecting.value) return;

  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const rect = container.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // 转换到画布坐标
  const canvasX = (clickX - transform.value.x) / transform.value.scale;
  const canvasY = (clickY - transform.value.y) / transform.value.scale;

  if (
    canvasX < 0 ||
    canvasX >= canvas.width ||
    canvasY < 0 ||
    canvasY >= canvas.height
  ) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pixel = ctx.getImageData(
    Math.floor(canvasX),
    Math.floor(canvasY),
    1,
    1
  ).data;
  emit("pick", { r: pixel[0], g: pixel[1], b: pixel[2] });
}

// 空格键监听
function handleKeyDown(e: KeyboardEvent) {
  if (e.code === "Space" && !isSpacePressed.value) {
    e.preventDefault();
    isSpacePressed.value = true;
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code === "Space") {
    e.preventDefault();
    isSpacePressed.value = false;
  }
}

// 监听窗口大小变化
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    resetView();
  });

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }

  // 监听空格键
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  // 清理可能残留的事件监听
  window.removeEventListener("mousemove", handleCanvasMouseMove);
  window.removeEventListener("mouseup", handleCanvasMouseUp);
  window.removeEventListener("mousemove", handleDividerMouseMove);
  window.removeEventListener("mouseup", handleDividerMouseUp);
  window.removeEventListener("mousemove", handleSelectMouseMove);
  window.removeEventListener("mouseup", handleSelectMouseUp);
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
});

// 暴露给父组件
defineExpose({
  transform,
  canvasRef,
});
</script>
