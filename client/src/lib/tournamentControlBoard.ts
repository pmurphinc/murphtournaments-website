export type GameType = "cashout" | "final_round";

export type GameStatus = "draft" | "ready" | "live" | "complete";
export type GameStatusClasses = {
  nodeBorder: string;
  statusPill: string;
  accent: string;
};

export function getGameStatusClasses(status: GameStatus): GameStatusClasses {
  switch (status) {
    case "draft":
      return {
        nodeBorder: "border-zinc-500/70",
        statusPill: "border-zinc-400/40 bg-zinc-500/15 text-zinc-200",
        accent: "shadow-[0_0_24px_rgba(113,113,122,0.14)]",
      };
    case "ready":
      return {
        nodeBorder: "border-yellow-300/80",
        statusPill: "border-yellow-300/50 bg-yellow-300/15 text-yellow-100",
        accent: "shadow-[0_0_26px_rgba(250,204,21,0.18)]",
      };
    case "live":
      return {
        nodeBorder: "border-emerald-400/80",
        statusPill: "border-emerald-400/50 bg-emerald-400/15 text-emerald-100",
        accent: "shadow-[0_0_26px_rgba(52,211,153,0.18)]",
      };
    case "complete":
      return {
        nodeBorder: "border-red-400/75",
        statusPill: "border-red-400/50 bg-red-500/15 text-red-100",
        accent: "shadow-[0_0_24px_rgba(248,113,113,0.14)]",
      };
  }
}
export type ConnectionFlowType = "winner" | "loser";
export type CanvasPoint = { x: number; y: number };
export type ViewportSize = { width: number; height: number };
export type BoardGame = {
  id: number;
  gameType: GameType;
  canvasX: number;
  canvasY: number;
};
export type CanvasPanStart = {
  clientX: number;
  clientY: number;
  scrollLeft: number;
  scrollTop: number;
};

export const minZoom = 0.1;
export const maxZoom = 1.8;
export const baseCanvasSize = { width: 2200, height: 1400 };
export const nodeWidth = 320;
const connectorHorizontalOffset = 44;
export const controlRoomGridSize = 40;
export const connectorRadius = 12;
const expandedCashoutNodeHeight = 438;
const expandedFinalNodeHeight = 300;
const minimizedNodeHeight = 132;

export function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

export function getNodeHeight(gameType: GameType, minimized: boolean) {
  if (minimized) return minimizedNodeHeight;
  return gameType === "cashout"
    ? expandedCashoutNodeHeight
    : expandedFinalNodeHeight;
}

export function getConnectorCenter(
  game: Pick<BoardGame, "gameType" | "canvasX" | "canvasY">,
  port: "top" | "bottom",
  minimized: boolean,
  position: CanvasPoint = { x: game.canvasX, y: game.canvasY },
  flowType: ConnectionFlowType = "winner"
) {
  const bottomOffset =
    flowType === "winner"
      ? -connectorHorizontalOffset
      : connectorHorizontalOffset;
  return {
    x: position.x + nodeWidth / 2 + (port === "bottom" ? bottomOffset : 0),
    y:
      port === "top"
        ? position.y
        : position.y + getNodeHeight(game.gameType, minimized),
  };
}

export function getConnectionEndpoint(
  center: CanvasPoint,
  port: "top" | "bottom"
) {
  return {
    x: center.x,
    y: center.y + (port === "top" ? -connectorRadius : connectorRadius),
  };
}

export function getConnectorEndpoints(
  sourceCenter: CanvasPoint,
  targetCenter: CanvasPoint,
  radius = connectorRadius
) {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { source: sourceCenter, target: targetCenter };
  const unitX = dx / length;
  const unitY = dy / length;
  return {
    source: {
      x: sourceCenter.x + unitX * radius,
      y: sourceCenter.y + unitY * radius,
    },
    target: {
      x: targetCenter.x - unitX * radius,
      y: targetCenter.y - unitY * radius,
    },
  };
}

