<template>
  <div>
    <div class="relative h-10" ref="sliderRef">
      <div
        class="absolute h-1 bg-gray-300 rounded top-1/2 -translate-y-1/2 w-full"
      ></div>
      <div
        v-if="duration > 0"
        class="absolute h-1 bg-blue-500 rounded top-1/2 -translate-y-1/2"
        :style="{
          left: startPercent + '%',
          width: endPercent - startPercent + '%',
        }"
      ></div>
      <div
        v-if="duration > 0"
        class="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-pointer top-1/2 -translate-y-1/2 -translate-x-1/2 hover:scale-110 transition-transform"
        :style="{ left: startPercent + '%' }"
        @mousedown="handleMouseDown('start', $event)"
      ></div>
      <div
        v-if="duration > 0"
        class="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-pointer top-1/2 -translate-y-1/2 -translate-x-1/2 hover:scale-110 transition-transform"
        :style="{ left: endPercent + '%' }"
        @mousedown="handleMouseDown('end', $event)"
      ></div>
    </div>
    <div class="flex justify-between text-sm text-gray-600 mt-2">
      <span>开始: {{ start.toFixed(2) }}秒</span>
      <span>结束: {{ end.toFixed(2) }}秒</span>
      <span>时长: {{ (end - start).toFixed(2) }}秒</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Props {
  start: number;
  end: number;
  duration: number;
  min?: number;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0.1,
});

const emit = defineEmits<{
  "update:start": [value: number];
  "update:end": [value: number];
}>();

const sliderRef = ref<HTMLDivElement>();
const dragging = ref<"start" | "end" | null>(null);

const startPercent = computed(() => {
  if (props.duration === 0) return 0;
  return (props.start / props.duration) * 100;
});

const endPercent = computed(() => {
  if (props.duration === 0) return 100;
  return (props.end / props.duration) * 100;
});

const handleMouseDown = (type: "start" | "end", e: MouseEvent) => {
  dragging.value = type;
  e.preventDefault();
  e.stopPropagation();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !sliderRef.value) return;

  const rect = sliderRef.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const value = (x / rect.width) * props.duration;

  if (dragging.value === "start") {
    const newStart = Math.max(0, Math.min(value, props.end - props.min));
    emit("update:start", newStart);
  } else {
    const newEnd = Math.max(
      props.start + props.min,
      Math.min(value, props.duration)
    );
    emit("update:end", newEnd);
  }
};

const handleMouseUp = () => {
  dragging.value = null;
};

onMounted(() => {
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});
</script>
