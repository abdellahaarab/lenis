/**
 * CategoryMegaMenu.tsx
 * Smart two-row category navigation for the shop page.
 *
 * Row 1 – parent category pills (always visible, horizontal scroll on mobile)
 * Row 2 – subcategory chips that slide in when a parent is active (desktop only mega-menu;
 *          on mobile they appear as a second scrollable row)
 *
 * RTL-aware, dark/light mode ready.
 */

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Laptop,
  Monitor,
  HardDrive,
  Gamepad2,
  Headphones,
  Wifi,
  BatteryCharging,
  Layers,
  MemoryStick,
  Cctv,
  Keyboard,
  Printer,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryItem {
  slug: string;
  parentSlug: string | null;
  title: { ar: string; en: string };
}

export interface CategoryMegaMenuProps {
  categories: CategoryItem[];
  activeCategory: string | undefined;
  language: 'ar' | 'en';
  onSelect: (slug: string | undefined) => void;
  query?: string;        // preserve query string when navigating
  langPrefix: string;    // e.g. '/ar' or '/en'
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  // root slugs
  laptops:       Laptop,
  computers:     Monitor,
  desktops:      Monitor,
  displays:      Monitor,
  monitors:      Monitor,
  'hard-drives': HardDrive,
  storage:       HardDrive,
  ram:           MemoryStick,
  cameras:       Cctv,
  surveillance:  Cctv,
  accessories:   Keyboard,
  network:       Wifi,
  networking:    Wifi,
  printers:      Printer,
  audio:         Headphones,
  gaming:        Gamepad2,
  power:         BatteryCharging,
  ups:           BatteryCharging,
};