export function resolveConnectionDropTargetGameId(
  target: EventTarget | null,
  sourceGameId: number
) {
  const element =
    target instanceof HTMLElement
      ? target.closest(
          "[data-connection-target-game-id], [data-input-port-game-id]"
        )
      : null;
  const raw =
    element instanceof HTMLElement
      ? (element.dataset.connectionTargetGameId ??
        element.dataset.inputPortGameId)
      : undefined;
  const targetGameId = raw ? Number(raw) : NaN;
  return Number.isInteger(targetGameId) &&
    targetGameId > 0 &&
    targetGameId !== sourceGameId
    ? targetGameId
    : null;
}

export function getCanvasPanScroll(
  start: CanvasPanStart,
  clientX: number,
  clientY: number
) {
  return {
    scrollLeft: start.scrollLeft - (clientX - start.clientX),
    scrollTop: start.scrollTop - (clientY - start.clientY),
  };
}

export function getBoundedControlKeyPosition(
  position: CanvasPoint,
  viewport: ViewportSize,
  overlay: ViewportSize,
  padding = 8
) {
  const maxX = Math.max(padding, viewport.width - overlay.width - padding);
  const maxY = Math.max(padding, viewport.height - overlay.height - padding);
  return {
    x: Math.min(maxX, Math.max(padding, position.x)),
    y: Math.min(maxY, Math.max(padding, position.y)),
  };
}

export function getViewportPreservingScroll(
  focalCanvasPoint: CanvasPoint,
  focalClientPoint: CanvasPoint,
  canvasRect: Pick<DOMRect, "left" | "top">,
  nextZoom: number
) {
  return {
    scrollLeft:
      focalCanvasPoint.x * nextZoom - (focalClientPoint.x - canvasRect.left),
    scrollTop:
      focalCanvasPoint.y * nextZoom - (focalClientPoint.y - canvasRect.top),
  };
}

export function shouldCancelBoardDragsForPinch(
  activeTouchPointerCount: number
) {
  return activeTouchPointerCount >= 2;
}

export function getCenterZoomView(
  viewport: ViewportSize,
  scroll: Pick<HTMLElement, "scrollLeft" | "scrollTop">,
  currentZoom: number,
  requestedZoom: number
) {
  const nextZoom = clampZoom(requestedZoom);
  const focalClientPoint = { x: viewport.width / 2, y: viewport.height / 2 };
  const focalCanvasPoint = {
    x: (scroll.scrollLeft + focalClientPoint.x) / currentZoom,
    y: (scroll.scrollTop + focalClientPoint.y) / currentZoom,
  };
  return {
    zoom: nextZoom,
    ...getViewportPreservingScroll(
      focalCanvasPoint,
      focalClientPoint,
      { left: 0, top: 0 },
      nextZoom
    ),
  };
}

export function getEmptyBoardResetView() {
  return { zoom: 1, scrollLeft: 0, scrollTop: 0 };
}

