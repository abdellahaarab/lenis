import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Product } from '@/data/types';
import ProductImage from '@/components/shop/ProductImage';
import {
  Layers,
  ArrowUpLeft,
  ArrowUpRight,
  CheckCircle,
  Briefcase,
  GraduationCap,
  Sparkles,
  Gamepad2,
  Zap,
  ShieldCheck
} from 'lucide-react';

export default function CuratedSetups() {
  const { bundles: bundles, products: productsData } = useCatalog();
  const exchangeRate = useExchangeRate();
  const { language, t } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const allProducts = productsData as Product[];

  const [selectedBundleId, setSelectedBundleId] = useState(bundles[1]?.id || bundles[0]?.id);
  const currentBundle = bundles.find(b => b.id === selectedBundleId) || bundles[0];
  const primaryTier = currentBundle?.tiers[0];
  const bundleProducts = (primaryTier?.items??[])
    .map(id => allProducts.find(p => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const bundleIcons: Record<string, any> = {
    study: GraduationCap,
    work: Briefcase,
    content: Sparkles,
    gaming: Gamepad2,
    security: ShieldCheck
  };

  if(!currentBundle||!primaryTier)return null;
  return (
    <section id="setups" className="curated-setups-section page-shell">
      {/* Section Header */}
      <div className="section-head-wrap">
        <div>
          <div className="eyebrow-chip">
            <Layers size={15} />
            <span>{ar ? 'تجهيزات بيئات العمل' : 'Engineered Setups'}</span>
          </div>
          <h2>
            {ar ? 'مكتبك وبيئة عملك.. مجهزة بحسب طبيعة يومك' : 'Your Workspace.. Engineered For Your Daily Workflow'}
          </h2>
        </div>
        <p className="section-head-desc">
          {ar
            ? 'توليفات مدروسة تجمع بين الحواسيب النخبوية، شاشات العرض، وحدات الطاقة، والشبكات لضمان أقصى إنتاجية بدون انقطاع.'
            : 'Cohesive hardware ecosystems combining enterprise laptops, calibrated displays, UPS battery backups, and high-speed mesh networking.'}
        </p>
      </div>

      {/* Setup Category Tabs */}
      <div className="setups-tab-nav" role="tablist">
        {bundles.map(bundle => {
          const Icon = bundleIcons[bundle.id] || Layers;
          const isActive = bundle.id === selectedBundleId;
          return (
            <button
              key={bundle.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedBundleId(bundle.id)}
              className={`setup-tab-button ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={18} />
              <span>{bundle.title[language]}</span>
            </button>
          );
        })}
      </div>

      {/* Active Setup Card Showcase */}
      <div className="setup-display-card">
        <div className="setup-display-meta">
          <div className="setup-meta-info">
            <span className="setup-tag-badge">
              {ar ? 'تجهيز معتمد ومتوافق' : 'Verified Compatible Setup'}
            </span>
            <h3>{currentBundle.title[language]}</h3>
            <p className="setup-summary-text">{primaryTier.summary[language]}</p>
          </div>

          <div className="setup-problem-box">
            <div className="problem-label">
              <Zap size={15} className="text-amber" />
              <span>{ar ? 'ما الذي تحله هذه المنظومة؟' : 'Problem Solved:'}</span>
            </div>
            <p>{currentBundle.problemSolved[language]}</p>
            <small>{currentBundle.why[language]}</small>
          </div>

          <div className="setup-cta-row">
            <a href="#contact" className="desk-action order-action">
              <span>{ar ? 'طلب تجهيز هذا المكتب' : 'Request This Setup'}</span>
              <Arrow size={18} />
            </a>
            <span className="setup-price-indicator">
              {primaryTier.price.usd == null ? (
                ar ? 'الأسعار تُحدد عند اعتماد التوليفة' : 'Custom configuration pricing'
              ) : (
                <>
                  <bdi dir="ltr">${primaryTier.price.usd}</bdi>
                  {(() => {
                    const yer = calculateYer(primaryTier.price.usd, exchangeRate, primaryTier.price.yer);
                    const yerFormatted = formatPriceYer(yer, language);
                    return yerFormatted ? (
                      <span className="setup-price-yer ms-1.5 opacity-85 text-xs font-normal">
                        {yerFormatted}
                      </span>
                    ) : null;
                  })()}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Setup Products Row */}
        <div className="setup-display-items">
          <div className="setup-items-label">
            <ShieldCheck size={16} />
            <span>{ar ? 'مكونات التجهيز المفحوصة والمترابطة:' : 'Connected & Inspected Setup Components:'}</span>
          </div>

          <div className="setup-devices-grid">
            {bundleProducts.map((p, idx) => (
              <div key={p.id} className="setup-device-card">
                <div className="setup-device-media">
                  <ProductImage src={p.images[0]} id={p.id} alt={p.title[language]} />
                  <span className="setup-device-index">0{idx + 1}</span>
                </div>
                <div className="setup-device-info">
                  <span className="device-brand-label">{p.brand}</span>
                  <h4>
                    <Link to={`/${language}/shop/${p.category}/${p.slug}`} viewTransition>
                      {p.title[language]}
                    </Link>
                  </h4>
                  <p className="device-specs-snippet">
                    {p.specs.cpu || p.specs.panel || p.specs.wifiStandard || p.specs.capacityGB ? (
                      <>
                        {p.specs.cpu && <span>{p.specs.cpu} · </span>}
                        {p.specs.ramGB && <span>{p.specs.ramGB}GB RAM · </span>}
                        {p.specs.storageGB && <span>{p.specs.storageGB}GB SSD</span>}
                        {p.specs.capacityGB && <span>{p.specs.capacityGB}GB NVMe</span>}
                        {p.specs.wifiStandard && <span>{p.specs.wifiStandard}</span>}
                        {p.specs.panel && <span>{p.specs.panel} Panel</span>}
                      </>
                    ) : (
                      p.summary[language]
                    )}
                  </p>
                  <Link
                    to={`/${language}/shop/${p.category}/${p.slug}`}
                    className="device-inspect-link"
                    viewTransition
                  >
                    <span>{ar ? 'مواصفات الجهاز' : 'Device Specs'}</span>
                    <Arrow size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
