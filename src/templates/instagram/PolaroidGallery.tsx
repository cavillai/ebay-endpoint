// Template 4 — Polaroid Gallery (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { CREAM, StoreBadge, formatPrice } from "../shared/utils";

const POLAROID_ROTATIONS = [-6, 8, -4, 7];

const Polaroid: React.FC<{
  src: string; title: string; dropFrame: number; rotation: number;
  x: number; targetY: number;
}> = ({ src, title, dropFrame, rotation, x, targetY }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const y = spring({ frame: frame - dropFrame, fps, from: -900, to: targetY, durationInFrames: 45, config: { damping: 10 } });
  const opacity = frame >= dropFrame ? 1 : 0;

  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `rotate(${rotation}deg)`,
      opacity, width: 420,
      backgroundColor: "#fff",
      boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      padding: "16px 16px 70px",
      borderRadius: 4,
    }}>
      <Img src={src} style={{ width: "100%", height: 360, objectFit: "cover", borderRadius: 2 }} />
      <div style={{
        marginTop: 12, fontSize: 22, color: "#333", textAlign: "center",
        fontFamily: "'Courier New', monospace", fontWeight: 600,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title.slice(0, 24)}
      </div>
    </div>
  );
};

export const PolaroidGallery: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, additionalImages = [],
}) => {
  const frame = useCurrentFrame();
  const allImages = [imageUrl, ...additionalImages].slice(0, 4);
  const positions = [
    { x: 40, y: 180 }, { x: 560, y: 140 },
    { x: 80, y: 680 }, { x: 580, y: 720 },
  ];

  const priceOpacity = frame > 330 ? 1 : 0;
  const logoOpacity = frame > 360 ? 1 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, fontFamily: "Inter, sans-serif" }}>
      {allImages.map((src, i) => (
        <Polaroid
          key={i} src={src} title={title}
          dropFrame={i * 70 + 20}
          rotation={POLAROID_ROTATIONS[i] || 0}
          x={positions[i]?.x ?? 60}
          targetY={positions[i]?.y ?? 200 + i * 400}
        />
      ))}

      {/* Price */}
      <div style={{
        position: "absolute", bottom: 260, left: 0, right: 0, textAlign: "center",
        opacity: priceOpacity,
      }}>
        <span style={{ fontSize: 80, fontWeight: 900, color: "#1a1a2e", fontFamily: "'Courier New', monospace" }}>
          {formatPrice(price, currency)}
        </span>
      </div>

      {/* Logo */}
      <div style={{
        position: "absolute", bottom: 180, left: 0, right: 0, display: "flex", justifyContent: "center",
        opacity: logoOpacity,
      }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
