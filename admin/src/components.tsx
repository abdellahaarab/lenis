import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { X, AlertCircle, CheckCircle2, LoaderCircle, Languages, Sun, Moon, Globe } from 'lucide-react';
import { useI18n } from './i18n';
const ToastContext = createContext<(message: string, failed?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; failed: boolean } | null>(null);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); } }, [toast]);
  return <ToastContext.Provider value={(message, failed = false) => setToast({ message, failed })}>{children}<div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className={`toast ${toast.failed ? 'error' : ''}`}>{toast.failed ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}<span>{toast.message}</span><button className="icon-button" aria-label="×" onClick={() => setToast(null)}><X size={16}/></button></div>}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);

export function PackageEnglishToggle({ variant = 'header' }: { variant?: 'header' | 'button' | 'compact' }) {
  const { lang, showEnglishFields, toggleShowEnglishFields } = useI18n();
  const ar = lang === 'ar';

  if (variant === 'button') {
    return (
      <button
        type="button"
        className={`button secondary sm package-en-card-btn ${showEnglishFields ? 'active' : ''}`}
        onClick={toggleShowEnglishFields}
        title={ar ? (showEnglishFields ? 'حقول الإنجليزية مفعّلة في النظام (انقر للإخفاء)' : 'حقول الإنجليزية مخفية في النظام (انقر للإظهار)') : (showEnglishFields ? 'English fields enabled across system (click to hide)' : 'English fields hidden across system (click to show)')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11.5px',
          fontWeight: 600,
          padding: '5px 11px',
          borderRadius: '8px',
          cursor: 'pointer',
          background: showEnglishFields ? 'var(--surface-soft)' : 'var(--surface)',
          borderColor: showEnglishFields ? 'var(--primary)' : 'var(--border)',
          color: showEnglishFields ? 'var(--primary-text)' : 'var(--muted)',
          transition: 'all 0.15s ease'
        }}
      >
        <Globe size={13} style={{ opacity: showEnglishFields ? 1 : 0.7 }} />
        <span>{showEnglishFields ? (ar ? 'إخفاء حقول الإنجليزية' : 'Hide English Fields') : (ar ? 'إظهار حقول الإنجليزية' : 'Show English Fields')}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`package-en-toggle-header ${showEnglishFields ? 'active' : ''}`}
      onClick={toggleShowEnglishFields}
      title={ar ? (showEnglishFields ? 'حقول الإنجليزية في النظام: معروضة (انقر للإخفاء)' : 'حقول الإنجليزية في النظام: مخفية (انقر للإظهار)') : (showEnglishFields ? 'English fields: visible (click to hide)' : 'English fields: hidden (click to show)')}
      aria-label={ar ? 'تبديل إظهار حقول الإنجليزية' : 'Toggle English fields'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        padding: '0 9px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: showEnglishFields ? 'var(--primary)' : 'var(--border)',
        background: showEnglishFields ? 'var(--surface-soft)' : 'transparent',
        color: showEnglishFields ? 'var(--primary-text)' : 'var(--muted)',
        transition: 'all 0.15s ease'
      }}
    >
      <Globe size={13} />
      <span>{ar ? 'الإنجليزية' : 'EN'}</span>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: showEnglishFields ? '#10b981' : '#9ca3af',
          display: 'inline-block'
        }}
      />
    </button>
  );
}

export const EnglishFieldsToggle = PackageEnglishToggle;

export function PreferencesButtons({ showEnToggle = true }: { showEnToggle?: boolean }) {
  const { t, theme, toggleTheme, toggleLanguage } = useI18n();
  return (
    <div className="preferences">
      {showEnToggle && <PackageEnglishToggle variant="header" />}
      <button className="language-button" onClick={toggleLanguage} aria-label={t('language')} title={t('language')}>
        <Languages size={16}/>
        <span className="lang-text">{t('language')}</span>
      </button>
      <button className="icon-button" title={t('theme')} aria-label={t('theme')} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
    </div>
  );
}
export function Loading() { const { t } = useI18n(); return <div className="loading" role="status"><LoaderCircle className="spin" size={24}/>{t('loading')}</div>; }
export function ErrorBox({ code }: { code?: string }) { const { t } = useI18n(); return code ? <div className="error-box" role="alert"><AlertCircle size={18}/>{t(code)}</div> : null; }
export function Modal({ open, onOpenChange, title, description, children, className }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; className?: string }) { const { t } = useI18n(); return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="overlay"/><Dialog.Content className={`modal ${className ?? ''}`}><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description ?? t('sessionWarning')}</Dialog.Description><Dialog.Close className="icon-button modal-close" aria-label={t('close')}><X size={20}/></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>; }
export function MobileDrawer({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-panel" aria-describedby={undefined}>
          <div className="drawer-header">
            <div className="drawer-title-box">
              <span className="drawer-badge">{t('brand')}</span>
              <Dialog.Title className="drawer-title">{title}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button drawer-close-btn" aria-label={t('close')}>
              <X size={20} />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="drawer-desc">{description}</Dialog.Description>}
          <div className="drawer-scroll-body">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({ title, description, onConfirm, children, disabled }: { title: string; description: string; onConfirm: () => Promise<void>; children: ReactNode; disabled?: boolean }) {
  const { t } = useI18n(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  return <AlertDialog.Root open={open} onOpenChange={setOpen}><AlertDialog.Trigger asChild><button className="button subtle" disabled={disabled}>{children}</button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="overlay"/><AlertDialog.Content className="modal"><AlertDialog.Title>{title}</AlertDialog.Title><AlertDialog.Description>{description}</AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel className="button secondary" disabled={busy}>{t('cancel')}</AlertDialog.Cancel><button className="button danger" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); setOpen(false); } finally { setBusy(false); } }}>{busy ? t('saving') : t('confirm')}</button></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>;
}
export function FieldError({ message }: { message?: string }) { const { t } = useI18n(); return message ? <span className="field-error">{t(['password_short', 'password_long', 'password_common', 'totp_invalid'].includes(message) ? message : 'fieldInvalid')}</span> : null; }
