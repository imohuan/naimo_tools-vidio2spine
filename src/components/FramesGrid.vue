<template>
  <div class="flex-1 overflow-y-auto bg-gray-50 rounded mt-2 p-2">
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 items-start"
    >
      <div
        v-for="frame in frames"
        :key="frame.index"
        class="relative cursor-pointer border-2 rounded overflow-hidden transition-all hover:shadow-lg bg-gray-200"
        :class="{
          'border-blue-500 ring-2 ring-blue-300': selectedFrames.includes(
            frame.index
          ),
          'border-transparent': !selectedFrames.includes(frame.index),
        }"
        @click="$emit('toggleFrame', frame.index)"
      >
        <img
          :src="frame.url"
          :alt="`Frame ${frame.index + 1}`"
          class="w-full h-auto block"
        />
        <div
          v-if="selectedFrames.includes(frame.index)"
          class="absolute inset-0 bg-blue-500 opacity-30 pointer-events-none"
        ></div>
        <div
          v-if="selectedFrames.includes(frame.index)"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            class="w-10 h-10 text-blue-600 drop-shadow"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div
          class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1"
        >
          #{{ frame.index + 1 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Frame {
  url: string;
  blob: Blob;
  index: number;
}

defineProps<{
  frames: Frame[];
  selectedFrames: number[];
}>();

defineEmits<{
  (e: "toggleFrame", index: number): void;
}>();
</script>
