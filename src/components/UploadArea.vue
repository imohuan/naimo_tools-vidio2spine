<template>
  <div
    class="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
    @click="openFileDialog"
    @dragover.prevent
    @drop.prevent="handleDrop"
    @paste.prevent="handlePaste"
  >
    <p class="text-gray-600 mb-3">拖拽或粘贴视频到此处</p>
    <p class="text-gray-500 text-sm">或点击选择文件</p>
    <input
      ref="uploadInputRef"
      type="file"
      class="hidden"
      :accept="accept"
      @change="handleVideoUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  accept?: string;
}>();

const emit = defineEmits<{
  (e: "fileSelected", file: File): void;
}>();

const uploadInputRef = ref<HTMLInputElement>();

const accept = props.accept ?? "video/*";

const openFileDialog = () => {
  uploadInputRef.value?.click();
};

const applySelectedFile = (file: File) => {
  if (!file) return;
  if (!file.type.startsWith("video/")) return;
  emit("fileSelected", file);
};

const handleVideoUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  applySelectedFile(file);
};

const handleDrop = (e: DragEvent) => {
  if (!e.dataTransfer) return;
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  applySelectedFile(file);
};

const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        applySelectedFile(file);
        return true;
      }
    }
  }
  return false;
};
</script>
