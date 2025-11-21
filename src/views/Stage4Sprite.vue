<template>
  <div class="grid grid-cols-2 gap-4 lg:gap-8 h-full pb-2">
    <!-- Left Panel: Frames & Sprite Preview -->
    <div class="bg-white rounded-lg shadow-md p-2 lg:p-6 flex flex-col min-h-0">
      <div class="mb-4 border-b border-gray-200">
        <nav class="flex space-x-4" aria-label="Tabs">
          <button @click="leftTab = 'frames'" :class="tabClass('frames')">
            序列帧
          </button>
          <button
            @click="leftTab = 'sprite'"
            :disabled="!spriteImageUrl"
            :class="[
              ...tabClass('sprite'),
              !spriteImageUrl ? 'cursor-not-allowed text-gray-400' : '',
            ]"
          >
            雪碧图预览
          </button>
        </nav>
      </div>

      <!-- 序列帧列表 -->
      <div v-show="leftTab === 'frames'" class="flex-1 min-h-0 overflow-auto">
        <div v-if="results.length === 0" class="text-gray-500 p-4 text-center">
          暂无序列帧
        </div>
        <div
          v-else
          class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 items-start"
        >
          <div
            v-for="r in sortedResults"
            :key="r.index"
            class="border rounded-md overflow-hidden"
          >
            <div
              class="w-full"
              :style="{
                backgroundImage: `
                  linear-gradient(45deg, #CCCCCC 25%, transparent 25%),
                  linear-gradient(-45deg, #CCCCCC 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #CCCCCC 75%),
                  linear-gradient(-45deg, transparent 75%, #CCCCCC 75%)
                `,
                backgroundSize: '10px 10px',
                backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
              }"
            >
              <canvas
                :ref="(el) => setCanvasRef(el, r.index)"
                class="w-full h-auto block"
              ></canvas>
            </div>
            <div class="text-xs text-gray-600 px-2 py-1">#{{ r.index + 1 }}</div>
          </div>
        </div>
      </div>

      <!-- 雪碧图预览 -->
      <div v-show="leftTab === 'sprite'" class="flex-1 min-h-0 flex items-center justify-center relative">
        <div v-if="!spriteImageUrl" class="text-gray-500 text-center">
          <svg
            class="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>请先生成雪碧图</p>
        </div>
        <div
          v-else
          ref="spriteContainer"
          class="w-full h-full relative overflow-hidden cursor-move"
          :style="{
            backgroundImage: `
              linear-gradient(45deg, #CCCCCC 25%, transparent 25%),
              linear-gradient(-45deg, #CCCCCC 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #CCCCCC 75%),
              linear-gradient(-45deg, transparent 75%, #CCCCCC 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
        >
          <div
            class="absolute border-2 border-blue-500 shadow-lg select-none pointer-events-none"
            :style="{
              transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`,
              transformOrigin: 'center center',
              left: '50%',
              top: '50%',
              width: spriteImageWidth ? `${spriteImageWidth}px` : 'auto',
              height: spriteImageHeight ? `${spriteImageHeight}px` : 'auto',
            }"
          >
            <img
              ref="spriteImage"
              :src="spriteImageUrl"
              alt="雪碧图"
              class="block w-full h-full pointer-events-none"
              draggable="false"
              @load="handleImageLoad"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Settings -->
    <div class="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-0">
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            行数 (Rows)
          </label>
          <input
            v-model.number="rows"
            type="number"
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p class="text-xs text-gray-500 mt-1">
            雪碧图的行数，建议值: {{ suggestedRows }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            列数 (Columns)
          </label>
          <input
            v-model.number="columns"
            type="number"
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p class="text-xs text-gray-500 mt-1">
            雪碧图的列数，建议值: {{ suggestedColumns }}
          </p>
        </div>

        <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-sm text-blue-700">
            <strong>总帧数:</strong> {{ results.length }}
          </p>
          <p class="text-sm text-blue-700 mt-1">
            <strong>网格大小:</strong> {{ rows }} × {{ columns }} = {{ rows * columns }}
          </p>
          <p
            v-if="rows * columns < results.length"
            class="text-xs text-orange-600 mt-2"
          >
            警告: 网格大小小于总帧数，部分帧将无法显示
          </p>
        </div>

        <button
          @click="generateSprite"
          :disabled="isGenerating || results.length === 0 || rows < 1 || columns < 1"
          class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            v-if="isGenerating"
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <span>{{ isGenerating ? "生成中..." : "生成雪碧图" }}</span>
        </button>

        <div v-if="spriteImageUrl" class="space-y-3">
          <button
            @click="resetView"
            class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center justify-center gap-2"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            重置视图
          </button>
          <button
            @click="downloadSprite"
            class="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center gap-2"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            下载雪碧图
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { drawTransparentBackground } from "../utils/transparent-bg";

interface Props {
  results: Array<{ index: number; imageData: ImageData }>;
}

const props = defineProps<Props>();

const leftTab = ref<"frames" | "sprite">("frames");
const rows = ref(1);
const columns = ref(1);
const isGenerating = ref(false);
const spriteImageUrl = ref("");

// 雪碧图预览的缩放和移动
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const spriteImageWidth = ref(0);
const spriteImageHeight = ref(0);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartTranslateX = ref(0);
const dragStartTranslateY = ref(0);
const spriteContainer = ref<HTMLElement | null>(null);
const spriteImage = ref<HTMLImageElement | null>(null);

// 排序后的结果
const sortedResults = computed(() => {
  return [...props.results].sort((a, b) => a.index - b.index);
});

// 建议的行数和列数
const suggestedRows = computed(() => {
  const total = props.results.length;
  if (total === 0) return 1;
  const sqrt = Math.sqrt(total);
  return Math.ceil(sqrt);
});

const suggestedColumns = computed(() => {
  const total = props.results.length;
  if (total === 0) return 1;
  return Math.ceil(total / suggestedRows.value);
});

// 初始化建议值
watch(
  () => props.results.length,
  () => {
    if (props.results.length > 0) {
      rows.value = suggestedRows.value;
      columns.value = suggestedColumns.value;
    }
  },
  { immediate: true }
);

// Canvas 引用管理
const canvasRefs = new Map<number, HTMLCanvasElement>();
function setCanvasRef(el: any, index: number) {
  if (!el) return;
  canvasRefs.set(index, el as HTMLCanvasElement);
}

// 渲染所有帧到 canvas
function renderAllFrames() {
  for (const r of sortedResults.value) {
    const c = canvasRefs.get(r.index);
    if (!c) continue;
    c.width = r.imageData.width;
    c.height = r.imageData.height;
    const ctx = c.getContext("2d");
    if (!ctx) continue;

    drawTransparentBackground(ctx, c.width, c.height, 10);
    ctx.putImageData(r.imageData, 0, 0);
  }
}

onMounted(() => {
  nextTick(renderAllFrames);
});

watch(
  () => props.results,
  () => {
    nextTick(renderAllFrames);
  },
  { deep: true }
);

// 组件卸载时清理事件监听
onUnmounted(() => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
});

