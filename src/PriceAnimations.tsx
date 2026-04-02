/**
 * Price Animation Library
 * 7 distinct animations randomly picked per video render.
 * All receive: { price, currency, accentColor, frame, fps }
 */

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: bebas } = loadBebas();
const { fontFamily: inter } = loadInter("normal", { weights: ["400","700"], subsets: ["latin"] });

export interface PriceAnimProps {
  price: number;
  currency: string;
  accentColor: string;
  renderSeed?: number;
}

const fmt = (n: number) => n.toFixed(2);
const sym = (c: string) => c === "USD" ? "$" : c;

// ── 1. COUNT UP ───────────────────────────────────────────────────────────
// Classic spring count from $0 → final price
export const PriceCountUp: React.FC<PriceAnimProps> = ({ price, currency, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 80, stiffness: 100 } });
  const display = interpolate(progress, [0, 1], [0, price]);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: inter, fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Only</div>
      <div style={{ fontFamily: bebas, fontSize: 112, color: accentColor, lineHeight: 1,
        fontVariantNumeric: "tabular-nums", textShadow: `0 0 60px ${accentColor}88` }}>
        {sym(currency)}{fmt(display)}
      </div>
    </div>
  );
};

// ── 2. DROP BOUNCE ────────────────────────────────────────────────────────
// Price drops from above and bounces to rest
export const PriceDropBounce: React.FC<PriceAnimProps> = ({ price, currency, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dropY = spring({ frame, fps, from: -400, to: 0,
    config: { damping: 10, stiffness: 160 } });
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ textAlign: "center", transform: `translateY(${dropY}px)`, opacity }}>
      <div style={{ fontFamily: inter, fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Just</div>
      <div style={{ fontFamily: bebas, fontSize: 112, color: accentColor, lineHeight: 1,
        textShadow: `0 0 60px ${accentColor}88, 0 8px 24px rgba(0,0,0,0.6)` }}>
        {sym(currency)}{fmt(price)}
      </div>
      {/* Shadow that squishes when it lands */}
      <div style={{
        width: `${interpolate(Math.abs(dropY), [0, 400], [200, 20], { extrapolateRight: "clamp" })}px`,
        height: 8, borderRadius: "50%",
        background: "rgba(0,0,0,0.4)",
        margin: "8px auto 0",
        transform: `scaleY(${interpolate(Math.abs(dropY), [0, 400], [1, 0.2], { extrapolateRight: "clamp" })})`,
      }} />
    </div>
  );
};

// ── 3. SLOT MACHINE ───────────────────────────────────────────────────────
// Digits roll independently like a slot machine
export const PriceSlotMachine: React.FC<PriceAnimProps> = ({ price, currency, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const priceStr = fmt(price);
  const CHAR_HEIGHT = 120;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: inter, fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>Only</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
        height: CHAR_HEIGHT, overflow: "hidden" }}>
        {/* Currency symbol */}
        <div style={{ fontFamily: bebas, fontSize: 96, color: accentColor,
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }) }}>
          {sym(currency)}
        </div>
        {/* Each digit rolls in with a stagger */}
        {priceStr.split("").map((char, i) => {
          const delay = i * 4;
          const spinProgress = spring({ frame: Math.max(0, frame - delay), fps,
            from: 10, to: 0, config: { damping: 20, stiffness: 200 } });
          const targetDigit = parseInt(char) || 0;
          const currentVal = char === "." ? "." :
            String(Math.round(interpolate(spinProgress, [0, 10], [targetDigit + 9, targetDigit])) % 10);
          return (
            <div key={i} style={{ fontFamily: bebas, fontSize: 112, color: accentColor, lineHeight: 1,
              width: char === "." ? 24 : 64, textAlign: "center",
              textShadow: `0 0 40px ${accentColor}88`,
              transform: `translateY(${spinProgress * 2}px)` }}>
              {currentVal}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── 4. TYPEWRITER ─────────────────────────────────────────────────────────
// Price types out character by character with cursor blink
export const PriceTypewriter: React.FC<PriceAnimProps> = ({ price, currency, accentColor }) => {
  const frame = useCurrentFrame();
  const fullText = `${sym(currency)}${fmt(price)}`;
  const FRAMES_PER_CHAR = 5;
  const charsVisible = Math.min(
    Math.floor(frame / FRAMES_PER_CHAR),
    fullText.length
  );
  const showCursor = Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: inter, fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 8,
        opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }) }}>
        Listed at
      </div>
      <div style={{ fontFamily: bebas, fontSize: 112, color: accentColor, lineHeight: 1,
        fontVariantNumeric: "tabular-nums", textShadow: `0 0 40px ${accentColor}80`,
        minHeight: 130, display: "flex", justifyContent: "center", alignItems: "center" }}>
        {fullText.slice(0, charsVisible)}
        {charsVisible < fullText.length && showCursor && (
          <span style={{ borderRight: `6px solid ${accentColor}`, marginLeft: 2, animation: "none" }}>
            &nbsp;
          </span>
        )}
      </div>
    </div>
  );
};

