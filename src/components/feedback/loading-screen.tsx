"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  videoSrc?: string;
  fullScreen?: boolean;
  bgOpacity?: number;
  accentColor?: string;
}

function hexToRgb(hex: string) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

export function LoadingScreen({
  message = "Preparing your journey...",
  subtitle = "Please wait while we set up your experience",
  videoSrc = "/airplane-preloader.webm",
  fullScreen = true,
  bgOpacity = 0.85,
  accentColor = "#F9D972",
}: LoadingScreenProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 150, height: 150 });
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const rgb = hexToRgb(accentColor);
  const rWeight = 0.2126;
  const gWeight = 0.7152;
  const bWeight = 0.0722;

  const matrixValues = [
    rWeight * rgb.r,
    gWeight * rgb.r,
    bWeight * rgb.r,
    0,
    0,
    rWeight * rgb.g,
    gWeight * rgb.g,
    bWeight * rgb.g,
    0,
    0,
    rWeight * rgb.b,
    gWeight * rgb.b,
    bWeight * rgb.b,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ].join(" ");

  const videoFrameStyle = useMemo(() => {
    const safeWidth = Math.max(videoSize.width, 1);
    const safeHeight = Math.max(videoSize.height, 1);
    const width = Math.min(safeWidth, 180);

    return {
      width: `min(${width}px, 42vw)`,
      aspectRatio: `${safeWidth} / ${safeHeight}`,
      minWidth: "120px",
      maxWidth: "180px",
      maxHeight: "180px",
      minHeight: "120px",
      height: "auto",
    } satisfies React.CSSProperties;
  }, [videoSize.height, videoSize.width]);

  const content = (
    <div style={containerStyle(fullScreen, bgOpacity)}>
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <filter id="plane-color-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrixValues} />
        </filter>
      </svg>

      <div style={backgroundMeshStyle}>
        <div style={backgroundGlowStyle(accentColor, 18, 22, 32)} />
        <div style={backgroundGlowStyle(accentColor, 82, 28, 22)} />
        <div style={backgroundGlowStyle(accentColor, 50, 84, 18)} />
      </div>

      <div style={contentWrapperStyle}>
        <div style={glowEffectStyle(accentColor)} />
        <div style={{ ...videoContainerStyle, ...videoFrameStyle }}>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={() => {
              if (!videoRef.current) return;
              setVideoSize({
                width: videoRef.current.videoWidth || 150,
                height: videoRef.current.videoHeight || 150,
              });
            }}
            onCanPlay={() => {
              setVideoLoaded(true);
              if (videoRef.current) {
                videoRef.current.playbackRate = 1;
              }
            }}
            style={{
              ...videoStyle,
              opacity: videoLoaded ? 1 : 0.5,
            }}
          />
        </div>

        <div style={textContainerStyle}>
          <h3 style={titleStyle}>{message}</h3>
          {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
        </div>

        <div style={dotsContainerStyle}>
          <span style={{ ...dotStyle(accentColor), animationDelay: "0s" }} />
          <span style={{ ...dotStyle(accentColor), animationDelay: "0.2s" }} />
          <span style={{ ...dotStyle(accentColor), animationDelay: "0.4s" }} />
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.28; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.52; }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate3d(0, -18px, 0) scale(1.06); opacity: 0.34; }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );

  if (fullScreen && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

const containerStyle = (
  fullScreen: boolean,
  bgOpacity: number,
): React.CSSProperties => ({
  position: fullScreen ? "fixed" : "relative",
  inset: 0,
  width: fullScreen ? "100vw" : "100%",
  height: fullScreen ? "100dvh" : "100%",
  minHeight: fullScreen ? "100dvh" : "350px",
  background:
    `linear-gradient(180deg, rgba(7, 10, 17, ${bgOpacity}) 0%, rgba(11, 16, 28, ${Math.min(bgOpacity + 0.08, 0.96)}) 100%)`,
  backdropFilter: "blur(22px) saturate(165%)",
  WebkitBackdropFilter: "blur(22px) saturate(165%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: "#FFFFFF",
  overflow: "hidden",
  boxSizing: "border-box",
});

const backgroundMeshStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

const backgroundGlowStyle = (
  accent: string,
  left: number,
  top: number,
  size: number,
): React.CSSProperties => ({
  position: "absolute",
  left: `${left}%`,
  top: `${top}%`,
  width: `min(${size}rem, 44vw)`,
  aspectRatio: "1 / 1",
  transform: "translate(-50%, -50%)",
  borderRadius: "999px",
  background: `radial-gradient(circle, ${accent}26 0%, ${accent}14 34%, rgba(0,0,0,0) 72%)`,
  filter: "blur(42px)",
  animation: "floatGlow 6s ease-in-out infinite",
});

const glowEffectStyle = (accent: string): React.CSSProperties => ({
  position: "absolute",
  top: "15%",
  left: "50%",
  width: "min(30rem, 64vw)",
  aspectRatio: "1 / 1",
  borderRadius: "50%",
  background: `radial-gradient(circle, ${accent}36 0%, ${accent}16 42%, rgba(0,0,0,0) 72%)`,
  filter: "blur(36px)",
  pointerEvents: "none",
  animation: "pulseGlow 4s ease-in-out infinite",
  zIndex: -1,
});

const contentWrapperStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(1.5rem, 4vw, 2.75rem)",
  maxWidth: "32rem",
  width: "min(92vw, 32rem)",
  textAlign: "center",
};

const videoContainerStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  boxShadow: "none",
  marginBottom: "clamp(1.25rem, 3vw, 2rem)",
  overflow: "visible",
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  transition: "opacity 0.45s ease",
  mixBlendMode: "screen",
  filter: "url(#plane-color-filter) brightness(1.55) contrast(1.08)",
  transform: "translateZ(0)",
};

const textContainerStyle: React.CSSProperties = {
  marginBottom: "1.25rem",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 0.65rem 0",
  fontSize: "clamp(1.15rem, 1rem + 0.8vw, 1.55rem)",
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "#F8FAFC",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.28)",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(0.85rem, 0.8rem + 0.2vw, 0.95rem)",
  fontWeight: 400,
  color: "#A8B3C7",
  lineHeight: 1.55,
};

const dotsContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  marginTop: "0.35rem",
};

const dotStyle = (accent: string): React.CSSProperties => ({
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  backgroundColor: accent,
  boxShadow: `0 0 10px ${accent}99`,
  display: "inline-block",
  animation: "bounceDot 1.4s infinite ease-in-out both",
});

export default LoadingScreen;
