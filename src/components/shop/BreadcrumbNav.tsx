import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BreadcrumbNavProps {
  /** Category slug, e.g. 'laptops', 'hard-drives' */
  category: string;
  /** Bilingual display label for the category */
  categoryTitle: { ar: string; en: string };
  /** Optional parent category for nested hierarchies */
  parentCategory?: { slug: string; title: { ar: string; en: string } } | null;
  /** Bilingual display label for the current product */
  productTitle: { ar: string; en: string };
  /** Active locale */
  language: 'ar' | 'en';
  /** Route prefix, e.g. '/ar' or '/en' */
  langPrefix: string;
}

// ─── Static labels ────────────────────────────────────────────────────────────

const labels = {
  home:       { ar: 'الرئيسية',     en: 'Home' },
  allCats:    { ar: 'جميع الأقسام', en: 'All Categories' },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BreadcrumbNav({
  category,
  categoryTitle,
  parentCategory,
  productTitle,
  language,
  langPrefix,
}: BreadcrumbNavProps) {
  const isRTL = language === 'ar';
  const t = (obj: { ar: string; en: string }) => obj[language];

  // Chevron direction flips for RTL
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  // ── Build ordered crumb list ─────────────────────────────────────────────

  interface Crumb {
    label: string;
    href?: string; // undefined = current page (last item)
  }

  const crumbs: Crumb[] = [
    { label: t(labels.home), href: `${langPrefix}/` },
  ];

  if (parentCategory) {
    crumbs.push({
      label: t(parentCategory.title),
      href: `${langPrefix}/shop/${parentCategory.slug}`,
    });
  }

  crumbs.push({
    label: t(categoryTitle),
    href: `${langPrefix}/shop/${category}`,
  });

  // Last item — no href
  crumbs.push({ label: t(productTitle) });

  // ── Schema.org JSON-LD ───────────────────────────────────────────────────

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://example.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.label,
      ...(crumb.href
        ? { item: `${origin}${crumb.href}` }
        : {}),
    })),
  };

  // ── Responsive slice — on mobile show only last 2 items with ellipsis ───

  const mobileStartIndex = Math.max(0, crumbs.length - 2);
  const showEllipsis = mobileStartIndex > 0;

  // ── Separator helper ─────────────────────────────────────────────────────

  const Separator = ({ className = '' }: { className?: string }) => (
    <li
      aria-hidden="true"
      className={`flex items-center text-gray-400 dark:text-gray-600 ${className}`}
    >
      <Chevron className="w-3 h-3 flex-shrink-0" />
    </li>
  );

  // ── Render a single crumb item ───────────────────────────────────────────

  const renderCrumb = (crumb: Crumb, idx: number, isMobileHidden: boolean) => {
    const isLast = idx === crumbs.length - 1;

    const liClass = [
      'flex items-center gap-1',
      isMobileHidden ? 'hidden sm:flex' : 'flex',
    ].join(' ');

    const textClass = isLast
      ? 'text-gray-800 dark:text-gray-100 font-medium truncate max-w-[140px] sm:max-w-xs'
      : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-150 whitespace-nowrap';

    return (
      <li key={idx} className={liClass}>
        {isLast ? (
          /* Current page — not a link */
          <span
            aria-current="page"
            title={crumb.label}
            className={textClass}
          >
            {crumb.label}
          </span>
        ) : (
          <Link to={crumb.href!} className={`flex items-center gap-1 ${textClass}`}>
            {/* Home icon on the first crumb only */}
            {idx === 0 && (
              <Home className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            )}
            {crumb.label}
          </Link>
        )}
      </li>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="breadcrumb"
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full"
      >
        <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-sm leading-none py-2">

          {/* Mobile ellipsis — shown when crumbs are truncated */}
          {showEllipsis && (
            <>
              {/* Show the very first crumb (Home) even on mobile */}
              {renderCrumb(crumbs[0], 0, false)}

              {/* Separator + ellipsis */}
              <Separator />
              <li
                aria-hidden="true"
                className="flex sm:hidden items-center text-gray-400 dark:text-gray-600 select-none"
              >
                &hellip;
              </li>
              <Separator className="flex sm:hidden" />

              {/* Middle crumbs hidden on mobile */}
              {crumbs.slice(1, mobileStartIndex).map((crumb, i) => (
                <Fragment key={`mid-${i}`}>
                  {renderCrumb(crumb, i + 1, true)}
                  <Separator className="hidden sm:flex" />
                </Fragment>
              ))}

              {/* Last 2 crumbs always visible */}
              {crumbs.slice(mobileStartIndex).map((crumb, i) => {
                const globalIdx = mobileStartIndex + i;
                const isFirstVisible = i === 0;
                return (
                  <Fragment key={`tail-${i}`}>
                    {/* Separator before each of the last 2 on desktop
                        (mobile ellipsis separator already rendered above) */}
                    {!isFirstVisible && <Separator />}
                    {renderCrumb(crumb, globalIdx, false)}
                  </Fragment>
                );
              })}
            </>
          )}

          {/* No truncation needed — render all crumbs normally */}
          {!showEllipsis &&
            crumbs.map((crumb, idx) => (
              <Fragment key={idx}>
                {idx > 0 && <Separator />}
                {renderCrumb(crumb, idx, false)}
              </Fragment>
            ))}
        </ol>
      </nav>
    </>
  );
}