// ── 5. SLAM ───────────────────────────────────────────────────────────────
// Price slams in at huge scale and smashes down to final size
export const PriceSlam: React.FC<PriceAnimProps> = ({ price, currency, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, from: 5.0, to: 1.0,
    config: { damping: 8, stiffness: 300 } });
  const opacity = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  // Screen shake on landing
  const shakeX = frame <= 12 ? Math.sin(frame * 3.5) * interpolate(frame, [0, 12], [12, 0]) : 0;
  return (
    <div style={{ textAlign: "center", transform: `translateX(${shakeX}px)`, opacity }}>
      <div style={{ fontFamily: bebas, fontSize: 116, color: accentColor, lineHeight: 1,
        transform: `scale(${scale})`,
        textShadow: `0 0 80px ${accentColor}, 0 0 40px ${accentColor}88`,
        fontVariantNumeric: "tabular-nums" }}>
        {sym(currency)}{fmt(price)}
      </div>
      {/* Impact lines radiating out */}
      {scale < 1.3 && Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 360;
        const dist = interpolate(frame, [6, 20], [0, 120], { extrapolateRight: "clamp" });
        const lineOpacity = interpolate(frame, [6, 20], [1, 0], { extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            position: "absolute", left: "50%", top: "50%",
            width: 3, height: 40,
            backgroundColor: accentColor,
            opacity: lineOpacity,
            transformOrigin: "top center",
            transform: `translateX(-50%) rotate(${angle}deg) translateY(${dist}px)`,
          }} />
        );
      })}
    </div>
  );
};

// ── 6. SPLIT REVEAL ───────────────────────────────────────────────────────
// Dollar sign and price slide in from opposite sides and meet center
export const PriceSplitReveal: React.FC<PriceAnimProps> = ({ price, currency, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const symbolX = spring({ frame, fps, from: -300, to: 0, config: { damping: 14, stiffness: 180 } });
  const priceX  = spring({ frame, fps, from: 300,  to: 0, config: { damping: 14, stiffness: 180 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ textAlign: "center", opacity }}>
      <div style={{ fontFamily: inter, fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
        Yours for
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline" }}>
        <span style={{ fontFamily: bebas, fontSize: 112, color: accentColor, lineHeight: 1,
          transform: `translateX(${symbolX}px)`,
          textShadow: `0 0 50px ${accentColor}88` }}>
          {sym(currency)}
        </span>
        <span style={{ fontFamily: bebas, fontSize: 112, color: accentColor, lineHeight: 1,
          transform: `translateX(${priceX}px)`,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 50px ${accentColor}88` }}>
          {fmt(price)}
        </span>
      </div>
    </div>
  );
};

// ── 7. GLITCH REVEAL ─────────────────────────────────────────────────────
// Price flickers through random numbers before landing on the real one
export const PriceGlitchReveal: React.FC<PriceAnimProps> = ({ price, currency, accentColor, renderSeed = 0 }) => {
  const frame = useCurrentFrame();
  const GLITCH_FRAMES = 20;
  const isSettled = frame >= GLITCH_FRAMES;
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });

  // During glitch phase: show random numbers
  const glitchPrice = isSettled
    ? fmt(price)
    : fmt(Math.abs(noise2D("price", frame * 0.3, renderSeed * 0.1)) * price * 3);

  const textColor = isSettled ? accentColor : "#ff3366";
  const settle = spring({ frame: Math.max(0, frame - GLITCH_FRAMES),
    fps: 30, from: 1.15, to: 1, config: { damping: 12, stiffness: 200 } });

  return (
    <div style={{ textAlign: "center", opacity }}>
      <div style={{ fontFamily: inter, fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 8,
        opacity: isSettled ? 1 : 0.4 }}>
        {isSettled ? "Priced at" : "Calculating..."}
      </div>
      <div style={{ fontFamily: bebas, fontSize: 112, color: textColor, lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        transform: `scale(${isSettled ? settle : 1 + noise2D("shake", frame * 0.5, 0) * 0.05})`,
        textShadow: isSettled
          ? `0 0 60px ${accentColor}88`
          : `0 0 20px #ff3366, 2px 2px 0 #00ffff, -2px -2px 0 #ff3366`,
        filter: isSettled ? "none" : `hue-rotate(${frame * 18}deg)`,
      }}>
        {sym(currency)}{glitchPrice}
      </div>
    </div>
  );
};

// ── ANIMATION REGISTRY ─────────────────────────────────────────────────────
export const PRICE_ANIMATIONS = [
  { id: "count-up",     label: "Count Up",      Component: PriceCountUp },
  { id: "drop-bounce",  label: "Drop & Bounce",  Component: PriceDropBounce },
  { id: "slot-machine", label: "Slot Machine",   Component: PriceSlotMachine },
  { id: "typewriter",   label: "Typewriter",     Component: PriceTypewriter },
  { id: "slam",         label: "Price Slam",     Component: PriceSlam },
  { id: "split-reveal", label: "Split Reveal",   Component: PriceSplitReveal },
  { id: "glitch",       label: "Glitch Reveal",  Component: PriceGlitchReveal },
] as const;

export type PriceAnimationId = typeof PRICE_ANIMATIONS[number]["id"];

/** Pick a price animation deterministically from renderSeed */
export function pickPriceAnimation(renderSeed: number): PriceAnimationId {
  return PRICE_ANIMATIONS[renderSeed % PRICE_ANIMATIONS.length].id;
}
