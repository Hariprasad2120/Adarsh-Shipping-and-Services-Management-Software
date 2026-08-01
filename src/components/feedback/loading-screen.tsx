"use client";

import { useEffect, useRef, useState } from "react";

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

  return (
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

      <div style={contentWrapperStyle}>
        <div style={glowEffectStyle(accentColor)} />
        <div style={videoContainerStyle}>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={() => {
              setVideoLoaded(true);
              if (videoRef.current) {
                videoRef.current.playbackRate = 1;
              }
            }}
            style={{
              ...videoStyle,
              opacity: videoLoaded ? 1 : 0.4,
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
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.45; }
          50% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.8; }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const containerStyle = (
  fullScreen: boolean,
  bgOpacity: number,
): React.CSSProperties => ({
  position: fullScreen ? "fixed" : "relative",
  inset: 0,
  width: "100%",
  height: fullScreen ? "100vh" : "100%",
  minHeight: fullScreen ? "100vh" : "350px",
  backgroundColor: `rgba(10, 12, 18, ${bgOpacity})`,
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
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

const glowEffectStyle = (accent: string): React.CSSProperties => ({
  position: "absolute",
  top: "136px",
  left: "50%",
  width: "520px",
  height: "520px",
  borderRadius: "50%",
  background: `radial-gradient(circle, ${accent}55 0%, ${accent}20 45%, rgba(0,0,0,0) 70%)`,
  filter: "blur(50px)",
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
  padding: "1rem",
  maxWidth: "480px",
  width: "90%",
  textAlign: "center",
};

const videoContainerStyle: React.CSSProperties = {
  position: "relative",
  width: "240px",
  height: "240px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  boxShadow: "none",
  marginBottom: "2rem",
  overflow: "hidden",
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "opacity 0.5s ease",
  mixBlendMode: "screen",
  filter: "url(#plane-color-filter) brightness(2.2) contrast(1.1)",
};

const textContainerStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 0.5rem 0",
  fontSize: "1.35rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "#F8FAFC",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.4)",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  fontWeight: 400,
  color: "#94A3B8",
  lineHeight: 1.5,
};

const dotsContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  marginTop: "0.5rem",
};

const dotStyle = (accent: string): React.CSSProperties => ({
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  backgroundColor: accent,
  boxShadow: `0 0 10px ${accent}B0`,
  display: "inline-block",
  animation: "bounceDot 1.4s infinite ease-in-out both",
});

export default LoadingScreen;
