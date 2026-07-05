"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Grainient from "@/components/Grainient";
import LoanlyLogo from "@/components/LoanlyLogo";
import TextPressure from "./TextPressure";

type PanelStatus = "pending" | "accepted" | "declined";

type Panel = {
  score: number;
  name: string;
  story: string;
  loan_product: string;
  return: string;
  money: number;
  interest: number;
  short: string;
  status: PanelStatus;
};

const INITIAL_PANELS: Panel[] = [
  {
    score: 67,
    name: "Alexey",
    story:
      "I work at the Soviet Academy on an Electronika 60. I wrote a puzzle game — falling blocks, clear a line, keep stacking. My coworkers keep sneaking back to play it after hours. I call it Tetris. I need $5,000 for a real port, cartridges, and a chance to get it out of the lab.",
    loan_product: "Game Development Loan",
    return: "$550/month for 10 months from arcade licensing royalties",
    money: 5000,
    interest: 8,
    short: "https://www.youtube.com/shorts/q1A4lX2l-Qo",
    status: "pending",
  },
  {
    score: 55,
    name: "Jesse",
    story:
      "Yo, me and my partner cooked up something pure — best product in Albuquerque, straight science. We just need a bigger operation, better equipment, and a RV that doesn't break down every week. I'm asking for $3,000 to scale up. Bitch.",
    loan_product: "Small Business Expansion Loan",
    money: 3000,
    return: "$400/week for 9 weeks from wholesale distribution profits",
    interest: 18,
    short: "https://www.youtube.com/shorts/DXwB3HLB3G8",
    status: "pending",
  },
  {
    score: 99,
    name: "Sherry",
    story:
      "I've been saving for years and finally found a small apartment in Taipei — good schools nearby, MRT five minutes away. The down payment is due next month and I'm $8,500 short after fees and renovation. I have stable income and just need a bridge loan to close.",
    loan_product: "Overseas Property Down Payment Loan",
    money: 8500,
    return: "$780/month for 12 months from salary and rental income",
    interest: 12,
    short: "https://www.youtube.com/shorts/7RKeHBp0Avo",
    status: "pending",
  },
];

const parseAmount = (value: string) => {
  const num = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

type AuditBlock = {
  timestamp: string;
  previousHash: string;
  hash: string;
  encryptedJson: string;
};

type LoanDecisionPayload = {
  event: "LOAN_DECISION";
  name: string;
  money: number;
  interest: number;
  score: number;
  loan_product: string;
  decision: "accepted" | "declined";
};

type SubmittedReel = {
  name: string;
  story: string;
  loan_product: string;
  return: string;
  money: number;
  interest: number;
  short: string;
  submittedAt?: string;
};

const STORAGE_KEY = "loanly-audit-chain";
const SUBMITTED_REELS_KEY = "loanly-submitted-reels";
const GENESIS_HASH = "0";
const CAESAR_SHIFT = 13;

const stableStringify = (obj: unknown): string => {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
};

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function caesarEncrypt(text: string, shift: number): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift) % 26) + 65);
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      return char;
    })
    .join("");
}

function formatGmt8(date: Date): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date) + " GMT+8"
  );
}

