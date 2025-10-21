<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pb-2">
    <!-- Left: Frames & Preview -->
    <div class="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-0">
      <div class="mb-4 border-b border-gray-200">
        <nav class="flex space-x-4" aria-label="Tabs">
          <button @click="leftTab = 'frames'" :class="tabClass('frames')">
            帧序列
          </button>
          <button @click="leftTab = 'single'" :class="tabClass('single')">
            单帧
          </button>
          <button @click="leftTab = 'results'" :class="tabClass('results')">
            结果
          </button>
          <button @click="leftTab = 'video'" :class="tabClass('video')">
            视频预览
          </button>
        </nav>
      </div>

      <div v-show="leftTab === 'frames'" class="flex-1 min-h-0">
        <FramesList
          :frames="frames"
          :active-index="activeFrameIndex"
          @select="onSelectFrame"
        />
      </div>
      <div v-show="leftTab === 'single'" class="flex-1 min-h-0">
        <CutoutPreview
          :original-url="currentOriginalUrl"
          :result-image-data="currentResultImageData"
          :enable-pick="isPicking"
          @pick="handlePickColor"
          @pick-multiple="handlePickMultipleColors"
          @shapes-update="handleShapesUpdate"
        />
      </div>
      <div v-show="leftTab === 'results'" class="flex-1 min-h-0">
        <ResultsList
          :results="results"
          :fps="outputFps"
          :is-processing="isProcessing"
          @generate-video="handleGenerateVideo"
        />
      </div>
      <div v-show="leftTab === 'video'" class="flex-1 min-h-0 flex flex-col">
        <div
          v-if="validResults.length === 0"
          class="flex-1 flex items-center justify-center text-gray-500"
        >
          <div class="text-center">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p>暂无动画预览</p>
            <p class="text-sm mt-1">批量运行后可以预览动画</p>
          </div>
        </div>
        <div v-else class="flex-1 min-h-0 flex flex-col gap-3">
          <!-- 播放器画布 -->
          <div
            class="flex-1 bg-white rounded-lg overflow-hidden flex items-center justify-center min-h-0"
          >
            <canvas
              ref="animationCanvas"
              class="max-w-full max-h-full"
              style="object-fit: contain"
            />
          </div>

          <!-- 控制栏 -->
          <div class="flex items-center gap-3 flex-wrap">
            <!-- 播放/暂停按钮 -->
            <button
              @click="togglePlayPause"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2"
            >
              <svg
                v-if="!isPlaying"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>{{ isPlaying ? "暂停" : "播放" }}</span>
            </button>

            <!-- 帧率控制 -->
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">帧率:</label>
              <input
                v-model.number="playbackFps"
                type="number"
                min="1"
                max="60"
                class="w-16 px-2 py-1 border border-gray-300 rounded-md"
              />
              <span class="text-sm text-gray-600">FPS</span>
            </div>

            <!-- 当前帧 -->
            <div class="text-sm text-gray-600">
              帧: {{ currentPlayFrame + 1 }} / {{ validResults.length }}
            </div>

            <!-- 循环播放 -->
            <label
              class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer"
            >
              <input v-model="isLooping" type="checkbox" class="rounded" />
              循环播放
            </label>

            <!-- 下载序列帧 -->
            <button
              @click="downloadFrames"
              class="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2"
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
              下载序列帧
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Plugin Panel -->
    <div class="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-0">
      <PluginTabs
        :active="activePlugin"
        @change="(v: 'color'|'imgly') => (activePlugin = v)"
      />
      <div class="mt-4 flex-1 min-h-0 overflow-auto">
        <component
          :is="activePluginComponent"
          :picked-colors="pickedColors"
          :is-picking="isPicking"
          :on-pick-start="startPick"
          :on-pick-stop="stopPick"
          :on-clear-colors="() => (pickedColors = [])"
          :on-remove-color="handleRemoveColor"
          v-model="pluginConfig"
        />
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          @click="onRunSingle"
          :disabled="!hasFrame || isRunningSingle.value.value"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
        >
          <svg
            v-if="isRunningSingle.value.value"
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
          <span>{{
            isRunningSingle.value.value ? "处理中..." : "运行当前帧"
          }}</span>
        </button>
        <button
          @click="onRunBatch"
          :disabled="frames.length === 0 || isRunningBatch.value.value"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
        >
          <svg
            v-if="isRunningBatch.value.value"
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
          <span>{{
            isRunningBatch.value.value ? `处理中 ${batchProgress}` : "批量运行"
          }}</span>
        </button>
        <div class="ml-auto flex items-center gap-2">
          <label class="text-sm text-gray-600">输出FPS</label>
          <input
            v-model.number="outputFps"
            type="number"
            min="1"
            max="60"
            class="w-20 px-2 py-1 border border-gray-300 rounded-md"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import FramesList from "../components/cutout/FramesList.vue";
