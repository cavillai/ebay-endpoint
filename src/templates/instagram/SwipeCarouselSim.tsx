// Template 12 — Swipe Carousel Sim (Instagram 1080x1080, 15s)
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
  const framesPerSlide = 75; // 2.5s

  const slideIndex = Math.min(Math.floor(frame / framesPerSlide), allImages.length - 1);
  const slideProgress = (frame % framesPerSlide) / framesPerSlide;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Images with parallax slide */}
      {allImages.map((src, i) => {
        const offset = (i - slideIndex) * 1080 - slideProgress * 1080;
        const bgOffset = offset * 0.8; // parallax

        return (
          <div key={i} style={{
            position: "absolute", top: 0, bottom: 0, width: 1080,
            left: offset,
            overflow: "hidden",
          }}>
            <Img src={src} style={{
              position: "absolute", top: 0, left: bgOffset - offset,
              width: "100%", height: "100%", objectFit: "cover",
            }} />
          </div>
        );
      })}

      {/* Dark overlay for text readability */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />

      {/* Title pinned top */}
      <div style={{
        position: "absolute", top: 60, left: 50, right: 50, textAlign: "center",
        color: "#fff", fontSize: 38, fontWeight: 800, lineHeight: 1.2,
        textShadow: "2px 2px 6px rgba(0,0,0,0.8)",
      }}>
        {title.length > 60 ? title.slice(0, 57) + "..." : title}
      </div>

      {/* Price pinned top right */}
      <div style={{
        position: "absolute", top: 60, right: 50,
        color: "#4ade80", fontSize: 44, fontWeight: 900,
        textShadow: "0 0 15px rgba(74,222,128,0.5)",
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Progress dots */}
      <div style={{
        position: "absolute", bottom: 100, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 10,
      }}>
        {allImages.map((_, i) => (
          <div key={i} style={{
            width: i === slideIndex ? 28 : 10, height: 10,
            borderRadius: 5, backgroundColor: i === slideIndex ? "#fff" : "rgba(255,255,255,0.4)",
          }} />
        ))}
      </div>

      {/* Logo bottom right */}
      <div style={{ position: "absolute", bottom: 40, right: 40 }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
