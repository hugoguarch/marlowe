/**
 * A finished-looking post design: AI artwork underneath, brand-driven
 * HTML/CSS typography on top. Tokens come from the Brand Brain.
 */
export type DesignTokens = {
  name: string;
  logoUrl?: string | null;
  ink: string;
  accent: string;
  light: string;
  headlineFont: string;
  bodyFont: string;
};

export type DesignContent = {
  headline: string;
  subhead?: string;
  caption?: string;
};

export const templates = [
  { id: "carousel", label: "Carousel" },
  { id: "quote", label: "Quote" },
  { id: "stat", label: "Stat" },
  { id: "announcement", label: "Announcement" },
  { id: "story", label: "Story" },
] as const;

export type TemplateId = (typeof templates)[number]["id"];

export function PostDesign({
  template,
  tokens,
  content,
  imageUrl,
  className = "",
  compact = false,
}: {
  template: TemplateId | string;
  tokens: DesignTokens;
  content: DesignContent;
  imageUrl?: string | null;
  className?: string;
  /** Smaller type and padding, for thumbnails inside grids. */
  compact?: boolean;
}) {
  const ratio = template === "story" ? "9 / 16" : "4 / 5";

  return (
    <div
      className={`relative w-full overflow-hidden ${compact ? "rounded-2xl" : "rounded-3xl"} ${className}`}
      style={{ aspectRatio: ratio, backgroundColor: tokens.ink }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          background:
            template === "quote" || template === "stat"
              ? `linear-gradient(140deg, ${tokens.ink}F2 0%, ${tokens.accent}B3 100%)`
              : `linear-gradient(180deg, ${tokens.ink}D9 0%, ${tokens.ink}26 45%, ${tokens.ink}E6 100%)`,
        }}
      />

      <div
        className={`absolute inset-0 flex flex-col justify-between ${
          compact ? "p-4" : "p-7 sm:p-9"
        }`}
      >
        <div className="flex items-center gap-3">
          {tokens.logoUrl ? (
            <img
              src={tokens.logoUrl}
              alt=""
              className={`${compact ? "h-4" : "h-7"} w-auto object-contain`}
            />
          ) : (
            <span
              className={`${compact ? "text-[0.5rem]" : "text-[0.62rem]"} tracking-[0.3em] uppercase`}
              style={{ color: tokens.light, fontFamily: tokens.bodyFont }}
            >
              {tokens.name}
            </span>
          )}
        </div>

        <div>
          {template === "stat" ? (
            <p
              className={`leading-none font-light ${compact ? "text-3xl" : "text-6xl sm:text-7xl"}`}
              style={{ color: tokens.light, fontFamily: tokens.headlineFont }}
            >
              {content.headline}
            </p>
          ) : (
            <p
              className={`font-light tracking-tight ${
                compact
                  ? "text-base"
                  : template === "quote"
                    ? "text-3xl sm:text-4xl"
                    : "text-4xl sm:text-5xl"
              }`}
              style={{
                color: tokens.light,
                fontFamily: tokens.headlineFont,
                lineHeight: 1.1,
              }}
            >
              {template === "quote" ? `“${content.headline}”` : content.headline}
            </p>
          )}

          {content.subhead ? (
            <p
              className={`max-w-[92%] leading-relaxed ${
                compact ? "mt-2 line-clamp-3 text-[0.68rem]" : "mt-4 text-sm sm:text-base"
              }`}
              style={{ color: `${tokens.light}B3`, fontFamily: tokens.bodyFont }}
            >
              {content.subhead}
            </p>
          ) : null}

          <span
            className={`inline-block rounded-full ${compact ? "mt-3 h-[2px] w-8" : "mt-6 h-[3px] w-14"}`}
            style={{ backgroundColor: tokens.accent }}
          />
        </div>
      </div>
    </div>
  );
}
