import { useState, useMemo, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import '@/commerce.css';
import {
  ShoppingCart,
  X,
  Check,
  Share2,
  MessageCircle,
  Cpu,
  Layers,
  HardDrive,
  Gamepad2,
  Monitor,
  Wifi,
  Printer,
  Headphones,
  Zap,
  Camera,
  Heart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import {
  commerceCopy,
  addCart,
  errorText,
  conditionText,
  type CatalogItem,
  type Offer,
  specText
} from '@/data/commerce';

export function Purchase({ item }: { item: CatalogItem }) {
  const { language } = useLanguage(), t = commerceCopy[language];
  const exchangeRate = useExchangeRate();
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false);

  const available = item.offers.filter(o => o.available);
  const isAvailable = available.length > 0;
  const key = (o: Offer) => o.variantId + ':' + (o.unitId ?? '');

  async function add(o: Offer) {
    setBusy(true);
    setError('');
    try {
      await addCart({ variantId: o.variantId, ...(o.unitId ? { unitId: o.unitId } : {}), quantity: 1 });
      setAdded(true);
      setOpen(false);
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setBusy(false);
    }
  }

  const handlePurchase = () => {
    setAdded(false);
    if (available.length === 1) {
      void add(available[0]);
    } else {
      setSelected(key(available[0]));
      setOpen(true);
    }
  };

  const titleText = added ? t.added : available.length > 1 ? t.choose : isAvailable ? t.add : t.unavailable;

  return (
    <>
      <button
        type="button"
        className={`store-card-action-btn store-btn-cart ${!isAvailable ? 'is-unavailable' : added ? 'is-added' : ''}`}
        disabled={!isAvailable || busy}
        onClick={handlePurchase}
        title={titleText}
        aria-label={titleText}
      >
        {added ? (
          <Check size={16} />
        ) : (
          <ShoppingCart size={16} className={!isAvailable ? 'opacity-40' : ''} />
        )}
      </button>

      {error && <p role="alert" className="store-error text-[10px] mt-1 text-red-500 text-center font-medium col-span-3">{error}</p>}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="store-overlay" />
          <Dialog.Content className="store-dialog" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="store-dialog-drag-handle sm:hidden" />
            <Dialog.Title className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">{t.choose}</Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground mb-4">{item.product.title[language]}</Dialog.Description>
            <Dialog.Close className="store-close" aria-label={t.close}><X size={18} /></Dialog.Close>
            
            <div className="offer-list mb-4">
              {available.map(o => (
                <label key={key(o)} className="offer-row">
                  <input
                    type="radio"
                    name="offer"
                    checked={selected === key(o)}
                    onChange={() => setSelected(key(o))}
                  />
                  <span>
                    <strong dir="ltr">{o.sku}</strong>
                    <span className="offer-specs">
                      {Object.entries(o.specs).slice(0, 6).map(([k, v]) => (
                        <span key={k}>
                          {item.fields.find(f => f.key === k)?.title[language] ?? k}: {specText(v, language)}
                        </span>
                      ))}
                    </span>
                    <span>
                      {conditionText(o.condition, language)} · {o.priceUsd ? '$' + o.priceUsd + (formatPriceYer(calculateYer(o.priceUsd, exchangeRate, o.priceYer), language) ? ' ' + formatPriceYer(calculateYer(o.priceUsd, exchangeRate, o.priceYer), language) : '') : t.ask}
                      {o.batteryHealthPct !== null ? ' · ' + o.batteryHealthPct + '%' : ''}
                    </span>
                    {o.unitId && <small>{language === 'ar' ? 'قطعة مفحوصة ومطابقة' : 'Certified inspected unit'}</small>}
                    {o.defects?.map((d, i) => <small key={i}>{d[language]}</small>)}
                  </span>
                </label>
              ))}
            </div>
            
            <button
              type="button"
              className="store-button w-full"
              disabled={busy || !selected}
              onClick={() => {
                const o = available.find(o => key(o) === selected);
                if (o) void add(o);
              }}
            >
              {t.add}
            </button>
            <Link
              to={'/' + language + '/cart'}
              className="block text-center mt-3 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              {t.cart}
            </Link>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default function CommerceCard({ item, rate, badge }: { item: CatalogItem; rate?: string | null; badge?: 'top' | 'new' | null }) {
  const { language } = useLanguage(), t = commerceCopy[language], p = item.product;
  const { site } = useCatalog();
  const catalogExchangeRate = useExchangeRate();
  const effectiveRate = rate || catalogExchangeRate;
  const [copied, setCopied] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [favorite, setFavorite] = useState(() => {
    try { return JSON.parse(localStorage.getItem('al-arabi-favorites') || '[]').includes(p.id); } catch { return false; }
  });

  const priced = item.offers.filter(o => o.priceUsd !== null).sort((a, b) => Number(a.priceUsd) - Number(b.priceUsd));
  const o = priced[0] ?? item.offers[0];
  const effectiveYer = calculateYer(o?.priceUsd, effectiveRate, o?.priceYer);
  const yerFormatted = formatPriceYer(effectiveYer, language);
  const isLaptop = p.category === 'laptops';
  const title = p.title[language] || p.title.ar;
  const displayTitle = title;
  const cardImages = [...new Set([...(o?.images ?? []), ...p.images].filter(Boolean))];
  const activeImage = cardImages[imageIndex] ?? cardImages[0];
  const fields = item.fields.filter(f => f.card && o?.specs[f.key] !== undefined).sort((a, b) => a.sort - b.sort).slice(0, 4);

  const productPath = `/${language}/shop/${p.category}/${p.slug}`;
  const getProductUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${productPath}`;
    }
    return productPath;
  };

  const handleShare = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getProductUrl();
    const title = p.title[language] || p.title.ar;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or fallback
      }
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const changeImage = (e: MouseEvent, direction: number) => {
    e.preventDefault(); e.stopPropagation();
    if (cardImages.length > 1) setImageIndex(index => (index + direction + cardImages.length) % cardImages.length);
  };

  const toggleFavorite = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    try {
      const saved = JSON.parse(localStorage.getItem('al-arabi-favorites') || '[]') as string[];
      localStorage.setItem('al-arabi-favorites', JSON.stringify(next ? [...new Set([...saved, p.id])] : saved.filter(id => id !== p.id)));
    } catch { /* Keep the button responsive if browser storage is unavailable. */ }
  };

  const whatsappPhone = site?.whatsapp ? site.whatsapp.replace(/\D/g, '') : '967771001044';

  const whatsappUrl = useMemo(() => {
    const url = getProductUrl();
    const priceText = o?.priceUsd ? `$${o.priceUsd}` : (language === 'ar' ? 'اسأل عن السعر' : 'Ask for price');
    const titleText = p.title[language] || p.title.ar;
    const modelText = p.model ? ` (${p.model})` : '';

    const textAr = `السلام عليكم ورحمة الله، أود الاستفسار عن هذا الصنف:\n• الصنف: ${titleText}${modelText}\n• السعر: ${priceText}\n• الرابط: ${url}`;
    const textEn = `Hello, I would like to inquire about this product:\n• Product: ${titleText}${modelText}\n• Price: ${priceText}\n• Link: ${url}`;

    const msg = language === 'ar' ? textAr : textEn;
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
  }, [p, o, language, whatsappPhone, productPath]);

  // Clean brand / condition labels
  const conditionLabel = useMemo(() => {
    return conditionText(o?.condition, language);
  }, [o?.condition, language]);

  const isBrandNew = o?.condition === 'new';

  // Build spec chips based on category
  const specChips = useMemo(() => {
    interface Chip {
      icon: any;
      label: string;
      type: string;
    }
    const chips: Chip[] = [];

    if (isLaptop || p.category === 'gaming' || (p.category === 'desktops' && Boolean(o?.specs?.cpu)) || Boolean(o?.specs?.cpu)) {
      // CPU
      const cpu = o?.specs?.cpuFamily
        ? String(o.specs.cpuFamily).replace(/^(Intel|AMD)\s+/i, '')
        : (o?.specs?.cpu ? String(o.specs.cpu).split(' ').slice(0, 2).join(' ').replace(/^(Intel|AMD)\s+/i, '') : null);
      if (cpu) chips.push({ icon: Cpu, label: cpu, type: 'chip-cpu' });

      // RAM
      const ram = o?.specs?.ramGB ? String(o.specs.ramGB) : null;
      if (ram) chips.push({ icon: Layers, label: `${ram}GB RAM`, type: 'chip-ram' });

      // Storage
      const storage = typeof o?.specs?.storageGB === 'number' ? o.specs.storageGB : (o?.specs?.storageGB ? Number(o.specs.storageGB) : null);
      if (storage !== null && !isNaN(storage)) {
        chips.push({ icon: HardDrive, label: `${storage >= 1000 ? Math.round(storage / 1000) + 'TB' : storage + 'GB'} SSD`, type: 'chip-storage' });
      }

      // GPU (Optimized & shortened)
      const isDedicated = o?.specs?.gpuType === 'dedicated' || (typeof o?.specs?.gpu === 'string' && /RTX|GTX|GeForce|Radeon|Quadro|T\d{3,4}/i.test(o.specs.gpu));
      if (isDedicated) {
        let gpuShort = 'GPU';
        const rawGpu = String(o?.specs?.gpuFamily || o?.specs?.gpu || '');
        const rtxMatch = rawGpu.match(/RTX\s*[A-Z]?\d{3,4}(?:\s*Ti)?/i);
        const gtxMatch = rawGpu.match(/GTX\s*\d{3,4}(?:\s*Ti)?/i);
        const quadroMatch = rawGpu.match(/Quadro\s*\w+/i);
        const radeonMatch = rawGpu.match(/Radeon\s*\w+/i);
        
        if (rtxMatch) gpuShort = rtxMatch[0];
        else if (gtxMatch) gpuShort = gtxMatch[0];
        else if (quadroMatch) gpuShort = quadroMatch[0];
        else if (radeonMatch) gpuShort = radeonMatch[0];
        else if (rawGpu.includes('RTX Pro') || rawGpu.includes('Workstation')) gpuShort = 'RTX Workstation';
        else if (o?.specs?.gpuFamily) gpuShort = String(o.specs.gpuFamily).replace(/NVIDIA|GeForce/gi, '').trim();

        chips.push({ icon: Gamepad2, label: gpuShort, type: 'chip-gpu' });
      }

      // Screen
      const screen = o?.specs?.screenSize ? String(o.specs.screenSize) : (o?.specs?.sizeInch ? String(o.specs.sizeInch) : null);
      const hz = (o?.specs?.display as any)?.hz;
      if (screen) {
        chips.push({ icon: Monitor, label: `${screen}"${hz && hz > 60 ? ` ${hz}Hz` : ''}`, type: 'chip-display' });
      }
    } else if (p.category === 'hard-drives' || p.category === 'storage') {
      const cap = typeof o?.specs?.capacityGB === 'number' ? o.specs.capacityGB : (typeof o?.specs?.storageGB === 'number' ? o.specs.storageGB : (o?.specs?.capacityGB ? Number(o.specs.capacityGB) : null));
      if (cap !== null && !isNaN(cap)) {
        chips.push({ icon: HardDrive, label: cap >= 1000 ? `${(cap / 1000).toFixed(cap % 1000 === 0 ? 0 : 1)} TB` : `${cap} GB`, type: 'chip-storage' });
      }

      const hddType = String(o?.specs?.hddType || '');
      const storageType = String(o?.specs?.storageType || '');
      if (hddType === 'NVMe' || storageType.includes('NVMe')) {
        chips.push({ icon: Zap, label: 'NVMe M.2', type: 'chip-cpu' });
      } else if (hddType === 'SSD' || storageType.includes('SATA SSD')) {
        chips.push({ icon: Zap, label: 'SATA SSD', type: 'chip-cpu' });
      } else if (hddType.includes('External')) {
        chips.push({ icon: Zap, label: language === 'ar' ? 'خارجي' : 'External', type: 'chip-cpu' });
      }

      const speed = o?.specs?.readSpeedMBs ? `${o.specs.readSpeedMBs} MB/s` : (o?.specs?.rpm ? `${o.specs.rpm} RPM` : null);
      if (speed) {
        chips.push({ icon: Zap, label: speed, type: 'chip-ram' });
      }
    } else if (p.category === 'ram') {
      const rawRam = o?.specs?.ramGB ?? o?.specs?.capacityGB;
      if (rawRam) chips.push({ icon: Layers, label: `${rawRam} GB`, type: 'chip-ram' });
      const ddr = o?.specs?.ddrGen || o?.specs?.ramType ? String(o.specs.ddrGen || o.specs.ramType).toUpperCase() : null;
      if (ddr) chips.push({ icon: Zap, label: ddr, type: 'chip-cpu' });
      const speed = o?.specs?.speedMhz ? `${o.specs.speedMhz}MHz` : null;
      if (speed) chips.push({ icon: Zap, label: speed, type: 'chip-storage' });
    } else if (p.category === 'cameras') {
      const res = o?.specs?.resolution ? String(o.specs.resolution) : (o?.specs?.megapixel ? `${o.specs.megapixel} MP` : null);
      if (res) chips.push({ icon: Camera, label: res, type: 'chip-cpu' });
      if (o?.specs?.nightVision) chips.push({ icon: Camera, label: language === 'ar' ? 'رؤية ليلية' : 'Night Vision', type: 'chip-special' });
    } else if (p.category === 'displays') {
      const disp = (o?.specs?.display && typeof o.specs.display === 'object' ? o.specs.display : {}) as any;
      const size = disp.sizeIn ? `${disp.sizeIn}"` : (o?.specs?.sizeIn ? `${o.specs.sizeIn}"` : null);
      if (size) chips.push({ icon: Monitor, label: size, type: 'chip-display' });
      const res = disp.res ? (disp.res === '2560x1440' ? '2K QHD' : disp.res === '3840x2160' ? '4K UHD' : disp.res) : null;
      if (res) chips.push({ icon: Monitor, label: res, type: 'chip-cpu' });
      if (disp.panel || o?.specs?.panel) chips.push({ icon: Monitor, label: String(disp.panel || o?.specs?.panel), type: 'chip-neutral' });
    } else if (p.category === 'network') {
      const wifi = o?.specs?.wifiStandard ? String(o.specs.wifiStandard).split('(')[0].trim() : null;
      if (wifi) chips.push({ icon: Wifi, label: wifi, type: 'chip-wifi' });
      const speed = o?.specs?.speedMbps ? `${o.specs.speedMbps} Mbps` : null;
      if (speed) chips.push({ icon: Zap, label: speed, type: 'chip-cpu' });
    } else if (p.category === 'power') {
      const va = o?.specs?.capacityVA ? `${o.specs.capacityVA} VA` : null;
      const watts = o?.specs?.capacityWatts ? `${o.specs.capacityWatts} W` : null;
      const outlets = o?.specs?.outletsCount ? `${o.specs.outletsCount} ${language === 'ar' ? 'منافذ' : 'Outlets'}` : null;
      if (va) chips.push({ icon: Zap, label: va, type: 'chip-power' });
      if (watts) chips.push({ icon: Zap, label: watts, type: 'chip-storage' });
      if (outlets) chips.push({ icon: Zap, label: outlets, type: 'chip-neutral' });
    } else if (p.category === 'printers') {
      if (o?.specs?.printTech) chips.push({ icon: Printer, label: String(o.specs.printTech), type: 'chip-cpu' });
      if (o?.specs?.functions) chips.push({ icon: Printer, label: String(o.specs.functions), type: 'chip-neutral' });
    } else if (p.category === 'audio') {
      if (o?.specs?.audioType) chips.push({ icon: Headphones, label: String(o.specs.audioType), type: 'chip-special' });
      if (o?.specs?.anc) chips.push({ icon: Headphones, label: 'ANC', type: 'chip-storage' });
    } else {
      fields.slice(0, 3).forEach(f => {
        chips.push({
          icon: Zap,
          label: `${f.title[language]}: ${specText(o.specs[f.key], language)}`,
          type: 'chip-neutral'
        });
      });
    }

    return chips.slice(0, 4);
  }, [isLaptop, p.category, o?.specs, fields, language]);

  const hasDiscount = Boolean(o?.originalPriceUsd && Number(o.originalPriceUsd) > Number(o?.priceUsd));
  const discountPercent = hasDiscount
    ? (o?.discountPercent ?? Math.round(((Number(o!.originalPriceUsd) - Number(o!.priceUsd)) / Number(o!.originalPriceUsd)) * 100))
    : 0;

  return (
    <article className="store-card">
      {/* Product Image & Floating Badges */}
      <div className="store-card-image group">
        <Link to={productPath} className="store-card-image-link" aria-label={title}>
        {/* Primary image */}
        {activeImage && (
          <img
            src={activeImage}
            alt={p.title[language]}
            width={480}
            height={360}
            loading="lazy"
            className="store-card-img-primary"
          />
        )}

        {/* Secondary image (shown on hover when available) */}
        {/* Floating Top Badges */}
        <div className="store-card-badges-row">
          {hasDiscount && (
            <span className="store-discount-badge">
              {language === 'ar' ? `-${discountPercent}%` : `-${discountPercent}%`}
            </span>
          )}

          {/* badge prop: 'top' = الأكثر طلباً, 'new' = وصل حديثاً */}
          {badge === 'top' && !hasDiscount && (
            <span className="store-bestseller-badge">
              {language === 'ar' ? 'الأكثر طلباً' : 'Best Seller'}
            </span>
          )}
          {badge === 'new' && !hasDiscount && (
            <span className="store-new-arrival-badge">
              {language === 'ar' ? 'وصل حديثاً' : 'New Arrival'}
            </span>
          )}

          {p.demo ? (
            <span className="store-demo-badge">
              {t.demo}
            </span>
          ) : isLaptop && o?.specs?.touch ? (
            <span className="store-touch-badge">
              {language === 'ar' ? 'شاشة لمس' : 'Touch'}
            </span>
          ) : null}
        </div>

        </Link>
        <button type="button" className={`store-card-favorite${favorite ? ' is-active' : ''}`} onClick={toggleFavorite} aria-pressed={favorite} aria-label={favorite ? (language === 'ar' ? 'إزالة من المفضلة' : 'Remove from favorites') : (language === 'ar' ? 'أضف إلى المفضلة' : 'Add to favorites')} title={favorite ? (language === 'ar' ? 'في المفضلة' : 'Saved') : (language === 'ar' ? 'أضف إلى المفضلة' : 'Add to favorites')}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
        {cardImages.length > 1 && <div className="store-card-gallery-controls" dir="ltr"><button type="button" aria-label={language === 'ar' ? 'الصورة السابقة' : 'Previous image'} onClick={e => changeImage(e, -1)}><ChevronLeft size={17} /></button><span>{imageIndex + 1} / {cardImages.length}</span><button type="button" aria-label={language === 'ar' ? 'الصورة التالية' : 'Next image'} onClick={e => changeImage(e, 1)}><ChevronRight size={17} /></button></div>}
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="store-card-quick-wa" aria-label={language === 'ar' ? 'استفسار عبر واتساب' : 'Ask on WhatsApp'} onClick={e => e.stopPropagation()}><MessageCircle size={14} className="shrink-0" /><span>{language === 'ar' ? 'اسأل الآن' : 'Ask Now'}</span></a>
      </div>

      {/* Card Content Body */}
      <div className="store-card-body">
        {/* Brand & Condition Bar */}
        <div className="store-card-header-row">
          {conditionLabel ? (
            <span className={`store-condition-pill ${isBrandNew ? 'is-new' : 'is-used'}`}>
              {conditionLabel}
            </span>
          ) : <span />}
          <span className="store-card-brand truncate" title={p.brand} dir="ltr">
            {p.brand && p.brand !== 'غير محددة' ? p.brand : (language === 'ar' ? 'الجيل العربي' : 'Al-Arabi')}
          </span>
        </div>

        {/* Title */}
        <h2>
          <Link to={productPath} title={title} aria-label={title}>
            {displayTitle}
          </Link>
        </h2>

        {/* Spec Chips */}
        <div className="store-specs-wrap">
          {specChips.map((chip, idx) => {
            const IconComponent = chip.icon;
            return (
              <span key={idx} className={`store-spec-chip ${chip.type}`}>
                <IconComponent size={11} className="shrink-0" />
                <span className="truncate max-w-[120px]">{chip.label}</span>
              </span>
            );
          })}
        </div>

        {/* Price Section */}
        <div className="store-price-row">
          <div className="store-price-left">
            {hasDiscount && (
              <div className="store-old-price-line">
                <span className="line-through font-medium" dir="ltr">${o!.originalPriceUsd}</span>
                <span className="store-save-pill">
                  {language === 'ar'
                    ? `وفر $${Math.round(Number(o!.originalPriceUsd) - Number(o!.priceUsd))}`
                    : `Save $${Math.round(Number(o!.originalPriceUsd) - Number(o!.priceUsd))}`}
                </span>
              </div>
            )}
            <strong className="store-price-main" dir="ltr">
              {o?.priceUsd ? '$' + o.priceUsd : t.ask}
            </strong>
          </div>

          {yerFormatted && (
            <small className="store-price-sub">
              {yerFormatted}
            </small>
          )}
        </div>

        {/* Single Row Actions Bar (Cart, WhatsApp, Share) */}
        <div className="store-card-actions-bar">
          <Purchase item={item} />

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="store-card-action-btn store-btn-whatsapp"
            title={language === 'ar' ? 'استفسار عبر واتساب' : 'Inquire on WhatsApp'}
            aria-label={language === 'ar' ? 'استفسار عبر واتساب' : 'Inquire on WhatsApp'}
          >
            <MessageCircle size={16} className="shrink-0" />
          </a>

          <button
            type="button"
            onClick={handleShare}
            className={`store-card-action-btn store-btn-share ${copied ? 'copied' : ''}`}
            title={copied ? (language === 'ar' ? 'تم نسخ الرابط!' : 'Copied!') : (language === 'ar' ? 'مشاركة الرابط' : 'Share')}
            aria-label={language === 'ar' ? 'مشاركة الرابط' : 'Share'}
          >
            {copied ? <Check size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Share2 size={16} className="shrink-0" />}
          </button>
        </div>
      </div>
    </article>
  );
}



