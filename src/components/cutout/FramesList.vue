<template>
  <div class="h-full overflow-auto">
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 items-start"
    >
      <div
        v-for="f in frames"
        :key="f.index"
        @click="$emit('select', f.index)"
        :class="[
          'relative border rounded-md overflow-hidden group',
          f.index === activeIndex
            ? 'border-blue-500 ring-2 ring-blue-300'
            : 'border-gray-200',
        ]"
      >
        <img :src="f.url" class="w-full h-auto object-cover" />
        <span
          class="absolute bottom-0 right-0 text-xs bg-black/60 text-white px-1"
          >#{{ f.index + 1 }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  frames: Array<{ url: string; index: number }>;
  activeIndex: number;
}>();
defineEmits<{ (e: "select", index: number): void }>();
</script>
