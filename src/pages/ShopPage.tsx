import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  SlidersHorizontal,
  X,
  Search,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  PackageSearch,
  PackageOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  Tag,
  Laptop,
  Monitor,
  Headphones,
  Gamepad2,
  Wifi,
  HardDrive,
  Cpu,
  Volume2,
  Briefcase,
  GraduationCap,
  Zap
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { commerceCopy, shopApi, errorText, conditionText, type SearchResult, type SearchSuggestions, type Facet } from '@/data/commerce';
import CommerceCard from '@/components/shop/CommerceCard';
import LaptopFilterSidebar from '@/components/shop/LaptopFilterSidebar';
import StorageFilterSidebar from '@/components/shop/StorageFilterSidebar';
import DesktopFilterSidebar from '@/components/shop/DesktopFilterSidebar';
import DisplayFilterSidebar from '@/components/shop/DisplayFilterSidebar';
import RamFilterSidebar from '@/components/shop/RamFilterSidebar';
import CameraFilterSidebar from '@/components/shop/CameraFilterSidebar';
import AccessoryFilterSidebar from '@/components/shop/AccessoryFilterSidebar';
import NetworkFilterSidebar from '@/components/shop/NetworkFilterSidebar';
import PrinterFilterSidebar from '@/components/shop/PrinterFilterSidebar';
import AudioFilterSidebar from '@/components/shop/AudioFilterSidebar';
import AllFilterSidebar from '@/components/shop/AllFilterSidebar';
import CategoryMegaMenu from '@/components/shop/CategoryMegaMenu';
import FacetFilterBar from '@/components/shop/FacetFilterBar';
import PopularSearchFilters from '@/components/shop/PopularSearchFilters';
import RelatedSearches from '@/components/shop/RelatedSearches';
import '@/commerce.css';
import { trackPageView, trackFilterUsed, trackSearch } from '@/analytics';

