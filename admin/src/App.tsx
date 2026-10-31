import { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { can, LoginSchema, type SessionResponse, type Permission } from '@aljeel/shared';
import { LayoutDashboard, UsersRound, ShieldCheck, ScrollText, LogOut, Menu, Package, LockKeyhole, Layers, Boxes, Tags, Tag, SlidersHorizontal, ShoppingBag, Warehouse, FileSpreadsheet, Coins, Image, FolderTree, Sparkles, ExternalLink, ArrowUpRight, Activity, Trophy, Languages, Sun, Moon, BarChart2, MessageSquare, AlertTriangle } from 'lucide-react';
import { api, getSession, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox, PreferencesButtons, FieldError, MobileDrawer, EnglishFieldsToggle } from './components';
import { Staff } from './Staff';
import { Security } from './Security';
import { Audit } from './Audit';
import { ContentSettings, ReferenceSettings, MediaLibrary } from './Content';
import ProductManager from './ProductManager';
import { ProductUpdates } from './ProductUpdates';
import { ExpoContest } from './ExpoContest';
import { CollectionsManager } from './CollectionsManager';
import { BrandsManager } from './BrandsManager';
import { TypesManager } from './TypesManager';
import { VariantsManager } from './VariantsManager';
import { PackagesManager } from './PackagesManager';
import { CouponsManager } from './CouponsManager';
import {
  CommerceCatalog,
  Inventory,
  OrdersAdmin,
  CustomersAdmin,
  PricingAdmin,
  CsvAdmin,
  CommerceContainer,
} from './Commerce';
import { Analytics } from './Analytics';
import { Crm } from './Crm';


const AuthContext = createContext<SessionResponse | null>(null);
export function useSession() {
  const session = useContext(AuthContext);
  if (!session) throw new Error('Session missing');
  return session;
}

const loginFormSchema = LoginSchema.extend({ code: z.string().regex(/^\d{6}$/).or(z.literal('')).optional() });

function Login() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema)
  });

  return (
    <main className="login-page">
      <div className="login-tools"><PreferencesButtons showEnToggle={false} /></div>
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <span className="eyebrow">{t('privateSpace')}</span>
          <h1>{t('loginIntro')}</h1>
          <p>{t('storeLocation')}</p>
          <div className="story-features">
            {[t('loginFeature1'), t('loginFeature2'), t('loginFeature3')].map(text => (
              <div key={text}><ShieldCheck size={19} />{text}</div>
            ))}
          </div>
        </div>
        <div className="story-foot"><LockKeyhole size={16} />{t('protected')}</div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <div className="section-icon"><LockKeyhole size={24} /></div>
          <span className="eyebrow">{t('admin')}</span>
          <h2>{t('loginTitle')}</h2>
          <p className="muted">{t('loginHint')}</p>
          <form onSubmit={handleSubmit(async values => {
            setError('');
            try {
              const session = await api<SessionResponse>('/auth/login', {
                method: 'POST',
                body: { ...values, code: values.code || undefined }
              });
              queryClient.setQueryData(['session'], session);
            } catch (error) {
              setError(error instanceof ApiError ? error.code : 'failed');
            }
          })}>
            <ErrorBox code={error} />
            <label>
              {t('email')}
              <input dir="ltr" type="email" autoComplete="username" {...register('email')} aria-invalid={!!errors.email} />
              <FieldError message={errors.email?.message} />
            </label>
            <label>
              {t('password')}
              <input dir="ltr" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
              <FieldError message={errors.password?.message} />
            </label>
            <label>
              {t('optionalCode')}
              <input dir="ltr" inputMode="numeric" maxLength={6} autoComplete="one-time-code" {...register('code')} aria-invalid={!!errors.code} />
              <FieldError message={errors.code?.message} />
            </label>
            <button className="button primary full" disabled={isSubmitting}>
              {isSubmitting ? t('loading') : t('signIn')}
              <LockKeyhole size={17} />
            </button>
          </form>
          <p className="seed-hint">{t('seedHint')}</p>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  const { t } = useI18n();
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">ج<span /></div>
      <div>
        <strong>{t('brand')}</strong>
        <small>{t('admin')}</small>
      </div>
    </div>
  );
}

