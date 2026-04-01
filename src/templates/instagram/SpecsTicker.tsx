// Template 6 — Specs Ticker (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { PURPLE, PINK, StoreBadge, formatPrice } from "../shared/utils";

export const SpecsTicker: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, itemSpecifics = {}, condition,
}) => {
  const frame = useCurrentFrame();
  const specs = Object.entries({ condition, ...itemSpecifics }).filter(([, v]) => v);
  const tickerOffset = -(frame * 2.5) % (specs.length * 260 || 1);

  const priceOpacity = interpolate(frame, [290, 320], [0, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [310, 340], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f0f", fontFamily: "Inter, sans-serif" }}>
      {/* Product image — top 65% */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1200, overflow: "hidden" }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, #0f0f0f 100%)" }} />
      </div>

      {/* Title above dark bar */}
      <div style={{
        position: "absolute", top: 1120, left: 50, right: 50,
        color: "#fff", fontSize: 40, fontWeight: 700, lineHeight: 1.2,
      }}>
        {title.length > 60 ? title.slice(0, 57) + "..." : title}
      </div>

      {/* Dark bar with ticker */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 500,
        backgroundColor: "#1a1a2e", overflow: "hidden",
        borderTop: `2px solid ${PURPLE}`,
      }}>
        {specs.length > 0 && (
          <div style={{
            display: "flex", flexDirection: "row", alignItems: "center",
            transform: `translateX(${tickerOffset}px)`,
            whiteSpace: "nowrap", paddingLeft: 40,
            position: "absolute", top: 40,
          }}>
            {[...specs, ...specs, ...specs].map(([key, value], i) => (
              <span key={i} style={{
                color: "#fff", fontSize: 36, fontWeight: 600, marginRight: 80,
                display: "inline-flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ color: PINK, fontWeight: 400 }}>{key}:</span>
                <span>{value}</span>
              </span>
            ))}
          </div>
        )}

        {/* Price and logo */}
        <div style={{ position: "absolute", bottom: 220, left: 60, right: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#4ade80", fontSize: 64, fontWeight: 900, opacity: priceOpacity }}>
            {formatPrice(price, currency)}
          </div>
          <div style={{ opacity: logoOpacity }}>
            <StoreBadge storeName={storeName} storeLogo={storeLogo} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
