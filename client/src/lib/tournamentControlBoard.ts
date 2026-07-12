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
  roundGroupId?: string | null;
  roundLabel?: string | null;
  roundColor?: RoundFrameColorId | null;
};
export type RoundFrameBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type RoundFrameTheme = {
  frame: string;
  label: string;
};
export type RoundFrame = RoundFrameBounds & {
  groupId: string;
  label: string;
  theme: RoundFrameTheme;
  colorId: RoundFrameColorId;
};

export type RoundFrameColorId =
  | "gold"
  | "cyan"
  | "violet"
  | "orange"
  | "blue"
  | "fuchsia"
  | "emerald";

export const roundFrameThemes: Record<RoundFrameColorId, RoundFrameTheme> = {
  gold: {
    frame:
      "border-[#FFD700]/65 bg-[#FFD700]/7 shadow-[inset_0_0_34px_rgba(255,215,0,0.10),0_0_28px_rgba(255,215,0,0.14)]",
    label:
      "border-[#FFD700]/75 bg-black text-[#FFD700] shadow-[0_0_18px_rgba(255,215,0,0.28)]",
  },
  cyan: {
    frame:
      "border-cyan-300/65 bg-cyan-300/7 shadow-[inset_0_0_34px_rgba(103,232,249,0.10),0_0_28px_rgba(103,232,249,0.14)]",
    label:
      "border-cyan-300/75 bg-black text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.26)]",
  },
  violet: {
    frame:
      "border-violet-300/65 bg-violet-400/7 shadow-[inset_0_0_34px_rgba(196,181,253,0.10),0_0_28px_rgba(196,181,253,0.14)]",
    label:
      "border-violet-300/75 bg-black text-violet-100 shadow-[0_0_18px_rgba(196,181,253,0.26)]",
  },
  orange: {
    frame:
      "border-orange-300/65 bg-orange-400/7 shadow-[inset_0_0_34px_rgba(253,186,116,0.10),0_0_28px_rgba(253,186,116,0.14)]",
    label:
      "border-orange-300/75 bg-black text-orange-100 shadow-[0_0_18px_rgba(253,186,116,0.26)]",
  },
  blue: {
    frame:
      "border-blue-300/65 bg-blue-400/7 shadow-[inset_0_0_34px_rgba(147,197,253,0.10),0_0_28px_rgba(147,197,253,0.14)]",
    label:
      "border-blue-300/75 bg-black text-blue-100 shadow-[0_0_18px_rgba(147,197,253,0.26)]",
  },
  fuchsia: {
    frame:
      "border-fuchsia-300/65 bg-fuchsia-400/7 shadow-[inset_0_0_34px_rgba(240,171,252,0.10),0_0_28px_rgba(240,171,252,0.14)]",
    label:
      "border-fuchsia-300/75 bg-black text-fuchsia-100 shadow-[0_0_18px_rgba(240,171,252,0.26)]",
  },
  emerald: {
    frame:
      "border-emerald-300/65 bg-emerald-400/7 shadow-[inset_0_0_34px_rgba(110,231,183,0.10),0_0_28px_rgba(110,231,183,0.14)]",
    label:
      "border-emerald-300/75 bg-black text-emerald-100 shadow-[0_0_18px_rgba(110,231,183,0.26)]",
  },
} as const satisfies Record<RoundFrameColorId, RoundFrameTheme>;

export const roundFrameColorIds = Object.keys(
  roundFrameThemes
) as RoundFrameColorId[];

export function getRoundFrameTheme(roundIndex: number): RoundFrameTheme {
  return roundFrameThemes[
    roundFrameColorIds[Math.abs(roundIndex) % roundFrameColorIds.length] ??
      "gold"
  ];
}

export function isRoundFrameColorId(
  value: unknown
): value is RoundFrameColorId {
  return typeof value === "string" && value in roundFrameThemes;
}
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

export function getRoundFrameBounds(
  games: BoardGame[],
  minimizedGameIds: ReadonlySet<number>,
  positions: ReadonlyMap<number, CanvasPoint> = new Map(),
  measuredHeights: ReadonlyMap<number, number> = new Map(),
  padding = 36
): RoundFrameBounds | null {
  if (games.length === 0) return null;
  const bounds = games.map(game => {
    const position = positions.get(game.id) ?? {
      x: game.canvasX,
      y: game.canvasY,
    };
    return {
      left: position.x,
      top: position.y,
      right: position.x + nodeWidth,
      bottom:
        position.y +
        (measuredHeights.get(game.id) ??
          getNodeHeight(game.gameType, minimizedGameIds.has(game.id))),
    };
  });
  const left = Math.min(...bounds.map(bound => bound.left));
  const top = Math.min(...bounds.map(bound => bound.top));
  const right = Math.max(...bounds.map(bound => bound.right));
  const bottom = Math.max(...bounds.map(bound => bound.bottom));
  return {
    x: left - padding,
    y: top - padding,
    width: right - left + padding * 2,
    height: bottom - top + padding * 2,
  };
}

