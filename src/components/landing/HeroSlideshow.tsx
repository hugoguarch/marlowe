import { useEffect, useState } from "react";

export function HeroSlideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 6000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[2500ms] ease-in-out"
          style={{ opacity: i === index ? 0.32 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/85 to-ink" />
    </div>
  );
}
