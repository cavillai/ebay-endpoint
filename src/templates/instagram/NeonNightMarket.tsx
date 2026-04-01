// Template 10 — Neon Night Market (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { NEON_CYAN, NEON_GREEN, NEON_ORANGE, NEON_PINK, StoreBadge, ScanlineOverlay, formatPrice } from "../shared/utils";

export const NeonNightMarket: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, brand, storeColor,
}) => {
  const frame = useCurrentFrame();
  const neonColor = storeColor || NEON_CYAN;

  // Letter-by-letter title reveal starting frame 30
  const chars = title.split("");
  const visibleChars = Math.floor(interpolate(frame, [30, 180], [0, chars.length], { extrapolateRight: "clamp" }));

  // Flicker on first appearance (frames 30-60)
  const flicker = frame >= 30 && frame < 60
    ? Math.random() > 0.85 ? 0 : 1
    : 1;

  const priceOpacity = interpolate(frame, [180, 210], [0, 1], { extrapolateRight: "clamp" });
  const brandOpacity = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [360, 400], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Product image with neon glow */}
      <div style={{
        position: "absolute", top: 150, left: 100, right: 100, height: 500,
        borderRadius: 16, overflow: "hidden",
        boxShadow: `0 0 40px ${neonColor}60, 0 0 80px ${neonColor}30`,
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Brand */}
      {brand && (
        <div style={{
          position: "absolute", top: 80, left: 0, right: 0, textAlign: "center",
          color: NEON_ORANGE, fontSize: 32, fontWeight: 700, letterSpacing: 4,
          textTransform: "uppercase", textShadow: `0 0 20px ${NEON_ORANGE}`,
          opacity: brandOpacity,
        }}>
          {brand}
        </div>
      )}

      {/* Neon title letter-by-letter */}
      <div style={{
        position: "absolute", bottom: 200, left: 50, right: 50, textAlign: "center",
        color: NEON_PINK, fontSize: 36, fontWeight: 900, lineHeight: 1.2,
        textShadow: `0 0 20px ${NEON_PINK}, 0 0 40px ${NEON_PINK}60`,
        opacity: flicker,
      }}>
        {chars.slice(0, visibleChars).join("").length > 55
          ? chars.slice(0, Math.min(visibleChars, 55)).join("") + "..."
          : chars.slice(0, visibleChars).join("")}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", bottom: 120, left: 0, right: 0, textAlign: "center",
        color: NEON_GREEN, fontSize: 64, fontWeight: 900,
        textShadow: `0 0 20px ${NEON_GREEN}, 0 0 40px ${NEON_GREEN}60`,
        opacity: priceOpacity,
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Logo with glow */}
      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))",
        opacity: logoOpacity,
      }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      <ScanlineOverlay />
    </AbsoluteFill>
  );
};