export function getFitToContentView(
  games: BoardGame[],
  minimizedGameIds: ReadonlySet<number>,
  viewport: ViewportSize,
  padding = 96
) {
  if (games.length === 0) return getEmptyBoardResetView();

  const bounds = games.reduce(
    (accumulator, game) => {
      const nodeHeight = getNodeHeight(
        game.gameType,
        minimizedGameIds.has(game.id)
      );
      return {
        minX: Math.min(accumulator.minX, game.canvasX),
        minY: Math.min(accumulator.minY, game.canvasY),
        maxX: Math.max(accumulator.maxX, game.canvasX + nodeWidth),
        maxY: Math.max(accumulator.maxY, game.canvasY + nodeHeight),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const usableWidth = Math.max(1, viewport.width - padding * 2);
  const usableHeight = Math.max(1, viewport.height - padding * 2);
  const nextZoom = clampZoom(
    Math.min(usableWidth / contentWidth, usableHeight / contentHeight)
  );
  const centeredScrollLeft =
    (bounds.minX + contentWidth / 2) * nextZoom - viewport.width / 2;
  const centeredScrollTop =
    (bounds.minY + contentHeight / 2) * nextZoom - viewport.height / 2;

  return {
    zoom: nextZoom,
    scrollLeft: Math.max(0, centeredScrollLeft),
    scrollTop: Math.max(0, centeredScrollTop),
  };
}

export type KeyboardPanKeyCode = "KeyA" | "KeyD" | "KeyW" | "KeyS";

const keyboardPanKeyDeltas: Record<KeyboardPanKeyCode, CanvasPoint> = {
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
};

export function isKeyboardPanKeyCode(code: string): code is KeyboardPanKeyCode {
  return code in keyboardPanKeyDeltas;
}

export function getKeyboardPanVector(
  activeCodes: ReadonlySet<KeyboardPanKeyCode>
): CanvasPoint {
  const vector = Array.from(activeCodes).reduce(
    (accumulator, code) => ({
      x: accumulator.x + keyboardPanKeyDeltas[code].x,
      y: accumulator.y + keyboardPanKeyDeltas[code].y,
    }),
    { x: 0, y: 0 }
  );
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude <= 1) return vector;
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function snapCanvasPointToGrid(
  position: CanvasPoint,
  gridSize = controlRoomGridSize
): CanvasPoint {
  const safeGridSize = gridSize > 0 ? gridSize : controlRoomGridSize;
  return {
    x: Math.max(0, Math.round(position.x / safeGridSize) * safeGridSize),
    y: Math.max(0, Math.round(position.y / safeGridSize) * safeGridSize),
  };
}

export function getConnectorPoint(
  game: Pick<BoardGame, "gameType" | "canvasX" | "canvasY">,
  port: "top" | "bottom",
  minimized: boolean,
  position?: CanvasPoint,
  flowType: ConnectionFlowType = "winner"
) {
  return getConnectionEndpoint(
    getConnectorCenter(game, port, minimized, position, flowType),
    port
  );
}

const canvasPanBlockedSelector =
  '[data-control-node="true"], [data-team-card="true"], [data-connector-port="true"], [data-connection-line="true"], [data-no-canvas-pan="true"], button, a, input, select, textarea, [role="menuitem"], [role="button"], [draggable="true"]';

export function shouldStartCanvasPan(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !Boolean(target.closest(canvasPanBlockedSelector));
}

export function hasPointerExceededDragThreshold(
  start: Pick<PointerEvent, "clientX" | "clientY">,
  current: Pick<PointerEvent, "clientX" | "clientY">,
  threshold = 4
) {
  return (
    Math.hypot(
      current.clientX - start.clientX,
      current.clientY - start.clientY
    ) > threshold
  );
}

export function getPointerDistance(
  first: Pick<PointerEvent, "clientX" | "clientY"> | CanvasPoint,
  second: Pick<PointerEvent, "clientX" | "clientY"> | CanvasPoint
) {
  const firstX = "clientX" in first ? first.clientX : first.x;
  const firstY = "clientY" in first ? first.clientY : first.y;
  const secondX = "clientX" in second ? second.clientX : second.x;
  const secondY = "clientY" in second ? second.clientY : second.y;
  return Math.hypot(secondX - firstX, secondY - firstY);
}

export function getMidpoint(
  first: Pick<PointerEvent, "clientX" | "clientY"> | CanvasPoint,
  second: Pick<PointerEvent, "clientX" | "clientY"> | CanvasPoint
) {
  const firstX = "clientX" in first ? first.clientX : first.x;
  const firstY = "clientY" in first ? first.clientY : first.y;
  const secondX = "clientX" in second ? second.clientX : second.x;
  const secondY = "clientY" in second ? second.clientY : second.y;
  return { x: (firstX + secondX) / 2, y: (firstY + secondY) / 2 };
}

export function getConnectionPath(source: CanvasPoint, target: CanvasPoint) {
  const distance = Math.max(80, Math.abs(target.y - source.y) * 0.55);
  return `M ${source.x} ${source.y} C ${source.x} ${source.y + distance}, ${target.x} ${target.y - distance}, ${target.x} ${target.y}`;
}