export function getRoundFrames(
  games: BoardGame[],
  minimizedGameIds: ReadonlySet<number>,
  positions: ReadonlyMap<number, CanvasPoint> = new Map(),
  measuredHeights: ReadonlyMap<number, number> = new Map()
): RoundFrame[] {
  const groups = new Map<string, BoardGame[]>();
  for (const game of games) {
    if (!game.roundGroupId) continue;
    groups.set(game.roundGroupId, [
      ...(groups.get(game.roundGroupId) ?? []),
      game,
    ]);
  }
  return Array.from(groups.entries()).flatMap(
    ([groupId, groupGames], index) => {
      const bounds = getRoundFrameBounds(
        groupGames,
        minimizedGameIds,
        positions,
        measuredHeights
      );
      return bounds
        ? [
            {
              ...bounds,
              groupId,
              label:
                groupGames.find(game => game.roundLabel)?.roundLabel ??
                `Group ${index + 1}`,
              colorId: isRoundFrameColorId(groupGames[0]?.roundColor)
                ? groupGames[0].roundColor
                : (roundFrameColorIds[index % roundFrameColorIds.length] ??
                  "gold"),
              theme:
                roundFrameThemes[
                  isRoundFrameColorId(groupGames[0]?.roundColor)
                    ? groupGames[0].roundColor
                    : (roundFrameColorIds[index % roundFrameColorIds.length] ??
                      "gold")
                ],
            },
          ]
        : [];
    }
  );
}

export type GroupDragMember = {
  id: number;
  canvasX: number;
  canvasY: number;
  roundGroupId?: string | null;
};

export function getRoundGroupGameIds<T extends Pick<GroupDragMember, "id" | "roundGroupId">>(
  games: readonly T[],
  groupId: string
): number[] {
  return games
    .filter(game => game.roundGroupId === groupId)
    .map(game => game.id);
}

export function isRoundGroupSelected(
  selectedGameIds: ReadonlySet<number>,
  groupGameIds: readonly number[]
) {
  return (
    groupGameIds.length > 0 &&
    groupGameIds.every(gameId => selectedGameIds.has(gameId))
  );
}

export function getNextRoundGroupSelection(
  selectedGameIds: ReadonlySet<number>,
  groupGameIds: readonly number[],
  additive: boolean
): Set<number> {
  if (!additive) return new Set(groupGameIds);
  const groupSelected = isRoundGroupSelected(selectedGameIds, groupGameIds);
  const next = new Set(selectedGameIds);
  for (const gameId of groupGameIds) {
    if (groupSelected) next.delete(gameId);
    else next.add(gameId);
  }
  return next;
}

export function applyGroupMovementDelta<T extends GroupDragMember>(
  games: readonly T[],
  groupId: string,
  delta: CanvasPoint
): Map<number, CanvasPoint> {
  const positions = new Map<number, CanvasPoint>();
  for (const game of games) {
    if (game.roundGroupId !== groupId) continue;
    positions.set(game.id, {
      x: Math.max(0, Math.round(game.canvasX + delta.x)),
      y: Math.max(0, Math.round(game.canvasY + delta.y)),
    });
  }
  return positions;
}

export function getCanvasDeltaFromPointerDelta(
  start: Pick<PointerEvent, "clientX" | "clientY">,
  current: Pick<PointerEvent, "clientX" | "clientY">,
  zoom: number
): CanvasPoint {
  return {
    x: (current.clientX - start.clientX) / zoom,
    y: (current.clientY - start.clientY) / zoom,
  };
}

export type GroupDragPositionStart = {
  clientX: number;
  clientY: number;
  startPositions: ReadonlyMap<number, CanvasPoint>;
};

export function getGroupDragPositionsFromStart(
  start: GroupDragPositionStart,
  pointer: { clientX: number; clientY: number },
  zoom: number
) {
  const delta = getCanvasDeltaFromPointerDelta(start, pointer, zoom);
  return new Map(
    Array.from(start.startPositions.entries()).map(([gameId, position]) => [
      gameId,
      {
        x: Math.max(0, Math.round(position.x + delta.x)),
        y: Math.max(0, Math.round(position.y + delta.y)),
      },
    ])
  );
}

export function organizeGroupLobbyPositions(
  games: readonly GroupDragMember[],
  groupId: string,
  options: {
    cardWidth?: number;
    cardHeight?: number;
    gap?: number;
    padding?: number;
    maxColumns?: number;
  } = {}
): Map<number, CanvasPoint> {
  const members = games
    .filter(game => game.roundGroupId === groupId)
    .sort(
      (first, second) =>
        first.canvasY - second.canvasY ||
        first.canvasX - second.canvasX ||
        first.id - second.id
    );
  const positions = new Map<number, CanvasPoint>();
  if (members.length === 0) return positions;
  const cardWidth = options.cardWidth ?? nodeWidth;
  const cardHeight = options.cardHeight ?? expandedCashoutNodeHeight;
  const gap = options.gap ?? controlRoomGridSize;
  const padding = options.padding ?? controlRoomGridSize;
  const columns = Math.min(
    options.maxColumns ?? 4,
    Math.max(1, Math.ceil(Math.sqrt(members.length)))
  );
  const minX = Math.min(...members.map(game => game.canvasX));
  const minY = Math.min(...members.map(game => game.canvasY));
  members.forEach((game, index) => {
    positions.set(game.id, {
      x: Math.round(minX + padding + (index % columns) * (cardWidth + gap)),
      y: Math.round(
        minY + padding + Math.floor(index / columns) * (cardHeight + gap)
      ),
    });
  });
  return positions;
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
