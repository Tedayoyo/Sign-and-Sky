import type { ReactNode } from "react";
import { Photo } from "./Photo";
import { MEDIA, type MediaKey } from "@/lib/media";

/** A full-width page header with a team photo, a slow drift and a readable overlay. */
export function PageHero({
  image,
  alt,
  eyebrow,
  title,
  lead,
  note,
  illustrativeLabel,
  children,
}: {
  image: MediaKey;
  alt: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  note?: string;
  illustrativeLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`page-hero page-hero--${image}`}>
      <Photo name={image} alt={alt} className="page-hero__img" priority sizes="100vw" />
      <div className="page-hero__shade" aria-hidden="true" />
      <div className="wrap page-hero__body">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lead && <p className="page-hero__lead">{lead}</p>}
        {note && <p className="page-hero__note">{note}</p>}
        {children}
      </div>
      {MEDIA[image].illustrative && illustrativeLabel && <p className="photo-credit">{illustrativeLabel}</p>}
    </header>
  );
}