function getIcon(slug: string): LucideIcon {
  // exact match first
  if (ICON_MAP[slug]) return ICON_MAP[slug];
  // partial match (e.g. "gaming-chairs" → Gamepad2)
  for (const key of Object.keys(ICON_MAP)) {
    if (slug.includes(key) || key.includes(slug)) return ICON_MAP[key];
  }
  return Layers;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the href for a given category slug (or undefined → all) */
function buildHref(
  langPrefix: string,
  slug: string | undefined,
  query?: string,
): string {
  // Search results use the /shop route with category in the query string.
  // Preserve that shape so ShopPage applies the selected category together
  // with the search term instead of treating the URL path as the category.
  if (query) {
    const params = new URLSearchParams({ q: query });
    if (slug) params.set('category', slug);
    return `${langPrefix}/shop?${params.toString()}`;
  }
  const base = slug ? `${langPrefix}/shop/${slug}` : `${langPrefix}/shop`;
  return base;
}

/** Return the root slug that "owns" the currently active category */
function resolveActiveRoot(
  activeCategory: string | undefined,
  categories: CategoryItem[],
): string | undefined {
  if (!activeCategory) return undefined;
  const item = categories.find((c) => c.slug === activeCategory);
  if (!item) return undefined;
  // if it's already a root, return itself
  if (!item.parentSlug) return item.slug;
  // otherwise return its parent
  return item.parentSlug;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ParentPillProps {
  slug: string | undefined;    // undefined = "all"
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
  href: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  language: 'ar' | 'en';
}

const ParentPill: React.FC<ParentPillProps> = ({
  label,
  Icon,
  isActive,
  href,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const highlighted = isActive || isHovered;

  return (
    <Link
      to={href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={[
        // base pill styles
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium',
        'whitespace-nowrap transition-all duration-200 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
        highlighted
          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
          : [
              'bg-white/10 dark:bg-white/5 text-gray-700 dark:text-gray-300',
              'hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300',
            ].join(' '),
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
};

interface SubChipProps {
  slug: string;
  label: string;
  isActive: boolean;
  href: string;
  onClick: () => void;
}

const SubChip: React.FC<SubChipProps> = ({
  label,
  isActive,
  href,
  onClick,
}) => (
  <Link
    to={href}
    onClick={onClick}
    className={[
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
      'whitespace-nowrap transition-all duration-150 select-none',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
      isActive
        ? 'bg-purple-500 text-white'
        : [
            'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300',
            'hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300',
          ].join(' '),
    ].join(' ')}
    aria-current={isActive ? 'page' : undefined}
  >
    {label}
  </Link>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CategoryMegaMenu: React.FC<CategoryMegaMenuProps> = ({
  categories,
  activeCategory,
  language,
  onSelect,
  query,
  langPrefix,
}) => {
  const isRtl = language === 'ar';

  // Track which root is being hovered (for desktop mega-menu reveal)
  const [hoveredRoot, setHoveredRoot] = useState<string | undefined>(undefined);

  // ── Derived data ────────────────────────────────────────────────────────────

  /** Use only root categories supplied by the live catalog API. */
  const roots = React.useMemo(() => {
    const rank = (slug: string) => {
      const value = slug.toLowerCase();
      const groups = [
        ['laptop', 'notebook'],
        ['desktop', 'computer', 'workstation', 'mini-pc', 'pc'],
        ['display', 'monitor', 'screen'],
        ['printer', 'printing'],
        ['office', 'stationery'],
        ['accessor', 'peripheral', 'keyboard', 'mouse'],
        ['audio', 'sound', 'headphone', 'speaker'],
        ['gaming', 'game'],
        ['network', 'router', 'connect'],
        ['storage', 'hard-drive', 'hdd', 'ssd', 'flash'],
        ['ram', 'memory'],
        ['power', 'ups', 'battery', 'energy'],
        ['security', 'surveillance', 'camera', 'lock', 'cctv'],
      ];
      const index = groups.findIndex(group => group.some(term => value.includes(term)));
      return index < 0 ? groups.length : index;
    };
    return categories
      .filter((category) => !category.parentSlug)
      .sort((a, b) => rank(a.slug) - rank(b.slug) || categories.indexOf(a) - categories.indexOf(b));
  }, [categories]);

  /** Map: parentSlug → subcategory list */
  const subMap = React.useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    for (const cat of categories) {
      if (cat.parentSlug) {
        const existing = map.get(cat.parentSlug) ?? [];
        existing.push(cat);
        map.set(cat.parentSlug, existing);
      }
    }
    return map;
  }, [categories]);

  /** The root slug that "owns" the currently active leaf/root */
  const activeRoot = resolveActiveRoot(activeCategory, categories);

  /**
   * Which root to show subcategories for:
   *  - On hover: the hovered root (if it has subcategories)
   *  - Otherwise: the active root (if it has subcategories)
   */
  const expandedRoot = hoveredRoot ?? activeRoot;
  const subcategories: CategoryItem[] = expandedRoot
    ? (subMap.get(expandedRoot) ?? [])
    : [];

  const showSubRow = subcategories.length > 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleParentClick = useCallback(
    (slug: string | undefined) => {
      onSelect(slug);
      // Clear hover so sub-row doesn't stay open via hover after tap
      setHoveredRoot(undefined);
    },
    [onSelect],
  );

  const handleSubClick = useCallback(
    (slug: string) => {
      onSelect(slug);
    },
    [onSelect],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full"
      /* Keep sub-row visible while pointer is anywhere inside the menu */
      onMouseLeave={() => setHoveredRoot(undefined)}
    >
      {/* ── Row 1: Parent category pills ── */}
      <div
        className={[
          'flex items-center gap-1.5 py-1',
          // Horizontal scroll in single row, no wrapping across desktop or mobile
          'overflow-x-auto scrollbar-none flex-nowrap',
        ].join(' ')}
        role="navigation"
        aria-label={language === 'ar' ? 'تصفح الفئات' : 'Browse categories'}
      >
        {/* "All" pill */}
        <ParentPill
          slug={undefined}
          label={language === 'ar' ? 'الكل' : 'All'}
          Icon={Layers}
          isActive={!activeCategory}
          isHovered={hoveredRoot === '__all__'}
          href={buildHref(langPrefix, undefined, query)}
          onMouseEnter={() => setHoveredRoot('__all__')}
          onMouseLeave={() => {/* handled by container */}}
          onClick={() => handleParentClick(undefined)}
          language={language}
        />

        {/* Dynamic root categories */}
        {roots.map((cat) => {
          const Icon = getIcon(cat.slug);
          const label = cat.title[language];
          const isActive = activeRoot === cat.slug;
          const isHovered = hoveredRoot === cat.slug;

          return (
            <ParentPill
              key={cat.slug}
              slug={cat.slug}
              label={label}
              Icon={Icon}
              isActive={isActive}
              isHovered={isHovered}
              href={buildHref(langPrefix, cat.slug, query)}
              onMouseEnter={() => setHoveredRoot(cat.slug)}
              onMouseLeave={() => {/* handled by container */}}
              onClick={() => handleParentClick(cat.slug)}
              language={language}
            />
          );
        })}
      </div>

      {/* ── Row 2: Subcategory chips (slide-in) ── */}
      <div
        className={[
          // Smooth height transition
          'overflow-hidden transition-all duration-300 ease-in-out',
          showSubRow ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
        aria-hidden={!showSubRow}
      >
        <div
          className={[
            'flex items-center gap-2 pb-2 pt-0.5',
            'overflow-x-auto scrollbar-none flex-nowrap',
          ].join(' ')}
        >
          {/* "All [parent]" chip to reset to root */}
          {expandedRoot && expandedRoot !== '__all__' && (() => {
            const parentCat = roots.find((r) => r.slug === expandedRoot);
            if (!parentCat) return null;
            return (
              <SubChip
                key={`${expandedRoot}-all`}
                slug={expandedRoot}
                label={language === 'ar' ? `كل ${parentCat.title.ar}` : `All ${parentCat.title.en}`}
                isActive={activeCategory === expandedRoot}
                href={buildHref(langPrefix, expandedRoot, query)}
                onClick={() => handleSubClick(expandedRoot)}
              />
            );
          })()}

          {subcategories.map((sub) => (
            <SubChip
              key={sub.slug}
              slug={sub.slug}
              label={sub.title[language]}
              isActive={activeCategory === sub.slug}
              href={buildHref(langPrefix, sub.slug, query)}
              onClick={() => handleSubClick(sub.slug)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryMegaMenu;
