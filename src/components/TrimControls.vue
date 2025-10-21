<template>
  <div class="space-y-6">
    <div>
      <label class="block text-sm font-medium text-gray-700"
        >2. 设置裁剪参数</label
      >
      <p class="text-sm text-gray-600 mt-1">
        视频时长: {{ videoDuration.toFixed(2) }}秒
      </p>
    </div>

    <div>
      <RangeSlider
        v-model:start="startTime"
        v-model:end="endTime"
        :duration="videoDuration"
      />
    </div>

    <div class="flex gap-2">
      <button
        @click="$emit('setDuration', 1)"
        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
      >
        1秒
      </button>
      <button
        @click="$emit('setDuration', 3)"
        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
      >
        3秒
      </button>
      <button
        @click="$emit('setDuration', 5)"
        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
      >
        5秒
      </button>
    </div>

    <div>
      <button
        @click="$emit('trim')"
        :disabled="isProcessing || debouncing"
        class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
      >
        <span v-if="!isProcessing">3. 裁剪视频</span>
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
          <span>{{ buttonProgressText }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import RangeSlider from "../components/RangeSlider.vue";

const props = defineProps<{
  videoDuration: number;
  startTime: number;
  endTime: number;
  isProcessing: boolean;
  debouncing: boolean;
  ffmpegProgress?: { text: string; percent: number };
}>();

const emit = defineEmits([
  "update:startTime",
  "update:endTime",
  "setDuration",
  "trim",
]);

const startTime = computed({
  get: () => props.startTime,
  set: (v: number) => emit("update:startTime", v),
});

const endTime = computed({
  get: () => props.endTime,
  set: (v: number) => emit("update:endTime", v),
});

const buttonProgressText = computed(() => {
  if (!props.isProcessing) return "处理中...";
  const p = props.ffmpegProgress;
  if (!p || !p.text) return "处理中...";
  const pct = Math.max(0, Math.min(100, p.percent));
  return `${p.text} ${pct.toFixed(0)}%`;
});
</script>
