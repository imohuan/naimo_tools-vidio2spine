<template>
  <div
    class="absolute inset-0"
    :class="isEditMode ? 'pointer-events-auto' : 'pointer-events-none'"
  >
    <!-- 悬浮菜单 -->
    <div class="absolute top-12 right-2 pointer-events-auto z-30">
      <!-- 主按钮 -->
      <button
        @click="toggleMenu"
        :class="[
          'w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-300',
          isMenuOpen ? 'rotate-45' : '',
        ]"
        title="绘制工具"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <!-- 展开的工具按钮 -->
      <transition name="tools">
        <div v-if="isMenuOpen" class="mt-2 space-y-2">
          <button
            v-for="tool in tools"
            :key="tool.type"
            @click="selectTool(tool.type)"
            :class="[
              'w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-lg border transition-all',
              currentTool === tool.type
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50',
            ]"
            :title="tool.label"
          >
            <span class="text-base">{{ tool.icon }}</span>
          </button>
        </div>
      </transition>

      <!-- 显示/隐藏按钮 -->
      <button
        @click="toggleShapesVisibility"
        :disabled="shapes.length === 0"
        class="mt-2 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300"
        :class="[
          shapes.length === 0
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:bg-gray-50 cursor-pointer',
        ]"
        :title="shapesVisible ? '隐藏形状' : '显示形状'"
      >
        <!-- 睁眼图标 -->
        <svg
          v-if="shapesVisible"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <!-- 闭眼图标 -->
        <svg
          v-else
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      </button>
    </div>

    <!-- 绘制层 -->
    <svg
      ref="svgRef"
      class="absolute inset-0 w-full h-full"
      :style="{
        cursor: getCursor(),
      }"
      @mousedown="handleMouseDown"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent
    >
      <g
        ref="shapeGroupRef"
        :style="{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }"
      >
        <!-- 已绘制的形状 -->
        <g v-if="shapesVisible" v-for="shape in shapes" :key="shape.id">
          <!-- 矩形 -->
          <rect
            v-if="shape.type === 'rect'"
            :x="Math.min(shape.points[0].x, shape.points[1].x)"
            :y="Math.min(shape.points[0].y, shape.points[1].y)"
            :width="Math.abs(shape.points[1].x - shape.points[0].x)"
            :height="Math.abs(shape.points[1].y - shape.points[0].y)"
            :fill="
              shape.id === selectedShapeId
                ? 'rgba(59, 130, 246, 0.3)'
                : isDrawingPolygon
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(239, 68, 68, 0.3)'
            "
            :stroke="shape.id === selectedShapeId ? '#3b82f6' : '#ef4444'"
            :stroke-width="2 / transform.scale"
            :class="isDrawingPolygon ? '' : 'cursor-move'"
            :style="{ pointerEvents: isDrawingPolygon ? 'none' : 'auto' }"
          />

          <!-- 圆形 -->
          <ellipse
            v-if="shape.type === 'circle'"
            :cx="(shape.points[0].x + shape.points[1].x) / 2"
            :cy="(shape.points[0].y + shape.points[1].y) / 2"
            :rx="Math.abs(shape.points[1].x - shape.points[0].x) / 2"
            :ry="Math.abs(shape.points[1].y - shape.points[0].y) / 2"
            :fill="
              shape.id === selectedShapeId
                ? 'rgba(59, 130, 246, 0.3)'
                : isDrawingPolygon
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(239, 68, 68, 0.3)'
            "
            :stroke="shape.id === selectedShapeId ? '#3b82f6' : '#ef4444'"
            :stroke-width="2 / transform.scale"
            :class="isDrawingPolygon ? '' : 'cursor-move'"
            :style="{ pointerEvents: isDrawingPolygon ? 'none' : 'auto' }"
          />

          <!-- 多边形 -->
          <polygon
            v-if="shape.type === 'polygon'"
            :points="shape.points.map((p) => `${p.x},${p.y}`).join(' ')"
            :fill="
              shape.id === selectedShapeId
                ? 'rgba(59, 130, 246, 0.3)'
                : isDrawingPolygon
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(239, 68, 68, 0.3)'
            "
            :stroke="shape.id === selectedShapeId ? '#3b82f6' : '#ef4444'"
            :stroke-width="2 / transform.scale"
            :class="isDrawingPolygon ? '' : 'cursor-move'"
            :style="{ pointerEvents: isDrawingPolygon ? 'none' : 'auto' }"
          />

          <!-- 选中状态的控制点 -->
          <g
            v-if="
              shape.id === selectedShapeId && !isDraggingShape && !isResizing
            "
          >
            <!-- 矩形和圆形：显示四个角的缩放控制点 -->
            <g v-if="shape.type === 'rect' || shape.type === 'circle'">
              <rect
                v-for="(corner, cIdx) in getShapeCorners(shape)"
                :key="`corner-${cIdx}`"
                :x="corner.x - 6 / transform.scale"
                :y="corner.y - 6 / transform.scale"
                :width="12 / transform.scale"
                :height="12 / transform.scale"
                fill="#3b82f6"
                stroke="white"
                :stroke-width="2 / transform.scale"
                class="cursor-nwse-resize"
                @mousedown.stop="handleResizeStart(shape.id, cIdx, $event)"
              />
            </g>
            <!-- 多边形：显示顶点控制点 -->
            <circle
              v-else-if="shape.type === 'polygon'"
              v-for="(point, pIdx) in shape.points"
              :key="pIdx"
              :cx="point.x"
              :cy="point.y"
              :r="5 / transform.scale"
              fill="#3b82f6"
              stroke="white"
              :stroke-width="2 / transform.scale"
              class="cursor-move"
            />
          </g>
        </g>

        <!-- 正在绘制的形状 -->
        <g v-if="isDrawing && tempShape">
          <rect
            v-if="tempShape.type === 'rect' && tempShape.points.length === 2"
            :x="Math.min(tempShape.points[0].x, tempShape.points[1].x)"
            :y="Math.min(tempShape.points[0].y, tempShape.points[1].y)"
            :width="Math.abs(tempShape.points[1].x - tempShape.points[0].x)"
            :height="Math.abs(tempShape.points[1].y - tempShape.points[0].y)"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            :stroke-width="2 / transform.scale"
            stroke-dasharray="5,5"
          />

          <ellipse
            v-if="tempShape.type === 'circle' && tempShape.points.length === 2"
            :cx="(tempShape.points[0].x + tempShape.points[1].x) / 2"
            :cy="(tempShape.points[0].y + tempShape.points[1].y) / 2"
            :rx="Math.abs(tempShape.points[1].x - tempShape.points[0].x) / 2"
            :ry="Math.abs(tempShape.points[1].y - tempShape.points[0].y) / 2"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            :stroke-width="2 / transform.scale"
            stroke-dasharray="5,5"
          />
        </g>

        <!-- 多边形绘制中的点和线 -->
        <g v-if="currentTool === 'polygon' && polygonPoints.length > 0">
          <polyline
            :points="polygonPoints.map((p) => `${p.x},${p.y}`).join(' ')"
            fill="none"
            stroke="#3b82f6"
            :stroke-width="2 / transform.scale"
            stroke-dasharray="5,5"
          />
          <circle
            v-for="(point, idx) in polygonPoints"
            :key="idx"
            :cx="point.x"
            :cy="point.y"
            :r="4 / transform.scale"
            fill="#3b82f6"
          />
        </g>
      </g>
    </svg>

    <!-- 底部工具栏 -->
    <div
      v-if="isEditMode && shapes.length > 0"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto"
    >
      <div
        class="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-2 py-1.5 flex flex-col gap-1.5"
      >
        <!-- 提示信息 -->
        <div class="text-[10px] text-gray-600 text-center font-medium">
          已绘制 {{ shapes.length }} 个区域
        </div>

        <!-- 按钮组 -->
        <div class="flex items-center justify-center gap-1">
          <button
            v-if="selectedShapeId"
            @click="deleteSelectedShape"
            class="flex flex-col items-center gap-0.5 px-1.5 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
          >
            <svg
              class="w-3 h-3"
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
            <span class="text-[9px]">删除</span>
          </button>

          <button
            @click="clearAllShapes"
            class="flex flex-col items-center gap-0.5 px-1.5 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
          >
            <svg
              class="w-3 h-3"
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
            <span class="text-[9px]">清除</span>
          </button>

          <button
            v-if="history.length > 0"
            @click="undo"
            :disabled="historyIndex < 0"
            class="flex flex-col items-center gap-0.5 px-1.5 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span class="text-[9px]">撤销</span>
          </button>

          <button
            v-if="history.length > 0"
            @click="redo"
            :disabled="historyIndex >= history.length - 1"
            class="flex flex-col items-center gap-0.5 px-1.5 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
              />
            </svg>
            <span class="text-[9px]">重做</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div
      v-if="isEditMode && currentTool !== 'none'"
      class="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none"
    >
      <div
        class="bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 whitespace-nowrap max-w-none"
      >
        <span v-if="currentTool === 'rect'"
          >拖拽绘制矩形，点击形状可选中和移动</span
        >
        <span v-else-if="currentTool === 'circle'"
          >拖拽绘制圆形，点击形状可选中和移动</span
        >
        <span v-else-if="currentTool === 'polygon'"
          >单击添加点，双击或 Enter 完成，Backspace 撤销点，Esc 取消</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Point {
  x: number;
  y: number;
}