type NavSection = {
  titleKey: string;
  items: { to: string; key: string; icon: typeof LayoutDashboard; permission?: Permission; permissions?: Permission[] }[];
};

const navSections: NavSection[] = [
  {
    titleKey: 'mainNav',
    items: [
      { to: '/', key: 'dashboard', icon: LayoutDashboard },
    ]
  },
  {
    titleKey: 'catalogSection',
    items: [
      { to: '/products', key: 'catalog', icon: Package, permission: 'catalog.edit' },
      { to: '/product-updates', key: 'productUpdates', icon: FileSpreadsheet, permission: 'catalog.edit' },
      { to: '/categories', key: 'categoriesModule', icon: FolderTree, permission: 'catalog.edit' },
      { to: '/brands', key: 'brandsModule', icon: Tags, permission: 'catalog.edit' },
      { to: '/types', key: 'typesModule', icon: SlidersHorizontal, permission: 'catalog.edit' },
      { to: '/variants', key: 'variantsModule', icon: Layers, permission: 'catalog.edit' },
      { to: '/collections', key: 'collectionsModule', icon: Boxes, permission: 'catalog.edit' },
      { to: '/packages', key: 'packagesModule', icon: Sparkles, permission: 'catalog.edit' },
    ]
  },
  {
    titleKey: 'operationsSection',
    items: [
      { to: '/orders', key: 'ordersModule', icon: ShoppingBag, permission: 'orders.manage' },
      { to: '/coupons', key: 'couponsModule', icon: Tag, permission: 'orders.manage' },
      { to: '/inventory', key: 'inventoryModule', icon: Warehouse, permission: 'inventory.manage' },
      { to: '/units', key: 'units', icon: Package, permission: 'inventory.manage' },
      { to: '/customers', key: 'customersModule', icon: UsersRound, permission: 'customers.manage' },
      { to: '/pricing', key: 'pricingModule', icon: Coins, permission: 'prices.edit' },
      { to: '/csv', key: 'csvModule', icon: FileSpreadsheet, permission: 'inventory.manage' },
      { to: '/expo', key: 'expoContest', icon: Trophy, permission: 'contest.manage' },
    ]
  },
  {
    titleKey: 'contentSection',
    items: [
      { to: '/content', key: 'content', icon: ScrollText, permission: 'settings.manage' },
      { to: '/media', key: 'media', icon: Image, permission: 'catalog.edit' },
      { to: '/reference', key: 'reference', icon: SlidersHorizontal, permission: 'catalog.edit' },
    ]
  },
  {
    titleKey: 'analyticsSection',
    items: [
      { to: '/analytics', key: 'analyticsModule', icon: BarChart2, permissions: ['analytics.read', 'analytics.limited'] },
      { to: '/crm', key: 'crmModule', icon: MessageSquare, permission: 'crm.read' as Permission },
    ]
  },
  {
    titleKey: 'systemSection',
    items: [
      { to: '/users', key: 'staff', icon: UsersRound, permission: 'staff.manage' },
      { to: '/security', key: 'security', icon: ShieldCheck },
      { to: '/audit', key: 'audit', icon: Activity, permission: 'audit.read' },
    ]
  }
];

const allNavLinks = navSections.flatMap(s => s.items);

