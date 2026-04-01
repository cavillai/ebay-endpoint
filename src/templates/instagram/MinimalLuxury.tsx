// Template 5 — Minimal Luxury (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, formatPrice } from "../shared/utils";

export const MinimalLuxury: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, brand,
}) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame * 0.04) * 8;
  const fadeIn = (start: number) => interpolate(frame, [start, start + 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", fontFamily: "Inter, sans-serif" }}>

      {/* Brand */}
      {brand && (
        <div style={{
          position: "absolute", top: 100, left: 0, right: 0, textAlign: "center",
          color: "#9ca3af", fontSize: 24, fontWeight: 400, letterSpacing: 6,
          textTransform: "uppercase", opacity: fadeIn(20),
        }}>
          {brand}
        </div>
      )}

      {/* Product image — floating */}
      <div style={{
        position: "absolute", top: 160, left: 120, right: 120, height: 520,
        transform: `translateY(${bob}px)`,
        opacity: fadeIn(0),
        boxShadow: `0 ${28 + bob}px 60px rgba(0,0,0,0.18)`,
        borderRadius: 16, overflow: "hidden",
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#f9fafb" }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", bottom: 220, left: 60, right: 60, textAlign: "center",
        color: "#111", fontSize: 38, fontWeight: 800, lineHeight: 1.2,
        opacity: fadeIn(40),
      }}>
        {title.length > 55 ? title.slice(0, 52) + "..." : title}
      </div>

      {/* Price pill */}
      <div style={{
        position: "absolute", bottom: 140, left: 0, right: 0, display: "flex", justifyContent: "center",
        opacity: fadeIn(60),
      }}>
        <div style={{
          backgroundColor: "#111", borderRadius: 50, padding: "12px 36px",
          color: "#fff", fontSize: 40, fontWeight: 900,
        }}>
          {formatPrice(price, currency)}
        </div>
      </div>

      {/* Logo bottom center */}
      <div style={{
        position: "absolute", bottom: 50, left: 0, right: 0, display: "flex", justifyContent: "center",
        opacity: fadeIn(80),
      }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} style={{ filter: "invert(1)" }} />
      </div>
    </AbsoluteFill>
  );
};
