// Template 21 — Comment Reply Bait (TikTok 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, ConditionBadge, formatPrice } from "../shared/utils";

const CommentBubble: React.FC<{
  text: string; isReply?: boolean; startFrame: number; replyColor?: string;
}> = ({ text, isReply = false, startFrame, replyColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const y = spring({ frame: frame - startFrame, fps, from: 60, to: 0, durationInFrames: 25 });
  const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      transform: `translateY(${y}px)`, opacity,
      backgroundColor: isReply ? "#1c1c1e" : "#2c2c2e",
      borderRadius: 18, padding: "16px 24px",
      maxWidth: 820,
      border: isReply ? `2px solid ${replyColor || "#4ade80"}` : "none",
    }}>
      {isReply && (
        <div style={{ color: replyColor || "#4ade80", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          replying to @shopper
        </div>
      )}
      <div style={{ color: "#fff", fontSize: 36, fontWeight: isReply ? 700 : 400, lineHeight: 1.3 }}>
        {text}
      </div>
    </div>
  );
};

export const CommentReplyBait: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, condition,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Background product image */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.45 }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      </div>

      {/* Logo TikTok handle style */}
      <div style={{ position: "absolute", top: 160, left: 40 }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Comment bubbles */}
      <div style={{
        position: "absolute", bottom: 320, left: 50, right: 50,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <CommentBubble text="How much is this?? 👀" startFrame={60} />
        <CommentBubble
          text={`Only ${formatPrice(price, currency)} — link in bio! 👇`}
          isReply startFrame={120}
          replyColor="#4ade80"
        />
      </div>

      {/* Item details below */}
      <div style={{
        position: "absolute", bottom: 160, left: 50, right: 50,
        opacity: interpolate(frame, [150, 180], [0, 1], { extrapolateRight: "clamp" }),
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 30, fontWeight: 600 }}>
          {title.length > 50 ? title.slice(0, 47) + "..." : title}
        </div>
        <ConditionBadge condition={condition} />
      </div>
    </AbsoluteFill>
  );
};
