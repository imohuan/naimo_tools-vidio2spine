<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pb-2">
    <!-- Left Panel: Video Preview -->
    <div class="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-0">
      <div class="mb-4 border-b border-gray-200">
        <nav class="flex space-x-4" aria-label="Tabs">
          <button
            @click="activeTab = 'trimmed'"
            :class="[
              'px-3 py-2 font-medium text-sm rounded-md',
              activeTab === 'trimmed'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            裁剪后视频
          </button>
          <button
            @click="activeTab = 'final'"
            :disabled="!finalVideoUrl"
            :class="[
              'px-3 py-2 font-medium text-sm rounded-md',
              activeTab === 'final'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700',
              !finalVideoUrl ? 'cursor-not-allowed text-gray-400' : '',
            ]"
          >
            最终视频
          </button>
        </nav>
      </div>

      <div v-show="activeTab === 'trimmed'" class="flex-1 min-h-0">
        <video
          :src="trimmedVideoUrl"
          controls
          class="w-full h-full object-contain"
        ></video>
      </div>
      <div v-show="activeTab === 'final'" class="flex-1 min-h-0">
        <FinalVideoPanel :final-video-url="finalVideoUrl" />
      </div>
    </div>

    <!-- Right Panel: Frame Extraction and Generation -->
    <div class="bg-white rounded-lg shadow-md p-6 flex flex-col min-h-0">
      <div class="flex items-center justify-between gap-4 flex-nowrap">
        <div class="flex items-center gap-4 overflow-hidden flex-1">
          <div class="shrink-0">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >帧率 (FPS)</label
            >
            <input
              v-model.number="extractionFps"
              type="number"
              min="1"
              max="60"
              class="w-32 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            @click="onExtractClick"
            :disabled="isProcessing || debouncingExtract"
            class="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span v-if="!isProcessing">提取帧</span>
            <span v-else class="flex items-center gap-2">
              <svg
                class="animate-spin h-5 w-5 text-white"
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
              <span>{{ extractProgressText }}</span>
            </span>
          </button>
        </div>
        <button
          v-if="frames.length > 0"
          @click="$emit('detectLoop')"
          :disabled="isProcessing"
          class="self-end px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
        >
          自动拾取循环帧
        </button>
      </div>

      <div v-if="frames.length > 0" class="flex-1 flex flex-col min-h-0 mt-4">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-sm font-medium text-gray-700">
            提取的帧 ({{ frames.length }})
          </p>
          <div class="flex items-center gap-2">
            <button
              @click="selectAllFrames"
              class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300"
            >
              全选
            </button>
            <button
              @click="invertSelection"
              class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300"
            >
              反选
            </button>
            <button
              @click="clearSelection"
              :disabled="selectedFrames.length === 0"
              class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空
            </button>
          </div>
        </div>
        <FramesGrid
          :frames="frames"
          :selected-frames="selectedFrames"
          @toggleFrame="$emit('toggleFrame', $event)"
        />

        <div
          v-if="loopInfo"
          class="p-3 bg-green-50 border border-green-200 rounded-md mt-4"
        >
          <p class="text-sm font-medium text-green-700">
            ✓ 检测到循环: 从第 {{ loopInfo.start + 1 }} 帧开始，周期
            {{ loopInfo.period }} 帧
          </p>
          <p class="text-xs text-green-600 mt-1">
            置信度: {{ (loopInfo.confidence * 100).toFixed(1) }}%
          </p>
        </div>

        <div
          v-if="selectedFrames.length > 0"
          class="w-full flex items-center justify-between gap-3 mt-4 flex-nowrap"
        >
          <div class="flex-1">
            <button
              @click="$emit('enterCutout')"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md whitespace-nowrap shrink-0"
            >
              进入抠图
            </button>
          </div>
          <div class="flex items-center gap-4 overflow-hidden">
            <label class="text-sm font-medium text-gray-700 shrink-0"
              >输出FPS</label
            >
            <input
              v-model.number="outputFps"
              type="number"
              min="1"
              max="60"
              class="w-20 px-2 py-1 border border-gray-300 rounded-md shrink-0"
            />
            <button
              @click="onGenerateClick"
              :disabled="isProcessing || debouncingGenerate"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <span v-if="!isProcessing">合并视频</span>
              <span v-else class="flex items-center gap-2">
                <svg
                  class="animate-spin h-5 w-5 text-white"
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
                <span>{{ generateProgressText }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { LoopInfo } from "../utils/loopDetection";
import FramesGrid from "../components/FramesGrid.vue";
import FinalVideoPanel from "../components/FinalVideoPanel.vue";

interface Frame {
  url: string;
  blob: Blob;
  index: number;
}

interface Props {
  trimmedVideoBlob?: Blob;
  frames: Frame[];
  selectedFrames: number[];
  loopInfo: LoopInfo | null;
  isProcessing: boolean;
  finalVideoUrl: string;
  canvasProgress?: { text: string; percent: number };
  ffmpegProgress?: { text: string; percent: number };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "extractFrames", fps: number): void;
  (e: "detectLoop"): void;
  (e: "toggleFrame", index: number): void;
  (e: "generateVideo", fps: number): void;
  (e: "enterCutout"): void;
}>();

const extractionFps = ref(24);
const outputFps = ref(24);
const activeTab = ref("trimmed");

const trimmedVideoUrl = computed(() => {
  if (props.trimmedVideoBlob) {
    return URL.createObjectURL(props.trimmedVideoBlob);
  }
  return "";
});

watch(
  () => props.finalVideoUrl,
  (newUrl) => {
    if (newUrl) {
      activeTab.value = "final";
    }
  }
);

// 去抖与按钮进度文案
const debouncingExtract = ref(false);
let extractTimer: number | undefined;
const onExtractClick = () => {
  if (debouncingExtract.value) return;
  debouncingExtract.value = true;
  emit("extractFrames", extractionFps.value);
  window.clearTimeout(extractTimer);
  extractTimer = window.setTimeout(
    () => (debouncingExtract.value = false),
    800
  );
};

const debouncingGenerate = ref(false);
let generateTimer: number | undefined;
const onGenerateClick = () => {
  if (debouncingGenerate.value) return;
  debouncingGenerate.value = true;
  emit("generateVideo", outputFps.value);
  window.clearTimeout(generateTimer);
  generateTimer = window.setTimeout(
    () => (debouncingGenerate.value = false),
    800
  );
};

const extractProgressText = computed(() => {
  if (!props.isProcessing) return "处理中...";
  const p = props.canvasProgress;
  if (!p || !p.text) return "处理中...";
  return p.text;
});

const generateProgressText = computed(() => {
  if (!props.isProcessing) return "处理中...";
  const p = props.ffmpegProgress || props.canvasProgress;
  if (!p || !p.text) return "处理中...";
  return p.text;
});

// 帧选择操作
const selectAllFrames = () => {
  props.frames.forEach((_, index) => {
    if (!props.selectedFrames.includes(index)) {
      emit("toggleFrame", index);
    }
  });
};

const invertSelection = () => {
  props.frames.forEach((_, index) => {
    emit("toggleFrame", index);
  });
};

const clearSelection = () => {
  // 清空所有已选中的帧
  [...props.selectedFrames].forEach((index) => {
    emit("toggleFrame", index);
  });
};
</script>
