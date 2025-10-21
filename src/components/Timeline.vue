<template>
  <div
    class="bg-white rounded-lg shadow-md p-2 lg:p-4 text-sm lg:text-base flex items-center justify-center gap-2 lg:gap-8"
  >
    <div
      v-for="(stage, index) in stages"
      :key="index"
      class="flex items-center"
    >
      <div
        class="flex items-center cursor-pointer"
        :class="{ 'pointer-events-none': !stage.enabled }"
        @click="onClick(stage.id)"
      >
        <div
          class="rounded-full h-6 w-6 lg:h-10 lg:w-10 flex items-center justify-center font-bold text-sm lg:text-lg"
          :class="getStageClass(stage.id)"
        >
          {{ stage.id }}
        </div>
        <div class="ml-4">
          <h2
            class="font-semibold"
            :class="{ 'text-gray-400': !stage.enabled }"
          >
            {{ stage.title }}
          </h2>
          <p
            class="text-sm text-gray-500"
            :class="{ 'text-gray-300': !stage.enabled }"
          >
            {{ stage.description }}
          </p>
        </div>
      </div>
      <div
        v-if="index < stages.length - 1"
        class="w-16 h-1 bg-gray-200 mx-8 rounded"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  currentStage: number;
  maxStage: number;
}>();

const emit = defineEmits(["update:currentStage"]);

const stages = computed(() => [
  {
    id: 1,
    title: "视频裁剪",
    description: "上传并选择视频区域",
    enabled: props.maxStage >= 1,
  },
  {
    id: 2,
    title: "帧提取与生成",
    description: "提取帧并生成循环视频",
    enabled: props.maxStage >= 2,
  },
  {
    id: 3,
    title: "帧抠图与生成",
    description: "抠图顺帧并生成视频",
    enabled: props.maxStage >= 3,
  },
]);

const getStageClass = (stageId: number) => {
  if (props.currentStage === stageId) {
    return "bg-blue-600 text-white shadow-lg scale-110";
  }
  if (props.maxStage >= stageId) {
    return "bg-white text-blue-600 border-2 border-blue-600";
  }
  return "bg-gray-200 text-gray-400";
};

const onClick = (stageId: number) => {
  if (props.maxStage >= stageId) {
    emit("update:currentStage", stageId);
  }
};
</script>
