"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TextPressureProps = {
  text: string;
  flex?: boolean;
  alpha?: boolean;
  stroke?: boolean;
  width?: boolean;
  weight?: boolean;
  italic?: boolean;
  textColor?: string;
  strokeColor?: string;
  minFontSize?: number;
  centered?: boolean;
};

export default function TextPressure({
  text,
  flex = false,
  alpha = false,
  stroke = false,
  width = false,
  weight = false,
  italic = false,
  textColor = "#111111",
  strokeColor = "#5227FF",
  minFontSize = 36,
  centered = true,
}: TextPressureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const letters = useMemo(() => text.split(""), [text]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const reset = () => {
      setPointer({ x: 0, y: 0 });
      setActiveIndex(null);
    };

    node.addEventListener("pointerleave", reset);
    return () => node.removeEventListener("pointerleave", reset);
  }, []);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ratioX = rect.width === 0 ? 0 : x / rect.width;

    setPointer({ x, y });
    setActiveIndex(Math.min(letters.length - 1, Math.max(0, Math.floor(ratioX * letters.length))));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      className="w-full select-none"
      style={{ fontFamily: "Montserrat, Arial, sans-serif" }}
    >
      <div className={`flex ${flex ? "flex-wrap" : "flex-wrap"} items-center ${centered ? "justify-center" : "justify-start"} gap-x-1 md:gap-x-2`}>
        {letters.map((letter, index) => {
          const isSpace = letter === " ";
          const isActive = activeIndex === index;

          const offsetX = isActive ? ((pointer.x / (containerRef.current?.clientWidth || 1)) - 0.5) * 12 : 0;
          const offsetY = isActive ? ((pointer.y / (containerRef.current?.clientHeight || 1)) - 0.5) * 8 : 0;
          const scale = isActive ? 1.08 : 1;
          const opacity = alpha ? (isActive ? 1 : 0.7) : 1;

          return (
            <span
              key={`${letter}-${index}`}
              className={isSpace ? "w-2 md:w-4" : "inline-block"}
              style={{
                display: "inline-block",
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                transition: "transform 180ms ease, opacity 180ms ease",
                fontSize: `clamp(${minFontSize}px, 3.8vw, 2.5rem)`,
                fontWeight: weight ? 800 : 600,
                fontStyle: italic ? "italic" : "normal",
                color: textColor,
                opacity,
                letterSpacing: width ? "0.06em" : "normal",
                WebkitTextStroke: stroke ? `2px ${strokeColor}` : undefined,
              }}
            >
              {isSpace ? "\u00A0" : letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}
