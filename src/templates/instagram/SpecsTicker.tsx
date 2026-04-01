// Template 6 — Specs Ticker (Instagram 1080x1080, 15s)
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
  const framesPerSpec = 60;
  const tickerOffset = -(frame % (specs.length * framesPerSpec)) * (220 / framesPerSpec);

  const priceOpacity = interpolate(frame, [290, 320], [0, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [310, 340], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f0f", fontFamily: "Inter, sans-serif" }}>
      {/* Product image — top 65% */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 650, overflow: "hidden" }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, #0f0f0f 100%)" }} />
      </div>

      {/* Title above dark bar */}
      <div style={{
        position: "absolute", top: 610, left: 50, right: 50,
        color: "#fff", fontSize: 36, fontWeight: 700, lineHeight: 1.2,
      }}>
        {title.length > 55 ? title.slice(0, 52) + "..." : title}
      </div>

      {/* Dark bar with ticker */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 280,
        backgroundColor: "#1a1a2e", overflow: "hidden",
        display: "flex", alignItems: "center",
        borderTop: `2px solid ${PURPLE}`,
      }}>
        <div style={{
          display: "flex", flexDirection: "row", alignItems: "center",
          transform: `translateX(${tickerOffset}px)`,
          whiteSpace: "nowrap", paddingLeft: 40,
        }}>
          {[...specs, ...specs].map(([key, value], i) => (
            <span key={i} style={{
              color: "#fff", fontSize: 32, fontWeight: 600, marginRight: 60,
              display: "inline-flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ color: PINK, fontWeight: 400 }}>{key}:</span>
              <span>{value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", bottom: 160, right: 50,
        color: "#4ade80", fontSize: 48, fontWeight: 900,
        opacity: priceOpacity,
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Logo */}
      <div style={{ position: "absolute", bottom: 90, right: 50, opacity: logoOpacity }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
