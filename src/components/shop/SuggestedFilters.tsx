/**
 * SuggestedFilters.tsx
 * فلاتر مقترحة ذكية مستوحاة من أمازون.
 * تظهر صف من الـ chips أعلى الفلاتر بناءً على الفئة الحالية.
 * البيانات مأخوذة من src/data/suggested-filters.ts (لا hardcode).
 * RTL-aware · dark/light · GSAP Flip-ready (الـ chips تُضغط دفعة واحدة).
 */
import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Gamepad2, Briefcase, GraduationCap, Zap, Monitor, HardDrive,
  Cpu, Layers, Wifi, Camera, Headphones, Printer, MemoryStick,
  Star, PackageCheck, Sparkles, type LucideIcon
} from 'lucide-react';

// ─── Data Types ───────────────────────────────────────────────────────────────

interface SuggestedFilter {
  id: string;
  label: { ar: string; en: string };
  icon: LucideIcon;
  params: Record<string, string>;
}

// ─── Suggested Filter Definitions (per category) ──────────────────────────────

const SUGGESTED: Record<string, SuggestedFilter[]> = {
  laptops: [
    {
      id: 'gaming',
      label: { ar: 'للألعاب', en: 'Gaming' },
      icon: Gamepad2,
      params: { gpuType: 'dedicated' }
    },
    {
      id: 'business',
      label: { ar: 'للأعمال', en: 'Business' },
      icon: Briefcase,
      params: { cpuFamily: 'Intel Core i7' }
    },
    {
      id: 'student',
      label: { ar: 'للطلاب', en: 'Student' },
      icon: GraduationCap,
      params: { max: '600' }
    },
    {
      id: 'budget',
      label: { ar: 'أقل من $500', en: 'Under $500' },
      icon: Zap,
      params: { max: '500' }
    },
    {
      id: 'touch',
      label: { ar: 'شاشة لمس', en: 'Touchscreen' },
      icon: Monitor,
      params: { touch: 'true' }
    },
    {
      id: 'highram',
      label: { ar: 'ذاكرة 16GB+', en: '16GB+ RAM' },
      icon: Layers,
      params: { ramGB: '16' }
    },
    {
      id: 'new',
      label: { ar: 'جديد بالكرتون', en: 'Brand New' },
      icon: PackageCheck,
      params: { condition: 'new' }
    }
  ],
  desktops: [
    {
      id: 'budget',
      label: { ar: 'أقل من $400', en: 'Under $400' },
      icon: Zap,
      params: { max: '400' }
    },
    {
      id: 'gaming',
      label: { ar: 'للألعاب', en: 'Gaming' },
      icon: Gamepad2,
      params: { gpuType: 'dedicated' }
    },
    {
      id: 'new',
      label: { ar: 'جديد بالكرتون', en: 'Brand New' },
      icon: PackageCheck,
      params: { condition: 'new' }
    },
    {
      id: 'office',
      label: { ar: 'للمكتب', en: 'Office Work' },
      icon: Briefcase,
      params: { max: '500' }
    }
  ],
  displays: [
    {
      id: '4k',
      label: { ar: 'دقة 4K', en: '4K Display' },
      icon: Monitor,
      params: { 'spec_resolution': '3840x2160' }
    },
    {
      id: 'gaming',
      label: { ar: 'جيمنج 144Hz+', en: 'Gaming 144Hz+' },
      icon: Gamepad2,
      params: { 'spec_refreshHz': '144' }
    },
    {
      id: 'ips',
      label: { ar: 'لوحة IPS', en: 'IPS Panel' },
      icon: Sparkles,
      params: { 'spec_panel': 'IPS' }
    },
    {
      id: 'curved',
      label: { ar: 'منحنية', en: 'Curved' },
      icon: Monitor,
      params: { 'spec_curved': 'curved' }
    },
    {
      id: 'budget',
      label: { ar: 'أقل من $200', en: 'Under $200' },
      icon: Zap,
      params: { max: '200' }
    }
  ],
  'hard-drives': [
    {
      id: 'nvme',
      label: { ar: 'NVMe سريع', en: 'Fast NVMe' },
      icon: Zap,
      params: { 'spec_storageType': 'nvme' }
    },
    {
      id: '1tb',
      label: { ar: '1 تيرابايت', en: '1 TB' },
      icon: HardDrive,
      params: { 'spec_storageGB': '1000' }
    },
    {
      id: '2tb',
      label: { ar: '2 تيرابايت', en: '2 TB' },
      icon: HardDrive,
      params: { 'spec_storageGB': '2000' }
    },
    {
      id: 'external',
      label: { ar: 'خارجي محمول', en: 'Portable' },
      icon: HardDrive,
      params: { 'spec_useCase': 'portable' }
    }
  ],
  ram: [
    {
      id: '16gb',
      label: { ar: '16 GB', en: '16 GB' },
      icon: MemoryStick,
      params: { 'spec_storageGB': '16' }
    },
    {
      id: '32gb',
      label: { ar: '32 GB', en: '32 GB' },
      icon: MemoryStick,
      params: { 'spec_storageGB': '32' }
    },
    {
      id: 'ddr5',
      label: { ar: 'DDR5', en: 'DDR5' },
      icon: Cpu,
      params: { 'spec_ddrGen': 'DDR5' }
    },
    {
      id: 'laptop',
      label: { ar: 'رام لابتوب', en: 'Laptop RAM' },
      icon: Layers,
      params: { 'spec_deviceType': 'laptop' }
    }
  ],
  cameras: [
    {
      id: 'night',
      label: { ar: 'رؤية ليلية ملونة', en: 'Color Night Vision' },
      icon: Camera,
      params: { 'spec_nightVision': 'color' }
    },
    {
      id: 'ai',
      label: { ar: 'ذكاء اصطناعي', en: 'AI Detection' },
      icon: Sparkles,
      params: { 'spec_smartFeature': 'face' }
    },
    {
      id: 'outdoor',
      label: { ar: 'للخارج', en: 'Outdoor' },
      icon: Camera,
      params: { 'spec_cameraType': 'bullet' }
    }
  ],
  network: [
    {
      id: 'wifi6',
      label: { ar: 'WiFi 6', en: 'WiFi 6' },
      icon: Wifi,
      params: { 'spec_wifiGen': 'Wi-Fi 6 (802.11ax)' }
    },
    {
      id: 'gigabit',
      label: { ar: 'جيجابت', en: 'Gigabit' },
      icon: Zap,
      params: { 'spec_portSpeed': '1000Mbps' }
    },
    {
      id: 'poe',
      label: { ar: 'PoE للكاميرات', en: 'PoE for Cameras' },
      icon: Camera,
      params: { 'spec_poe': 'poe' }
    }
  ],
  audio: [
    {
      id: 'anc',
      label: { ar: 'عزل الضوضاء', en: 'Noise Cancelling' },
      icon: Headphones,
      params: { 'spec_anc': 'true' }
    },
    {
      id: 'wireless',
      label: { ar: 'لاسلكي', en: 'Wireless' },
      icon: Wifi,
      params: { 'spec_wireless': 'wireless' }
    },
    {
      id: 'gaming',
      label: { ar: 'ألعاب', en: 'Gaming' },
      icon: Gamepad2,
      params: { 'spec_usage': 'gaming' }
    }
  ],
  printers: [
    {
      id: 'color',
      label: { ar: 'ألوان', en: 'Color Print' },
      icon: Printer,
      params: { 'spec_color': 'color' }
    },
    {
      id: 'aio',
      label: { ar: 'متعدد الوظائف', en: 'All-in-One' },
      icon: Printer,
      params: { 'spec_allInOne': 'aio' }
    }
  ],
  accessories: [
    {
      id: 'wireless',
      label: { ar: 'لاسلكي', en: 'Wireless' },
      icon: Wifi,
      params: { 'spec_wireless': 'wireless' }
    },
    {
      id: 'gaming',
      label: { ar: 'جيمنج', en: 'Gaming' },
      icon: Gamepad2,
      params: { 'spec_usage': 'gaming' }
    }
  ],
  // Global / "All categories" suggestions
  '': [
    {
      id: 'new',
      label: { ar: 'جديد بالكرتون', en: 'Brand New' },
      icon: PackageCheck,
      params: { condition: 'new' }
    },
    {
      id: 'available',
      label: { ar: 'متوفر الآن', en: 'In Stock' },
      icon: Star,
      params: { available: 'true' }
    },
    {
      id: 'budget',
      label: { ar: 'أقل من $300', en: 'Under $300' },
      icon: Zap,
      params: { max: '300' }
    }
  ]
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuggestedFiltersProps {
  category?: string;
  language: 'ar' | 'en';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuggestedFilters({ category, language }: SuggestedFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const suggestions = SUGGESTED[category ?? ''] ?? SUGGESTED[''];

  const isActive = useCallback(
    (filter: SuggestedFilter) => {
      return Object.entries(filter.params).every(([k, v]) => {
        const current = searchParams.getAll(k);
        return current.some(cv => cv.split(',').includes(v) || cv === v);
      });
    },
    [searchParams]
  );

  const toggle = useCallback(
    (filter: SuggestedFilter) => {
      const next = new URLSearchParams(searchParams);
      const active = isActive(filter);

      Object.entries(filter.params).forEach(([k, v]) => {
        if (active) {
          // Remove this param value
          const existing = next.getAll(k).flatMap(c => c.split(','));
          next.delete(k);
          existing.filter(c => c !== v).forEach(c => next.append(k, c));
        } else {
          // Add this param value (multi-select friendly)
          const existing = next.getAll(k).flatMap(c => c.split(','));
          if (!existing.includes(v)) {
            next.delete(k);
            [...existing, v].filter(Boolean).forEach(c => next.append(k, c));
          }
        }
      });

      next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, isActive]
  );

  if (!suggestions?.length) return null;

  return (
    <div className="suggested-filters-row" role="group" aria-label={language === 'ar' ? 'اقتراحات سريعة' : 'Quick suggestions'}>
      <span className="suggested-filters-label">
        <Sparkles size={12} />
        {language === 'ar' ? 'اقتراحات:' : 'Popular:'}
      </span>
      <div className="suggested-filters-chips">
        {suggestions.map(f => {
          const Icon = f.icon;
          const active = isActive(f);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f)}
              aria-pressed={active}
              className={`suggested-chip ${active ? 'suggested-chip-active' : ''}`}
            >
              <Icon size={12} className="shrink-0" />
              <span>{f.label[language]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
