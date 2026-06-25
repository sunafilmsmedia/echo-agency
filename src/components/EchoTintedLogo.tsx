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
  /** Which pose to display */
  pose?: EchoPose;
  /** Drop the tint and show Echo in its native green */
  untinted?: boolean;
}

/**
 * Echo mascot (PNG with alpha) tinted with an arbitrary color.
 *
 * Technique: the colored overlay is clipped to the Echo silhouette using
 * CSS mask-image. This keeps the tint INSIDE the character shape and lets
 * transparency around it show through cleanly.
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
  const src = POSE_FILES[pose];

  return (
    <div
      className={`relative ${size} ${rounded} flex-shrink-0`}
      style={glow ? { filter: `drop-shadow(0 0 12px ${color}66)` } : undefined}
    >
      <img src={src} alt="Echo" className="w-full h-full object-contain" />
      {!untinted && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: color,
            mixBlendMode: "color",
            opacity: intensity,
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      )}
    </div>
  );
}
