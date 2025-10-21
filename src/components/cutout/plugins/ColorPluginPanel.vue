<template>
  <div class="space-y-4 pr-2">
    <!-- 颜色相似度 -->
    <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <label
        class="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between"
      >
        <span class="flex items-center gap-2">
          <svg
            class="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          颜色相似度
        </span>
        <span class="text-lg font-bold text-gray-900">{{
          local.tolerance
        }}</span>
      </label>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        v-model.number="local.tolerance"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
      />
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>精确 (0)</span>
        <span>宽松 (100)</span>
      </div>
    </div>

    <!-- 边缘参数 -->
    <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div
        class="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
      >
        <svg
          class="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
          />
        </svg>
        边缘参数
      </div>
      <div class="space-y-4">
        <div>
          <label
            class="flex items-center justify-between text-xs font-medium text-gray-700 mb-2"
          >
            <span>羽化 (px)</span>
            <span class="text-sm font-bold text-gray-900">{{
              local.feather
            }}</span>
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            v-model.number="local.feather"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
        <div>
          <label
            class="flex items-center justify-between text-xs font-medium text-gray-700 mb-2"
          >
            <span>边缘膨胀 (px)</span>
            <span class="text-sm font-bold text-gray-900">{{
              local.expand
            }}</span>
          </label>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            v-model.number="local.expand"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
      </div>
    </div>

    <!-- 模式选择 -->
    <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <label
        class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"
      >
        <svg
          class="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        处理模式
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label
          class="relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all border-2"
          :class="
            local.mode === 'remove'
              ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
          "
        >
          <input
            type="radio"
            value="remove"
            v-model="local.mode"
            class="sr-only"
          />
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>移除颜色</span>
        </label>
        <label
          class="relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all border-2"
          :class="
            local.mode === 'keep'
              ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
          "
        >
          <input
            type="radio"
            value="keep"
            v-model="local.mode"
            class="sr-only"
          />
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>保留颜色</span>
        </label>
      </div>
    </div>

    <!-- 拾取颜色 -->
    <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <label
        class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"
      >
        <svg
          class="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
        拾取颜色
      </label>
      <div class="flex items-center gap-2 mb-3">
        <button
          v-if="!props.isPicking"
          @click="onPickStart"
          class="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          开始拾取
        </button>
        <button
          v-else
          @click="onPickStop"
          class="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-5 h-5 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            <span class="font-bold">拾取中...</span>
          </div>
          <div class="text-xs font-normal opacity-90">按 ESC 取消拾取</div>
        </button>
        <button
          @click="onPickClear"
          class="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 border border-gray-300"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      <div
        v-if="pickedColors.length > 0"
        class="p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-32 overflow-y-auto"
      >
        <div
          class="grid gap-2 items-start"
          style="grid-template-columns: repeat(auto-fill, minmax(40px, 1fr))"
        >
          <button
            v-for="(c, i) in pickedColors"
            :key="i"
            class="relative group border-2 rounded overflow-hidden hover:border-gray-400 transition-colors"
            :style="{ background: `rgb(${c.r},${c.g},${c.b})` }"
            :title="`RGB(${c.r}, ${c.g}, ${c.b})`"
          >
            <div class="w-full h-8"></div>
            <!-- 删除按钮 -->
            <span
              @click.stop="onRemoveColor(i)"
              class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md cursor-pointer"
              :title="`删除`"
            >
              <svg
                class="w-2.5 h-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="4"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>
      <div
        v-else
        class="text-center text-xs text-gray-400 py-3 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50"
      >
        暂无拾取的颜色
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider-thumb::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 3px solid currentColor;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.slider-thumb::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.slider-thumb::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 3px solid currentColor;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.slider-thumb::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>

<script setup lang="ts">
import { reactive, watch, toRaw, onMounted } from "vue";

const props = defineProps<{
  pickedColors: Array<{ r: number; g: number; b: number }>;
  isPicking?: boolean;
  onPickStart: () => void;
  onPickStop: () => void;
  onClearColors?: () => void;
  onRemoveColor?: (index: number) => void;
}>();
const model = defineModel<Record<string, any>>({
  default: { tolerance: 30, feather: 2, expand: 0, mode: "remove" },
});

const local = reactive({
  tolerance: model.value.tolerance ?? 30,
  feather: model.value.feather ?? 2,
  expand: model.value.expand ?? 0,
  mode: model.value.mode || "remove",
});

watch(local, () => (model.value = { ...toRaw(local) }));

// 初始化时同步一次到 model
onMounted(() => {
  model.value = { ...toRaw(local) };
});

function onPickStart() {
  props.onPickStart();
}
function onPickClear() {
  if (props.onClearColors) props.onClearColors();
}
function onRemoveColor(index: number) {
  if (props.onRemoveColor) props.onRemoveColor(index);
}
</script>
