import sphere from "@/assets/marlowe-sphere.png";

/** The Marlowe brand mark: a soft pearlescent silver-blue sphere. */
export function Sphere({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={sphere}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
      className={`select-none drop-shadow-[0_8px_24px_rgba(90,130,180,0.35)] ${className}`}
    />
  );
}
