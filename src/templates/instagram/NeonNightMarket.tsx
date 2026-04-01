// Template 10 — Neon Night Market (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { NEON_GREEN, NEON_ORANGE, NEON_PINK, StoreBadge, ScanlineOverlay, formatPrice } from "../shared/utils";

export const NeonNightMarket: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, brand, storeColor,
}) => {
  const frame = useCurrentFrame();
  const neonColor = storeColor || "#00FFFF";

  const chars = title.split("").slice(0, 70);
  const visibleChars = Math.floor(interpolate(frame, [40, 200], [0, chars.length], { extrapolateRight: "clamp" }));
  const flicker = frame >= 40 && frame < 75 ? Math.random() > 0.85 ? 0 : 1 : 1;

  const priceOpacity = interpolate(frame, [200, 230], [0, 1], { extrapolateRight: "clamp" });
  const brandOpacity = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [380, 420], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Product image — large, centered */}
      <div style={{
        position: "absolute", top: 220, left: 60, right: 60, height: 940,
        borderRadius: 20, overflow: "hidden",
        boxShadow: `0 0 50px ${neonColor}50, 0 0 100px ${neonColor}20`,
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Brand */}
      {brand && (
        <div style={{
          position: "absolute", top: 165, left: 0, right: 0, textAlign: "center",
          color: NEON_ORANGE, fontSize: 32, fontWeight: 700, letterSpacing: 5,
          textTransform: "uppercase", textShadow: `0 0 20px ${NEON_ORANGE}`,
          opacity: brandOpacity,
        }}>
          {brand}
        </div>
      )}

      {/* Letter-by-letter neon title */}
      <div style={{
        position: "absolute", top: 1210, left: 50, right: 50, textAlign: "center",
        color: NEON_PINK, fontSize: 42, fontWeight: 900, lineHeight: 1.3,
        textShadow: `0 0 20px ${NEON_PINK}, 0 0 40px ${NEON_PINK}60`,
        opacity: flicker,
      }}>
        {chars.slice(0, visibleChars).join("")}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", top: 1460, left: 0, right: 0, textAlign: "center",
        color: NEON_GREEN, fontSize: 80, fontWeight: 900,
        textShadow: `0 0 20px ${NEON_GREEN}, 0 0 40px ${NEON_GREEN}60`,
        opacity: priceOpacity,
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Logo */}
      <div style={{
        position: "absolute", bottom: 200, left: 0, right: 0, display: "flex", justifyContent: "center",
        filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))", opacity: logoOpacity,
      }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      <ScanlineOverlay />
    </AbsoluteFill>
  );
};