interface Shape {
  id: string;
  type: "rect" | "circle" | "polygon";
  points: Point[];
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const props = defineProps<{
  transform: Transform;
  canvasWidth: number;
  canvasHeight: number;
}>();

const emit = defineEmits<{
  (e: "update:shapes", shapes: Shape[]): void;
  (e: "update:transform", transform: Transform): void;
}>();

// 工具类型
type ToolType = "rect" | "circle" | "polygon";

// 工具定义
const tools: Array<{ type: ToolType; label: string; icon: string }> = [
  { type: "rect", label: "矩形", icon: "▭" },
  { type: "circle", label: "圆形", icon: "○" },
  { type: "polygon", label: "多边形", icon: "⬡" },
];

// 状态
const isMenuOpen = ref(false);
const currentTool = ref<"none" | ToolType>("none");
const shapes = ref<Shape[]>([]);
const selectedShapeId = ref<string | null>(null);
const shapesVisible = ref(true);

// 绘制状态
const isDrawing = ref(false);
const tempShape = ref<Shape | null>(null);
const polygonPoints = ref<Point[]>([]);

// 拖拽状态
const isDraggingShape = ref(false);
const dragStartPos = ref<Point | null>(null);
const dragShapeOriginalPoints = ref<Point[]>([]);

// 缩放状态
const isResizing = ref(false);
const resizeCornerIndex = ref(-1);
const resizeStartPos = ref<Point | null>(null);
const resizeOriginalPoints = ref<Point[]>([]);

// 空格键平移状态
const isSpacePressed = ref(false);
const isPanning = ref(false);
const panStartPos = ref<{ x: number; y: number } | null>(null);
const panStartTransform = ref<Transform | null>(null);

// 历史记录
const history = ref<Shape[][]>([]);
const historyIndex = ref(-1);

const svgRef = ref<SVGElement>();
const shapeGroupRef = ref<SVGGElement>();

// 计算编辑状态
const isEditMode = computed(() => {
  return isMenuOpen.value || currentTool.value !== "none";
});

// 计算是否正在绘制多边形
const isDrawingPolygon = computed(() => {
  return currentTool.value === "polygon" && polygonPoints.value.length > 0;
});

// 切换菜单
function toggleMenu() {
  if (isMenuOpen.value) {
    // 关闭菜单并重置工具
    isMenuOpen.value = false;
    currentTool.value = "none";
    selectedShapeId.value = null;
    polygonPoints.value = [];
    if (isDrawing.value) {
      isDrawing.value = false;
      tempShape.value = null;
      // 移除 window 上的监听器
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
  } else if (currentTool.value !== "none") {
    // 如果已经在绘制模式，退出绘制模式
    currentTool.value = "none";
    selectedShapeId.value = null;
    polygonPoints.value = [];
    if (isDrawing.value) {
      isDrawing.value = false;
      tempShape.value = null;
      // 移除 window 上的监听器
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
  } else {
    // 打开菜单
    isMenuOpen.value = true;
  }
}

// 选择工具
function selectTool(type: ToolType) {
  currentTool.value = type;
  selectedShapeId.value = null;
  // 保持菜单展开状态
}

// 切换形状可见性
function toggleShapesVisibility() {
  shapesVisible.value = !shapesVisible.value;
}

// 获取光标样式
function getCursor() {
  if (isPanning.value) return "grabbing";
  if (isSpacePressed.value) return "grab";
  if (isResizing.value) return "nwse-resize";
  if (isDraggingShape.value) return "move";
  if (isDrawing.value) return "crosshair";
  if (currentTool.value !== "none") return "crosshair";
  return "default";
}

// 获取形状的四个角点
function getShapeCorners(shape: Shape): Point[] {
  if (shape.points.length < 2) return [];

  if (shape.type === "rect" || shape.type === "circle") {
    const x1 = Math.min(shape.points[0].x, shape.points[1].x);
    const y1 = Math.min(shape.points[0].y, shape.points[1].y);
    const x2 = Math.max(shape.points[0].x, shape.points[1].x);
    const y2 = Math.max(shape.points[0].y, shape.points[1].y);

    return [
      { x: x1, y: y1 }, // 左上
      { x: x2, y: y1 }, // 右上
      { x: x2, y: y2 }, // 右下
      { x: x1, y: y2 }, // 左下
    ];
  }

  return [];
}

// 屏幕坐标转画布坐标
function screenToCanvas(screenX: number, screenY: number): Point {
  const svg = svgRef.value;
  if (!svg) return { x: 0, y: 0 };

  const rect = svg.getBoundingClientRect();

  // 获取鼠标在 SVG 容器中的坐标（像素坐标）
  const svgX = screenX - rect.left;
  const svgY = screenY - rect.top;

  // 应用 transform 的逆变换：先减去平移，再除以缩放
  const x = (svgX - props.transform.x) / props.transform.scale;
  const y = (svgY - props.transform.y) / props.transform.scale;

  return { x, y };
}

// 计算形状面积
function calculateShapeArea(shape: Shape): number {
  if (shape.points.length < 2) return 0;

  if (shape.type === "rect") {
    const width = Math.abs(shape.points[1].x - shape.points[0].x);
    const height = Math.abs(shape.points[1].y - shape.points[0].y);
    return width * height;
  } else if (shape.type === "circle") {
    const rx = Math.abs(shape.points[1].x - shape.points[0].x) / 2;
    const ry = Math.abs(shape.points[1].y - shape.points[0].y) / 2;
    return Math.PI * rx * ry;
  } else if (shape.type === "polygon") {
    // 使用鞋带公式计算多边形面积
    let area = 0;
    for (let i = 0; i < shape.points.length; i++) {
      const j = (i + 1) % shape.points.length;
      area += shape.points[i].x * shape.points[j].y;
      area -= shape.points[j].x * shape.points[i].y;
    }
    return Math.abs(area / 2);
  }
  return 0;
}

// 检查点是否在形状内
function isPointInShape(point: Point, shape: Shape): boolean {
  if (shape.type === "rect" && shape.points.length === 2) {
    const x1 = Math.min(shape.points[0].x, shape.points[1].x);
    const y1 = Math.min(shape.points[0].y, shape.points[1].y);
    const x2 = Math.max(shape.points[0].x, shape.points[1].x);
    const y2 = Math.max(shape.points[0].y, shape.points[1].y);
    return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
  } else if (shape.type === "circle" && shape.points.length === 2) {
    const cx = (shape.points[0].x + shape.points[1].x) / 2;
    const cy = (shape.points[0].y + shape.points[1].y) / 2;
    const rx = Math.abs(shape.points[1].x - shape.points[0].x) / 2;
    const ry = Math.abs(shape.points[1].y - shape.points[0].y) / 2;
    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  } else if (shape.type === "polygon" && shape.points.length >= 3) {
    // 射线法判断点是否在多边形内
    let inside = false;
    for (
      let i = 0, j = shape.points.length - 1;
      i < shape.points.length;
      j = i++
    ) {
      const xi = shape.points[i].x;
      const yi = shape.points[i].y;
      const xj = shape.points[j].x;
      const yj = shape.points[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  return false;
}

// 查找点击位置的形状
function findShapeAtPoint(point: Point): Shape | null {
  // 从后往前查找（后绘制的在上层）
  for (let i = shapes.value.length - 1; i >= 0; i--) {
    if (isPointInShape(point, shapes.value[i])) {
      return shapes.value[i];
    }
  }
  return null;
}

// 鼠标按下
function handleMouseDown(e: MouseEvent) {
  // 空格键按下时启动平移
  if (isSpacePressed.value) {
    isPanning.value = true;
    panStartPos.value = { x: e.clientX, y: e.clientY };
    panStartTransform.value = { ...props.transform };
    return;
  }

  const point = screenToCanvas(e.clientX, e.clientY);

  // 如果正在绘制多边形，优先处理多边形绘制
  if (currentTool.value === "polygon") {
    // 左键点击添加点
    if (e.button === 0) {
      polygonPoints.value.push(point);
    }
    // 右键点击撤销最后一个点
    else if (e.button === 2) {
      e.preventDefault();
      if (polygonPoints.value.length > 0) {
        polygonPoints.value.pop();
      }
    }
    return;
  }

  // 检查是否点击在某个形状上（仅在形状可见时且不在绘制多边形时）
  if (shapesVisible.value && !isDrawingPolygon.value) {
    const clickedShape = findShapeAtPoint(point);

    if (clickedShape) {
      // 点击在形状上，选中并开始拖拽
      selectShape(clickedShape.id, e);
      e.stopPropagation();
      return;
    }
  }

  // 点击在空白区域
  if (currentTool.value === "none") {
    // 取消选中
    selectedShapeId.value = null;
    return;
  }

  // 开始绘制新形状（矩形和圆形）
  if (currentTool.value === "rect" || currentTool.value === "circle") {
    isDrawing.value = true;
    tempShape.value = {
      id: generateId(),
      type: currentTool.value,
      points: [point],
    };

    // 在 window 上添加 mousemove 和 mouseup 监听器
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }
}

// 鼠标移动
function handleMouseMove(e: MouseEvent) {
  // 处理平移
  if (isPanning.value && panStartPos.value && panStartTransform.value) {
    const dx = e.clientX - panStartPos.value.x;
    const dy = e.clientY - panStartPos.value.y;

    emit("update:transform", {
      x: panStartTransform.value.x + dx,
      y: panStartTransform.value.y + dy,
      scale: panStartTransform.value.scale,
    });
    return;
  }

  if (!isDrawing.value || !tempShape.value) return;

  const point = screenToCanvas(e.clientX, e.clientY);

  if (tempShape.value.points.length === 1) {
    tempShape.value.points.push(point);
  } else {
    tempShape.value.points[1] = point;
  }
}

// 鼠标释放
function handleMouseUp() {
  // 结束平移
  if (isPanning.value) {
    isPanning.value = false;
    panStartPos.value = null;
    panStartTransform.value = null;
    return;
  }

  if (!isDrawing.value || !tempShape.value) return;

  if (tempShape.value.points.length === 2) {
    // 检查形状面积是否足够大
    const area = calculateShapeArea(tempShape.value);
    const minArea = 100; // 最小面积阈值

    if (area >= minArea) {
      // 添加形状并选中
      addShape(tempShape.value);
      selectedShapeId.value = tempShape.value.id;
    }
  }

  isDrawing.value = false;
  tempShape.value = null;

  // 移除 window 上的监听器
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
}

// 双击完成多边形
function handleDoubleClick() {
  if (currentTool.value === "polygon" && polygonPoints.value.length >= 3) {
    finishPolygon();
  }
}

// 完成多边形绘制
function finishPolygon() {
  if (polygonPoints.value.length >= 3) {
    addShape({
      id: generateId(),
      type: "polygon",
      points: [...polygonPoints.value],
    });
  }
  polygonPoints.value = [];
}

// 选中形状
function selectShape(shapeId: string, e: MouseEvent) {
  selectedShapeId.value = shapeId;

  // 开始拖拽
  const shape = shapes.value.find((s) => s.id === shapeId);
  if (shape) {
    isDraggingShape.value = true;
    dragStartPos.value = screenToCanvas(e.clientX, e.clientY);
    dragShapeOriginalPoints.value = shape.points.map((p) => ({ ...p }));

    window.addEventListener("mousemove", handleShapeDrag);
    window.addEventListener("mouseup", handleShapeDragEnd);
  }
}

// 拖拽形状
function handleShapeDrag(e: MouseEvent) {
  if (!isDraggingShape.value || !dragStartPos.value || !selectedShapeId.value)
    return;

  const currentPos = screenToCanvas(e.clientX, e.clientY);
  const dx = currentPos.x - dragStartPos.value.x;
  const dy = currentPos.y - dragStartPos.value.y;

  const shape = shapes.value.find((s) => s.id === selectedShapeId.value);
  if (shape) {
    shape.points = dragShapeOriginalPoints.value.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
  }
}

// 结束拖拽
function handleShapeDragEnd() {
  if (isDraggingShape.value) {
    saveHistory();
  }

  isDraggingShape.value = false;
  dragStartPos.value = null;
  dragShapeOriginalPoints.value = [];

  window.removeEventListener("mousemove", handleShapeDrag);
  window.removeEventListener("mouseup", handleShapeDragEnd);
}

// 开始缩放
function handleResizeStart(
  shapeId: string,
  cornerIndex: number,
  e: MouseEvent
) {
  selectedShapeId.value = shapeId;

  const shape = shapes.value.find((s) => s.id === shapeId);
  if (shape) {
    isResizing.value = true;
    resizeCornerIndex.value = cornerIndex;
    resizeStartPos.value = screenToCanvas(e.clientX, e.clientY);
    resizeOriginalPoints.value = shape.points.map((p) => ({ ...p }));

    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", handleResizeEnd);
  }
}

// 缩放形状
function handleResize(e: MouseEvent) {
  if (!isResizing.value || !resizeStartPos.value || !selectedShapeId.value)
    return;

  const currentPos = screenToCanvas(e.clientX, e.clientY);
  const shape = shapes.value.find((s) => s.id === selectedShapeId.value);

  if (!shape || shape.points.length < 2) return;

  const original = resizeOriginalPoints.value;
  const x1 = Math.min(original[0].x, original[1].x);
  const y1 = Math.min(original[0].y, original[1].y);
  const x2 = Math.max(original[0].x, original[1].x);
  const y2 = Math.max(original[0].y, original[1].y);

  let newX1 = x1;
  let newY1 = y1;
  let newX2 = x2;
  let newY2 = y2;

  // 根据拖拽的角点更新对应的坐标
  switch (resizeCornerIndex.value) {
    case 0: // 左上
      newX1 = currentPos.x;
      newY1 = currentPos.y;
      break;
    case 1: // 右上
      newX2 = currentPos.x;
      newY1 = currentPos.y;
      break;
    case 2: // 右下
      newX2 = currentPos.x;
      newY2 = currentPos.y;
      break;
    case 3: // 左下
      newX1 = currentPos.x;
      newY2 = currentPos.y;
      break;
  }

  // 确保最小尺寸
  const minSize = 10;
  if (Math.abs(newX2 - newX1) < minSize || Math.abs(newY2 - newY1) < minSize) {
    return;
  }

  // 更新形状的点
  shape.points = [
    { x: newX1, y: newY1 },
    { x: newX2, y: newY2 },
  ];
}

// 结束缩放
function handleResizeEnd() {
  if (isResizing.value) {
    saveHistory();
  }

  isResizing.value = false;
  resizeCornerIndex.value = -1;
  resizeStartPos.value = null;
  resizeOriginalPoints.value = [];

  window.removeEventListener("mousemove", handleResize);
  window.removeEventListener("mouseup", handleResizeEnd);
}

// 添加形状
function addShape(shape: Shape) {
  shapes.value.push(shape);
  saveHistory();
  emit("update:shapes", shapes.value);
}

// 删除选中的形状
function deleteSelectedShape() {
  if (selectedShapeId.value) {
    shapes.value = shapes.value.filter((s) => s.id !== selectedShapeId.value);
    selectedShapeId.value = null;
    saveHistory();
    emit("update:shapes", shapes.value);
  }
}

// 清除所有形状
function clearAllShapes() {
  shapes.value = [];
  selectedShapeId.value = null;
  saveHistory();
  emit("update:shapes", shapes.value);
}

// 保存历史记录
function saveHistory() {
  // 移除当前索引之后的历史
  history.value = history.value.slice(0, historyIndex.value + 1);

  // 添加新的历史记录
  history.value.push(JSON.parse(JSON.stringify(shapes.value)));
  historyIndex.value = history.value.length - 1;

  // 限制历史记录数量
  if (history.value.length > 50) {
    history.value.shift();
    historyIndex.value--;
  }
}

// 撤销
function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    shapes.value = JSON.parse(
      JSON.stringify(history.value[historyIndex.value])
    );
    emit("update:shapes", shapes.value);
  }
}

// 重做
function redo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++;
    shapes.value = JSON.parse(
      JSON.stringify(history.value[historyIndex.value])
    );
    emit("update:shapes", shapes.value);
  }
}

// 生成唯一 ID
function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 键盘事件
function handleKeyDown(e: KeyboardEvent) {
  // 优先处理多边形绘制相关的快捷键
  // Backspace 撤销多边形最后一个点（最高优先级）
  if (
    e.code === "Backspace" &&
    currentTool.value === "polygon" &&
    polygonPoints.value.length > 0
  ) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    polygonPoints.value.pop();
    return;
  }

  // Enter 完成多边形
  if (
    e.code === "Enter" &&
    currentTool.value === "polygon" &&
    polygonPoints.value.length >= 3
  ) {
    e.preventDefault();
    e.stopPropagation();
    finishPolygon();
    return;
  }

  // Esc 关闭编辑状态
  if (e.code === "Escape") {
    e.preventDefault();

    // 取消所有正在进行的操作
    if (currentTool.value === "polygon" && polygonPoints.value.length > 0) {
      polygonPoints.value = [];
      return;
    }
    if (isDrawing.value) {
      isDrawing.value = false;
      tempShape.value = null;
      // 移除 window 上的监听器
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      return;
    }
    if (selectedShapeId.value) {
      selectedShapeId.value = null;
      return;
    }

    // 关闭菜单并退出绘制模式
    if (isMenuOpen.value || currentTool.value !== "none") {
      isMenuOpen.value = false;
      currentTool.value = "none";
      return;
    }
  }

  // 空格键启用平移模式（仅在编辑状态下）
  if (e.code === "Space" && isEditMode.value && !isSpacePressed.value) {
    e.preventDefault();
    isSpacePressed.value = true;
    return;
  }

  // Delete 删除选中
  if (
    (e.code === "Delete" || e.code === "Backspace") &&
    selectedShapeId.value
  ) {
    e.preventDefault();
    deleteSelectedShape();
    return;
  }

  // Ctrl+Z 撤销（仅在编辑模式下处理）
  if (e.ctrlKey && e.code === "KeyZ" && !e.shiftKey && isEditMode.value) {
    e.preventDefault();
    e.stopPropagation();
    undo();
    return;
  }

  // Ctrl+Shift+Z 或 Ctrl+Y 重做（仅在编辑模式下处理）
  if (
    ((e.ctrlKey && e.shiftKey && e.code === "KeyZ") ||
      (e.ctrlKey && e.code === "KeyY")) &&
    isEditMode.value
  ) {
    e.preventDefault();
    e.stopPropagation();
    redo();
    return;
  }
}

// 键盘释放事件
function handleKeyUp(e: KeyboardEvent) {
  // 空格键释放，退出平移模式
  if (e.code === "Space") {
    e.preventDefault();
    isSpacePressed.value = false;

    // 如果正在平移，结束平移
    if (isPanning.value) {
      isPanning.value = false;
      panStartPos.value = null;
      panStartTransform.value = null;
    }
  }
}

// 滚轮缩放事件
function handleWheel(e: WheelEvent) {
  // 仅在编辑状态下且按住空格键时支持缩放
  if (!isEditMode.value || !isSpacePressed.value) return;

  e.preventDefault();

  const svg = svgRef.value;
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 计算缩放因子
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(10, props.transform.scale * delta));

