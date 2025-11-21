/**
 * 绘制透明背景的棋盘格图案（类似 PS 的透明图样式）
 * @param ctx Canvas 2D 上下文
 * @param width 画布宽度
 * @param height 画布高度
 * @param tileSize 棋盘格大小，默认 10px
 */
export function drawTransparentBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tileSize: number = 10
) {
  // 两种颜色：中灰色和白色（参考PS透明图样式）
  const color1 = "#CCCCCC"; // 中灰色
  const color2 = "#FFFFFF"; // 白色

  // 计算需要绘制的格子数量
  const cols = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // 棋盘格：行列索引之和为偶数时用一种颜色，奇数时用另一种颜色
      const isEven = (row + col) % 2 === 0;
      ctx.fillStyle = isEven ? color1 : color2;

      const x = col * tileSize;
      const y = row * tileSize;
      const w = Math.min(tileSize, width - x);
      const h = Math.min(tileSize, height - y);

      ctx.fillRect(x, y, w, h);
    }
  }
}
