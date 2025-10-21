<template>
  <div class="border-b border-gray-200">
    <nav class="flex space-x-4" aria-label="Tabs">
      <button @click="$emit('change', 'color')" :class="tabClass('color')">
        颜色抠图
      </button>
      <button @click="$emit('change', 'imgly')" :class="tabClass('imgly')">
        ImgLy 抠图
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ active: "color" | "imgly" }>();
defineEmits<{ (e: "change", v: "color" | "imgly"): void }>();

function tabClass(key: "color" | "imgly") {
  return [
    "px-3 py-2 font-medium text-sm rounded-md",
    props.active === key
      ? "bg-blue-100 text-blue-700"
      : "text-gray-500 hover:text-gray-700",
  ];
}
</script>
