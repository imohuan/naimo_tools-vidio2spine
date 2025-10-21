<template>
  <div
    class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden pb-2"
  >
    <!-- Left Panel: Video Display -->
    <div class="bg-white rounded-lg shadow-md p-6 flex flex-col h-full min-h-0">
      <UploadArea
        v-if="!videoUrl"
        accept="video/*"
        @fileSelected="applySelectedFile"
      />
      <div v-else class="flex flex-col flex-1 min-h-0 h-full">
        <!-- Tabs -->
        <div class="mb-4 border-b border-gray-200">
          <nav class="flex space-x-4" aria-label="Tabs">
            <button
              @click="activeTab = 'original'"
              :class="[
                'px-3 py-2 font-medium text-sm rounded-md',
                activeTab === 'original'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700',
              ]"
            >
              原始视频
            </button>
            <button
              @click="activeTab = 'trimmed'"
              :disabled="!trimmedVideoUrl"
              :class="[
                'px-3 py-2 font-medium text-sm rounded-md',
                activeTab === 'trimmed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700',
                !trimmedVideoUrl ? 'cursor-not-allowed text-gray-400' : '',
              ]"
            >
              裁剪后视频
            </button>
          </nav>
        </div>

        <!-- Video Player -->
        <div
          v-show="activeTab === 'original'"
          class="flex-1 min-h-0"
          @dragover.prevent
          @drop.prevent="handleDrop"
          @paste.prevent="handlePaste"
        >
          <video
            ref="videoPreview"
            :src="videoUrl"
            controls
            class="w-full h-full object-contain"
          ></video>
        </div>
        <div v-show="activeTab === 'trimmed'" class="flex-1 min-h-0">
          <video
            v-if="trimmedVideoUrl"
            :src="trimmedVideoUrl"
            controls
            class="w-full h-full object-contain"
          ></video>
          <p v-else class="text-gray-500 text-center p-4">暂无裁剪视频</p>
        </div>
      </div>
    </div>

    <!-- Right Panel: Controls -->
    <div class="bg-white rounded-lg shadow-md p-6 overflow-y-auto min-h-0">
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2"
            >1. 上传视频</label
          >
          <input
            type="file"
            @change="handleVideoUpload"
            accept="video/*"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div v-if="videoUrl" class="space-y-6">
          <TrimControls
            v-model:start-time="startTime"
            v-model:end-time="endTime"
            :video-duration="videoDuration"
            :is-processing="isProcessing"
            :debouncing="debouncing"
            :ffmpeg-progress="ffmpegProgress"
            @setDuration="setTrimDuration"
            @trim="onTrimClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import UploadArea from "../components/UploadArea.vue";
import TrimControls from "../components/TrimControls.vue";

interface Props {
  isProcessing: boolean;
  trimmedVideoBlob?: Blob;
  isActive?: boolean;
  ffmpegProgress?: { text: string; percent: number };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "trim", file: File, start: number, duration: number): void;
}>();

const videoPreview = ref<HTMLVideoElement>();
const originalVideo = ref<File>();
const videoUrl = ref("");
const videoDuration = ref(0);

const startTime = ref(0);
const endTime = ref(3);

const trimmedVideoUrl = ref("");
const activeTab = ref("original");

watch(
  () => props.trimmedVideoBlob,
  (newBlob) => {
    if (newBlob) {
      trimmedVideoUrl.value = URL.createObjectURL(newBlob);
      activeTab.value = "trimmed";
    }
  }
);

// 统一选择文件后的处理
const applySelectedFile = (file: File) => {
  if (!file) return;
  // 仅接收视频
  if (!file.type.startsWith("video/")) return;
  originalVideo.value = file;
  videoUrl.value = URL.createObjectURL(file);
  activeTab.value = "original";

  // 重置状态
  videoDuration.value = 0;
  startTime.value = 0;
  endTime.value = 3;
  trimmedVideoUrl.value = "";
};

// input 选择
const handleVideoUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  applySelectedFile(file);
};

// 拖拽
const handleDrop = (e: DragEvent) => {
  if (!e.dataTransfer) return;
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  applySelectedFile(file);
};

// 粘贴（返回是否处理了文件）
const handlePaste = (e: ClipboardEvent): boolean => {
  const items = e.clipboardData?.items;
  if (!items) return false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        applySelectedFile(file);
        return true;
      }
    }
  }
  return false;
};

watch(videoPreview, (video) => {
  if (video) {
    video.addEventListener("loadedmetadata", () => {
      videoDuration.value = video.duration;
      endTime.value = Math.min(3, video.duration);
    });
  }
});

// 全局默认行为拦截（避免浏览器在窗口打开文件）
const preventWindowDragOver = (e: Event) => e.preventDefault();
const preventWindowDrop = (e: Event) => e.preventDefault();

// document 粘贴监听：仅裁剪阶段才处理
const onDocumentPaste = (e: ClipboardEvent) => {
  if (!props.isActive) return; // 非裁剪阶段忽略
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName.toLowerCase();
    const isEditable = (target as HTMLElement).isContentEditable;
    if (tag === "input" || tag === "textarea" || isEditable) return; // 不干扰文本输入
  }
  const handled = handlePaste(e);
  if (handled) e.preventDefault();
};

onMounted(() => {
  window.addEventListener("dragover", preventWindowDragOver);
  window.addEventListener("drop", preventWindowDrop);
  document.addEventListener("paste", onDocumentPaste);
});

onUnmounted(() => {
  window.removeEventListener("dragover", preventWindowDragOver);
  window.removeEventListener("drop", preventWindowDrop);
  document.removeEventListener("paste", onDocumentPaste);
});

const setTrimDuration = (duration: number) => {
  const maxDuration = Math.min(duration, videoDuration.value);
  endTime.value = Math.min(startTime.value + maxDuration, videoDuration.value);
};

const handleTrimVideo = () => {
  if (!originalVideo.value) return;
  emit(
    "trim",
    originalVideo.value,
    startTime.value,
    endTime.value - startTime.value
  );
};

// 去抖处理，避免多次触发
const debouncing = ref(false);
let debounceTimer: number | undefined;
const onTrimClick = () => {
  if (debouncing.value) return;
  debouncing.value = true;
  handleTrimVideo();
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debouncing.value = false;
  }, 800);
};

// 按钮内展示的进度文案
// 已移动到 TrimControls 组件中
</script>
