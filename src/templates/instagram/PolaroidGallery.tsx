// Template 4 — Polaroid Gallery (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { CREAM, StoreBadge, formatPrice } from "../shared/utils";

const POLAROID_ROTATIONS = [-6, 8, -4, 7];

const Polaroid: React.FC<{
  src: string; title: string; dropFrame: number; rotation: number;
  x: number; y: number;
}> = ({ src, title, dropFrame, rotation, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const yDrop = spring({ frame: frame - dropFrame, fps, from: -800, to: y, durationInFrames: 40, config: { damping: 10 } });
  const opacity = frame >= dropFrame ? 1 : 0;

  return (
    <div style={{
      position: "absolute", left: x, top: yDrop,
      transform: `rotate(${rotation}deg)`,
      opacity, width: 240,
      backgroundColor: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      padding: "12px 12px 50px",
      borderRadius: 4,
    }}>
      <Img src={src} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 2 }} />
      <div style={{
        marginTop: 8, fontSize: 16, color: "#333", textAlign: "center",
        fontFamily: "'Courier New', monospace", fontWeight: 600,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title.slice(0, 20)}
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
    { x: 60, y: 120 }, { x: 380, y: 80 },
    { x: 120, y: 380 }, { x: 400, y: 400 },
  ];

  const priceOpacity = frame > 330 ? 1 : 0;
  const logoOpacity = frame > 360 ? 1 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, fontFamily: "Inter, sans-serif" }}>
      {allImages.map((src, i) => (
        <Polaroid
          key={i} src={src} title={title}
          dropFrame={i * 60 + 30}
          rotation={POLAROID_ROTATIONS[i] || 0}
          x={positions[i]?.x ?? 60 + i * 200}
          y={positions[i]?.y ?? 80 + i * 120}
        />
      ))}

      {/* Price reveal */}
      <div style={{
        position: "absolute", bottom: 120, left: 0, right: 0, textAlign: "center",
        opacity: priceOpacity, transition: "opacity 0.3s",
      }}>
        <span style={{ fontSize: 64, fontWeight: 900, color: "#1a1a2e" }}>
          {formatPrice(price, currency)}
        </span>
      </div>

      {/* Logo */}
      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center",
        opacity: logoOpacity,
      }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