import CutoutPreview from "../components/cutout/CutoutPreview.vue";
import ResultsList from "../components/cutout/ResultsList.vue";
import PluginTabs from "../components/cutout/PluginTabs.vue";
import ColorPluginPanel from "../components/cutout/plugins/ColorPluginPanel.vue";
import ImglyPluginPanel from "../components/cutout/plugins/ImglyPluginPanel.vue";
import { useBoolean } from "../composables/useBoolean";
import { destroyImglyWorker } from "../utils/imgly-worker";

interface Frame {
  url: string;
  blob: Blob;
  index: number;
}

const props = defineProps<{
  frames: Frame[];
  isProcessing: boolean;
  ffmpegProgress?: { text: string; percent: number };
}>();

const leftTab = ref<"frames" | "single" | "results" | "video">("frames");
const activeFrameIndex = ref(0);
const activePlugin = ref<"color" | "imgly">("color");
const outputFps = ref(24);

// 动画播放器相关
const animationCanvas = ref<HTMLCanvasElement | null>(null);
const isPlaying = ref(false);
const playbackFps = ref(24);
const currentPlayFrame = ref(0);
const isLooping = ref(true);
let animationFrameId: number | null = null;
let lastFrameTime = 0;

// 插件配置与拾色
const pluginConfig = ref<Record<string, any>>({});
const pickedColors = ref<Array<{ r: number; g: number; b: number }>>([]);
const isPicking = ref(false);

// 遮罩形状
const maskShapes = ref<
  Array<{
    type: "rect" | "circle" | "polygon";
    points: Array<{ x: number; y: number }>;
  }>
>([]);

const hasFrame = computed(() => props.frames && props.frames.length > 0);

// 过滤有效结果
const validResults = computed(() => {
  return results.value
    .filter((r) => r && r.imageData)
    .sort((a, b) => a.index - b.index);
});

watch(
  () => props.frames,
  (arr) => {
    if (arr && arr.length > 0 && activeFrameIndex.value >= arr.length) {
      activeFrameIndex.value = 0;
    }
  }
);

const onSelectFrame = (index: number) => {
  activeFrameIndex.value = index;
  leftTab.value = "single";
};

const currentOriginalUrl = computed(() => {
  const f = props.frames?.[activeFrameIndex.value];
  return f?.url || "";
});

// 结果缓存：与帧 index 对应
const results = ref<Array<{ index: number; imageData: ImageData }>>([]);
const currentResultImageData = computed(() => {
  const r = results.value.find((r) => r.index === activeFrameIndex.value);
  return r?.imageData;
});

const startPick = () => {
  isPicking.value = true;
  // 自动切换到单帧视图以便拾取颜色
  if (leftTab.value !== "single" && hasFrame.value) {
    leftTab.value = "single";
  }
};
const stopPick = () => {
  isPicking.value = false;
};

