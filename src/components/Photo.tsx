import { MEDIA, fallbackSrc, srcSet, type MediaKey } from "@/lib/media";

/** A team photo as WebP with a JPEG fallback, sized for phones and desktops. */
export function Photo({
  name,
  alt,
  className,
  sizes = "100vw",
  priority = false,
}: {
  name: MediaKey;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const m = MEDIA[name];
  return (
    <picture className={className}>
      <source type="image/webp" srcSet={srcSet(name, "webp")} sizes={sizes} />
      <img
        src={fallbackSrc(name)}
        srcSet={srcSet(name, "jpg")}
        sizes={sizes}
        width={m.width}
        height={m.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
