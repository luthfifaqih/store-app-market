import type { ReactNode } from "react";
export function SectionTitle({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  children?: ReactNode;
}) {
  return (
    <header className="fresh-section-heading">
      <div>
        <p className="fresh-eyebrow">~ {eyebrow} ~</p>
        <h2>
          {title} <em>{accent}</em>
        </h2>
      </div>
      {children}
    </header>
  );
}
