import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { THE_FINALS_MAPS } from "@/lib/finalsMaps";
import {
  baseCanvasSize,
  clampZoom,
  getCanvasPanScroll,
  getCenterZoomView,
  getConnectorEndpoints,
  getConnectorPoint,
  getConnectionPath,
  getFitToContentView,
  getMidpoint,
  getNodeHeight,
  getPointerDistance,
  getViewportPreservingScroll,
  maxZoom,
  minZoom,
  nodeWidth,
  shouldCancelBoardDragsForPinch,
  shouldStartCanvasPan,
  type CanvasPanStart,
  type CanvasPoint,
} from "@/lib/tournamentControlBoard";

type ViewerGame = {
  id: number;
  tournamentId: number;
  gameType: "cashout" | "final_round";
  status: "draft" | "ready" | "live" | "complete";
  displayLabel: string;
  canvasX: number;
  canvasY: number;
  seriesBestOf?: number | null;
  mapId?: string | null;
  broadcastUrl?: string | null;
};

export type NodeDragState = {
  gameId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};

type PinchZoomStart = {
  distance: number;
  zoom: number;
  focalClientX: number;
  focalClientY: number;
  focalCanvasX: number;
  focalCanvasY: number;
};

const mapsById = new Map<string, string>(
  THE_FINALS_MAPS.map(map => [map.id, map.name])
);

export function getViewerLocalPosition(
  game: Pick<ViewerGame, "id" | "canvasX" | "canvasY">,
  localPositions: ReadonlyMap<number, CanvasPoint>
) {
  return localPositions.get(game.id) ?? { x: game.canvasX, y: game.canvasY };
}

export function getViewerVisualPosition(
  game: Pick<ViewerGame, "id" | "canvasX" | "canvasY">,
  localPositions: ReadonlyMap<number, CanvasPoint>,
  nodeDrag: Pick<NodeDragState, "gameId" | "x" | "y"> | null
): CanvasPoint {
  if (nodeDrag?.gameId === game.id) {
    return { x: nodeDrag.x, y: nodeDrag.y };
  }
  return getViewerLocalPosition(game, localPositions);
}

export function getViewerConnectionEndpoints(
  source: Pick<ViewerGame, "id" | "gameType" | "canvasX" | "canvasY">,
  target: Pick<ViewerGame, "id" | "gameType" | "canvasX" | "canvasY">,
  flowType: "winner" | "loser",
  minimizedGameIds: ReadonlySet<number>,
  localPositions: ReadonlyMap<number, CanvasPoint>,
  nodeDrag: Pick<NodeDragState, "gameId" | "x" | "y"> | null
) {
  return getConnectorEndpoints(
    getConnectorPoint(
      source,
      "bottom",
      minimizedGameIds.has(source.id),
      getViewerVisualPosition(source, localPositions, nodeDrag),
      flowType
    ),
    getConnectorPoint(
      target,
      "top",
      minimizedGameIds.has(target.id),
      getViewerVisualPosition(target, localPositions, nodeDrag)
    )
  );
}

export function getViewerConnectorNodeDescriptors() {
  return [
    { port: "top", label: "Receives advancing team", interactive: false },
    { port: "winner", label: "Winner advances", interactive: false },
    { port: "loser", label: "Loser advances", interactive: false },
  ] as const;
}

export function resetViewerLayoutState() {
  return {
    localPositions: new Map<number, CanvasPoint>(),
    minimized: new Set<number>(),
  };
}

