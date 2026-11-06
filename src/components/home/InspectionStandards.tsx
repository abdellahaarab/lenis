import { useCatalog } from '@/data/CatalogContext';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowUpLeft,
  ArrowUpRight,
  Monitor,
  Keyboard,
  Battery,
  Flame,
  HardDrive,
  Usb,
  Volume2,
  FileCheck
} from 'lucide-react';

export default function InspectionStandards() {
  const { warranty: warrantyData } = useCatalog();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;

  const checklistIcons: Record<string, any> = {
    screen: Monitor,
    keyboard_touchpad: Keyboard,
    battery: Battery,
    thermals: Flame,
    storage_smart: HardDrive,
    ports_connectivity: Usb,
    audio_camera: Volume2
  };

  return (
    <section id="inspection" className="inspection-standards-section page-shell">
      <div className="inspection-container">
        {/* Header */}
        <div className="inspection-header">
          <div className="eyebrow-chip">
            <FileCheck size={15} />
            <span>{ar ? 'معايير الفحص والاعتماد المخبري' : '7-Point Diagnostic Protocol'}</span>
          </div>

          <h2>
            {ar ? (
              <>
                قبل أن يصل إليك..
                <br />
                <span className="text-brand-gradient">7 اختبارات مخبرية صارمة لضمان راحة بالك.</span>
              </>
            ) : (
              <>
                Before it reaches your desk..
                <br />
                <span className="text-brand-gradient">7 rigorous hardware tests to ensure peak reliability.</span>
              </>
            )}
          </h2>

          <p className="inspection-lead">
            {ar
              ? 'في سوق الأجهزة المستخدمة والمستوردة، تكون المفاجآت مكلفة. لذلك نطبق في الجيل العربي الرقمي بصنعاء فحصاً شاملاً بأحدث برامج التشخيص واختبارات الإجهاد، ونرفق تقريراً معلناً لكل جهاز.'
              : 'In imported and business hardware, unverified claims are costly. At Digital Arab Generation in Sana’a, we enforce systematic benchmarking and diagnostic telemetry, providing full transparency on every device.'}
          </p>
        </div>

        {/* 7-Point Grid */}
        <div className="inspection-cards-grid">
          {warrantyData.inspectionChecklist.map((item, idx) => {
            const Icon = checklistIcons[item.id] || CheckCircle2;
            return (
              <div key={item.id} className="inspection-point-card">
                <div className="point-card-top">
                  <span className="point-index">0{idx + 1}</span>
                  <div className="point-icon-badge">
                    <Icon size={18} />
                  </div>
                </div>

                <h3>{item.title[language].replace(/^\d+\.\s*/, '')}</h3>
                <p>{item.description[language]}</p>

                <div className="point-verified-tag">
                  <CheckCircle2 size={13} className="text-status" />
                  <span>{ar ? 'فحص إلزامي 100%' : '100% Mandatory Check'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Policy & Link */}
        <div className="inspection-policy-banner">
          <div className="policy-banner-info">
            <ShieldCheck size={28} className="text-status" />
            <div>
              <h4>{ar ? 'درجات حالة معلنة بوضوح (A+ / A / B)' : 'Transparent Grading Standard (A+ / A / B)'}</h4>
              <p>
                {ar
                  ? 'نعرض لكل لابتوب نسبة صحة بطاريته المقاسة، حالة الهيكل، ومدة الضمان المكتوب بكل صدق وبدون إخفاء أي تفاصيل.'
                  : 'Every laptop clearly specifies real measured battery health, exterior condition grade, and written warranty coverage.'}
              </p>
            </div>
          </div>

          <Link to={`/${language}/warranty`} className="desk-action desk-action-secondary">
            <span>{ar ? 'مراجعة سياسة الضمان والفحص كاملة' : 'Read Full Warranty & Lab Protocol'}</span>
            <Arrow size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
