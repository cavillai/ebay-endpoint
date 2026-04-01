// Template 12 — Swipe Carousel Sim (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, formatPrice } from "../shared/utils";

export const SwipeCarouselSim: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, additionalImages = [],
}) => {
  const frame = useCurrentFrame();
  const allImages = [imageUrl, ...additionalImages].slice(0, 5);
  const framesPerSlide = 75;

  const slideIndex = Math.min(Math.floor(frame / framesPerSlide), allImages.length - 1);
  const slideProgress = (frame % framesPerSlide) / framesPerSlide;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Parallax sliding images */}
      {allImages.map((src, i) => {
        const offset = (i - slideIndex) * 1080 - slideProgress * 1080;
        const bgOffset = offset * 0.8;

        return (
          <div key={i} style={{
            position: "absolute", top: 0, bottom: 0, width: 1080, left: offset,
            overflow: "hidden",
          }}>
            <Img src={src} style={{
              position: "absolute", top: 0, left: bgOffset - offset,
              width: "100%", height: "100%", objectFit: "cover",
            }} />
          </div>
        );
      })}

      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.5) 100%)",
      }} />

      {/* Title pinned top — safe zone */}
      <div style={{
        position: "absolute", top: 160, left: 50, right: 50, textAlign: "center",
        color: "#fff", fontSize: 42, fontWeight: 800, lineHeight: 1.2,
        textShadow: "2px 2px 8px rgba(0,0,0,0.9)",
      }}>
        {title.length > 65 ? title.slice(0, 62) + "..." : title}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", top: 375, left: 0, right: 0, textAlign: "center",
        color: "#4ade80", fontSize: 56, fontWeight: 900,
        textShadow: "0 0 20px rgba(74,222,128,0.5)",
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Progress dots */}
      <div style={{
        position: "absolute", bottom: 270, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 12,
      }}>
        {allImages.map((_, i) => (
          <div key={i} style={{
            width: i === slideIndex ? 32 : 12, height: 12,
            borderRadius: 6, backgroundColor: i === slideIndex ? "#fff" : "rgba(255,255,255,0.4)",
          }} />
        ))}
      </div>

      {/* Logo — safe zone bottom */}
      <div style={{ position: "absolute", bottom: 200, right: 50 }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