export default function TournamentControlViewer() {
  const params = useParams<{ viewerToken: string }>();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const canvasPanRef = useRef<(CanvasPanStart & { pointerId: number }) | null>(
    null
  );
  const touchPointersRef = useRef<Map<number, PointerEvent>>(new Map());
  const pinchStartRef = useRef<PinchZoomStart | null>(null);
  const isPinchingRef = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [localPositions, setLocalPositions] = useState<
    Map<number, CanvasPoint>
  >(() => new Map());
  const [minimizedGameIds, setMinimizedGameIds] = useState<Set<number>>(
    () => new Set()
  );
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const query = trpc.tournamentControl.getViewer.useQuery(
    { token: params.viewerToken ?? "" },
    { enabled: Boolean(params.viewerToken), retry: false, refetchInterval: 5000 }
  );
  const games = (query.data?.games ?? []) as ViewerGame[];
  const teamsById = useMemo(
    () =>
      new Map(query.data?.teams.map(team => [team.id, team] as const) ?? []),
    [query.data]
  );
  const gamesById = useMemo(
    () => new Map(games.map(game => [game.id, game] as const)),
    [games]
  );

  const logicalCanvasSize = useMemo(
    () => ({
      width: Math.max(
        baseCanvasSize.width,
        ...games.map(
          game =>
            getViewerVisualPosition(game, localPositions, nodeDrag).x + 520
        )
      ),
      height: Math.max(
        baseCanvasSize.height,
        ...games.map(
          game =>
            getViewerVisualPosition(game, localPositions, nodeDrag).y + 680
        )
      ),
    }),
    [games, localPositions, nodeDrag]
  );

  const applyBoardView = useCallback(
    (view: { zoom: number; scrollLeft: number; scrollTop: number }) => {
      const element = canvasRef.current;
      if (!element) return;
      setZoom(view.zoom);
      requestAnimationFrame(() => {
        element.scrollLeft = view.scrollLeft;
        element.scrollTop = view.scrollTop;
      });
    },
    []
  );

  const fitBoardView = useCallback(() => {
    const element = canvasRef.current;
    if (!element) return;
    const visualGames = games.map(game => ({
      ...game,
      ...getViewerVisualPosition(game, localPositions, nodeDrag),
    }));
    applyBoardView(
      getFitToContentView(visualGames, minimizedGameIds, {
        width: element.clientWidth,
        height: element.clientHeight,
      })
    );
  }, [applyBoardView, games, localPositions, minimizedGameIds, nodeDrag]);

  const resetLayout = useCallback(() => {
    setLocalPositions(new Map());
    setMinimizedGameIds(new Set());
    requestAnimationFrame(fitBoardView);
  }, [fitBoardView]);

  const zoomBoardFromCenter = useCallback(
    (zoomDelta: number) => {
      const element = canvasRef.current;
      if (!element) return;
      applyBoardView(
        getCenterZoomView(
          { width: element.clientWidth, height: element.clientHeight },
          { scrollLeft: element.scrollLeft, scrollTop: element.scrollTop },
          zoom,
          zoom + zoomDelta
        )
      );
    },
    [applyBoardView, zoom]
  );

  const canvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.round(
            (clientX -
              (rect?.left ?? 0) +
              (canvasRef.current?.scrollLeft ?? 0)) /
              zoom
          )
        ),
        y: Math.max(
          0,
          Math.round(
            (clientY - (rect?.top ?? 0) + (canvasRef.current?.scrollTop ?? 0)) /
              zoom
          )
        ),
      };
    },
    [zoom]
  );

  useEffect(() => {
    if (!nodeDrag) return;
    const { gameId, offsetX, offsetY } = nodeDrag;
    const move = (event: PointerEvent) => {
      if (isPinchingRef.current) return;
      const point = canvasPoint(event.clientX, event.clientY);
      setNodeDrag(current =>
        current?.gameId === gameId
          ? {
              ...current,
              x: Math.max(0, point.x - offsetX),
              y: Math.max(0, point.y - offsetY),
            }
          : current
      );
    };
    const finish = (event: PointerEvent) => {
      const point = canvasPoint(event.clientX, event.clientY);
      setLocalPositions(current =>
        new Map(current).set(gameId, {
          x: Math.max(0, point.x - offsetX),
          y: Math.max(0, point.y - offsetY),
        })
      );
      setNodeDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", () => setNodeDrag(null), {
      once: true,
    });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
  }, [canvasPoint, nodeDrag]);

  if (query.isLoading) return <ViewerState title="Loading bracket…" />;
  if (query.error)
    return (
      <ViewerState
        title="Bracket unavailable"
        description={query.error.message}
      />
    );
  if (!query.data) return <ViewerState title="Bracket not found" />;

  return (
    <section className="min-h-screen bg-black text-white">
      <header className="border-b border-neon-gold/30 bg-zinc-950 px-6 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">
          Viewer Bracket
        </p>
        <h1 className="mt-2 font-mono text-3xl font-black uppercase">
          {query.data.tournament.name}
        </h1>
        <p className="text-sm text-white/60">
          {query.data.tournament.eventStatus} ·{" "}
          {query.data.tournament.currentStage}
        </p>
      </header>
      <main
        ref={canvasRef}
        className={`relative h-[calc(100dvh-8.5rem)] touch-none overflow-auto overscroll-contain bg-[radial-gradient(circle_at_top,#4d39091a,transparent_32rem),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px] ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        onWheel={event => {
          if (!event.shiftKey) return;
          event.preventDefault();
          const element = canvasRef.current;
          const rect = element?.getBoundingClientRect();
          if (!element || !rect) return;
          const focalCanvasPoint = {
            x: (event.clientX - rect.left + element.scrollLeft) / zoom,
            y: (event.clientY - rect.top + element.scrollTop) / zoom,
          };
          const nextZoom = clampZoom(zoom + (event.deltaY > 0 ? -0.08 : 0.08));
          const nextScroll = getViewportPreservingScroll(
            focalCanvasPoint,
            { x: event.clientX, y: event.clientY },
            rect,
            nextZoom
          );
          setZoom(nextZoom);
          requestAnimationFrame(() => {
            element.scrollLeft = nextScroll.scrollLeft;
            element.scrollTop = nextScroll.scrollTop;
          });
        }}
        onPointerDown={event => {
          if (event.pointerType === "touch") {
            touchPointersRef.current.set(event.pointerId, event.nativeEvent);
            event.currentTarget.setPointerCapture?.(event.pointerId);
            if (shouldCancelBoardDragsForPinch(touchPointersRef.current.size)) {
              isPinchingRef.current = true;
              setNodeDrag(null);
              canvasPanRef.current = null;
              const element = canvasRef.current;
              const rect = element?.getBoundingClientRect();
              const pointers = Array.from(touchPointersRef.current.values());
              if (element && rect && pointers[0] && pointers[1]) {
                const midpoint = getMidpoint(pointers[0], pointers[1]);
                pinchStartRef.current = {
                  distance: getPointerDistance(pointers[0], pointers[1]),
                  zoom,
                  focalClientX: midpoint.x,
                  focalClientY: midpoint.y,
                  focalCanvasX:
                    (midpoint.x - rect.left + element.scrollLeft) / zoom,
                  focalCanvasY:
                    (midpoint.y - rect.top + element.scrollTop) / zoom,
                };
              }
              event.preventDefault();
              return;
            }
          }
          if (event.button !== 0 || !shouldStartCanvasPan(event.target)) return;
          const element = canvasRef.current;
          if (!element) return;
          event.preventDefault();
          canvasPanRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            scrollLeft: element.scrollLeft,
            scrollTop: element.scrollTop,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setIsPanning(true);
        }}
        onPointerMove={event => {
          if (
            event.pointerType === "touch" &&
            touchPointersRef.current.has(event.pointerId)
          ) {
            touchPointersRef.current.set(event.pointerId, event.nativeEvent);
            if (touchPointersRef.current.size >= 2 && pinchStartRef.current) {
              const element = canvasRef.current;
              const rect = element?.getBoundingClientRect();
              const pointers = Array.from(touchPointersRef.current.values());
              if (!element || !rect || !pointers[0] || !pointers[1]) return;
              event.preventDefault();
              const nextZoom = clampZoom(
                pinchStartRef.current.zoom *
                  (getPointerDistance(pointers[0], pointers[1]) /
                    pinchStartRef.current.distance)
              );
              const nextScroll = getViewportPreservingScroll(
                {
                  x: pinchStartRef.current.focalCanvasX,
                  y: pinchStartRef.current.focalCanvasY,
                },
                {
                  x: pinchStartRef.current.focalClientX,
                  y: pinchStartRef.current.focalClientY,
                },
                rect,
                nextZoom
              );
              setZoom(nextZoom);
              element.scrollLeft = nextScroll.scrollLeft;
              element.scrollTop = nextScroll.scrollTop;
              return;
            }
          }
          const panStart = canvasPanRef.current;
          if (!panStart || panStart.pointerId !== event.pointerId) return;
          const element = canvasRef.current;
          if (!element) return;
          event.preventDefault();
          const nextScroll = getCanvasPanScroll(
            panStart,
            event.clientX,
            event.clientY
          );
          element.scrollLeft = nextScroll.scrollLeft;
          element.scrollTop = nextScroll.scrollTop;
        }}
        onPointerUp={event => {
          if (event.pointerType === "touch") {
            touchPointersRef.current.delete(event.pointerId);
            if (touchPointersRef.current.size < 2) pinchStartRef.current = null;
            if (touchPointersRef.current.size === 0)
              isPinchingRef.current = false;
          }
          if (canvasPanRef.current?.pointerId === event.pointerId) {
            canvasPanRef.current = null;
            setIsPanning(false);
          }
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
        onPointerCancel={event => {
          touchPointersRef.current.delete(event.pointerId);
          canvasPanRef.current = null;
          setIsPanning(false);
        }}
      >
        <div className="pointer-events-none sticky left-3 top-3 z-50 h-0 w-0">
          <div
            data-no-canvas-pan="true"
            className="pointer-events-auto flex w-20 flex-col items-center gap-2 rounded-xl border border-[#FFD700]/35 bg-zinc-950/95 p-2 font-mono shadow-[0_0_24px_rgba(255,215,0,0.16)] sm:w-24"
          >
            <button
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= maxZoom}
              onClick={() => zoomBoardFromCenter(0.1)}
              className="h-9 w-full rounded border border-white/15 text-lg font-black disabled:opacity-30"
            >
              +
            </button>
            <span className="w-full rounded bg-black/50 px-1 py-1 text-center text-xs font-black text-[#FFD700]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= minZoom}
              onClick={() => zoomBoardFromCenter(-0.1)}
              className="h-9 w-full rounded border border-white/15 text-lg font-black disabled:opacity-30"
            >
              −
            </button>
            <button
              aria-label="Fit bracket to view"
              title="Fit bracket to view"
              onClick={fitBoardView}
              className="w-full rounded border border-[#FFD700]/40 px-1 py-2 text-[10px] font-black uppercase leading-tight text-[#FFD700]"
            >
              Fit
            </button>
            <button
              aria-label="Reset viewer layout"
              title="Reset viewer layout"
              onClick={resetLayout}
              className="w-full rounded border border-white/20 px-1 py-2 text-[10px] font-black uppercase leading-tight text-white/80"
            >
              Reset
            </button>
            <span className="w-full rounded bg-white/5 px-1 py-1 text-center text-[9px] uppercase tracking-wider text-white/50">
              Read-only
            </span>
            <div
              aria-label="Connector legend"
              className="w-full rounded border border-white/10 bg-black/50 px-1.5 py-1 text-[9px] leading-snug text-white/60"
            >
              <p>
                <span className="font-black text-[#FFD700]">W</span> — Winner
              </p>
              <p>
                <span className="font-black text-slate-100">L</span> — Loser
              </p>
            </div>
          </div>
        </div>
        <div
          className="relative"
          style={{
            width: logicalCanvasSize.width * zoom,
            height: logicalCanvasSize.height * zoom,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: logicalCanvasSize.width,
              height: logicalCanvasSize.height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <svg
              className="absolute inset-0 overflow-visible"
              width={logicalCanvasSize.width}
              height={logicalCanvasSize.height}
            >
              {query.data.connections.map(connection => {
                const source = gamesById.get(connection.sourceGameId);
                const target = gamesById.get(connection.targetGameId);
                if (!source || !target) return null;
                const endpoints = getViewerConnectionEndpoints(
                  source,
                  target,
                  connection.flowType,
                  minimizedGameIds,
                  localPositions,
                  nodeDrag
                );
                const isLoserConnection = connection.flowType === "loser";
                return (
                  <path
                    key={connection.id}
                    d={getConnectionPath(endpoints.source, endpoints.target)}
                    stroke={isLoserConnection ? "#F8FAFC" : "#FFD700"}
                    strokeWidth="3"
                    fill="none"
                    opacity={isLoserConnection ? "0.82" : "0.75"}
                  />
                );
              })}
            </svg>
            {games.map(game => {
              const position = getViewerVisualPosition(
                game,
                localPositions,
                nodeDrag
              );
              const assignments = query.data.assignments
                .filter(assignment => assignment.gameId === game.id)
                .sort((a, b) => a.slotIndex - b.slotIndex);
              const capacity = game.gameType === "cashout" ? 4 : 2;
              const isMinimized = minimizedGameIds.has(game.id);
              const mapName = game.mapId
                ? mapsById.get(
                    game.mapId as keyof (typeof THE_FINALS_MAPS)[number]
                  )
                : null;
              return (
                <article
                  key={game.id}
                  data-control-node="true"
                  className="absolute w-80 rounded-lg border border-neon-gold/30 bg-zinc-950/95 p-4 shadow-2xl"
                  style={{
                    left: position.x,
                    top: position.y,
                    minHeight: getNodeHeight(game.gameType, isMinimized),
                  }}
                  onPointerDown={(event: ReactPointerEvent<HTMLElement>) => {
                    if (
                      event.button !== 0 ||
                      (event.target instanceof Element &&
                        event.target.closest(
                          '[data-no-node-drag="true"], button, a'
                        ))
                    )
                      return;
                    event.preventDefault();
                    event.stopPropagation();
                    const point = canvasPoint(event.clientX, event.clientY);
                    setNodeDrag({
                      gameId: game.id,
                      offsetX: point.x - position.x,
                      offsetY: point.y - position.y,
                      x: position.x,
                      y: position.y,
                    });
                  }}
                >
                  <span
                    data-no-node-drag="true"
                    data-connector-port="true"
                    aria-label="Receives advancing team"
                    title="Receives advancing team"
                    className="pointer-events-none absolute -top-3 left-1/2 z-20 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#FFD700] bg-black shadow-[0_0_14px_rgba(255,215,0,0.45)]"
                  />
                  <span
                    data-no-node-drag="true"
                    data-connector-port="true"
                    aria-label="Winner advances"
                    title="Winner advances"
                    className="pointer-events-none absolute -bottom-3 left-[calc(50%-44px)] z-20 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#FFD700] bg-[#FFD700] font-mono text-[11px] font-black leading-none text-black shadow-[0_0_14px_rgba(255,215,0,0.45)]"
                  >
                    W
                  </span>
                  <span
                    data-no-node-drag="true"
                    data-connector-port="true"
                    aria-label="Loser advances"
                    title="Loser advances"
                    className="pointer-events-none absolute -bottom-3 left-[calc(50%+44px)] z-20 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-slate-100 bg-slate-100 font-mono text-[11px] font-black leading-none text-black shadow-[0_0_14px_rgba(226,232,240,0.45)]"
                  >
                    L
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-white/45">
                        {game.gameType === "cashout"
                          ? "Cashout Lobby"
                          : `Final Round · BO${game.seriesBestOf ?? 1}`}
                      </p>
                      <h2 className="mt-1 font-mono text-xl font-black text-white">
                        {game.displayLabel}
                      </h2>
                    </div>
                    <button
                      data-no-node-drag="true"
                      className="rounded border border-white/15 bg-white/10 px-2 py-1 font-mono text-xs uppercase text-white/70"
                      onClick={() =>
                        setMinimizedGameIds(current => {
                          const next = new Set(current);
                          next.has(game.id)
                            ? next.delete(game.id)
                            : next.add(game.id);
                          return next;
                        })
                      }
                    >
                      {isMinimized ? "+" : "−"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="inline-flex rounded border border-white/15 px-2 py-1 font-mono text-xs uppercase text-white/60">
                      {game.status}
                    </p>
                    <p className="rounded border border-[#FFD700]/25 bg-[#FFD700]/10 px-2 py-1 font-mono text-xs uppercase text-[#FFD700]">
                      Map: {mapName ?? "TBD"}
                    </p>
                  </div>
                  {!isMinimized && (
                    <>
                      {game.broadcastUrl && (
                        <a
                          data-no-node-drag="true"
                          href={game.broadcastUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex w-full items-center justify-center rounded border border-[#FFD700] bg-[#FFD700] px-3 py-2 font-mono text-xs font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,215,0,0.24)] hover:bg-[#D4AF37]"
                        >
                          Watch Broadcast
                        </a>
                      )}
                      <div className="mt-3 space-y-2">
                        {Array.from({ length: capacity }, (_, index) => {
                          const slot = index + 1;
                          const assignment = assignments.find(
                            item => item.slotIndex === slot
                          );
                          const team = assignment
                            ? teamsById.get(assignment.teamId)
                            : null;
                          return (
                            <div
                              key={slot}
                              className="rounded border border-white/10 bg-black/50 p-2"
                            >
                              <p className="font-mono text-[10px] uppercase text-white/35">
                                Slot {slot}
                              </p>
                              <p className="font-mono text-sm font-bold text-white">
                                {team?.name ?? "TBD"}
                                {assignment?.resultPlacement
                                  ? ` · ${assignment.resultPlacement}`
                                  : ""}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </main>
    </section>
  );
}

function ViewerState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <h1 className="font-mono text-2xl font-black text-neon-gold">
          {title}
        </h1>
        {description && <p className="mt-3 text-white/60">{description}</p>}
      </div>
    </section>
  );
}