export default function ShopPage({ initialCategory }: { initialCategory?: string } = {}) {
  const { category: rawCategory } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = commerceCopy[language];

  // A search from a category route searches the whole catalog unless the user
  // explicitly selected a category in the search filters.
  const routeCategory = initialCategory || (rawCategory === 'browser' ? undefined : rawCategory);
  const category = params.has('q') ? (params.get('category') || undefined) : routeCategory;

  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [draft, setDraft] = useState(new URLSearchParams(params));
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestions>({ items: [], categories: [] });
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState<'all' | 'products' | 'categories'>('all');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const requestParams = new URLSearchParams(params);
  requestParams.delete('focusSearch');
  const query = requestParams.toString();

  // AbortController ref to cancel in-flight catalog requests when filters change rapidly
  const catalogAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any previous in-flight request to prevent piling up on the server
    if (catalogAbortRef.current) catalogAbortRef.current.abort();
    const controller = new AbortController();
    catalogAbortRef.current = controller;

    let active = true;
    setLoading(true);
    setError('');
    const q = new URLSearchParams(query);
    if (category) q.set('category', category);
    if (q.has('q') && !q.has('sort')) q.set('sort', 'relevance');

    // Debounce filter changes by 80ms to batch rapid consecutive param changes
    const timer = window.setTimeout(() => {
      fetch('/api/shop/catalog?' + q, { signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw new Error('catalog');
          return response.json();
        })
        .then(result => {
          if (active) setData(result as SearchResult);
        })
        .catch(e => {
          if (e instanceof DOMException && e.name === 'AbortError') return; // request was cancelled, ignore
          if (active) setError(errorText(e.message, language));
        })
        .finally(() => {
          if (active) {
            setLoading(false);
            // Track page view on every category/filter change
            trackPageView();
            // Track search queries
            const searchQuery = q.get('q');
            if (searchQuery) trackSearch(searchQuery);
            // Track filter usage (any param other than q/page/sort = filter active)
            const hasFilters = [...q.keys()].some(k => !['q', 'page', 'sort', 'category'].includes(k));
            if (hasFilters) trackFilterUsed();
          }
        });
    }, 80);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, language]);

  // Dynamic page title & meta description for client-side SEO / Google Search
  useEffect(() => {
    const isAr = language === 'ar';
    const siteTitle = isAr ? 'الجيل العربي الرقمي' : 'Al-Jeel Digital';
    const matchedCategory = data?.categories.find(c => c.slug === category);
    const catTitle = matchedCategory?.title?.[language] || (category === 'laptops' ? (isAr ? 'أجهزة لابتوب' : 'Laptops') : (category || ''));

    let title = '';
    let description = '';

    if (catTitle) {
      title = isAr
        ? `${catTitle} في اليمن — أسعار ومواصفات | ${siteTitle} صنعاء`
        : `${catTitle} in Yemen — Best Prices & Specs | ${siteTitle} Sana'a`;
      description = isAr
        ? `تصفح أفضل أجهزة ${catTitle} الأصلية في اليمن بأسعار منافسة بالدولار والريال اليمني. فحص معتمد وضمان حقيقي مع توصيل فوري في صنعاء وشحن لكافة المحافظات: عدن، تعز، حضرموت، إب، ذمار، مأرب.`
        : `Explore certified ${catTitle} in Yemen at competitive prices in USD and YER. Technical inspection, official warranty, and shipping across all Yemeni governorates.`;
    } else {
      title = isAr
        ? `متجر الإلكترونيات واللابتوبات في اليمن | ${siteTitle} صنعاء`
        : `Electronics & Laptops Store in Yemen | ${siteTitle} Sana'a`;
      description = isAr
        ? `المتجر الإلكتروني الأول لأجهزة اللابتوب ومعدات تقنية المعلومات في اليمن. فحص معتمد وضمان حقيقي مع خدمة التوصيل والشحن لكافة المحافظات اليمنية (صنعاء، عدن، تعز، حضرموت، إب، ذمار، مأرب).`
        : `Premier electronics & laptop store in Yemen. Verified inspection, real warranty, and nationwide delivery to all Yemeni governorates.`;
    }

    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', description);
    }
  }, [category, data?.categories, language]);

  const shopJsonLd = useMemo(() => {
    const isAr = language === 'ar';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aljeel-digital.com';
    const matchedCategory = data?.categories.find(c => c.slug === category);
    const catTitle = matchedCategory?.title?.[language] || (category === 'laptops' ? (isAr ? 'أجهزة لابتوب' : 'Laptops') : (category || ''));
    const pageTitle = catTitle ? `${catTitle} في اليمن` : (isAr ? 'متجر الإلكترونيات واللابتوبات في اليمن' : 'Electronics & Laptop Store in Yemen');
    const pageUrl = typeof window !== 'undefined' ? window.location.href : `${origin}/${language}/shop`;

    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageTitle,
      url: pageUrl,
      description: isAr
        ? 'تسوق أفضل أجهزة اللابتوب ومعدات تقنية المعلومات في اليمن مع فحص معتمد وضمان حقيقي وتوصيل لكافة المحافظات: صنعاء، عدن، تعز، حضرموت، إب، ذمار، مأرب.'
        : 'Shop certified laptops and IT hardware in Yemen with warranty and shipping across all Yemeni governorates.',
    };
  }, [category, data?.categories, language]);

  useEffect(() => setSearch(params.get('q') ?? ''), [query, params]);

  useEffect(() => {
    if (params.get('focusSearch') !== '1') return;
    setSearchFocused(true);
    const frame = window.requestAnimationFrame(() => {
      const input = searchContainerRef.current?.querySelector<HTMLInputElement>('.store-search-input');
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    const next = new URLSearchParams(params);
    next.delete('focusSearch');
    setParams(next, { replace: true });
    return () => window.cancelAnimationFrame(frame);
  }, [params, setParams]);

  useEffect(() => {
    const term = search.trim();
    if (!searchFocused || term.length < 2) {
      setSearchSuggestions({ items: [], categories: [] });
      setSuggestionLoading(false);
      return;
    }
    let current = true;
    const timer = window.setTimeout(() => {
      setSuggestionLoading(true);
      shopApi<SearchSuggestions>(`/suggestions?q=${encodeURIComponent(term)}&lang=${language}`)
        .then(result => { if (current) setSearchSuggestions(result); })
        .catch(() => { if (current) setSearchSuggestions({ items: [], categories: [] }); })
        .finally(() => { if (current) setSuggestionLoading(false); });
    }, 300);
    return () => { current = false; window.clearTimeout(timer); };
  }, [search, searchFocused, language]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearchFocused(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  useEffect(() => setActiveSuggestion(-1), [search, suggestionFilter]);

  const activeFilterCount = useMemo(() => {
    return [...params.keys()].filter(k => !['q', 'page', 'sort'].includes(k)).length;
  }, [params]);

  const draftFilterCount = useMemo(() => {
    return [...draft.keys()].filter(k => !['q', 'sort', 'page'].includes(k)).length;
  }, [draft]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const removeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    const values = next.getAll(key);
    next.delete(key);
    values.filter(x => x !== value).forEach(x => next.append(key, x));
    next.delete('page');
    setParams(next);
  };

  const clearAllFilters = () => {
    setParams(new URLSearchParams(params.get('q') ? { q: params.get('q')! } : {}));
  };

  const applySearchSuggestion = (value: string, suggestedCategory?: string) => {
    const next = new URLSearchParams({ q: value });
    if (suggestedCategory) next.set('category', suggestedCategory);
    setSearch(value);
    setSearchFocused(false);
    navigate({ pathname: `/${language}/shop`, search: next.toString() ? `?${next}` : '' });
  };

  const applyCategorySuggestion = (slug: string) => {
    const next = new URLSearchParams();
    if (search.trim()) next.set('q', search.trim());
    next.set('category', slug);
    setSearchFocused(false);
    navigate({ pathname: `/${language}/shop`, search: `?${next}` });
  };

  const submitSearch = (value: string) => {
    const term=value.trim();
    setSearch(term);
    setSearchFocused(false);
    navigate({ pathname: `/${language}/shop`, search: term ? `?${new URLSearchParams({q:term})}` : '' });
  };

  const hasSearchSuggestions = searchFocused && search.trim().length >= 2;
  const visibleSuggestionItems = suggestionFilter === 'categories' ? [] : searchSuggestions.items;
  const visibleSuggestionCategories = suggestionFilter === 'products' ? [] : searchSuggestions.categories;

  const filterChips = useMemo(() => {
    // The search term is already visible in the search field; don't spend a
    // second row repeating it as an active-filter pill.
    return [...params.entries()].filter(([k]) => !['q', 'page', 'sort'].includes(k));
  }, [params]);

  const getChipLabel = (k: string, v: string) => {
    const isAr = language === 'ar';
    if (k === 'q') return `${isAr ? 'بحث' : 'Search'}: "${v}"`;
    if (k === 'available') return isAr ? 'المتوفر فوراً' : t.available;
    if (k === 'min') return `${isAr ? 'من' : 'From'} $${v}`;
    if (k === 'max') return `${isAr ? 'حتى' : 'Up to'} $${v}`;
    if (k === 'brand') {
      const facetBrand = data?.laptopFacets?.brands.find(b => b.value === v);
      if (facetBrand) return facetBrand.title[language] || facetBrand.value;
      return data?.facets.brand.find(b => b.value === v)?.title ?? v;
    }
    if (k === 'condition') {
      const facetCond = data?.laptopFacets?.conditions.find(c => c.value === v);
      if (facetCond) return `${isAr ? 'الحالة: ' : 'Condition: '}${facetCond.title[language] || facetCond.value}`;
      const condLabel = conditionText(v, language);
      return `${isAr ? 'الحالة: ' : 'Condition: '}${condLabel}`;
    }
    if (k === 'collection') return data?.collections.find(c => c.id === v)?.title[language] ?? v;
    if (k === 'cpuFamily') return `${isAr ? 'معالج' : 'CPU'}: ${v}`;
    if (k === 'cpuBrand') return v;
    if (k === 'cpuGen') return `${isAr ? 'الجيل' : 'Gen'} ${v}`;
    if (k === 'ramGB') return `${v} GB RAM`;
    if (k === 'storageGB') return `${Number(v) >= 1000 ? Math.round(Number(v) / 1000) + ' TB' : v + ' GB'} SSD`;
    if (k === 'gpuType') return v === 'dedicated' ? (isAr ? 'كرت منفصل' : 'Dedicated GPU') : (isAr ? 'كرت مدمج' : 'Integrated GPU');
    if (k === 'screenSize') return `${v}"`;
    if (k === 'touch') return isAr ? 'شاشة لمس' : t.touch;
    // Storage labels
    if (k === 'storageType' || k === 'spec_storageType') {
      const typeMap: Record<string, { ar: string; en: string }> = {
        'nvme': { ar: 'NVMe M.2', en: 'NVMe M.2 SSD' },
        'ssd-sata': { ar: 'SATA SSD', en: 'SATA SSD' },
        'hdd': { ar: 'HDD ميكانيكي', en: 'HDD' },
        'external_ssd': { ar: 'SSD خارجي', en: 'External SSD' },
        'external_hdd': { ar: 'هاردسك خارجي', en: 'External HDD' },
        'external': { ar: 'تخزين خارجي', en: 'External' }
      };
      return typeMap[v] ? typeMap[v][language] : (isAr ? `نوع التخزين: ${v}` : `Storage: ${v}`);
    }
    if (k === 'storageGB' || k === 'spec_storageGB' || k === 'capacityGB' || k === 'spec_capacityGB') {
      const capMap: Record<string, string> = {
        '256': '240 / 256 GB',
        '512': '480 / 512 GB',
        '1000': '1 TB',
        '2000': '2 TB',
        '4000': '4 TB+'
      };
      return capMap[v] || `${Number(v) >= 1000 ? Math.round(Number(v) / 1000) + ' TB' : v + ' GB'}`;
    }
    if (k === 'formFactor' || k === 'spec_formFactor') {
      const ffMap: Record<string, { ar: string; en: string }> = {
        'm.2': { ar: 'M.2 2280', en: 'M.2 2280' },
        '2.5': { ar: '2.5 بوصة', en: '2.5"' },
        '3.5': { ar: '3.5 بوصة مكتبي/DVR', en: '3.5" Desktop/DVR' },
        'external': { ar: 'خارجي محمول', en: 'Portable' }
      };
      return ffMap[v] ? ffMap[v][language] : (isAr ? `الهيكل: ${v}` : `Form: ${v}`);
    }
    if (k === 'interface' || k === 'spec_interface') {
      const ifaceMap: Record<string, string> = {
        'm.2': 'PCIe NVMe',
        'sata': 'SATA III',
        'usb-c': 'USB-C',
        'usb 3': 'USB 3.0'
      };
      return ifaceMap[v] || (isAr ? `الواجهة: ${v}` : `Interface: ${v}`);
    }
    if (k === 'rpm' || k === 'spec_rpm') return `${v} RPM`;
    if (k === 'useCase' || k === 'spec_useCase') {
      const ucMap: Record<string, { ar: string; en: string }> = {
        'surveillance': { ar: 'أنظمة مراقبة DVR', en: 'CCTV Surveillance' },
        'laptop': { ar: 'ترقية لابتوب', en: 'Laptop Upgrade' },
        'desktop': { ar: 'كمبيوتر مكتبي', en: 'Desktop Storage' },
        'portable': { ar: 'تخزين متنقل', en: 'Portable Backup' }
      };
      return ucMap[v] ? ucMap[v][language] : (isAr ? `الاستخدام: ${v}` : `Usage: ${v}`);
    }
    // Desktop labels
    if (k === 'spec_formFactor') return isAr ? `الهيكل: ${v}` : `Form: ${v}`;
    // Display labels
    if (k === 'spec_resolution') return isAr ? `الدقة: ${v}` : `Res: ${v}`;
    if (k === 'spec_refreshHz') return `${v} Hz`;
    if (k === 'spec_panel') return isAr ? `لوحة ${v}` : `${v} Panel`;
    if (k === 'spec_curved') return v === 'curved' ? (isAr ? 'شاشة منحنية' : 'Curved') : (isAr ? 'شاشة مسطحة' : 'Flat');
    if (k === 'spec_feature') return isAr ? `ميزة: ${v}` : `Feature: ${v}`;
    // RAM labels
    if (k === 'spec_deviceType') return isAr ? (v === 'laptop' ? 'رام لابتوب' : 'رام ديسكتوب') : (v === 'laptop' ? 'Laptop RAM' : 'Desktop RAM');
    if (k === 'spec_ddrGen') return `${v}`;
    if (k === 'spec_speedMhz') return `${v} MHz`;
    if (k === 'spec_kit') return v === 'dual' ? (isAr ? 'طقم قطعتين 2x' : 'Dual Kit') : (isAr ? 'قطعة واحدة' : 'Single');
    if (k === 'spec_rgb') return v === 'true' ? (isAr ? 'إضاءة RGB' : 'RGB') : (isAr ? 'بدون RGB' : 'Non-RGB');
    // Camera labels
    if (k === 'spec_cameraType') return isAr ? `الكاميرا: ${v}` : `Camera: ${v}`;
    if (k === 'spec_connectivity') return isAr ? `الاتصال: ${v}` : `Conn: ${v}`;
    if (k === 'spec_nightVision') return v === 'color' ? (isAr ? 'رؤية ليلية ملونة' : 'Color Night') : (isAr ? 'رؤية IR' : 'IR Night');
    if (k === 'spec_smartFeature') return isAr ? `ميزة ذكية: ${v}` : `AI: ${v}`;
    if (k === 'spec_storageMode') return isAr ? `التخزين: ${v}` : `Storage: ${v}`;
    // Accessory labels
    if (k === 'spec_accessoryType') return isAr ? `الملحق: ${v}` : `Accessory: ${v}`;
    if (k === 'spec_wireless') return v === 'wireless' || v === 'true' ? (isAr ? 'لاسلكي' : 'Wireless') : (isAr ? 'سلكي' : 'Wired');
    if (k === 'spec_usage') return v === 'gaming' ? (isAr ? 'ألعاب جيمنج' : 'Gaming') : (isAr ? 'مكتبي' : 'Office');
    // Network labels
    if (k === 'spec_deviceType') return isAr ? `الجهاز: ${v}` : `Device: ${v}`;
    if (k === 'spec_wifiGen') return `${v}`;
    if (k === 'spec_portSpeed') return isAr ? `السرعة: ${v}` : `Speed: ${v}`;
    if (k === 'spec_poe') return v === 'poe' ? 'PoE' : (isAr ? 'بدون PoE' : 'Non-PoE');
    // Printer labels
    if (k === 'spec_printerType') return isAr ? `الطابعة: ${v}` : `Printer: ${v}`;
    if (k === 'spec_color') return v === 'color' ? (isAr ? 'ألوان' : 'Color') : (isAr ? 'أبيض وأسود' : 'Mono');
    if (k === 'spec_allInOne') return v === 'aio' ? (isAr ? 'متعددة الوظائف' : 'All-in-One') : (isAr ? 'طباعة فقط' : 'Print Only');
    if (k === 'spec_duplex') return v === 'auto' ? (isAr ? 'وجهين أوتوماتيك' : 'Auto Duplex') : (isAr ? 'وجه واحد' : 'Single');
    // Audio labels
    if (k === 'spec_audioType') return isAr ? `نوع الصوتيات: ${v}` : `Audio: ${v}`;
    if (k === 'spec_anc') return v === 'true' ? (isAr ? 'عزل ضوضاء ANC' : 'ANC') : (isAr ? 'عزل عادي' : 'Standard');
    return v;
  };

  const sortOptions: [string, string][] = useMemo(() => [
    ['relevance', t.relevance],
    ['newest', t.newest],
    ['price_asc', t.priceAsc],
    ['price_desc', t.priceDesc],
    ['name', t.name],
    ...(category === 'laptops' ? [
      ['performance', t.performance] as [string, string],
      ['ram', t.highestRam] as [string, string]
    ] : []),
    // Storage-specific sort: largest capacity first
    ...((category === 'hard-drives' || category === 'storage') ? [
      ['capacity', language === 'ar' ? 'الأكبر سعةً' : 'Largest Capacity'] as [string, string]
    ] : []),
    ...(data?.facets.specs.some(s => s.key === 'batteryHealthPct') ? [['battery', t.battery] as [string, string]] : [])
  ], [t, data, category, language]);

  function renderFilterContent(current: URLSearchParams, onChange: (p: URLSearchParams) => void, isDialog = false) {
    if (category === 'laptops') {
      return (
        <LaptopFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.laptopFacets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'desktops') {
      return (
        <DesktopFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'displays') {
      return (
        <DisplayFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'hard-drives' || category === 'storage') {
      const storageFacets = data?.facets ? {
        brand: data.facets.brand,
        condition: data.facets.condition
      } : undefined;
      return (
        <StorageFilterSidebar
          current={current}
          onChange={onChange}
          facets={storageFacets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'ram') {
      return (
        <RamFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'cameras') {
      return (
        <CameraFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'accessories') {
      return (
        <AccessoryFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'network') {
      return (
        <NetworkFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'printers') {
      return (
        <PrinterFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    if (category === 'audio') {
      return (
        <AudioFilterSidebar
          current={current}
          onChange={onChange}
          facets={data?.facets}
          language={language}
          isDialog={isDialog}
        />
      );
    }

    // Default "الكل" (All categories)
    return (
      <AllFilterSidebar
        current={current}
        onChange={onChange}
        facets={data?.facets}
        language={language}
        isDialog={isDialog}
      />
    );
  }

  return (
    <main id="main-content" className="store-shell" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {shopJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }}
        />
      )}
      {/* Modern Compact Search Bar */}
      {/* Modern Compact Search Bar */}
      <div className="store-search-container" ref={searchContainerRef}>
      <form
        className="store-search-bar"
        onSubmit={e => {
          e.preventDefault();
          submitSearch(search);
        }}
      >
        <div className="store-search-field">
          <Search size={17} className="store-search-icon" />
          <input
            type="text"
            className="store-search-input"
            aria-label={t.search}
            placeholder={t.search}
            value={search}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={hasSearchSuggestions}
            aria-controls="store-search-suggestions"
            aria-activedescendant={activeSuggestion >= 0 ? `store-search-option-${activeSuggestion}` : undefined}
            onFocus={() => setSearchFocused(true)}
            onChange={e => { setSuggestionFilter('all'); setSearch(e.target.value); }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' && visibleSuggestionItems.length) {
                event.preventDefault();
                setActiveSuggestion(index => Math.min(index + 1, visibleSuggestionItems.length - 1));
              } else if (event.key === 'ArrowUp' && visibleSuggestionItems.length) {
                event.preventDefault();
                setActiveSuggestion(index => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && activeSuggestion >= 0) {
                event.preventDefault();
                const item = searchSuggestions.items[activeSuggestion];
                if (item) applySearchSuggestion(item.value, item.category);
              } else if (event.key === 'Escape') {
                setSearchFocused(false);
              }
            }}
          />
          {search && (
            <button
              type="button"
              className="store-search-clear"
              aria-label={language === 'ar' ? 'مسح' : 'Clear'}
              onClick={() => {
                setSearch('');
                update('q', '');
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="store-search-btn" aria-label={t.search}>
          <span>{language === 'ar' ? 'بحث' : 'Search'}</span>
        </button>
      </form>
      {hasSearchSuggestions && (
        <div id="store-search-suggestions" className="store-search-suggestions">
          <div className="store-search-suggestions-heading">{language === 'ar' ? 'اقتراحات البحث' : 'Search suggestions'}</div>
          <button type="button" className="store-search-query-option" onMouseDown={event => event.preventDefault()} onClick={() => submitSearch(search)}>
            <Search size={16} aria-hidden="true" />
            <span className="store-search-query-copy">
              <small>{language === 'ar' ? 'ابحث عن' : 'Search for'}</small>
              <strong dir="auto">{search.trim()}</strong>
            </span>
            <kbd>↵</kbd>
          </button>
          <div className="store-search-filter-tabs" role="group" aria-label={language === 'ar' ? 'تصفية الاقتراحات' : 'Filter suggestions'}>
            {([
              ['all', language === 'ar' ? 'الكل' : 'All'],
              ['products', language === 'ar' ? 'المنتجات' : 'Products'],
              ['categories', language === 'ar' ? 'الفئات' : 'Categories'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={suggestionFilter === value}
                className={suggestionFilter === value ? 'is-active' : ''}
                onMouseDown={event => event.preventDefault()}
                onClick={() => setSuggestionFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {suggestionLoading && !searchSuggestions.items.length ? (
            <div className="store-search-suggestions-status" role="status">{language === 'ar' ? 'جارٍ البحث في المنتجات…' : 'Finding products…'}</div>
          ) : visibleSuggestionItems.length || visibleSuggestionCategories.length ? (
            <>
              {visibleSuggestionItems.length > 0 && <div id="store-search-suggestions-list" role="listbox" aria-label={language === 'ar' ? 'اقتراحات المنتجات' : 'Product suggestions'}>
                {visibleSuggestionItems.map((item, index) => (
                  <button
                    key={`${item.category}-${item.value}`}
                    id={`store-search-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeSuggestion === index}
                    className={`store-search-suggestion${activeSuggestion === index ? ' is-active' : ''}`}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => applySearchSuggestion(item.value, item.category)}
                  >
                    <Search size={16} aria-hidden="true" />
                    <span className="store-search-suggestion-copy">
                      <span className="store-search-suggestion-title">{item.value}</span>
                      <span className="store-search-suggestion-meta">{item.categoryTitle}</span>
                    </span>
                    <span className="store-search-suggestion-count">{item.count}</span>
                  </button>
                ))}
              </div>}
              {visibleSuggestionCategories.length > 0 && (
                <div className="store-search-category-suggestions">
                  <span>{language === 'ar' ? 'الفئات' : 'Categories'}</span>
                  {visibleSuggestionCategories.map(item => (
                    <button key={item.slug} type="button" onMouseDown={event => event.preventDefault()} onClick={() => applyCategorySuggestion(item.slug)}>
                      {item.title}<small>{item.count}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : !suggestionLoading ? (
            <div className="store-search-suggestions-status">{suggestionFilter === 'categories' ? (language === 'ar' ? 'لا توجد فئات مطابقة' : 'No matching categories') : (language === 'ar' ? 'لا توجد اقتراحات مطابقة' : 'No matching suggestions')}</div>
          ) : null}
        </div>
      )}
      </div>

      <RelatedSearches
        terms={params.has('q') ? data?.relatedSearches ?? [] : []}
        language={language}
        onSelectSearch={submitSearch}
      />

      <CategoryMegaMenu
        categories={data?.categories ?? []}
        activeCategory={category}
        language={language}
        onSelect={() => {}}
        query={params.get('q') ?? undefined}
        langPrefix={'/' + language}
      />

      <FacetFilterBar
        data={data}
        current={params}
        language={language}
        onChange={setParams}
        getLabel={getChipLabel}
      />

      <PopularSearchFilters
        data={data}
        current={params}
        language={language}
        onChange={setParams}
        getLabel={getChipLabel}
      />

      {/* Single-Row Action Bar: Filters Trigger + Count + Sort Select */}
      <div className="store-action-row">
        <div className="store-action-start">
          <button
            type="button"
            className={`store-filter-toggle-btn${showDesktopFilters ? ' is-active' : ''}`}
            onClick={() => {
              if (window.innerWidth > 820) {
                setShowDesktopFilters(prev => !prev);
              } else {
                setDraft(new URLSearchParams(params));
                setOpen(true);
              }
            }}
          >
            <SlidersHorizontal size={14} />
            <span>{t.filters}</span>
            {activeFilterCount > 0 && (
              <span className="store-filter-badge">{activeFilterCount}</span>
            )}
          </button>

          <div className="store-count-chip">
            <span className="store-count-num">{data?.total ?? 0}</span>
            <span className="store-count-label">{t.results}</span>
          </div>
        </div>

        <div className="store-sort-container">
          <ArrowUpDown size={13} className="store-sort-icon" />
          <select
            className="store-sort-select"
            aria-label={t.newest}
            value={params.get('sort') ?? (params.has('q') ? 'relevance' : 'newest')}
            onChange={e => update('sort', e.target.value)}
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {filterChips.length > 0 && (
        <div className="store-chips-row">
          <div className="store-chips-list">
            <Tag size={13} className="store-chips-icon" />
            {filterChips.map(([k, v], i) => (
              <button
                key={`${k}-${v}-${i}`}
                type="button"
                className="store-chip-tag"
                onClick={() => removeFilter(k, v)}
              >
                <span>{getChipLabel(k, v)}</span>
                <X size={12} />
              </button>
            ))}
            <button
              type="button"
              className="store-chip-clear-all"
              onClick={clearAllFilters}
            >
              <RotateCcw size={11} />
              <span>{t.reset}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className={`store-layout${showDesktopFilters ? ' has-sidebar-open' : ''}`}>
        {renderFilterContent(params, p => setParams(p))}

        <section className="store-catalog-section" aria-busy={loading}>
          {error ? (
            <div className="store-error-box" role="alert">
              <span className="store-state-icon store-state-icon-error" aria-hidden="true"><PackageSearch size={25} /></span>
              <div className="store-state-copy">
                <strong>{language === 'ar' ? 'تعذر عرض المنتجات الآن' : 'Products could not be loaded'}</strong>
                <p>{error}</p>
              </div>
              <button type="button" className="store-button secondary" onClick={() => update('retry', String(Date.now()))}>
                <RotateCcw size={14} />
                <span>{t.retry}</span>
              </button>
            </div>
          ) : loading ? (
            <div className="store-loading-box" role="status">
              <div className="store-loading-intro">
                <span className="store-state-icon"><PackageOpen size={23} /></span>
                <div className="store-state-copy">
                  <strong>{language === 'ar' ? 'نجهز لك المنتجات' : 'Getting products ready'}</strong>
                  <span>{t.loading}</span>
                </div>
                <div className="store-spinner" aria-hidden="true" />
              </div>
              <div className="store-loading-skeletons" aria-hidden="true">
                {[0, 1, 2, 3].map(item => <div className="store-loading-skeleton" key={item}><span /><i /><b /></div>)}
              </div>
            </div>
          ) : data?.items.length ? (
            <div className="store-grid">
              {data.items.map(item => (
                <CommerceCard key={item.product.id} item={item} rate={data.pricing?.usdToYer} />
              ))}
            </div>
          ) : (
            <div className="store-empty-box">
              <div className="store-empty-icon-wrap">
                <PackageSearch size={32} />
              </div>
              <h2>{data?.hasCatalog ? t.noResults : t.empty}</h2>
              <p>{data?.hasCatalog ? t.reset : t.emptyNote}</p>
              {data?.hasCatalog ? (
                <button type="button" className="store-button" onClick={() => setParams({})}>
                  <RotateCcw size={15} />
                  <span>{t.reset}</span>
                </button>
              ) : (
                <Link to={'/' + language + '/bundles'} className="store-button secondary">
                  <Sparkles size={15} />
                  <span>{t.packages}</span>
                </Link>
              )}
            </div>
          )}

          {data && data.total > 24 && (
            <nav className="store-pagination" aria-label="Pagination">
              <button
                disabled={data.page <= 1}
                className="store-button secondary"
                onClick={() => update('page', String(data.page - 1))}
              >
                {t.previous}
              </button>
              <span className="store-page-info">{data.page} / {Math.ceil(data.total / 24)}</span>
              <button
                disabled={data.page * 24 >= data.total}
                className="store-button secondary"
                onClick={() => update('page', String(data.page + 1))}
              >
                {t.next}
              </button>
            </nav>
          )}
        </section>
      </div>

      {/* Mobile Drawer Filter Dialog */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="store-overlay" />
          <Dialog.Content className="store-dialog" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="store-dialog-drag-handle" />
            <div className="store-dialog-head">
              <Dialog.Title className="store-dialog-title">
                {t.filters}
                {draftFilterCount > 0 && (
                  <span className="store-dialog-badge">({draftFilterCount})</span>
                )}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="store-close"
                  aria-label={t.close}
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="store-dialog-desc">
              {t.filterHint}
            </Dialog.Description>

            <div className="store-dialog-scroll-body">
              {renderFilterContent(draft, setDraft, true)}
            </div>

            <div className="store-dialog-bottom-actions">
              <button
                type="button"
                className="store-button secondary store-dialog-reset-btn"
                onClick={() => setDraft(new URLSearchParams(draft.get('q') ? { q: draft.get('q')! } : {}))}
              >
                {t.reset}
              </button>
              <button
                type="button"
                className="store-button store-dialog-apply-btn"
                onClick={() => {
                  setParams(draft);
                  setOpen(false);
                }}
              >
                {language === 'ar' ? 'عرض النتائج' : t.apply}
                {data?.total !== undefined ? ` (${data.total})` : ''}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