// 生成雪碧图
async function generateSprite() {
  if (props.results.length === 0 || rows.value < 1 || columns.value < 1) {
    return;
  }

  isGenerating.value = true;
  try {
    const sorted = sortedResults.value;
    if (sorted.length === 0) {
      alert("没有可用的帧");
      return;
    }

    // 获取第一帧的尺寸（假设所有帧尺寸相同）
    const firstFrame = sorted[0].imageData;
    const frameWidth = firstFrame.width;
    const frameHeight = firstFrame.height;

    // 计算雪碧图尺寸
    const spriteWidth = frameWidth * columns.value;
    const spriteHeight = frameHeight * rows.value;

    // 创建雪碧图画布
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteWidth;
    spriteCanvas.height = spriteHeight;
    const spriteCtx = spriteCanvas.getContext("2d");
    if (!spriteCtx) {
      throw new Error("无法创建画布上下文");
    }

    // 不绘制背景，保持透明
    // drawTransparentBackground(spriteCtx, spriteWidth, spriteHeight, 20);

    // 将每一帧绘制到对应位置
    for (let i = 0; i < sorted.length && i < rows.value * columns.value; i++) {
      const r = sorted[i];
      const row = Math.floor(i / columns.value);
      const col = i % columns.value;
      const x = col * frameWidth;
      const y = row * frameHeight;

      spriteCtx.putImageData(r.imageData, x, y);
    }

    // 转换为图片 URL
    spriteCanvas.toBlob((blob) => {
      if (blob) {
        if (spriteImageUrl.value) {
          URL.revokeObjectURL(spriteImageUrl.value);
        }
        spriteImageUrl.value = URL.createObjectURL(blob);
        leftTab.value = "sprite";
      } else {
        alert("生成雪碧图失败");
      }
      isGenerating.value = false;
    }, "image/png");
  } catch (error: any) {
    console.error("生成雪碧图失败:", error);
    alert("生成雪碧图失败: " + error.message);
    isGenerating.value = false;
  }
}

// 下载雪碧图
function downloadSprite() {
  if (!spriteImageUrl.value) return;

  const a = document.createElement("a");
  a.href = spriteImageUrl.value;
  a.download = `sprite_${rows.value}x${columns.value}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function tabClass(key: "frames" | "sprite") {
  return [
    "px-3 py-2 font-medium text-sm rounded-md",
    leftTab.value === key
      ? "bg-blue-100 text-blue-700"
      : "text-gray-500 hover:text-gray-700",
  ];
}

// 图片加载完成
function handleImageLoad() {
  if (spriteImage.value) {
    spriteImageWidth.value = spriteImage.value.naturalWidth;
    spriteImageHeight.value = spriteImage.value.naturalHeight;
    // 重置缩放和位置
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }
}

// 鼠标滚轮缩放
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(5, scale.value * delta));
  scale.value = newScale;
}

// 鼠标按下开始拖拽
function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return; // 只处理左键
  e.preventDefault();
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragStartTranslateX.value = translateX.value;
  dragStartTranslateY.value = translateY.value;
  
  // 绑定到 window 上
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
}

// 鼠标移动拖拽
function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  e.preventDefault();
  const deltaX = e.clientX - dragStartX.value;
  const deltaY = e.clientY - dragStartY.value;
  translateX.value = dragStartTranslateX.value + deltaX;
  translateY.value = dragStartTranslateY.value + deltaY;
}

// 鼠标释放结束拖拽
function handleMouseUp() {
  if (!isDragging.value) return;
  isDragging.value = false;
  // 移除 window 上的事件监听
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
}

// 重置视图
function resetView() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}
</script>

