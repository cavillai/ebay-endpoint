import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const PURPLE = "#681FCB";
export const PINK = "#F73A8A";
export const GOLD = "#FFD700";
export const NEON_CYAN = "#00FFFF";
export const NEON_PINK = "#FF00FF";
export const NEON_GREEN = "#39FF14";
export const NEON_ORANGE = "#FF6600";
export const DARK = "#0a0a0a";
export const NAVY = "#0a0f2e";
export const CREAM = "#fdf8f0";

/** Spring-based fade-in + slide-up from Y offset */
export function useSlideUp(startFrame: number, fromY = 60, durationInFrames = 30) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const y = spring({ frame: frame - startFrame, fps, from: fromY, to: 0, durationInFrames });
  const opacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], { extrapolateRight: "clamp" });
  return { y, opacity };
}

/** Fade in only */
export function useFadeIn(startFrame: number, durationFrames = 20) {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], { extrapolateRight: "clamp" });
}

/** Scale bounce entrance (goes to 1.1x then settles) */
export function useScaleBounce(startFrame: number, durationInFrames = 25) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - startFrame, fps, from: 0, to: 1, durationInFrames, config: { overshootClamping: false } });
}

/** Pulse animation — gently oscillates scale */
export function usePulse(amplitude = 0.03, speed = 0.05) {
  const frame = useCurrentFrame();
  return 1 + Math.sin(frame * speed) * amplitude;
}

/** Condition color coding */
export function conditionColor(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes("new") || c.includes("like new")) return "#4ade80";
  if (c.includes("excellent") || c.includes("very good")) return "#60a5fa";
  if (c.includes("good")) return "#facc15";
  if (c.includes("fair") || c.includes("acceptable")) return "#fb923c";
  return "#a0aec0";
}

/** Countdown from a date string */
export function timeUntil(dateStr: string) {
  const end = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, isUrgent: h < 24 };
}

/** TikTok-style word-by-word caption component */
export const TikTokCaption: React.FC<{
  text: string;
  startFrame: number;
  framesPerWord?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, framesPerWord = 8, style = {} }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const visibleCount = Math.floor((frame - startFrame) / framesPerWord) + 1;

  return (
    <div style={{
      fontSize: 56, fontWeight: 900, color: "#fff",
      fontFamily: "Inter, sans-serif", lineHeight: 1.1,
      textAlign: "center", textShadow: "2px 2px 0px #000, -2px -2px 0px #000",
      ...style,
    }}>
      {words.map((word, i) => (
        <span key={i} style={{
          opacity: i < visibleCount ? 1 : 0,
          display: "inline-block", marginRight: "0.25em",
          transform: i === visibleCount - 1 ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.1s",
        }}>
          {word}
        </span>
      ))}
    </div>
  );
};

/** Store logo / name badge */
export const StoreBadge: React.FC<{
  storeName: string;
  storeLogo?: string;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ storeName, storeLogo, opacity = 1, style = {} }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    opacity,
    ...style,
  }}>
    {storeLogo ? (
      <img src={storeLogo} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
    ) : (
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: 18,
        fontFamily: "Inter, sans-serif",
      }}>
        {storeName.charAt(0).toUpperCase()}
      </div>
    )}
    <span style={{
      color: "#fff", fontSize: 28, fontWeight: 700,
      fontFamily: "Inter, sans-serif",
      textShadow: "1px 1px 4px rgba(0,0,0,0.7)",
    }}>
      {storeName}
    </span>
  </div>
);

/** Price formatted with currency */
export function formatPrice(price: string, currency = "USD") {
  return currency === "USD" ? `$${price}` : `${currency} ${price}`;
}

/** White flash overlay for hard cuts */
export const FlashOverlay: React.FC<{ frame: number; flashFrame: number; durationFrames?: number }> = ({
  frame, flashFrame, durationFrames = 6
}) => {
  const opacity = interpolate(
    frame, [flashFrame, flashFrame + Math.floor(durationFrames / 2), flashFrame + durationFrames],
    [0, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  return opacity > 0 ? (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#fff", opacity, pointerEvents: "none" }} />
  ) : null;
};

/** Scanline overlay for neon/retro effect */
export const ScanlineOverlay: React.FC = () => (
  <div style={{
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
    zIndex: 100,
  }} />
);

/** Condition pill badge */
export const ConditionBadge: React.FC<{ condition: string; style?: React.CSSProperties }> = ({ condition, style = {} }) => (
  <div style={{
    backgroundColor: conditionColor(condition),
    borderRadius: 100, padding: "6px 20px",
    color: "#000", fontWeight: 800, fontSize: 28,
    fontFamily: "Inter, sans-serif",
    display: "inline-block",
    ...style,
  }}>
    {condition}
  </div>
);
