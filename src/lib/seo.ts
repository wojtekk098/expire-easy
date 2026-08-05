/**
 * Centralne generowanie metadanych SEO dla podstron.
 *
 * Każda podstrona wywołuje `pageHead({ path, title, description })`,
 * a helper automatycznie dokłada: sufiks marki w tytule, Open Graph
 * (og:title, og:description, og:type, og:url, og:site_name, og:locale),
 * tagi Twittera oraz kanoniczny adres URL wskazujący na tę podstronę.
 */

export const SITE_NAME = "Deadline";
export const SITE_URL = "https://mojdeadline.pl";
export const SITE_LOCALE = "pl_PL";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

export type PageSeo = {
  /** Ścieżka podstrony, np. "/pro". Używana w canonical i og:url. */
  path: string;
  /** Tytuł bez nazwy marki — sufiks „— Deadline” dokładamy automatycznie. */
  title: string;
  description: string;
  /** Opcjonalne nadpisania dla social share. */
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article" | "product";
  /** Bezwzględny https URL obrazka podglądu (tylko jeśli istnieje). */
  image?: string;
  /** Strony prywatne / techniczne wyłączone z indeksowania. */
  noindex?: boolean;
};

function clamp(value: string, max: number) {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function withBrand(title: string) {
  const full = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
  return clamp(full, TITLE_MAX);
}

function absoluteUrl(path: string) {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function pageHead(seo: PageSeo) {
  const title = withBrand(seo.title);
  const description = clamp(seo.description, DESCRIPTION_MAX);
  const ogTitle = withBrand(seo.ogTitle ?? seo.title);
  const ogDescription = clamp(seo.ogDescription ?? seo.description, DESCRIPTION_MAX);
  const url = absoluteUrl(seo.path);

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:type", content: seo.ogType ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: SITE_LOCALE },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
  ];

  if (seo.image) {
    meta.push(
      { property: "og:image", content: seo.image },
      { name: "twitter:image", content: seo.image },
    );
  }

  if (seo.noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  return {
    meta,
    links: seo.noindex ? [] : [{ rel: "canonical", href: url }],
  };
}
