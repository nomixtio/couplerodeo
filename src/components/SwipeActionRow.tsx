import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const ACTION_WIDTH = 72;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.4;
const DIRECTION_LOCK_PX = 8;
const SWIPE_OPEN_EVENT = "loveapp-swipe-open";

interface SwipeActionRowProps {
  actionLabel: string;
  variant?: "remove" | "restore";
  onAction: () => void;
  disabled?: boolean;
  children: ReactNode;
}

function BinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button, a, input, textarea, select, video, audio"),
  );
}

export function SwipeActionRow({
  actionLabel,
  variant = "remove",
  onAction,
  disabled,
  children,
}: SwipeActionRowProps) {
  const rowId = useId();
  const frontRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    offset: number;
  } | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const open = offset <= -OPEN_THRESHOLD;
  const revealing = offset < 0;

  useEffect(() => {
    function onOpen(event: Event) {
      const openedId = (event as CustomEvent<string>).detail;
      if (openedId !== rowId) setOffset(0);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOffset(0);
    }

    document.addEventListener(SWIPE_OPEN_EVENT, onOpen);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener(SWIPE_OPEN_EVENT, onOpen);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [rowId]);

  useEffect(() => {
    const node = frontRef.current;
    if (!node) return;

    function onMove(event: PointerEvent) {
      if (draggingRef.current) event.preventDefault();
    }

    node.addEventListener("pointermove", onMove, { passive: false });
    return () => node.removeEventListener("pointermove", onMove);
  }, []);

  function announceOpen() {
    document.dispatchEvent(
      new CustomEvent(SWIPE_OPEN_EVENT, { detail: rowId }),
    );
  }

  function snap(next: number) {
    draggingRef.current = false;
    setDragging(false);
    startRef.current = null;
    setOffset(next);
    if (next < 0) announceOpen();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;
    if (isInteractive(event.target) && offset === 0) return;

    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      offset,
    };
    draggingRef.current = false;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (!start || disabled) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!draggingRef.current) {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        startRef.current = null;
        return;
      }
      draggingRef.current = true;
      setDragging(true);
      frontRef.current?.setPointerCapture(event.pointerId);
      announceOpen();
    }

    const unclamped = start.offset + dx;
    const next =
      unclamped < -ACTION_WIDTH
        ? -ACTION_WIDTH + (unclamped + ACTION_WIDTH) * 0.2
        : Math.min(0, unclamped);
    setOffset(next);
  }

  function onPointerUp() {
    const wasDragging = draggingRef.current;
    startRef.current = null;

    if (!wasDragging) {
      if (offset < 0) {
        suppressClickRef.current = true;
        snap(0);
      }
      return;
    }

    snap(offset <= -OPEN_THRESHOLD ? -ACTION_WIDTH : 0);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current && offset === 0) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
    if (offset < 0) setOffset(0);
  }

  return (
    <div
      className={`swipe-action-row${dragging ? " is-dragging" : ""}${
        open ? " is-open" : ""
      }${revealing ? " is-revealing" : ""}`}
    >
      <div className="swipe-action-behind" aria-hidden={!open}>
        <button
          type="button"
          className={`swipe-action-btn swipe-action-btn--${variant}`}
          aria-label={actionLabel}
          tabIndex={open ? 0 : -1}
          disabled={disabled}
          onClick={() => {
            setOffset(0);
            onAction();
          }}
        >
          {variant === "restore" ? <RestoreIcon /> : <BinIcon />}
        </button>
      </div>
      <div
        ref={frontRef}
        className="swipe-action-front"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
