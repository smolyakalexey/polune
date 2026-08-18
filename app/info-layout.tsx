/* eslint-disable @next/next/no-img-element -- exact local SVG logo exported from Figma */

import Link from "next/link";

export function InfoLayout({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main className="info-shell">
      <header className="info-header">
        <Link className="brand" href="/" aria-label="Polune — на главную">
          <img src="/figma/polune-mark.svg" alt="" />
        </Link>
        <Link className="info-back" href="/">вернуться к выбору дня</Link>
      </header>
      <article className="info-article">
        <p className="info-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </article>
      <footer className="info-footer">
        <Link href="/feedback">обратная связь</Link>
        <Link href="/methodology">методика</Link>
        <Link href="/privacy">конфиденциальность</Link>
      </footer>
    </main>
  );
}