  // 以鼠标位置为中心进行缩放
  const scaleRatio = newScale / props.transform.scale;
  const newX = mouseX - (mouseX - props.transform.x) * scaleRatio;
  const newY = mouseY - (mouseY - props.transform.y) * scaleRatio;

  emit("update:transform", {
    x: newX,
    y: newY,
    scale: newScale,
  });
}

onMounted(() => {
  // 使用 capture 模式确保优先处理，阻止事件继续传播到其他监听器
  window.addEventListener("keydown", handleKeyDown, { capture: true });
  window.addEventListener("keyup", handleKeyUp, { capture: true });

  const svg = svgRef.value;
  if (svg) {
    svg.addEventListener("wheel", handleWheel, { passive: false });
  }

  // 初始化历史记录
  saveHistory();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown, {
    capture: true,
  } as any);
  window.removeEventListener("keyup", handleKeyUp, { capture: true } as any);
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
  window.removeEventListener("mousemove", handleShapeDrag);
  window.removeEventListener("mouseup", handleShapeDragEnd);
  window.removeEventListener("mousemove", handleResize);
  window.removeEventListener("mouseup", handleResizeEnd);

  const svg = svgRef.value;
  if (svg) {
    svg.removeEventListener("wheel", handleWheel);
  }
});
</script>

<style scoped>
.tools-enter-active,
.tools-leave-active {
  transition: all 0.3s ease;
}

.tools-enter-from,
.tools-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
