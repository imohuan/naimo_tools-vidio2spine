<template>
  <div class="h-screen bg-gray-50 p-6 flex flex-col">
    <div class="max-w-6xl w-full mx-auto flex flex-col flex-1 min-h-0">
      <!-- 阶段导航 -->
      <Timeline v-model:currentStage="currentStage" :max-stage="maxStage" />

      <!-- 阶段视图 -->
      <div class="mt-8 flex-1 h-full overflow-hidden">
        <Stage1Crop
          v-show="currentStage === 1"
          class="h-full"
          :is-processing="isProcessing"
          :trimmed-video-blob="trimmedVideoBlob"
          :is-active="currentStage === 1"
          :ffmpeg-progress="ffmpegProgress"
          @trim="handleTrimVideo"
        />
        <Stage2Frames
          v-show="currentStage === 2"
          class="h-full"
          :is-processing="isProcessing"
          :trimmed-video-blob="trimmedVideoBlob"
          :frames="extractedFrames"
          :selected-frames="selectedFrames"
          :loop-info="loopInfo"
          :final-video-url="finalVideoUrl"
          :canvas-progress="canvasProgress"
          :ffmpeg-progress="ffmpegProgress"
          @extract-frames="handleExtractFrames"
          @detect-loop="handleDetectLoop"
          @toggle-frame="toggleFrameSelection"
          @generate-video="handleGenerateVideo"
          @enter-cutout="goToCutout"
        />
        <Stage3Cutout
          v-show="currentStage === 3"
          class="h-full"
          :frames="selectedFrameObjects"
          :is-processing="isProcessing"
          :ffmpeg-progress="ffmpegProgress"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useFFmpeg } from "./composables/useFFmpeg";
import { useCanvasFrameExtractor } from "./composables/useCanvasFrameExtractor";
import { detectLoopFrames, type LoopInfo } from "./utils/loopDetection";
import Timeline from "./components/Timeline.vue";
import Stage1Crop from "./views/Stage1Crop.vue";
import Stage2Frames from "./views/Stage2Frames.vue";
import Stage3Cutout from "./views/Stage3Cutout.vue";

const { progress: ffmpegProgress, trimVideo, generateVideo } = useFFmpeg();

const { progress: canvasProgress, extractFrames: extractFramesByCanvas } =
  useCanvasFrameExtractor();

// UI 状态
const currentStage = ref(1);
const maxStage = ref(1);
const isProcessing = computed(
  () => ffmpegProgress.value.text !== "" || canvasProgress.value.text !== ""
);

// 裁剪后视频
const trimmedVideoBlob = ref<Blob>();

// 帧提取
const extractedFrames = ref<Array<{ url: string; blob: Blob; index: number }>>(
  []
);
const selectedFrames = ref<number[]>([]);

// 选中的帧对象（用于抠图阶段）
const selectedFrameObjects = computed(() => {
  return selectedFrames.value.map((index, newIndex) => {
    const frame = extractedFrames.value[index];
    return {
      ...frame,
      index: newIndex, // 重新索引，从0开始
    };
  });
});

// 循环检测
const loopInfo = ref<LoopInfo | null>(null);

// 视频生成
const finalVideoUrl = ref("");

// 裁剪视频
const handleTrimVideo = async (file: File, start: number, duration: number) => {
  try {
    const blob = await trimVideo(file, start, duration);
    trimmedVideoBlob.value = blob;

    // 进入下一阶段
    currentStage.value = 2;
    maxStage.value = 2;

    // 重置后续状态
    extractedFrames.value = [];
    selectedFrames.value = [];
    loopInfo.value = null;
    finalVideoUrl.value = "";
  } catch (error: any) {
    console.error("裁剪失败:", error);
    alert(
      "裁剪失败: " +
        error.message +
        "\n\n提示: 如果是首次使用，请确保网络连接正常，FFmpeg需要下载约30MB的文件。"
    );
  }
};

// 提取帧
const handleExtractFrames = async (fps: number) => {
  if (!trimmedVideoBlob.value) return;

  try {
    // 默认使用 Canvas 提帧，避免 FFmpeg 在部分环境下无响应问题
    const frames = await extractFramesByCanvas(trimmedVideoBlob.value, fps);
    extractedFrames.value = frames;

    // 重置选择状态
    selectedFrames.value = [];
    loopInfo.value = null;
    finalVideoUrl.value = "";
  } catch (error: any) {
    console.error("提取帧失败:", error);
    alert("提取帧失败: " + error.message);
  }
};

// 切换帧选择
const toggleFrameSelection = (index: number) => {
  const idx = selectedFrames.value.indexOf(index);
  if (idx > -1) {
    selectedFrames.value.splice(idx, 1);
  } else {
    selectedFrames.value.push(index);
  }
  selectedFrames.value.sort((a, b) => a - b);
};

// 检测循环帧
const handleDetectLoop = async () => {
  if (extractedFrames.value.length === 0) return;

  try {
    const result = await detectLoopFrames(extractedFrames.value, {
      minPeriod: 12,
      smoothWindow: 1,
      sampleLimit: 120,
    });
    loopInfo.value = result;

    // 选择循环帧（只选择一个周期）
    selectedFrames.value = [];
    const targetCount = Math.max(12, result.period);
    const endIndex = Math.min(
      result.start + targetCount,
      extractedFrames.value.length
    );
    for (let i = result.start; i < endIndex; i++) {
      selectedFrames.value.push(i);
    }
  } catch (error: any) {
    console.error("循环检测失败:", error);
    alert("循环检测失败: " + error.message);
  }
};

// 生成视频
const handleGenerateVideo = async (fps: number) => {
  if (selectedFrames.value.length === 0) {
    alert("请先选择要生成的帧");
    return;
  }

  try {
    const frames = selectedFrames.value.map(
      (index) => extractedFrames.value[index]
    );
    // 将选中帧重复两轮，合并生成更长循环
    const repeatedFrames = frames.concat(frames);
    const blob = await generateVideo(repeatedFrames, fps);
    finalVideoUrl.value = URL.createObjectURL(blob);
  } catch (error: any) {
    console.error("生成视频失败:", error);
    alert("生成视频失败: " + error.message);
  }
};

// 进入第三步抠图
const goToCutout = () => {
  if (selectedFrames.value.length === 0) {
    alert("请先选择要抠图的帧");
    return;
  }
  currentStage.value = 3;
  maxStage.value = 3;
};
</script>
