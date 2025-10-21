<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="flex-1 min-h-0 overflow-auto">
      <div v-if="validResults.length === 0" class="text-gray-500 p-4">
        暂无结果
      </div>
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 items-start"
      >
        <div
          v-for="r in validResults"
          :key="r.index"
          class="border rounded-md overflow-hidden"
        >
          <canvas
            :ref="(el) => setCanvasRef(el, r.index)"
            class="w-full h-auto"
          ></canvas>
          <div class="text-xs text-gray-600 px-2 py-1">#{{ r.index + 1 }}</div>
        </div>
      </div>
    </div>
    <div class="mt-3 flex items-center gap-3">
      <button
        @click="$emit('generateVideo')"
        :disabled="validResults.length === 0 || isProcessing"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
      >
        <svg
          v-if="isProcessing"
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
        <span>{{ isProcessing ? "处理中..." : "预览动画" }}</span>
      </button>
      <div class="ml-auto text-sm text-gray-600">
        共 {{ validResults.length }} 帧
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, computed } from "vue";

const props = defineProps<{
  results: Array<{ index: number; imageData: ImageData }>;
  fps: number;
  isProcessing: boolean;
}>();
defineEmits<{ (e: "generateVideo"): void }>();

// 过滤出有效的结果
const validResults = computed(() => {
  return props.results.filter((r) => r && r.imageData);
});

const canvasRefs = new Map<number, HTMLCanvasElement>();
function setCanvasRef(el: any, index: number) {
  if (!el) return;
  canvasRefs.set(index, el as HTMLCanvasElement);
}

onMounted(renderAll);
watch(
  () => props.results,
  () => {
    nextTick(renderAll);
  },
  { deep: true }
);

function renderAll() {
  for (const r of validResults.value) {
    const c = canvasRefs.get(r.index);
    if (!c) continue;
    c.width = r.imageData.width;
    c.height = r.imageData.height;
    const ctx = c.getContext("2d");
    if (!ctx) continue;
    ctx.putImageData(r.imageData, 0, 0);
  }
}
</script>
