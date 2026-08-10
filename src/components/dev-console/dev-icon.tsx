"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

const POSITION_KEY = "devConsole.position";
const ICON_SIZE = 56;
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
    if (
      !movedRef.current &&
      (Math.abs(event.clientX - position.x - dragState.offsetX) > 2 ||
        Math.abs(event.clientY - position.y - dragState.offsetY) > 2)
    ) {
      movedRef.current = true;
    }
    setPosition(
      clampPosition({
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      }),
    );
  }, [position.x, position.y]);

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

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    movedRef.current = false;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      className={`mnx-dev-icon${dragging ? " is-dragging" : ""}`}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2147483647,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${ICON_SIZE}px`,
        height: `${ICON_SIZE}px`,
        padding: 0,
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "999px",
        background:
          "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.18), rgba(255,255,255,0.04) 32%, transparent 33%), linear-gradient(180deg, #434343 0%, #232323 100%)",
        color: "#f4f4f5",
        boxShadow: dragging
          ? "0 18px 40px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255,255,255,0.14)"
          : "0 10px 24px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
        fontFamily: "var(--mn-font-sans, sans-serif)",
        fontSize: "0.8rem",
        fontWeight: 500,
        letterSpacing: "0.08em",
        lineHeight: 1,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        WebkitUserSelect: "none",
        appearance: "none",
        verticalAlign: "top",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      aria-label="Open developer console"
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "calc(100% - 4px)",
          height: "calc(100% - 4px)",
          borderRadius: "999px",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.35)",
        }}
      >
        DEV
      </span>
      {badgeCount > 0 ? (
        <span
          className="mnx-dev-icon-badge"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-4px",
            right: "-2px",
            minWidth: "20px",
            height: "20px",
            padding: "0 5px",
            borderRadius: "999px",
            background: "var(--mn-color-danger, #dc2626)",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            lineHeight: 1,
            boxShadow: "0 6px 14px rgba(220, 38, 38, 0.28)",
          }}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </button>,
    document.body,
  );
}
