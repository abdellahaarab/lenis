import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { Link } from 'react-router-dom';
import type { Product } from '@/data/types';
import { useLanguage } from '@/i18n/LanguageContext';
import ProductImage from './ProductImage';
import { calculateYer, formatPriceYer } from '@/lib/currency';

export default function ProductCard({ product }: { product: Product }) {
  const { site } = useCatalog();
  const exchangeRate = useExchangeRate();
  const { language, t } = useLanguage();
  const path = `/${language}/shop/${product.category}/${product.slug}`;
  const specs = [
    product.specs.cpu,
    product.specs.ramGB ? `${product.specs.ramGB} GB RAM` : null,
    product.specs.storageGB ? `${product.specs.storageGB} GB ${product.specs.storageType}` : null,
    product.specs.display ? `${product.specs.display.sizeIn}″ · ${product.specs.display.hz} Hz` : null,
    product.specs.wifiStandard,
    product.specs.capacityGB ? `${product.specs.capacityGB} GB · ${product.specs.interface}` : null,
    product.specs.connectionType
  ].filter(Boolean);
  const title = product.title[language];
  const yerPrice = calculateYer(product.price.usd, exchangeRate, product.price.yer);
  const yerFormatted = formatPriceYer(yerPrice, language);

  return (
    <article className="catalog-card">
      <Link className="catalog-media" to={path} viewTransition aria-label={title}>
        <ProductImage src={product.images[0]} id={product.id} alt={title} shared />
        <span className="catalog-demo">
          {product.demo ? (language === 'ar' ? 'نموذج تجريبي' : 'Demo model') : t.shop.conditionLabels[product.condition]}
        </span>
      </Link>
      <div className="catalog-body">
        <span className="catalog-brand">{product.brand}</span>
        <h3><Link to={path} viewTransition>{title}</Link></h3>
        <p className="catalog-summary">{product.summary[language]}</p>
        <ul className="catalog-specs">
          {specs.slice(0, 4).map((value, i) => (
            <li key={i}><bdi>{value}</bdi></li>
          ))}
        </ul>
        <div className="catalog-condition">
          <span>{t.shop.conditionLabels[product.condition]}</span>
          <span>{product.demo ? (language === 'ar' ? 'التوفر يحتاج تأكيدًا' : 'Stock unconfirmed') : t.shop.stockLabels[product.stock]}</span>
        </div>
        <p className="catalog-warranty">
          {product.warrantyMonths == null ? t.shop.warrantyTBD : `${product.warrantyMonths} ${language === 'ar' ? 'شهر' : 'months'}`}
        </p>
        <div className="catalog-footer">
          <div className="catalog-price-block">
            {product.price.originalUsd && product.price.usd && product.price.originalUsd > product.price.usd && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--muted)', fontWeight: 500 }}>
                  ${product.price.originalUsd}
                </span>
                <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                  -{product.price.discountPercent ?? Math.round(((product.price.originalUsd - product.price.usd) / product.price.originalUsd) * 100)}%
                </span>
              </div>
            )}
            <strong>{product.price.usd == null ? t.shop.askForPrice : `$${product.price.usd}`}</strong>
            {yerFormatted && (
              <small className="catalog-price-yer">{yerFormatted}</small>
            )}
          </div>
          <Link to={path} viewTransition>
            {t.shop.viewDetails} <span aria-hidden="true">{language === 'ar' ? '↖' : '↗'}</span>
          </Link>
        </div>
        {product.price.updatedAt && <small>{product.price.updatedAt}</small>}
        {site.whatsapp && (
          <a
            className="desk-text-link"
            href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noreferrer"
          >
            {t.shop.askAboutProduct}
          </a>
        )}
      </div>
    </article>
  );
}
