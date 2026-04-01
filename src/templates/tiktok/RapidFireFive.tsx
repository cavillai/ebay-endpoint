// Template 20 — Rapid Fire Five (TikTok 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { PINK, StoreBadge, TikTokCaption, formatPrice, FlashOverlay } from "../shared/utils";

// This template expects products to be passed as additionalImages + titles
// We use additionalImages array as secondary product images
// and itemSpecifics for additional prices
export const RapidFireFive: React.FC<TemplateProps & {
  productImages?: string[];
  productTitles?: string[];
  productPrices?: string[];
}> = ({
  storeName, storeLogo,
  title, price, currency = "USD", imageUrl,
  additionalImages = [],
  productTitles = [],
  productPrices = [],
}) => {
  const frame = useCurrentFrame();
  const FRAMES_PER_ITEM = 75; // 2.5s per listing

  const allImages = [imageUrl, ...additionalImages].slice(0, 5);
  const allTitles = [title, ...productTitles].slice(0, 5);
  const allPrices = [price, ...productPrices].slice(0, 5);

  const currentIdx = Math.min(Math.floor(frame / FRAMES_PER_ITEM), allImages.length - 1);
  const isEndCard = frame >= allImages.length * FRAMES_PER_ITEM;

  const fromLeft = currentIdx % 2 === 0;
  const localFrame = frame % FRAMES_PER_ITEM;
  const imgX = interpolate(localFrame, [0, 20], [fromLeft ? -200 : 200, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {!isEndCard && (
        <>
          {/* Product image */}
          <div style={{
            position: "absolute", inset: 0,
            transform: `translateX(${imgX}px)`,
          }}>
            <Img src={allImages[currentIdx]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          </div>

          {/* Title at top */}
          <div style={{ position: "absolute", top: 160, left: 50, right: 50 }}>
            <TikTokCaption
              text={allTitles[currentIdx].slice(0, 40)}
              startFrame={currentIdx * FRAMES_PER_ITEM}
              framesPerWord={6}
            />
          </div>

          {/* Price at bottom */}
          <div style={{
            position: "absolute", bottom: 220, left: 0, right: 0, textAlign: "center",
            color: PINK, fontSize: 100, fontWeight: 900,
            textShadow: `0 0 30px ${PINK}60`,
          }}>
            {formatPrice(allPrices[currentIdx], currency)}
          </div>

          {/* Flash on cut */}
          {allImages.map((_, i) => (
            <FlashOverlay key={i} frame={frame} flashFrame={(i + 1) * FRAMES_PER_ITEM} durationFrames={4} />
          ))}
        </>
      )}

      {/* End card — grid of thumbnails */}
      {isEndCard && (
        <AbsoluteFill style={{ backgroundColor: "#111", justifyContent: "center", alignItems: "center" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 8, padding: 40, width: "100%",
            opacity: interpolate(frame, [allImages.length * FRAMES_PER_ITEM, allImages.length * FRAMES_PER_ITEM + 20], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            {allImages.slice(0, 4).map((src, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: "hidden", height: 340 }}>
                <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
          <div style={{
            position: "absolute", bottom: 280, left: 0, right: 0, textAlign: "center",
            color: "#fff", fontSize: 48, fontWeight: 900,
          }}>
            All live now
          </div>
          <div style={{ position: "absolute", bottom: 200, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <StoreBadge storeName={storeName} storeLogo={storeLogo} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
