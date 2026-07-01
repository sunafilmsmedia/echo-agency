import { useState } from "react";

type EchoPose = "default" | "waving" | "jumping" | "sitting" | "thinking";

const POSE_FILES: Record<EchoPose, string> = {
  default:  "/echo-avatar.png",
  waving:   "/echo-waving.png",
  jumping:  "/echo-jumping.png",
  sitting:  "/echo-sitting.png",
  thinking: "/echo-thinking.png",
};

interface Props {
  /** Agency color in CSS (hex, rgb, etc.) */
  color: string;
  /** Tailwind size classes, e.g. "w-16 h-16" */
  size?: string;
  /** Tailwind rounding classes, e.g. "rounded-2xl" */
  rounded?: string;
  /** Add a soft glow ring in the agency color */
  glow?: boolean;
  /** Override blend strength (0–1). Default 1 = full tint. */
  intensity?: number;
  /** Which pose to display (falls back to default if the pose file 404s) */
  pose?: EchoPose;
  /** Drop the tint and show Echo in its native color */
  untinted?: boolean;
}

/**
 * Echo mascot tinted with an arbitrary color.
 *
 * Works with both RGB (no-alpha) and RGBA (transparent) PNGs. Uses
 * mix-blend-mode: color so the character silhouette takes on the agency's
 * hue while keeping its luminance and highlights.
 *
 * If a specific pose PNG is missing, it silently falls back to /echo-avatar.png.
 */
export function EchoTintedLogo({
  color,
  size = "w-16 h-16",
  rounded = "rounded-2xl",
  glow = false,
  intensity = 1,
  pose = "default",
  untinted = false,
}: Props) {
  const [src, setSrc] = useState(POSE_FILES[pose]);

  return (
    <div
      className={`relative ${size} ${rounded} overflow-hidden flex-shrink-0`}
      style={glow ? { filter: `drop-shadow(0 0 16px ${color}55)` } : undefined}
    >
      <img
        src={src}
        alt="Echo"
        className="w-full h-full object-contain"
        onError={() => { if (src !== POSE_FILES.default) setSrc(POSE_FILES.default); }}
      />
      {!untinted && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none mix-blend-color"
          style={{ backgroundColor: color, opacity: intensity }}
        />
      )}
    </div>
  );
}
