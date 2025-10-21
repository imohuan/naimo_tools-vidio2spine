<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0">
      <video
        v-if="finalVideoUrl"
        :src="finalVideoUrl"
        controls
        loop
        class="w-full h-full object-contain"
      ></video>
      <p v-else class="text-gray-500 text-center p-4">暂未生成最终视频</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ finalVideoUrl: string }>();
</script>