function loadAuditChain(): AuditBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAuditChain(blocks: AuditBlock[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch {
    // ignore quota / private mode errors
  }
}

function loadSubmittedReels(): SubmittedReel[] {
  try {
    const raw = localStorage.getItem(SUBMITTED_REELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSubmittedReels(reels: SubmittedReel[]): void {
  try {
    localStorage.setItem(SUBMITTED_REELS_KEY, JSON.stringify(reels));
  } catch {
    // ignore quota / private mode errors
  }
}

function submittedReelToPanel(reel: SubmittedReel): Panel {
  return {
    score: 50,
    name: reel.name,
    story: reel.story,
    loan_product: reel.loan_product,
    return: reel.return,
    money: reel.money,
    interest: reel.interest,
    short: reel.short,
    status: "pending",
  };
}

const MAX_SCORE = 100;
const SCROLL_LOCK_MS = 400;
const SWIPE_THRESHOLD_PX = 50;
const THROW_DISTANCE_PX = 100;
const THROW_VELOCITY_PX_MS = 0.6;
const SCROLL_SNAP_EPSILON_PX = 2;

type CardDragState = {
  name: string;
  x: number;
  y: number;
  animating: boolean;
};

const wrapLogical = (index: number, count: number) =>
  count === 0 ? 0 : ((index % count) + count) % count;

const getYouTubeVideoId = (url: string) =>
  url.match(/(?:shorts\/|v=|youtu\.be\/)([\w-]+)/)?.[1];

const getPanelShort = (panel: Panel) =>
  "short" in panel ? panel.short : undefined;

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

const isPlayerReady = (player: YTPlayer | null): player is YTPlayer =>
  Boolean(
    player &&
      typeof player.getDuration === "function" &&
      typeof player.getCurrentTime === "function",
  );

const getYouTubePlayerVars = (videoId: string) => ({
  autoplay: 1,
  mute: 1,
  loop: 1,
  playlist: videoId,
  controls: 0,
  playsinline: 1,
  rel: 0,
  enablejsapi: 1,
  fs: 0,
  iv_load_policy: 3,
  disablekb: 1,
  origin: typeof window !== "undefined" ? window.location.origin : "",
});

function ShortVideoOverlay({
  videoId,
  apiReady,
  shouldPlay,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onScrubStart,
  onScrubEnd,
}: {
  videoId: string;
  apiReady: boolean;
  shouldPlay: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}) {
  const playerMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isPlayerReadyRef = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const shouldPlayRef = useRef(shouldPlay);
  const [progress, setProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  shouldPlayRef.current = shouldPlay;

  const syncPlayback = useCallback((play: boolean) => {
    const player = playerRef.current;
    if (!isPlayerReady(player)) return;

    if (play && typeof player.playVideo === "function") {
      player.playVideo();
    } else if (!play && typeof player.pauseVideo === "function") {
      player.pauseVideo();
    }
  }, []);

  useEffect(() => {
    syncPlayback(shouldPlay);
  }, [shouldPlay, syncPlayback]);

  useEffect(() => {
    if (!apiReady || !playerMountRef.current) return;

    const mount = playerMountRef.current;
    isPlayerReadyRef.current = false;

    const player = new window.YT.Player(mount, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: getYouTubePlayerVars(videoId),
      events: {
        onReady: (event: { target: YTPlayer }) => {
          playerRef.current = event.target;
          isPlayerReadyRef.current = true;
          syncPlayback(shouldPlayRef.current);
        },
      },
    });

    return () => {
      isPlayerReadyRef.current = false;
      playerRef.current = null;
      if (typeof player.destroy === "function") {
        player.destroy();
      }
    };
  }, [apiReady, videoId, syncPlayback]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (isScrubbingRef.current || !isPlayerReadyRef.current) return;

      const player = playerRef.current;
      if (!isPlayerReady(player)) return;

      const duration = player.getDuration();
      if (!duration) return;

      setProgress((player.getCurrentTime() / duration) * 100);
    }, 200);

    return () => window.clearInterval(tick);
  }, [videoId]);

  const seekToPercent = useCallback((percent: number) => {
    const player = playerRef.current;
    if (!isPlayerReady(player)) return;

    const duration = player.getDuration();
    if (!duration) return;

    const clamped = Math.max(0, Math.min(100, percent));
    player.seekTo((clamped / 100) * duration, true);
    setProgress(clamped);
  }, []);

  const percentFromClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar) return 0;

    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const handleProgressPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation();
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    onScrubStart();
    seekToPercent(percentFromClientX(event.clientX));
    progressBarRef.current?.setPointerCapture(event.pointerId);
  };

  const handleProgressPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isScrubbingRef.current) return;

    event.stopPropagation();
    seekToPercent(percentFromClientX(event.clientX));
  };

  const finishScrub = (
    event: React.PointerEvent<HTMLDivElement>,
    percent: number,
  ) => {
    if (!isScrubbingRef.current) return;

    event.stopPropagation();
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    seekToPercent(percent);
    progressBarRef.current?.releasePointerCapture(event.pointerId);
    onScrubEnd();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Dismiss video"
      className="absolute inset-0 z-10 cursor-pointer touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div ref={playerMountRef} className="pointer-events-none h-full w-full" />
      <div
        ref={progressBarRef}
        className="absolute inset-x-0 bottom-0 z-20 flex h-4 cursor-pointer items-end touch-none"
        onPointerDown={handleProgressPointerDown}
        onPointerMove={handleProgressPointerMove}
        onPointerUp={(event) =>
          finishScrub(event, percentFromClientX(event.clientX))
        }
        onPointerCancel={(event) => {
          isScrubbingRef.current = false;
          setIsScrubbing(false);
          progressBarRef.current?.releasePointerCapture(event.pointerId);
          onScrubEnd();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-[.2em] w-full bg-black">
          <div
            className={`h-full bg-white ${isScrubbing ? "" : "transition-[width] duration-200"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        config: Record<string, unknown>,
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isFinePointerRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);
  const shortGestureRef = useRef<{
    name: string | null;
    x: number;
    y: number;
    dragged: boolean;
    axis: "none" | "horizontal" | "vertical";
  }>({ name: null, x: 0, y: 0, dragged: false, axis: "none" });
  const isProgressScrubbingRef = useRef(false);
  const isCardDraggingRef = useRef(false);
  const storyGestureRef = useRef<{
    name: string | null;
    x: number;
    y: number;
    dragged: boolean;
    axis: "none" | "horizontal" | "vertical";
    lastX: number;
    lastT: number;
    pointerId: number;
  }>({
    name: null,
    x: 0,
    y: 0,
    dragged: false,
    axis: "none",
    lastX: 0,
    lastT: 0,
    pointerId: -1,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [panelHeight, setPanelHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hiddenShorts, setHiddenShorts] = useState<Set<string>>(() => new Set());
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);
  const [isScrollSettled, setIsScrollSettled] = useState(true);

  const [accepted, setAccepted] = useState<Set<string>>(() => new Set());
  const [declined, setDeclined] = useState<Set<string>>(() => new Set());
  const [cardDrag, setCardDrag] = useState<CardDragState | null>(null);
  const [panels, setPanels] = useState<Panel[]>(INITIAL_PANELS);
  const [panelStatuses, setPanelStatuses] = useState<Record<string, PanelStatus>>(
    () => Object.fromEntries(INITIAL_PANELS.map((panel) => [panel.name, panel.status])),
  );

  const [mode, setMode] = useState<"lender" | "borrower">("borrower");
  const [showLogs, setShowLogs] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [logBlocks, setLogBlocks] = useState<AuditBlock[]>([]);
  const [submittedShortUrls, setSubmittedShortUrls] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setLogBlocks(loadAuditChain());
  }, []);

  useEffect(() => {
    const saved = loadSubmittedReels();
    if (saved.length === 0) return;

    setSubmittedShortUrls(new Set(saved.map((reel) => reel.short)));

    const existingShorts = new Set(
      INITIAL_PANELS.map((panel) => getPanelShort(panel)).filter(Boolean),
    );
    const toAdd = saved.filter((reel) => !existingShorts.has(reel.short));
    if (toAdd.length === 0) return;

    setPanels((prev) => {
      const prevShorts = new Set(
        prev.map((panel) => getPanelShort(panel)).filter(Boolean),
      );
      const stillToAdd = toAdd.filter((reel) => !prevShorts.has(reel.short));
      if (stillToAdd.length === 0) return prev;
      return [...prev, ...stillToAdd.map(submittedReelToPanel)];
    });
    setPanelStatuses((prev) => ({
      ...prev,
      ...Object.fromEntries(toAdd.map((reel) => [reel.name, "pending" as const])),
    }));
  }, []);

  const record = useCallback(
    async (panel: Panel, decision: "accepted" | "declined") => {
      const payload: LoanDecisionPayload = {
        event: "LOAN_DECISION",
        name: panel.name,
        money: panel.money,
        interest: panel.interest,
        score: panel.score,
        loan_product: panel.loan_product,
        decision,
      };
      const chain = loadAuditChain();
      const previousHash = chain.at(-1)?.hash ?? GENESIS_HASH;
      const payloadJson = stableStringify(payload);
      const hash = await sha256(previousHash + payloadJson);
      const encryptedJson = caesarEncrypt(JSON.stringify(payload), CAESAR_SHIFT);
      const block: AuditBlock = {
        timestamp: formatGmt8(new Date()),
        previousHash,
        hash,
        encryptedJson,
      };
      const updatedChain = [...chain, block];
      saveAuditChain(updatedChain);
      setLogBlocks(updatedChain);
    },
    [],
  );

  const visiblePanels = useMemo(
    () =>
      panels.filter(
        (panel) =>
          panelStatuses[panel.name] === "pending" ||
          (cardDrag?.name === panel.name && cardDrag.animating),
      ),
    [panelStatuses, cardDrag, panels],
  );

  const visibleCount = visiblePanels.length;
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;

  const extendedPanels = useMemo(() => {
    if (visibleCount === 0) return [];
    return [
      visiblePanels[visibleCount - 1],
      ...visiblePanels,
      visiblePanels[0],
    ];
  }, [visiblePanels, visibleCount]);

  activeIndexRef.current = activeIndex;

  const normalizeScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const count = visibleCountRef.current;
    if (!count) return;

    const height = container.clientHeight;
    if (!height) return;

    const physical = Math.round(container.scrollTop / height);

    if (physical === 0) {
      container.scrollTo({ top: count * height, behavior: "instant" });
      setActiveIndex(count - 1);
      activeIndexRef.current = count - 1;
      return;
    }

    if (physical === count + 1) {
      container.scrollTo({ top: height, behavior: "instant" });
      setActiveIndex(0);
      activeIndexRef.current = 0;
      return;
    }

    const logical = physical - 1;
    setActiveIndex(logical);
    activeIndexRef.current = logical;
  }, []);

  const updateScrollSettled = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const height = container.clientHeight;
    if (!height) return;

    const offset = container.scrollTop % height;
    const isSnapped =
      offset <= SCROLL_SNAP_EPSILON_PX ||
      height - offset <= SCROLL_SNAP_EPSILON_PX;
    const settled =
      !isDraggingRef.current &&
      !isCardDraggingRef.current &&
      !isAnimatingRef.current &&
      isSnapped;

    setIsScrollSettled(settled);
  }, []);

  const scrollToLogical = useCallback((index: number, force = false) => {
    const container = containerRef.current;
    if (!container || isAnimatingRef.current) return;

    const count = visibleCountRef.current;
    if (!count) return;

    const logical = wrapLogical(index, count);
    if (!force && logical === activeIndexRef.current) return;

    const current = activeIndexRef.current;
    const height = container.clientHeight;
    let physical: number;

    if (current === count - 1 && logical === 0) {
      physical = count + 1;
    } else if (current === 0 && logical === count - 1) {
      physical = 0;
    } else {
      physical = logical + 1;
    }

    isAnimatingRef.current = true;
    setIsScrollSettled(false);
    container.scrollTo({ top: physical * height, behavior: "smooth" });
    setActiveIndex(logical);
    activeIndexRef.current = logical;

    window.setTimeout(() => {
      isAnimatingRef.current = false;
      normalizeScrollPosition();
      updateScrollSettled();
    }, SCROLL_LOCK_MS);
  }, [normalizeScrollPosition, updateScrollSettled]);

  const snapToPhysical = useCallback(
    (physical: number) => {
      const container = containerRef.current;
      if (!container || isAnimatingRef.current) return;

      const height = container.clientHeight;
      if (!height) return;

      const count = visibleCountRef.current;
      const clamped = Math.max(0, Math.min(count + 1, physical));

      isAnimatingRef.current = true;
      setIsScrollSettled(false);
      container.scrollTo({ top: clamped * height, behavior: "smooth" });

      window.setTimeout(() => {
        isAnimatingRef.current = false;
        normalizeScrollPosition();
        updateScrollSettled();
      }, SCROLL_LOCK_MS);
    },
    [normalizeScrollPosition, updateScrollSettled],
  );

  const goToNextPanel = useCallback(() => {
    scrollToLogical(activeIndexRef.current + 1);
  }, [scrollToLogical]);

  const goToPrevPanel = useCallback(() => {
    scrollToLogical(activeIndexRef.current - 1);
  }, [scrollToLogical]);

  const toggleShort = useCallback(
    (name: string) => {
      setHiddenShorts((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
        }
        return next;
      });

      const panel = panels.find((p) => p.name === name);
      const short = panel ? getPanelShort(panel) : undefined;
      if (short && submittedShortUrls.has(short)) {
        setShowNotification(true);
      }
    },
    [panels, submittedShortUrls],
  );

  const resetShortGesture = useCallback(() => {
    shortGestureRef.current = {
      name: null,
      x: 0,
      y: 0,
      dragged: false,
      axis: "none",
    };
  }, []);

  const addDecision = useCallback(
    (name: string, decision: "accepted" | "declined") => {
      setPanelStatuses((prev) => {
        const next = { ...prev, [name]: decision };
        console.log(decision, name, next);
        return next;
      });
      if (decision === "accepted") {
        setAccepted((prev) => new Set(prev).add(name));
        setDeclined((prev) => {
          if (!prev.has(name)) return prev;
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      } else {
        setDeclined((prev) => new Set(prev).add(name));
        setAccepted((prev) => {
          if (!prev.has(name)) return prev;
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }

      const panel = panels.find((p) => p.name === name);
      if (panel) {
        void record(panel, decision);
      }
    },
    [panels, record],
  );

  const lockPanelScroll = useCallback(() => {
    isProgressScrubbingRef.current = true;
    shortGestureRef.current.dragged = true;

    const container = containerRef.current;
    if (!container) return;

    container.style.overflow = "hidden";
    container.style.touchAction = "none";
  }, []);

  const unlockPanelScroll = useCallback(() => {
    isProgressScrubbingRef.current = false;

    const container = containerRef.current;
    if (!container) return;

    container.style.overflow = "";
    container.style.touchAction = "";
  }, []);

  const resetStoryGesture = useCallback(() => {
    storyGestureRef.current = {
      name: null,
      x: 0,
      y: 0,
      dragged: false,
      axis: "none",
      lastX: 0,
      lastT: 0,
      pointerId: -1,
    };
  }, []);

  const lockCardScroll = useCallback(() => {
    isCardDraggingRef.current = true;
    setIsScrollSettled(false);

    const container = containerRef.current;
    if (!container) return;

    container.style.overflow = "hidden";
    container.style.touchAction = "none";
  }, []);

  const unlockCardScroll = useCallback(() => {
    isCardDraggingRef.current = false;

    const container = containerRef.current;
    if (!container || isProgressScrubbingRef.current) return;

    container.style.overflow = "";
    container.style.touchAction = "";
  }, []);

  const finishCardDragAnimation = useCallback(() => {
    unlockCardScroll();
    resetStoryGesture();
  }, [unlockCardScroll, resetStoryGesture]);

  const handleStoryPointerDown = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      const now = performance.now();
      storyGestureRef.current = {
        name,
        x: event.clientX,
        y: event.clientY,
        dragged: false,
        axis: "none",
        lastX: event.clientX,
        lastT: now,
        pointerId: event.pointerId,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handleStoryPointerMove = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      const gesture = storyGestureRef.current;
      if (gesture.name !== name) return;

      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const distance = Math.hypot(dx, dy);

      if (distance > SWIPE_THRESHOLD_PX) {
        gesture.dragged = true;
        if (gesture.axis === "none") {
          gesture.axis =
            Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        }
      }

      if (gesture.axis === "horizontal") {
        if (!isCardDraggingRef.current) {
          lockCardScroll();
        }
        setCardDrag({ name, x: dx, y: dy * 0.15, animating: false });
        gesture.lastX = event.clientX;
        gesture.lastT = performance.now();
        event.stopPropagation();
      }
    },
    [lockCardScroll],
  );

  const handleStoryPointerUp = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      const gesture = storyGestureRef.current;
      if (gesture.name !== name) return;

      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const now = performance.now();
      const dt = Math.max(now - gesture.lastT, 1);
      const vx = (event.clientX - gesture.lastX) / dt;

      if (gesture.pointerId === event.pointerId) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (gesture.axis === "horizontal" && gesture.dragged) {
        const isThrow =
          Math.abs(dx) >= THROW_DISTANCE_PX ||
          Math.abs(vx) >= THROW_VELOCITY_PX_MS;

        if (isThrow) {
          const direction =
            Math.abs(dx) >= THROW_DISTANCE_PX ? Math.sign(dx) : Math.sign(vx);
          addDecision(name, direction > 0 ? "accepted" : "declined");
          setCardDrag({
            name,
            x: direction * 600,
            y: dy * 0.15,
            animating: true,
          });
        } else {
          setCardDrag({ name, x: 0, y: 0, animating: true });
        }

        storyGestureRef.current = { ...gesture, name: null };
        event.stopPropagation();
        return;
      }

      const shouldToggle = !gesture.dragged;
      resetStoryGesture();
      unlockCardScroll();

      if (!shouldToggle) return;

      event.stopPropagation();
      toggleShort(name);
    },
    [addDecision, toggleShort, resetStoryGesture, unlockCardScroll],
  );

  const handleStoryPointerCancel = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      const gesture = storyGestureRef.current;
      if (gesture.name !== name) return;

      if (gesture.pointerId === event.pointerId) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (gesture.axis === "horizontal" && gesture.dragged) {
        setCardDrag({ name, x: 0, y: 0, animating: true });
        storyGestureRef.current = { ...gesture, name: null };
        return;
      }

      resetStoryGesture();
      unlockCardScroll();
    },
    [resetStoryGesture, unlockCardScroll],
  );

  const handleCardTransitionEnd = useCallback(
    (name: string, event: React.TransitionEvent<HTMLElement>) => {
      if (event.propertyName !== "transform") return;

      setCardDrag((current) => {
        if (current?.name === name && current.animating) {
          finishCardDragAnimation();
          return null;
        }
        return current;
      });
    },
    [finishCardDragAnimation],
  );

  const handleShortPointerDown = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      shortGestureRef.current = {
        name,
        x: event.clientX,
        y: event.clientY,
        dragged: false,
        axis: "none",
      };
    },
    [],
  );

  const handleShortPointerMove = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      const gesture = shortGestureRef.current;
      if (gesture.name !== name) return;

      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const distance = Math.hypot(dx, dy);

      if (distance > SWIPE_THRESHOLD_PX) {
        gesture.dragged = true;
        if (gesture.axis === "none") {
          gesture.axis =
            Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        }
      }
    },
    [],
  );

  const handleShortPointerUp = useCallback(
    (name: string, event: React.PointerEvent<HTMLElement>) => {
      const gesture = shortGestureRef.current;
      if (gesture.name !== name) return;

      const shouldToggle = !gesture.dragged;
      resetShortGesture();

      if (!shouldToggle) return;

      event.stopPropagation();
      toggleShort(name);
    },
    [toggleShort, resetShortGesture],
  );

  useEffect(() => {
    if (window.YT?.Player) {
      setYoutubeApiReady(true);
      return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      setYoutubeApiReady(true);
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, []);

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

  const visiblePanelKey = visiblePanels.map((panel) => panel.name).join(",");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !panelHeight || visibleCount === 0) return;

    const clamped = Math.min(activeIndexRef.current, visibleCount - 1);
    if (clamped !== activeIndexRef.current) {
      setActiveIndex(clamped);
      activeIndexRef.current = clamped;
    }

    container.scrollTo({
      top: (clamped + 1) * panelHeight,
      behavior: "instant",
    });
  }, [visiblePanelKey, panelHeight, visibleCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateScrollSettled();
    container.addEventListener("scroll", updateScrollSettled, { passive: true });
    window.addEventListener("resize", updateScrollSettled);

    return () => {
      container.removeEventListener("scroll", updateScrollSettled);
      window.removeEventListener("resize", updateScrollSettled);
    };
  }, [updateScrollSettled, panelHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (isProgressScrubbingRef.current || isCardDraggingRef.current) {
        return;
      }

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
      updateScrollSettled();
    };

    container.addEventListener("scrollend", syncIndex);

    return () => {
      container.removeEventListener("scrollend", syncIndex);
    };
  }, [normalizeScrollPosition, updateScrollSettled]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (
        !isDraggingRef.current ||
        isProgressScrubbingRef.current ||
        isCardDraggingRef.current
      ) {
        return;
      }

      shortGestureRef.current.dragged = true;

      const container = containerRef.current;
      if (!container) return;

      const height = container.clientHeight;
      if (!height) return;

      const deltaY = dragStartYRef.current - event.clientY;
      const count = visibleCountRef.current;
      const maxScroll = (count + 1) * height;
      container.scrollTop = Math.max(
        0,
        Math.min(maxScroll, dragStartScrollTopRef.current + deltaY),
      );
      updateScrollSettled();
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);

      const container = containerRef.current;
      if (!container) return;

      const height = container.clientHeight;
      if (!height) return;

      container.style.scrollBehavior = "";
      const scrollDelta = container.scrollTop - dragStartScrollTopRef.current;

      if (Math.abs(scrollDelta) >= SWIPE_THRESHOLD_PX) {
        if (scrollDelta > 0) {
          goToNextPanel();
        } else {
          goToPrevPanel();
        }
        return;
      }

      const physical = Math.round(container.scrollTop / height);
      snapToPhysical(physical);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [goToNextPanel, goToPrevPanel, snapToPhysical, updateScrollSettled]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      !isFinePointerRef.current ||
      isAnimatingRef.current ||
      isProgressScrubbingRef.current ||
      isCardDraggingRef.current
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    event.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsScrollSettled(false);
    dragStartYRef.current = event.clientY;
    dragStartScrollTopRef.current = container.scrollTop;
    container.style.scrollBehavior = "auto";
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (
      isFinePointerRef.current ||
      isProgressScrubbingRef.current ||
      isCardDraggingRef.current
    ) {
      return;
    }

    touchStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (
      isFinePointerRef.current ||
      isProgressScrubbingRef.current ||
      isCardDraggingRef.current
    ) {
      return;
    }

    const deltaY = touchStartYRef.current - event.changedTouches[0].clientY;
    if (Math.abs(deltaY) >= SWIPE_THRESHOLD_PX) {
      shortGestureRef.current.dragged = true;
    }

    if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;

    if (deltaY > 0) {
      goToNextPanel();
    } else {
      goToPrevPanel();
    }
  };

  const [name, setName] = useState<string>("");
  const [story, setStory] = useState<string>("");
  const [shortUrl, setShortUrl] = useState<string>("");
  const [planResponse, setPlanResponse] = useState<{
    story: string;
    loanProduct: string;
    money: string;
    interest: string;
  } | null>(null);
  const [planError, setPlanError] = useState("");

  async function generateLoanPlan() {
    setPlanError("");

    if (!name.trim() || !story.trim() || !shortUrl.trim()) {
      setPlanError("Please enter your name, story, and YouTube Short URL.");
      return;
    }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, story, youtubeUrl: shortUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPlanError(data.error ?? "Failed to generate loan plan.");
        return;
      }

      setPlanResponse(data.plan);
    } catch {
      setPlanError("Something went wrong. Please try again.");
    }
  }

  function submitLoanPlan() {
    if (!planResponse) return;

    const trimmedShort = shortUrl.trim();
    const newPanel: Panel = {
      score: 50,
      name: name.trim(),
      story: planResponse.story,
      loan_product: planResponse.loanProduct,
      return: "",
      money: parseAmount(String(planResponse.money)),
      interest: parseAmount(String(planResponse.interest)),
      short: trimmedShort,
      status: "pending",
    };

    const saved = loadSubmittedReels();
    if (!saved.some((reel) => reel.short === trimmedShort)) {
      saveSubmittedReels([
        ...saved,
        {
          name: newPanel.name,
          story: newPanel.story,
          loan_product: newPanel.loan_product,
          return: newPanel.return,
          money: newPanel.money,
          interest: newPanel.interest,
          short: trimmedShort,
          submittedAt: formatGmt8(new Date()),
        },
      ]);
    }
    setSubmittedShortUrls((prev) => new Set(prev).add(trimmedShort));

    setPanels((prev) => [...prev, newPanel]);
    setPanelStatuses((prev) => ({ ...prev, [newPanel.name]: "pending" }));
    setPlanResponse(null);
    setPlanError("");
    setMode("lender");
  }

  const activePanel = visiblePanels[activeIndex];
  const activeScore = activePanel?.score ?? 0;
  const scoreHeightPercent = (activeScore / MAX_SCORE) * 100;

  return (

    <div className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(82,39,255,0.12),_transparent_34%),linear-gradient(135deg,_#ffffff_0%,_#faf7ff_100%)]">
      <div className="absolute -left-10 top-24 h-48 w-48 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-fuchsia-100/60 blur-3xl" />
      <hr className="absolute border-gray-200 w-full top-[10vmin] left-0 -translate-y-1/2" />


      <div className="absolute top-0 left-[10vmin] right-[10vmin] h-[10vmin] flex items-center justify-between px-4 sm:px-5">
        <div className="flex items-center">
          <img src="/loanly-logo.svg" alt="Loanly logo" className="h-10 w-auto [filter:brightness(0)_saturate(100%)]" />
        </div>
        <p className="hidden text-xs font-semibold text-zinc-600 lg:block">Feeling Loanly? Find your next opportunity.</p>

      </div>

      <hr className="absolute border-gray-200 w-full bottom-[10vmin] left-0 translate-y-1/2" />

      <div className={`fixed inset-0 z-[60] ${showLogs ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${showLogs ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute inset-0 flex items-center justify-center p-4 transition ${showLogs ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="w-full max-w-2xl rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-zinc-900">Audit Logs</p>
                <p className="mt-1 text-sm text-zinc-500">Blockchain prototype of loan decisions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100"
                aria-label="Close logs"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
              {logBlocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                  No decisions recorded yet.
                </div>
              ) : (
                [...logBlocks].reverse().map((block, i) => (
                  <div key={i} className="rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-sm text-white shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">{block.timestamp}</p>
                    <p className="mt-3 break-all text-[11px] text-zinc-300">Hash: {block.hash}</p>
                    <p className="mt-2 break-all text-[11px] text-zinc-300">Encrypted JSON: {block.encryptedJson}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showNotification && (
        <div className="fixed bottom-10 right-10 z-[50] bg-white rounded-md shadow-sm p-5 w-[35em]">
          <div className="flex items-center justify-between">
            <p>Notification</p>
            <img src="/close.svg" className="w-3 h-3 cursor-pointer" onClick={() => setShowNotification(false)} alt="" />
          </div>
          <p className="text-xs text-zinc-600">A sugar mommy just noticed your profile!</p>
        </div>
      )}

      <div className={`absolute inset-[10vmin] overflow-y-auto px-10 ${mode === "borrower" ? "" : "hidden"}`}> 

        <div className="min-h-full flex flex-col justify-center py-10 mx-auto w-full max-w-[30em]">


          <div className={`mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-black shadow-sm ${planResponse ? "" : "hidden"}`}>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-600">Loan Plan</p>

            <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-900">
              <p className="lg:w-[30em]">Story: {planResponse?.story}</p> 
              <p>Loan Product: {planResponse?.loanProduct}</p>
              <p>Money: ${planResponse?.money}</p>
              <p>Interest: {planResponse?.interest}%</p>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <p onClick={submitLoanPlan} className="w-full cursor-pointer rounded-xl border border-white/20 bg-white px-3 py-2 text-center text-sm font-medium text-black shadow-sm transition duration-200 hover:bg-black hover:text-white hover:-translate-y-0.5">Submit</p>
              <p onClick={generateLoanPlan} className="w-full cursor-pointer rounded-xl border border-white/20 bg-zinc-800 px-3 py-2 text-center text-sm font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5">Re-generate</p>
            </div>
          </div>

          <div className="mb-6">
            <TextPressure
              text="WELCOME TO LOANLY"
              flex
              alpha={false}
              stroke={false}
              width
              weight
              italic
              textColor="black"
              strokeColor="#5227FF"
              minFontSize={28}
            />
          </div>


          <p className="text-sm text-zinc-700">G'day <input value={name} onChange={(e) => setName(e.target.value)} className="border-b border-zinc-300 bg-transparent px-1 pb-1 outline-none transition focus:border-black" placeholder="Enter your name here"></input>, what do you need money for?</p>
          <textarea value={story} onChange={(e) => setStory(e.target.value)} className="mt-5 h-32 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none shadow-sm transition focus:border-zinc-400 focus:bg-white" placeholder="Tell us your story..."></textarea>
          <input value={shortUrl} onChange={(e) => setShortUrl(e.target.value)} className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none shadow-sm transition focus:border-zinc-400 focus:bg-white" placeholder="Add a YouTube video about you"></input>
          
          <p onClick={generateLoanPlan} className="mt-6 w-full cursor-pointer rounded-2xl bg-black px-4 py-3 text-center text-sm font-medium text-white shadow-lg shadow-zinc-300 transition hover:-translate-y-0.5">Generate loan plan</p>
          
          {planError ? (
            <p className="mt-4 text-center text-xs text-red-500">{planError}</p>
          ) : null}

        </div>
        
      </div>

      <div className={`absolute inset-[10vmin] overflow-hidden ${mode === "lender" ? "" : "hidden"}`}> 
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex w-auto lg:w-[calc(30em+1em)]">
          <section className="shrink-0 bg-black w-[.2em] self-stretch flex flex-col justify-end">
            <div
              className="bg-red-500 w-full transition-[height] duration-300"
              style={{ height: `${scoreHeightPercent}%` }}
            />
          </section>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`h-full w-[30em] shrink-0 overflow-y-auto bg-black touch-pan-y select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          >
            {visibleCount === 0 ? (
              <div
                className="flex h-full items-center justify-center p-10"
                style={{ height: panelHeight || "100%" }}
              >
                <p className="text-center text-sm text-white">
                  No more reels — check back later.
                </p>
              </div>
            ) : (
            extendedPanels.map((panel, index) => {
              const shortUrl = getPanelShort(panel);
              const videoId = shortUrl ? getYouTubeVideoId(shortUrl) : null;
              const showShort = Boolean(
                videoId && !hiddenShorts.has(panel.name),
              );

              const cardOffset =
                cardDrag?.name === panel.name ? cardDrag : null;

              return (
              <section
                key={index}
                data-panel-index={index}
                className={`relative isolate shrink-0 overflow-hidden ${!showShort && videoId ? "cursor-pointer" : ""}`}
                style={{ height: panelHeight || "100%" }}
              >
                <Grainient className="absolute inset-0 z-0 pointer-events-none" />
                {showShort && videoId && (
                  <ShortVideoOverlay
                    videoId={videoId}
                    apiReady={youtubeApiReady}
                    shouldPlay={isScrollSettled && index === activeIndex + 1}
                    onPointerDown={(event) =>
                      handleShortPointerDown(panel.name, event)
                    }
                    onPointerMove={(event) =>
                      handleShortPointerMove(panel.name, event)
                    }
                    onPointerUp={(event) =>
                      handleShortPointerUp(panel.name, event)
                    }
                    onPointerCancel={resetShortGesture}
                    onScrubStart={lockPanelScroll}
                    onScrubEnd={unlockPanelScroll}
                  />
                )}
                {!showShort && (
                  <div
                    className={`relative z-10 h-full p-10${cardOffset ? " touch-none" : ""}`}
                    style={{
                      transform: cardOffset
                        ? `translate(${cardOffset.x}px, ${cardOffset.y}px) rotate(${cardOffset.x * 0.04}deg)`
                        : undefined,
                      transition: cardOffset?.animating
                        ? "transform 300ms ease-out"
                        : undefined,
                    }}
                    onTransitionEnd={(event) =>
                      handleCardTransitionEnd(panel.name, event)
                    }
                    onPointerDown={(event) =>
                      handleStoryPointerDown(panel.name, event)
                    }
                    onPointerMove={(event) =>
                      handleStoryPointerMove(panel.name, event)
                    }
                    onPointerUp={(event) =>
                      handleStoryPointerUp(panel.name, event)
                    }
                    onPointerCancel={(event) =>
                      handleStoryPointerCancel(panel.name, event)
                    }
                  >
                    <p className="text-white text-2xl font-semibold">{panel.name}</p>
                    <p className="text-white text-sm mt-5">{panel.story}</p>
                    <p className="text-white text-sm mt-5">Loan Product: {panel.loan_product}</p>
                    <p className="text-white text-sm mt-5">Money: ${panel.money}</p>
                    <p className="text-white text-sm mt-5">Interest: {panel.interest}%</p>
                    <p className="text-white text-sm mt-5">Return: {panel.return}</p>
                  </div>
                )}
              </section>
              );
            })
            )}
          </div>

          <section className="shrink-0 bg-black w-[.2em] self-stretch flex flex-col justify-end">
            <div
              className="bg-green-500 w-full transition-[height] duration-300"
              style={{ height: `${scoreHeightPercent}%` }}
            />
          </section>

        </div>

        <div className="flex absolute left-1/2 top-1/2 ml-[calc(15em+1.25rem)] -translate-y-1/2 flex-col gap-4">
       <div className="flex flex-col gap-2 items-center">
        
       <img src={"/check.svg"} className="w-5 h-5"></img>
       <p className="text-xs text-zinc-600">{activeScore}</p>
       
       </div>
        </div>
      </div>

      <div className="absolute border-l border-gray-200 h-full top-0 left-[10vmin] -translate-x-1/2" />

      <div className="absolute bottom-0 left-[10vmin] right-[10vmin] z-40 flex h-[10vmin] items-center justify-between px-4 sm:px-5">
        <button
          type="button"
          onClick={() => setMode(mode === "lender" ? "borrower" : "lender")}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_50px_-30px_rgba(0,0,0,0.8)] transition duration-200 hover:bg-black hover:text-white hover:-translate-y-1 hover:scale-[1.02]"
        >
          Switch to {mode === "lender" ? "Borrower" : "Lender"} Mode
        </button>
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_50px_-30px_rgba(0,0,0,0.8)] transition duration-200 hover:bg-black hover:text-white hover:-translate-y-1 hover:scale-[1.02]"
        >
          {showLogs ? "Close Logs" : "Open Logs"}
        </button>
      </div>
      <div className="absolute border-l border-gray-200 h-full top-0 right-[10vmin] translate-x-1/2" />
    </div>
  );
}
