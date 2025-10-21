<template>
  <div class="space-y-4">
    <!-- 模型选择 -->
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
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
        模型选择
      </label>
      <CustomSelect
        v-model="local.model"
        :options="modelOptions"
        placeholder="选择模型"
      />
    </div>

    <!-- 分割阈值 -->
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
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          分割阈值
        </span>
        <span class="text-lg font-bold text-gray-900">{{
          local.threshold.toFixed(2)
        }}</span>
      </label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        v-model.number="local.threshold"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
      />
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>宽松 (0.0)</span>
        <span>严格 (1.0)</span>
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
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
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
            max="10"
            step="1"
            v-model.number="local.feather"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
        <div>
          <label
            class="flex items-center justify-between text-xs font-medium text-gray-700 mb-2"
          >
            <span>边缘调整 (px)</span>
            <span class="text-sm font-bold text-gray-900">{{
              local.morph
            }}</span>
          </label>
          <input
            type="range"
            min="-5"
            max="5"
            step="1"
            v-model.number="local.morph"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
        <div>
          <label
            class="flex items-center justify-between text-xs font-medium text-gray-700 mb-2"
          >
            <span>透明度 (%)</span>
            <span class="text-sm font-bold text-gray-900">{{
              local.opacity
            }}</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            v-model.number="local.opacity"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
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
import CustomSelect from "../../CustomSelect.vue";

const modelOptions = [
  { label: "小型 (量化) - 快速", value: "isnet_quint8" },
  { label: "中型 (FP16) - 推荐", value: "isnet_fp16" },
  { label: "完整模型 - 精确", value: "isnet" },
];

const model = defineModel<Record<string, any>>({
  default: {
    model: "isnet_fp16",
    threshold: 0.5,
    feather: 1,
    morph: 0,
    opacity: 100,
  },
});
const local = reactive({
  model: model.value.model || "isnet_fp16",
  threshold: model.value.threshold ?? 0.5,
  feather: model.value.feather ?? 1,
  morph: model.value.morph ?? 0,
  opacity: model.value.opacity ?? 100,
});

watch(local, () => (model.value = { ...toRaw(local) }));

// 初始化时同步一次到 model
onMounted(() => {
  model.value = { ...toRaw(local) };
});
</script>