const handlePickColor = (color: { r: number; g: number; b: number }) => {
  // 检查颜色是否已存在（去重）
  const isDuplicate = pickedColors.value.some(
    (c) => c.r === color.r && c.g === color.g && c.b === color.b
  );
  if (!isDuplicate) {
    pickedColors.value.push(color);
  }
  // 不再自动关闭拾取模式，允许多次拾取
};

const handlePickMultipleColors = (
  colors: Array<{ r: number; g: number; b: number }>
) => {
  // 批量添加颜色，去重
  colors.forEach((color) => {
    const isDuplicate = pickedColors.value.some(
      (c) => c.r === color.r && c.g === color.g && c.b === color.b
    );
    if (!isDuplicate) {
      pickedColors.value.push(color);
    }
  });
};

const handleRemoveColor = (index: number) => {
  pickedColors.value.splice(index, 1);
};

const handleShapesUpdate = (
  shapes: Array<{
    type: "rect" | "circle" | "polygon";
    points: Array<{ x: number; y: number }>;
  }>
) => {
  maskShapes.value = shapes;
};

const activePluginComponent = computed(() => {
  return activePlugin.value === "color" ? ColorPluginPanel : ImglyPluginPanel;
});

// 加载状态管理
const isRunningSingle = useBoolean(false);
const isRunningBatch = useBoolean(false);
const batchProgress = ref("");

const onRunSingle = async () => {
  if (!hasFrame.value || isRunningSingle.value.value) return;

  // 运行时取消拾取模式
  isPicking.value = false;

  // 如果没有选中帧或当前tab不是单帧，切换到单帧tab并选中第一帧
  if (leftTab.value !== "single") {
    leftTab.value = "single";
    if (
      activeFrameIndex.value < 0 ||
      activeFrameIndex.value >= props.frames.length
    ) {
      activeFrameIndex.value = 0;
    }
  }

  isRunningSingle.setTrue();
  try {
    await runProcessForIndex(activeFrameIndex.value);
  } finally {
    isRunningSingle.setFalse();
  }
};

const onRunBatch = async () => {
  if (props.frames.length === 0 || isRunningBatch.value.value) return;

  // 运行时取消拾取模式
  isPicking.value = false;

  isRunningBatch.setTrue();
  try {
    // 并发处理多个帧（每次处理3个帧以平衡速度和内存）
    const concurrency = 3;
    const totalFrames = props.frames.length;
    let completed = 0;

    for (let i = 0; i < totalFrames; i += concurrency) {
      const batch = [];
      for (let j = 0; j < concurrency && i + j < totalFrames; j++) {
        batch.push(runProcessForIndex(i + j));
      }

      await Promise.all(batch);
      completed += batch.length;
      batchProgress.value = `(${completed}/${totalFrames})`;
    }

    leftTab.value = "results";
  } finally {
    isRunningBatch.setFalse();
    batchProgress.value = "";
  }
};

