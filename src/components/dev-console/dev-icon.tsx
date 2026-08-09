"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POSITION_KEY = "devConsole.position";
const ICON_SIZE = 44;
const EDGE_MARGIN = 12;

type Position = { x: number; y: number };

function defaultPosition(): Position {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  return {
    x: window.innerWidth - ICON_SIZE - EDGE_MARGIN,
    y: window.innerHeight - ICON_SIZE - EDGE_MARGIN * 4,
  };
}

function clampPosition(position: Position): Position {
  if (typeof window === "undefined") return position;
  const maxX = window.innerWidth - ICON_SIZE - EDGE_MARGIN;
  const maxY = window.innerHeight - ICON_SIZE - EDGE_MARGIN;
  return {
    x: Math.min(Math.max(position.x, EDGE_MARGIN), Math.max(maxX, EDGE_MARGIN)),
    y: Math.min(Math.max(position.y, EDGE_MARGIN), Math.max(maxY, EDGE_MARGIN)),
  };
}

function readStoredPosition(): Position | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(POSITION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // corrupted value, ignore
  }
  return null;
}

export function DevIcon({
  onToggle,
  badgeCount,
}: {
  onToggle: () => void;
  badgeCount: number;
}) {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const stored = readStoredPosition();
      setPosition(clampPosition(stored ?? defaultPosition()));
      setPositionLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!positionLoaded) return;
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position, positionLoaded]);

  useEffect(() => {
    function handleResize() {
      setPosition((current) => clampPosition(current));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      movedRef.current = false;
      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - position.x,
        offsetY: event.clientY - position.y,
      };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [position.x, position.y],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    movedRef.current = true;
    setPosition(
      clampPosition({
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      }),
    );
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragStateRef.current = null;
      setDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (!movedRef.current) {
        onToggle();
      }
    },
    [onToggle],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  return (
    <button
      type="button"
      className={`mnx-dev-icon${dragging ? " is-dragging" : ""}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      aria-label="Open developer console"
    >
      <span>DEV</span>
      {badgeCount > 0 ? (
        <span className="mnx-dev-icon-badge" aria-hidden="true">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </button>
  );
}