function Shell() {
  const { user } = useSession();
  const { t, lang, toggleLanguage, theme, toggleTheme } = useI18n();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');

  const currentNav = allNavLinks.find(link => link.to === location.pathname);
  const title = location.pathname === '/browser' ? t('catalog') : t(currentNav?.key ?? 'control');

  const renderNavGroups = (onItemClick?: () => void) => (
    <div className="sidebar-nav-groups">
      {navSections.map(section => {
        const visible = section.items.filter(item => {
          if (item.permissions) return item.permissions.some(p => can(user.role, p));
          if (item.permission) return can(user.role, item.permission);
          return true;
        });
        if (!visible.length) return null;
        return (
          <div className="nav-group-block" key={section.titleKey}>
            <div className="nav-group-heading">{t(section.titleKey)}</div>
            <nav className="nav-group-links" aria-label={t(section.titleKey)}>
              {visible.map(({ to, key, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onItemClick}
                  className={({ isActive }) => `nav-link-pill ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{t(key)}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <Link to="/" className="brand-link"><Brand /></Link>
        </div>

        <div className="sidebar-scrollable">
          {renderNavGroups()}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-status-banner">
            <span className="live-dot" />
            <div>
              <strong>{t('foundationReady')}</strong>
              <small>{t('foundation')}</small>
            </div>
          </div>

          <div className="sidebar-user-block">
            <Avatar />
            <div className="user-info-text">
              <strong>{user.name}</strong>
              <small>{t(user.role)}</small>
            </div>
            <button
              className="logout-icon-btn"
              title={t('logout')}
              onClick={async () => {
                try {
                  await api('/auth/logout', { method: 'POST', body: {} });
                  queryClient.clear();
                  queryClient.setQueryData(['session'], null);
                } catch (error) {
                  setError(error instanceof ApiError ? error.code : 'failed');
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="icon-button mobile-menu"
              aria-label={t('menu')}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">{t('admin')}</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{title}</strong>
          </div>

          <div className="topbar-controls">
            <a
              href="/ar/shop/browser"
              target="_blank"
              rel="noopener noreferrer"
              className="storefront-link-pill"
              title={t('brand')}
            >
              <ExternalLink size={14} />
              <span className="storefront-link-text">المتجر</span>
            </a>
            <PreferencesButtons />
            <span className="topbar-divider" />
            <Link to="/security" title={t('manageAccount')}>
              <Avatar />
            </Link>
          </div>
        </header>

        <main className="main-content" id="main">
          <ErrorBox code={error} />
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Guard permission="catalog.edit"><CommerceContainer><ProductManager /></CommerceContainer></Guard>} />
            <Route path="product-updates" element={<Guard permission="catalog.edit"><ProductUpdates /></Guard>} />
            <Route path="browser" element={<Guard permission="catalog.edit"><CommerceContainer><ProductManager /></CommerceContainer></Guard>} />
            <Route path="reference" element={<Guard permission="catalog.edit"><ReferenceSettings /></Guard>} />
            <Route path="media" element={<Guard permission="catalog.edit"><MediaLibrary /></Guard>} />
            <Route path="content" element={<Guard permission="settings.manage"><ContentSettings /></Guard>} />
            <Route path="users" element={<Guard permission="staff.manage"><Staff /></Guard>} />
            <Route path="security" element={<Security />} />
            <Route path="audit" element={<Guard permission="audit.read"><Audit /></Guard>} />
            <Route path="brands" element={<Guard permission="catalog.edit"><BrandsManager /></Guard>} />
            <Route path="collections" element={<Guard permission="catalog.edit"><CommerceContainer><CollectionsManager /></CommerceContainer></Guard>} />
            <Route path="types" element={<Guard permission="catalog.edit"><CommerceContainer><TypesManager /></CommerceContainer></Guard>} />
            <Route path="variants" element={<Guard permission="catalog.edit"><CommerceContainer><VariantsManager /></CommerceContainer></Guard>} />
            <Route path="categories" element={<Guard permission="catalog.edit"><CommerceContainer><CommerceCatalog module="categories" /></CommerceContainer></Guard>} />
            <Route path="packages" element={<Guard permission="catalog.edit"><CommerceContainer><PackagesManager /></CommerceContainer></Guard>} />
            <Route path="units" element={<Guard permission="inventory.manage"><CommerceContainer><CommerceCatalog module="units" /></CommerceContainer></Guard>} />
            <Route path="inventory" element={<Guard permission="inventory.manage"><CommerceContainer><Inventory /></CommerceContainer></Guard>} />
            <Route path="orders" element={<Guard permission="orders.manage"><CommerceContainer><OrdersAdmin /></CommerceContainer></Guard>} />
            <Route path="coupons" element={<Guard permission="orders.manage"><CommerceContainer><CouponsManager /></CommerceContainer></Guard>} />
            <Route path="customers" element={<Guard permission="customers.manage"><CommerceContainer><CustomersAdmin /></CommerceContainer></Guard>} />
            <Route path="pricing" element={<Guard permission="prices.edit"><CommerceContainer><PricingAdmin /></CommerceContainer></Guard>} />
            <Route path="csv" element={<Guard permission="inventory.manage"><CommerceContainer><CsvAdmin /></CommerceContainer></Guard>} />
            <Route path="expo" element={<Guard permission="contest.manage"><ExpoContest /></Guard>} />
            <Route path="analytics" element={<Guard permissions={['analytics.read', 'analytics.limited']}><Analytics /></Guard>} />
            <Route path="crm" element={<Guard permission="crm.read"><Crm /></Guard>} />
            <Route path="403" element={<StatusPage forbidden />} />
            <Route path="*" element={<StatusPage />} />
          </Routes>
        </main>

        <footer className="workspace-footer">
          <span>{t('brand')}</span>
          <span><ShieldCheck size={14} />{t('protected')}</span>
        </footer>
      </div>

      {/* Streamlined Mobile Bottom Navigation (5 vital hubs) */}
      <div className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <LayoutDashboard size={19} />
          <span>{t('dashboard')}</span>
        </NavLink>
        {can(user.role, 'catalog.edit') && (
          <NavLink to="/products" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Package size={19} />
            <span>{lang === 'ar' ? 'المنتجات' : 'Products'}</span>
          </NavLink>
        )}
        {can(user.role, 'orders.manage') && (
          <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
            <ShoppingBag size={19} />
            <span>{t('ordersModule')}</span>
          </NavLink>
        )}
        {can(user.role, 'inventory.manage') && (
          <NavLink to="/inventory" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Warehouse size={19} />
            <span>{t('inventoryModule')}</span>
          </NavLink>
        )}
        <button type="button" className="bottom-nav-menu-btn" onClick={() => setMenuOpen(true)}>
          <Menu size={19} />
          <span>{t('menu')}</span>
        </button>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer open={menuOpen} onOpenChange={setMenuOpen} title={t('control')}>
        <div className="drawer-user-card">
          <Avatar />
          <div className="drawer-user-meta">
            <strong className="drawer-user-email">{user.email}</strong>
            <span className="drawer-user-role">{t(user.role)}</span>
          </div>
        </div>

        <div className="drawer-quick-actions">
          <a
            href="/ar/shop/browser"
            target="_blank"
            rel="noopener noreferrer"
            className="drawer-quick-btn"
          >
            <div className="drawer-btn-left">
              <ExternalLink size={16} />
              <span>{t('brand')} - {lang === 'ar' ? 'زيارة المتجر' : 'Visit Store'}</span>
            </div>
            <ArrowUpRight size={14} className="drawer-btn-arrow" />
          </a>
          <button
            type="button"
            className="drawer-quick-btn"
            onClick={toggleLanguage}
          >
            <div className="drawer-btn-left">
              <Languages size={16} />
              <span>{t('language')}: {lang === 'ar' ? 'العربية' : 'English'}</span>
            </div>
            <span className="drawer-btn-action">{lang === 'ar' ? 'تغيير' : 'Switch'}</span>
          </button>
          <button
            type="button"
            className="drawer-quick-btn"
            onClick={toggleTheme}
          >
            <div className="drawer-btn-left">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{t('theme')}: {theme === 'dark' ? (lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode') : (lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode')}</span>
            </div>
            <span className="drawer-btn-action">{lang === 'ar' ? 'تبديل' : 'Toggle'}</span>
          </button>
          <div className="drawer-en-toggle-wrap">
            <EnglishFieldsToggle variant="button" />
          </div>
        </div>

        <div className="mobile-drawer-inner">
          {renderNavGroups(() => setMenuOpen(false))}
          <div className="drawer-footer-actions">
            <button
              className="button secondary full"
              onClick={async () => {
                await api('/auth/logout', { method: 'POST', body: {} });
                queryClient.clear();
                queryClient.setQueryData(['session'], null);
              }}
            >
              <LogOut size={16} />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </MobileDrawer>
    </div>
  );
}

function Avatar() {
  const { user } = useSession();
  return <span className="avatar" aria-hidden="true">{user.name.charAt(0)}</span>;
}

function Guard({ permission, permissions, children }: { permission?: Permission; permissions?: Permission[]; children: React.ReactNode }) {
  const role = useSession().user.role;
  const isAllowed = permissions ? permissions.some(p => can(role, p)) : (permission ? can(role, permission) : true);
  return isAllowed ? children : <StatusPage forbidden />;
}

function StatusPage({ forbidden = false }: { forbidden?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="status-page">
      <div className="section-icon"><LockKeyhole size={27} /></div>
      <span className="eyebrow">{forbidden ? '403' : '404'}</span>
      <h1>{t(forbidden ? 'noAccess' : 'notFound')}</h1>
      {forbidden && <p>{t('noAccessNote')}</p>}
      <Link className="button primary" to="/">{t('returnHome')}</Link>
    </div>
  );
}

function Dashboard() {
  const { lang, t } = useI18n(), ar = lang === 'ar', { user } = useSession();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<{ products?: number; published?: number; newLeads?: number; overdueFollowups?: number }>('/dashboard')
  });
  const pricing = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api<{ usdToYer?: number; whatsapp?: string }>('/commerce/pricing')
  });

  const published = query.data?.published ?? 0;
  const total = query.data?.products ?? 0;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;
  const newLeads = query.data?.newLeads ?? 0;
  const overdueFollowups = query.data?.overdueFollowups ?? 0;

  return (
    <div className="dashboard-view">
      {/* Welcome Hero Banner */}
      <section className="dashboard-hero-card">
        <div className="hero-text-block">
          <div className="hero-pill-badge">
            <Sparkles size={14} />
            <span>{ar ? 'مساحة الإدارة الذكية' : 'Smart Admin Workspace'}</span>
          </div>
          <h1>{ar ? `أهلاً بك، ${user.name}` : `Welcome back, ${user.name}`}</h1>
          <p className="hero-subtext">
            {ar
              ? 'تابع عمليات المتجر، حلّل سلوك الزوار والعملاء، واضبط المخزون والأسعار بسهولة وسرعة.'
              : 'Monitor store operations, analyze visitor and customer behaviour, and manage catalog with ease.'}
          </p>
        </div>

        <div className="hero-status-pills">
          <div className="status-kpi-pill">
            <span className="live-dot" />
            <span>{ar ? 'الخادم وقاعدة البيانات متصلان' : 'Server & DB Online'}</span>
          </div>
          <a
            href="/ar/shop/browser"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-shop-link"
          >
            <ExternalLink size={14} />
            <span>{ar ? 'معاينة متجر العملاء' : 'Live Storefront'}</span>
          </a>
        </div>
      </section>

      {/* CRM Alert banner if there are new leads or overdue followups */}
      {(newLeads > 0 || overdueFollowups > 0) && can(user.role, 'crm.read') && (
        <section style={{ marginBottom: 16 }}>
          <Link
            to="/crm"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: 14,
              background: overdueFollowups > 0 ? '#f2a93b16' : '#322f8312',
              border: `1px solid ${overdueFollowups > 0 ? '#f2a93b50' : 'var(--border)'}`,
              color: 'var(--text)',
              transition: 'background .15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {overdueFollowups > 0 ? (
                <AlertTriangle size={18} style={{ color: '#d97706' }} />
              ) : (
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
              )}
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {overdueFollowups > 0
                  ? (ar
                      ? `لديك ${overdueFollowups} استفسار متأخر عن موعد المتابعة و ${newLeads} استفسار جديد بانتظار الرد`
                      : `${overdueFollowups} overdue follow-ups and ${newLeads} new leads waiting`)
                  : (ar
                      ? `لديك ${newLeads} استفسار جديد ينتظر الرد في قسم علاقات العملاء (CRM)`
                      : `You have ${newLeads} new lead(s) waiting in CRM`)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
              <span>{ar ? 'فتح الاستفسارات' : 'Open CRM'}</span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        </section>
      )}

      {/* KPI Stats Grid */}
      <section className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{ar ? 'جاهزية الكتالوج' : 'Catalog Readiness'}</span>
            <span className="stat-icon-wrap primary"><Package size={20} /></span>
          </div>
          <div className="stat-number-row">
            <strong className="stat-big-num">{published}</strong>
            <span className="stat-secondary-text">/ {total} {ar ? 'منتج' : 'items'}</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <small className="stat-note-text">
            {ar ? `${pct}% من إجمالي الكتالوج منشور ومعروض للعملاء` : `${pct}% of products are published & visible`}
          </small>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{ar ? 'سعر الصرف المعتمد' : 'Exchange Rate'}</span>
            <span className="stat-icon-wrap amber"><Coins size={20} /></span>
          </div>
          <div className="stat-number-row">
            <strong className="stat-big-num" dir="ltr">{pricing.data?.usdToYer ?? '—'}</strong>
            <span className="stat-secondary-text">YER / USD</span>
          </div>
          <small className="stat-note-text">
            {pricing.data?.whatsapp ? (ar ? `واتساب: ${pricing.data.whatsapp}` : `WhatsApp: ${pricing.data.whatsapp}`) : (ar ? 'أساس حساب أسعار الريال' : 'Base for YER prices')}
          </small>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{ar ? 'حسابك وصلاحياتك' : 'Your Account & Role'}</span>
            <span className="stat-icon-wrap green"><ShieldCheck size={20} /></span>
          </div>
          <div className="stat-number-row">
            <strong className="stat-big-num">{t(user.role)}</strong>
          </div>
          <small className="stat-note-text">
            {user.totpEnabled ? (ar ? 'التحقق بخطوتين مفعّل' : '2FA Enabled') : (ar ? 'جلسة مشفرة محمية' : 'Protected session')}
          </small>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">{ar ? 'اختصارات سريعة' : 'Quick Actions'}</span>
            <span className="stat-icon-wrap violet"><Activity size={20} /></span>
          </div>
          <div className="quick-links-stack">
            {(can(user.role, 'analytics.read') || can(user.role, 'analytics.limited')) && (
              <Link to="/analytics" className="quick-link-row">
                <span>{ar ? 'التحليلات والتقارير' : 'Analytics & Reports'}</span>
                <ArrowUpRight size={14} />
              </Link>
            )}
            {can(user.role, 'crm.read') && (
              <Link to="/crm" className="quick-link-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ar ? 'الاستفسارات والعملاء' : 'Leads & CRM'}
                  {newLeads > 0 && (
                    <span style={{ background: '#f2a93b', color: '#1e1b4b', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                      {newLeads}
                    </span>
                  )}
                </span>
                <ArrowUpRight size={14} />
              </Link>
            )}
            {can(user.role, 'catalog.edit') && (
              <Link to="/products" className="quick-link-row">
                <span>{ar ? 'كتالوج المنتجات' : 'Products Catalog'}</span>
                <ArrowUpRight size={14} />
              </Link>
            )}
            {can(user.role, 'orders.manage') && (
              <Link to="/orders" className="quick-link-row">
                <span>{ar ? 'طلبات العملاء' : 'Customer Orders'}</span>
                <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Quick Launchpad Grid */}
      <section className="dashboard-launchpad">
        <h2 className="section-title">{ar ? 'وحدات وأقسام النظام' : 'Control Modules'}</h2>
        <div className="launchpad-grid">
          {[
            { to: '/analytics', title: ar ? 'التحليلات والتقارير' : 'Analytics & Intelligence', desc: ar ? 'مراقبة الزيارات والعملاء وأداء الأصناف لحظياً' : 'Track traffic, live visitors and product performance', icon: BarChart2, permissions: ['analytics.read', 'analytics.limited'] },
            { to: '/crm', title: ar ? 'الاستفسارات والعملاء' : 'Leads & CRM', desc: ar ? 'إدارة فرص البيع ومتابعة استفسارات واتساب' : 'Track customer inquiries, quotes & follow-ups', icon: MessageSquare, perm: 'crm.read' },
            { to: '/products', title: ar ? 'المنتجات والكتالوج' : 'Products & Catalog', desc: ar ? 'تصفح وتحرير وتعديل المنتجات والمواصفات' : 'Browse and edit products & specs', icon: Package, perm: 'catalog.edit' },
            { to: '/variants', title: ar ? 'خيارات البيع SKU' : 'Sellable Variants', desc: ar ? 'إدارة الخيارات والأسعار والصور لكل SKU' : 'Manage variant SKUs, prices and images', icon: Layers, perm: 'catalog.edit' },
            { to: '/inventory', title: ar ? 'المخزون وحركاته' : 'Inventory & Movements', desc: ar ? 'متابعة الكميات، الجرد، والتسويات المخزنية' : 'Track stock levels, counts & adjustments', icon: Warehouse, perm: 'inventory.manage' },
            { to: '/orders', title: ar ? 'طلبات العملاء' : 'Customer Orders', desc: ar ? 'معالجة مراحل الطلبات والتوصيل والتأكيد' : 'Process order statuses, delivery & pickup', icon: ShoppingBag, perm: 'orders.manage' },
            { to: '/categories', title: ar ? 'الفئات والتصنيفات' : 'Categories Hierarchy', desc: ar ? 'هيكلة أقسام المتجر الرئيسية والفرعية' : 'Manage main and sub categories', icon: FolderTree, perm: 'catalog.edit' },
            { to: '/pricing', title: ar ? 'التسعير وواتساب' : 'Pricing & WhatsApp', desc: ar ? 'تحديث سعر الصرف ورقم واتساب المعتمد' : 'Update exchange rate and WhatsApp phone', icon: Coins, perm: 'prices.edit' },
            { to: '/media', title: ar ? 'مكتبة الصور' : 'Media Library', desc: ar ? 'رفع وإدارة الصور المعتمدة للمتجر' : 'Upload and manage store images', icon: Image, perm: 'catalog.edit' },
            { to: '/security', title: ar ? 'الحساب والأمان' : 'Account & Security', desc: ar ? 'إعدادات كلمة المرور والتحقق بخطوتين والجلسات' : 'Password, 2FA and active sessions', icon: ShieldCheck },
          ].filter(m => (!m.perm && !m.permissions) || (m.perm && can(user.role, m.perm as Permission)) || (m.permissions && m.permissions.some(p => can(user.role, p as Permission)))).map(m => (
            <Link key={m.to} to={m.to} className="launchpad-card">
              <div className="launchpad-icon-wrap">
                <m.icon size={22} />
              </div>
              <div className="launchpad-content">
                <strong>{m.title}</strong>
                <p>{m.desc}</p>
              </div>
              <ArrowUpRight size={16} className="launchpad-arrow" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function App() {
  const client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      client.clear();
      client.setQueryData(['session'], null);
    };
    window.addEventListener('admin-session-expired', expired);
    return () => window.removeEventListener('admin-session-expired', expired);
  }, [client]);

  const query = useQuery({ queryKey: ['session'], queryFn: getSession, retry: false });
  const { t } = useI18n();

  if (query.isPending) return <Loading />;
  if (query.isError) return (
    <div className="status-page">
      <ErrorBox code={query.error instanceof ApiError ? query.error.code : 'failed'} />
      <button className="button primary" onClick={() => query.refetch()}>{t('retry')}</button>
    </div>
  );
  if (!query.data) return <Login />;

  return (
    <AuthContext.Provider value={query.data}>
      {query.data.user.mustChangePassword ? (
        <main className="required-page">
          <PreferencesButtons />
          <Security required />
        </main>
      ) : (
        <Shell />
      )}
    </AuthContext.Provider>
  );
}

