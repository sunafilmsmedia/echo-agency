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
}

/**
 * Echo logo (the canonical /echo-avatar.png) tinted with an arbitrary color
 * using mix-blend-mode: color. Image silhouette is preserved; hue/saturation
 * is replaced with the agency's chosen color.
 */
export function EchoTintedLogo({ color, size = "w-16 h-16", rounded = "rounded-2xl", glow = false, intensity = 1 }: Props) {
  return (
    <div
      className={`relative ${size} ${rounded} overflow-hidden flex-shrink-0`}
      style={glow ? { boxShadow: `0 0 32px ${color}40, 0 0 0 2px ${color}55` } : undefined}
    >
      <img src="/echo-avatar.png" alt="Echo" className="w-full h-full object-cover" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: color, mixBlendMode: "color", opacity: intensity }}
      />
    </div>
  );
}
