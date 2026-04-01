// Template 5 — Minimal Luxury (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, formatPrice } from "../shared/utils";

export const MinimalLuxury: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, brand,
}) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame * 0.04) * 10;
  const fade = (start: number) => interpolate(frame, [start, start + 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Brand — safe zone top */}
      {brand && (
        <div style={{
          position: "absolute", top: 160, left: 0, right: 0, textAlign: "center",
          color: "#9ca3af", fontSize: 28, fontWeight: 400, letterSpacing: 8,
          textTransform: "uppercase", opacity: fade(20),
        }}>
          {brand}
        </div>
      )}

      {/* Product image — large center, floating */}
      <div style={{
        position: "absolute", top: 250, left: 80, right: 80, height: 900,
        transform: `translateY(${bob}px)`,
        opacity: fade(0),
        boxShadow: `0 ${32 + bob}px 80px rgba(0,0,0,0.15)`,
        borderRadius: 20, overflow: "hidden",
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#f9fafb" }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 1210, left: 60, right: 60, textAlign: "center",
        color: "#111", fontSize: 44, fontWeight: 800, lineHeight: 1.2,
        opacity: fade(40),
      }}>
        {title.length > 65 ? title.slice(0, 62) + "..." : title}
      </div>

      {/* Price pill */}
      <div style={{
        position: "absolute", top: 1430, left: 0, right: 0, display: "flex", justifyContent: "center",
        opacity: fade(60),
      }}>
        <div style={{
          backgroundColor: "#111", borderRadius: 50, padding: "14px 48px",
          color: "#fff", fontSize: 48, fontWeight: 900,
        }}>
          {formatPrice(price, currency)}
        </div>
      </div>

      {/* Logo — safe zone bottom */}
      <div style={{
        position: "absolute", bottom: 200, left: 0, right: 0, display: "flex", justifyContent: "center",
        opacity: fade(80),
      }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} style={{ filter: "invert(1)" }} />
      </div>
    </AbsoluteFill>
  );
};
