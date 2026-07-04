"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PANELS = [
  { color: "bg-yellow-400" },
  { color: "bg-green-500" },
  { color: "bg-blue-500" },
] as const;

const PANEL_COUNT = PANELS.length;
const SCROLL_LOCK_MS = 400;
const SWIPE_THRESHOLD_PX = 50;

const wrapLogical = (index: number) =>
  ((index % PANEL_COUNT) + PANEL_COUNT) % PANEL_COUNT;

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isFinePointerRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [panelHeight, setPanelHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const extendedPanels = useMemo(
    () => [PANELS[PANEL_COUNT - 1], ...PANELS, PANELS[0]],
    [],
  );

  activeIndexRef.current = activeIndex;

  const normalizeScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const height = container.clientHeight;
    if (!height) return;

    const physical = Math.round(container.scrollTop / height);

    if (physical === 0) {
      container.scrollTo({ top: PANEL_COUNT * height, behavior: "instant" });
      setActiveIndex(PANEL_COUNT - 1);
      activeIndexRef.current = PANEL_COUNT - 1;
      return;
    }

    if (physical === PANEL_COUNT + 1) {
      container.scrollTo({ top: height, behavior: "instant" });
      setActiveIndex(0);
      activeIndexRef.current = 0;
      return;
    }

    const logical = physical - 1;
    setActiveIndex(logical);
    activeIndexRef.current = logical;
  }, []);

  const scrollToLogical = useCallback((index: number, force = false) => {
    const container = containerRef.current;
    if (!container || isAnimatingRef.current) return;

    const logical = wrapLogical(index);
    if (!force && logical === activeIndexRef.current) return;

    const current = activeIndexRef.current;
    const height = container.clientHeight;
    let physical: number;

    if (current === PANEL_COUNT - 1 && logical === 0) {
      physical = PANEL_COUNT + 1;
    } else if (current === 0 && logical === PANEL_COUNT - 1) {
      physical = 0;
    } else {
      physical = logical + 1;
    }

    isAnimatingRef.current = true;
    container.scrollTo({ top: physical * height, behavior: "smooth" });
    setActiveIndex(logical);
    activeIndexRef.current = logical;

    window.setTimeout(() => {
      isAnimatingRef.current = false;
      normalizeScrollPosition();
    }, SCROLL_LOCK_MS);
  }, [normalizeScrollPosition]);

  const snapToPhysical = useCallback(
    (physical: number) => {
      const container = containerRef.current;
      if (!container || isAnimatingRef.current) return;

      const height = container.clientHeight;
      if (!height) return;

      const clamped = Math.max(0, Math.min(PANEL_COUNT + 1, physical));

      isAnimatingRef.current = true;
      container.scrollTo({ top: clamped * height, behavior: "smooth" });

      window.setTimeout(() => {
        isAnimatingRef.current = false;
        normalizeScrollPosition();
      }, SCROLL_LOCK_MS);
    },
    [normalizeScrollPosition],
  );

  const goToNextPanel = useCallback(() => {
    scrollToLogical(activeIndexRef.current + 1);
  }, [scrollToLogical]);

  const goToPrevPanel = useCallback(() => {
    scrollToLogical(activeIndexRef.current - 1);
  }, [scrollToLogical]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const update = () => {
      isFinePointerRef.current = media.matches;
    };

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setPanelHeight(container.clientHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !panelHeight) return;

    container.scrollTo({
      top: (activeIndexRef.current + 1) * panelHeight,
      behavior: "instant",
    });
  }, [panelHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (isFinePointerRef.current) return;

      event.preventDefault();
      if (isAnimatingRef.current) return;

      if (event.deltaY > 0) {
        goToNextPanel();
      } else if (event.deltaY < 0) {
        goToPrevPanel();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [goToNextPanel, goToPrevPanel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncIndex = () => {
      if (isAnimatingRef.current || isDraggingRef.current) return;
      normalizeScrollPosition();
    };

    container.addEventListener("scrollend", syncIndex);

    return () => {
      container.removeEventListener("scrollend", syncIndex);
    };
  }, [normalizeScrollPosition]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const height = container.clientHeight;
      if (!height) return;

      const deltaY = dragStartYRef.current - event.clientY;
      const maxScroll = (PANEL_COUNT + 1) * height;
      container.scrollTop = Math.max(
        0,
        Math.min(maxScroll, dragStartScrollTopRef.current + deltaY),
      );
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);

      const container = containerRef.current;
      if (!container) return;

      const height = container.clientHeight;
      if (!height) return;

      const physical = Math.round(container.scrollTop / height);
      container.style.scrollBehavior = "";
      snapToPhysical(physical);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [snapToPhysical]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isFinePointerRef.current || isAnimatingRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    event.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = event.clientY;
    dragStartScrollTopRef.current = container.scrollTop;
    container.style.scrollBehavior = "auto";
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isFinePointerRef.current) return;

    touchStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isFinePointerRef.current) return;

    const deltaY = touchStartYRef.current - event.changedTouches[0].clientY;
    if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;

    if (deltaY > 0) {
      goToNextPanel();
    } else {
      goToPrevPanel();
    }
  };

  return (
    <div className="relative bg-white h-screen overflow-hidden">
      <hr className="absolute border-gray-200 w-full top-[10vmin] left-0 -translate-y-1/2" />

      <div className="absolute top-0 left-[10vmin] right-[10vmin] h-[10vmin] flex items-center px-5 justify-between items-center">
        <img src="/loanly-logo.svg" alt="Logo" className="w-[10vmin] h-[10vmin]" />
        <p className="text-xs text-zinc-600">Feeling Loanly? Find Your Sugar Daddies or Mommies.</p>
      </div>

      <hr className="absolute border-gray-200 w-full bottom-[10vmin] left-0 translate-y-1/2" />

      <div className="absolute inset-[10vmin] overflow-hidden">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`absolute inset-y-0 left-1/2 w-[30em] -translate-x-1/2 overflow-y-auto bg-black touch-pan-y select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {extendedPanels.map((panel, index) => (
            <section
              key={index}
              className={`shrink-0 ${panel.color}`}
              style={{ height: panelHeight || "100%" }}
            />
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 ml-[calc(15em+1.25rem)] -translate-y-1/2 flex flex-col gap-4">
          <p>Like</p>
          <p>Image</p>
        </div>
      </div>

      <div className="absolute border-l border-gray-200 h-full top-0 left-[10vmin] -translate-x-1/2" />
      <div className="absolute border-l border-gray-200 h-full top-0 right-[10vmin] translate-x-1/2" />
    </div>
  );
}
