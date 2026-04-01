// Template 14 — Hook Word-by-Word (TikTok 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, TikTokCaption } from "../shared/utils";

export const HookWordByWord: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD", imageUrl,
}) => {
  const frame = useCurrentFrame();

  // Price count-up 90-150
  const countedPrice = interpolate(frame, [90, 150], [0, parseFloat(price)], { extrapolateRight: "clamp" });
  const priceOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp" });

  // Image reveals at frame 90
  const imgOpacity = interpolate(frame, [85, 110], [0, 1], { extrapolateRight: "clamp" });

  // CTA at frame 360
  const ctaOpacity = interpolate(frame, [350, 380], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Product image fills frame from frame 90 */}
      <div style={{ position: "absolute", inset: 0, opacity: imgOpacity }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      </div>

      {/* Logo pinned top-left */}
      <div style={{ position: "absolute", top: 160, left: 40, opacity: 0.7 }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Hook caption word by word */}
      {frame < 90 && (
        <div style={{
          position: "absolute", top: "42%", left: 60, right: 60,
          transform: "translateY(-50%)", textAlign: "center",
        }}>
          <TikTokCaption
            text="Wait until you see the price on this"
            startFrame={0}
            framesPerWord={7}
          />
        </div>
      )}

      {/* Price count up */}
      <div style={{
        position: "absolute", top: "40%", left: 0, right: 0, textAlign: "center",
        color: "#4ade80", fontSize: 120, fontWeight: 900,
        textShadow: "0 0 40px rgba(74,222,128,0.5)",
        opacity: priceOpacity,
      }}>
        {currency === "USD" ? "$" : currency}{countedPrice.toFixed(2)}
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", bottom: 250, left: 60, right: 60, textAlign: "center",
        opacity: ctaOpacity,
      }}>
        <TikTokCaption
          text={`Find it at ${storeName} on eBay`}
          startFrame={350}
          framesPerWord={8}
        />
      </div>
    </AbsoluteFill>
  );
};