async function runProcessForIndex(i: number) {
  const frame = props.frames[i];
  if (!frame) {
    console.warn(`帧 ${i} 不存在`);
    return;
  }

  try {
    const img = await loadImage(frame.url);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error(`无法获取帧 ${i} 的 canvas context`);
      return;
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const context = {
      canvas,
      ctx,
      originalImage: img,
      pickedColors: pickedColors.value,
      maskShapes: maskShapes.value,
      setStatus: () => {},
      yieldToUI: () => new Promise((r) => setTimeout(r, 0)),
    };

    let imageData: ImageData | null = null;
    if (activePlugin.value === "color") {
      const { colorPlugin } = await import("../plugins/cutout/colorPlugin");
      const res = await colorPlugin.process(context as any, pluginConfig.value);
      if (res.success && res.imageData) imageData = res.imageData;
    } else {
      const { imglyPlugin } = await import("../plugins/cutout/imglyPlugin");
      const res = await imglyPlugin.process(context as any, pluginConfig.value);
      if (res.success && res.imageData) imageData = res.imageData;
    }

    if (imageData) {
      // 覆盖/追加
      const idx = results.value.findIndex((r) => r.index === i);
      if (idx >= 0) {
        results.value[idx].imageData = imageData;
      } else {
        results.value.push({ index: i, imageData });
      }
      if (i === activeFrameIndex.value) leftTab.value = "single";
    } else {
      console.warn(`帧 ${i} 处理失败，未生成有效的 imageData`);
    }
  } catch (error) {
    console.error(`处理帧 ${i} 时发生错误:`, error);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function tabClass(key: "frames" | "single" | "results" | "video") {
  return [
    "px-3 py-2 font-medium text-sm rounded-md",
    leftTab.value === key
      ? "bg-blue-100 text-blue-700"
      : "text-gray-500 hover:text-gray-700",
  ];
}

// 切换到视频预览
function handleGenerateVideo() {
  if (validResults.value.length === 0) {
    alert("没有可用的结果帧");
    return;
  }

  // 切换到视频预览 tab
  leftTab.value = "video";

  // 渲染第一帧
  currentPlayFrame.value = 0;
  renderFrame(0);
}

// 动画播放器功能
function renderFrame(frameIndex: number) {
  if (!animationCanvas.value || validResults.value.length === 0) return;

  const result = validResults.value[frameIndex];
  if (!result || !result.imageData) return;

  const canvas = animationCanvas.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 设置 canvas 尺寸（仅在首次或尺寸变化时）
  if (
    canvas.width !== result.imageData.width ||
    canvas.height !== result.imageData.height
  ) {
    canvas.width = result.imageData.width;
    canvas.height = result.imageData.height;
  }

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制白色背景
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制当前帧
  ctx.putImageData(result.imageData, 0, 0);
}

function animate(timestamp: number) {
  if (!isPlaying.value) return;

  const frameDuration = 1000 / playbackFps.value;

  if (timestamp - lastFrameTime >= frameDuration) {
    renderFrame(currentPlayFrame.value);

    currentPlayFrame.value++;
    if (currentPlayFrame.value >= validResults.value.length) {
      if (isLooping.value) {
        currentPlayFrame.value = 0;
      } else {
        isPlaying.value = false;
        currentPlayFrame.value = validResults.value.length - 1;
        return;
      }
    }

    lastFrameTime = timestamp;
  }

  animationFrameId = requestAnimationFrame(animate);
}

function togglePlayPause() {
  isPlaying.value = !isPlaying.value;

  if (isPlaying.value) {
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(animate);
  } else {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
}

// 监听 validResults 变化，渲染第一帧
watch(validResults, (results) => {
  if (results.length > 0) {
    currentPlayFrame.value = 0;
    renderFrame(0);
  }
});

// 监听切换到视频 tab，渲染第一帧
watch(leftTab, (tab) => {
  if (tab === "video" && validResults.value.length > 0) {
    currentPlayFrame.value = 0;
    renderFrame(0);
  }
});

// 下载序列帧
async function downloadFrames() {
  if (validResults.value.length === 0) {
    alert("没有可下载的帧");
    return;
  }

  try {
    // 创建 ZIP 文件（简化版：逐个下载）
    for (let i = 0; i < validResults.value.length; i++) {
      const r = validResults.value[i];
      const canvas = document.createElement("canvas");
      canvas.width = r.imageData.width;
      canvas.height = r.imageData.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      // 添加白色背景
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(r.imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("转换失败"));
        }, "image/png");
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame_${String(i + 1).padStart(4, "0")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 添加短暂延迟，避免浏览器阻止多次下载
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    alert("序列帧下载完成！");
  } catch (error: any) {
    console.error("下载序列帧失败:", error);
    alert("下载失败: " + error.message);
  }
}

// 监听ESC键取消拾取
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" && isPicking.value) {
    isPicking.value = false;
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  // 清理 ImgLy Worker 资源
  destroyImglyWorker();
  // 停止动画
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>
