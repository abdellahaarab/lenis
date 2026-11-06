import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  Trophy,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Gift,
  Laptop,
  Camera,
  Zap,
  Headphones,
  ArrowLeft,
  ArrowRight,
  Share2,
  Download,
  AlertCircle,
  Copy,
  Clock,
  MapPin,
  Flame,
  Volume2,
  VolumeX,
  ExternalLink,
  Tag,
  Check,
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

interface Prize {
  id: string;
  title: Record<string, string> | string;
  description?: Record<string, string> | string;
  imageUrl?: string;
  category: string;
  quantity: number;
}

interface ContestData {
  contest: {
    id: string;
    slug: string;
    title: Record<string, string>;
    description: Record<string, string>;
    isActive: boolean;
  };
  prizes: Prize[];
  stats: {
    totalEntries: number;
    winnersCount: number;
  };
}

interface TicketData {
  id?: string;
  ticketNumber: string;
  name: string;
  phone: string;
  city?: string;
  interests?: string[];
  isWinner?: boolean;
  wonPrize?: unknown;
  createdAt: string;
}

// Lightweight synthesized Web Audio sound helper (offline safe)
function playTriumphChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.12, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  } catch {
    // Audio context not allowed or not supported
  }
}

// Lightweight Confetti Particle Canvas
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#fbbf24', '#a855f7', '#c084fc', '#38bdf8', '#ec4899', '#ffffff'];
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 4 - 2,
    }));

    let animationFrame: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();

        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
      animationFrame = requestAnimationFrame(render);
    };

    render();

    const timer = setTimeout(() => {
      cancelAnimationFrame(animationFrame);
    }, 7000);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

export default function ExpoContestPage() {
  const { lang = 'ar' } = useParams<{ lang?: string }>();
  const isAr = lang === 'ar';

  const [step, setStep] = useState<'intro' | 'quiz' | 'register' | 'ticket'>('intro');
  const [contestData, setContestData] = useState<ContestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Quiz state
  const [selectedInterest, setSelectedInterest] = useState<string>('laptops');
  const [priorityAnswer, setPriorityAnswer] = useState<string>('warranty');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('صنعاء');
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Get or persist client device fingerprint
  const getDeviceHash = () => {
    let hash = localStorage.getItem('aljeel_expo_device_id');
    if (!hash) {
      hash = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('aljeel_expo_device_id', hash);
    }
    return hash;
  };

  useEffect(() => {
    const savedTicket = localStorage.getItem('aljeel_expo_my_ticket');
    if (savedTicket) {
      try {
        setTicket(JSON.parse(savedTicket));
        setStep('ticket');
      } catch {
        // ignore
      }
    }

    fetch('/api/contest/active')
      .then(res => res.json())
      .then(data => {
        setContestData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال الاسم الكريم ورقم الهاتف' : 'Please enter your name and phone number');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/contest/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          interests: [selectedInterest],
          deviceHash: getDeviceHash(),
          notes: `الأولوية في الشراء: ${priorityAnswer}`,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.code || 'failed');
      }

      if (json.ticket) {
        setTicket(json.ticket);
        localStorage.setItem('aljeel_expo_my_ticket', JSON.stringify(json.ticket));
        setStep('ticket');
        setShowConfetti(true);
        playTriumphChime();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'failed';
      if (msg === 'invalid_phone_number') {
        setErrorMsg(isAr ? 'رقم الهاتف غير صالح، يرجى كتابة 9 أرقام (مثال: 771234567)' : 'Invalid phone number format');
      } else {
        setErrorMsg(isAr ? 'حدث خطأ في الاتصال، يرجى المحاولة مجدداً' : 'Connection error, please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyTicketCode = () => {
    if (ticket?.ticketNumber) {
      navigator.clipboard.writeText(ticket.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    if (!ticket) return;
    const shareText = isAr
      ? `شاركت في مسابقة جناح «الجيل العربي الرقمي» بالمعرض وحصلت على التذكرة الذهبية (${ticket.ticketNumber})! ادخل وشارك في السحب المباشر: ${window.location.origin}/${lang}/expo`
      : `I joined the Al-Jeel Al-Arabi Expo contest and got ticket (${ticket.ticketNumber})! Enter the live draw: ${window.location.origin}/${lang}/expo`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  // Generate and download a high-res digital ticket card directly to the phone gallery
  const downloadTicketImage = () => {
    if (!ticket) return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Card Background with luxury gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 900, 540);
      bgGrad.addColorStop(0, '#1a0b33');
      bgGrad.addColorStop(0.5, '#0e051d');
      bgGrad.addColorStop(1, '#05020a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 900, 540);

      // Gold Metallic Border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, 864, 504);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, 848, 488);

      // Top Brand Header
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('الجيل العربي الرقمي • معرض 2026', 840, 75);

      ctx.fillStyle = '#c084fc';
      ctx.font = '18px sans-serif';
      ctx.fillText('تقنية تتكامل.. وضمان يستمر', 840, 105);

      // VIP Raffle Badge
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(50, 48, 160, 40);
      ctx.fillStyle = '#1e0c38';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VIP RAFFLE', 130, 74);

      // Dashed divider line
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(50, 140);
      ctx.lineTo(850, 140);
      ctx.stroke();
      ctx.setLineDash([]);

      // Entrant Name
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('اسم المتسابق الكريم:', 840, 190);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(ticket.name, 840, 238);

      // Phone & City
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.fillText(`رقم الهاتف: ${ticket.phone}  |  المدينة: ${ticket.city || 'صنعاء'}`, 840, 290);

      // Ticket Serial Number Box
      ctx.fillStyle = 'rgba(15, 7, 30, 0.9)';
      ctx.fillRect(50, 335, 800, 100);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 335, 800, 100);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('رقم السحب الفريد للمطابقة بالجناح (UNIQUE TICKET CODE)', 450, 365);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(ticket.ticketNumber, 450, 415);

      // Bottom Trust Footer
      ctx.fillStyle = '#a78bfa';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('أبرز هذه التذكرة لموظفي جناح الجيل العربي الرقمي في المعرض لاستلام جائزتك عند الفوز', 450, 485);

      // Convert to downloadable file
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `aljeel-expo-ticket-${ticket.ticketNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // ignore
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  const totalEntrantsCount = (contestData?.stats?.totalEntries || 0) + (step === 'ticket' ? 1 : 0);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 10%, #1e0a38 0%, #090314 60%, #030108 100%)',
        color: '#f8fafc',
        fontFamily: isAr ? 'LinaRound, system-ui, sans-serif' : 'MPLUSRounded1c, system-ui, sans-serif',
        direction: isAr ? 'rtl' : 'ltr',
        paddingTop: '5.5rem',
        paddingBottom: '4.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Confetti Celebration Particle Layer */}
      {showConfetti && <ConfettiCanvas />}

      {/* Cyber Neon Lighting Effects */}
      <div
        style={{
          position: 'absolute',
          top: '3%',
          left: '15%',
          width: 420,
          height: 420,
          background: 'rgba(114, 54, 234, 0.25)',
          filter: 'blur(120px)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '8%',
          width: 380,
          height: 380,
          background: 'rgba(245, 158, 11, 0.18)',
          filter: 'blur(110px)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 1.25rem', position: 'relative', zIndex: 2 }}>
        {/* Booth Header Pill & Live Entrants Ticker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(114, 54, 234, 0.28)',
              border: '1px solid rgba(168, 85, 247, 0.45)',
              color: '#e9d5ff',
              padding: '0.4rem 0.95rem',
              borderRadius: 30,
              fontSize: '0.82rem',
              fontWeight: 700,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Sparkles size={15} color="#f59e0b" />
            <span>{isAr ? 'جناح المعرض التقني 2026 — صنعاء' : 'Tech Expo Booth 2026 — Sana’a'}</span>
          </div>

          {/* Real-time Entrant Counter */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fef08a',
              padding: '0.35rem 0.8rem',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <Flame size={14} color="#f59e0b" />
            <span>{totalEntrantsCount} {isAr ? 'زائراً مسجلاً حتى الآن' : 'registered entrants'}</span>
          </div>
        </div>

        {/* Live Draw Countdown Banner */}
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(114,54,234,0.3) 0%, rgba(245,158,11,0.2) 100%)',
            border: '1px solid rgba(168,85,247,0.35)',
            borderRadius: 14,
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.75rem',
            fontSize: '0.84rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', fontWeight: 700 }}>
            <Clock size={16} />
            <span>{isAr ? 'السحب المباشر القادم: اليوم 7:00 مساءً' : 'Next Live Draw: Today at 7:00 PM'}</span>
          </div>
          <span style={{ color: '#d8b4fe', fontSize: '0.78rem' }}>
            {isAr ? 'على شاشات الجناح الكبرى' : 'On Booth Big Screens'}
          </span>
        </div>

        {/* Multi-Step Animated Flow */}
        <AnimatePresence mode="wait">
          {/* STEP 1: HERO HOOK & PRIZES SHOWCASE */}
          {step === 'intro' && (
            <motion.div
              key="step-intro"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 900,
                    lineHeight: 1.25,
                    margin: '0 0 0.8rem 0',
                    background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {isAr ? 'سحب رقمي مباشر على أجهزة إلكترونية مميزة' : 'Live Digital Raffle for Premium Tech Gear'}
                </h1>
                <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                  {isAr
                    ? 'شارك في تحدي الـ 30 ثانية بجناح «الجيل العربي الرقمي» واحصل على تذكرتك الذهبية فوراً لدخول السحب المباشر!'
                    : 'Take our 30-second interactive challenge at Al-Jeel booth and grab your VIP Raffle Ticket instantly!'}
                </p>
              </div>

              {/* Showcase Cards of the Grand Prizes */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.92rem', fontWeight: 800 }}>
                    <Trophy size={17} />
                    <span>{isAr ? 'جوائز السحب الكبرى في المعرض:' : 'Grand Expo Prizes:'}</span>
                  </div>
                  <span style={{ color: '#a855f7', fontSize: '0.8rem' }}>{isAr ? 'أجهزة أصلية معتمدة' : 'Genuine Hardware'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {/* Laptop Prize Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(35,16,68,0.7) 0%, rgba(18,8,36,0.85) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      borderRadius: 18,
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.1rem',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #7236ea 0%, #9333ea 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(114,54,234,0.4)',
                      }}
                    >
                      <Laptop size={28} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                          {isAr ? 'لابتوب أعمال خارق (ThinkPad / Dell)' : 'High-End Business Laptop'}
                        </span>
                        <span style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>
                          الجائزة الكبرى
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#c084fc', marginTop: '0.25rem' }}>
                        {isAr ? 'معالج Core i7 • ذاكرة 16GB • فحص شامل من 12 نقطة مع ضمان حقيقي' : 'Core i7 • 16GB RAM • 12-point inspection with real warranty'}
                      </div>
                    </div>
                  </div>

                  {/* CCTV Security Prize Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(14,35,68,0.7) 0%, rgba(8,18,36,0.85) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: 18,
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.1rem',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(2,132,199,0.4)',
                      }}
                    >
                      <Camera size={28} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                          {isAr ? 'منظومة كاميرات مراقبة ذكية Dahua 4K' : 'Dahua 4K Smart CCTV System'}
                        </span>
                        <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>
                          أمن ومراقبة
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#7dd3fc', marginTop: '0.25rem' }}>
                        {isAr ? 'رؤية ليلية ملونة 24/7 بدقة فائقة + متابعة مباشرة من تطبيق هاتفك' : 'Full-Color 24/7 Night Vision + Live smartphone streaming'}
                      </div>
                    </div>
                  </div>

                  {/* Accessories Pack Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(55,30,15,0.7) 0%, rgba(30,16,8,0.85) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: 18,
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.1rem',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(217,119,6,0.4)',
                      }}
                    >
                      <Headphones size={28} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                          {isAr ? 'باقات إكسسوارات وملحقات تقنية فاخرة' : 'Executive Accessories Gear Packs'}
                        </span>
                        <span style={{ background: 'rgba(234,179,8,0.2)', color: '#facc15', fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>
                          5 فائزين
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#fde047', marginTop: '0.25rem' }}>
                        {isAr ? 'حقيبة أعمال مقاومة للصدمات + ماوس لاسلكي مريح + بطارية شحن سريعة' : 'Shockproof bag + ergonomic mouse + fast power bank'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start CTA Button */}
              <button
                onClick={() => setStep('quiz')}
                style={{
                  width: '100%',
                  padding: '1.15rem',
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #7236ea 0%, #9333ea 50%, #c026d3 100%)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.7rem',
                  boxShadow: '0 8px 30px rgba(114, 54, 234, 0.45)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>{isAr ? 'ابدأ التحدي وسجل في السحب' : 'Start Challenge & Enter Raffle'}</span>
                {isAr ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.4rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                {isAr ? 'سحب إلكتروني مشفر وعشوائي 100% معتمد أمام الجمهور' : '100% verifiable random live raffle at booth'}
              </div>
            </motion.div>
          )}

          {/* STEP 2: 30-SECOND DISCOVERY QUIZ */}
          {step === 'quiz' && (
            <motion.div
              key="step-quiz"
              initial={{ opacity: 0, x: isAr ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isAr ? 30 : -30 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <span style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 700 }}>
                  {isAr ? 'خطوة 1 من 2' : 'Step 1 of 2'}
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0.3rem 0 0.5rem 0' }}>
                  {isAr ? 'ما هو جهازك المفضل القادم؟' : 'What is your preferred gear?'}
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', margin: 0 }}>
                  {isAr ? 'حدد اهتمامك لنخصص لك تذكرتك وعروض المعرض الحصرية' : 'Choose your focus to personalize your raffle ticket'}
                </p>
              </div>

              {/* Interest Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.75rem' }}>
                {([
                  { id: 'laptops', titleAr: 'لابتوبات أعمال وبرمجة', titleEn: 'Business Laptops', icon: Laptop, tag: 'فحص وضمان' },
                  { id: 'security_cameras', titleAr: 'كاميرات ومراقبة ذكية', titleEn: 'Smart CCTV Systems', tag: 'دقة 4K' },
                  { id: 'power_energy', titleAr: 'طاقة وبطاريات وإنفرترات', titleEn: 'Power & Solar Inverters', tag: 'حلول مستمرة' },
                  { id: 'accessories', titleAr: 'ملحقات وإكسسوارات', titleEn: 'Premium Accessories', tag: 'تجهيز كامل' },
                ] as Array<{ id: string; titleAr: string; titleEn: string; icon: LucideIcon; tag: string }>).map(item => {
                  const isSelected = selectedInterest === item.id;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedInterest(item.id)}
                      style={{
                        padding: '1.2rem 1rem',
                        borderRadius: 16,
                        background: isSelected ? 'rgba(114, 54, 234, 0.32)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 20px rgba(168,85,247,0.3)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: isSelected ? '#7236ea' : 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.6rem auto',
                        }}
                      >
                        <Icon size={24} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#fff' : '#e2e8f0' }}>
                        {isAr ? item.titleAr : item.titleEn}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: isSelected ? '#d8b4fe' : '#94a3b8', marginTop: '0.2rem', display: 'block' }}>
                        {item.tag}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Priority Question */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.65rem' }}>
                  {isAr ? 'في سوق الكمبيوتر، ما هو الأهم لك عند الشراء؟' : 'When buying tech, what matters most?'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { id: 'warranty', textAr: 'فحص جودة معتمد من 12 نقطة + ضمان حقيقي مكتوب', textEn: 'Certified 12-point inspection & real warranty' },
                    { id: 'speed', textAr: 'أداء عالي وسرعة فائقة للمهام الهندسية والشاقة', textEn: 'High specs & reliable performance for heavy loads' },
                    { id: 'pricing', textAr: 'تكامل التجهيز والوضوح التام في المواصفات والأسعار', textEn: 'Full ecosystem compatibility & transparent pricing' },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setPriorityAnswer(opt.id)}
                      style={{
                        padding: '0.9rem 1.1rem',
                        borderRadius: 12,
                        background: priorityAnswer === opt.id ? 'rgba(168, 85, 247, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                        border: priorityAnswer === opt.id ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        fontSize: '0.9rem',
                        color: priorityAnswer === opt.id ? '#fff' : '#cbd5e1',
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: priorityAnswer === opt.id ? '6px solid #a855f7' : '2px solid #64748b',
                          background: '#fff',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: priorityAnswer === opt.id ? 700 : 500 }}>
                        {isAr ? opt.textAr : opt.textEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setStep('register')}
                style={{
                  width: '100%',
                  padding: '1.1rem',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #7236ea 0%, #9333ea 100%)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                }}
              >
                <span>{isAr ? 'متابعة إلى إصدار التذكرة الذهبية' : 'Continue to Issue VIP Ticket'}</span>
                {isAr ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
              </button>
            </motion.div>
          )}

          {/* STEP 3: REGISTRATION FORM */}
          {step === 'register' && (
            <motion.div
              key="step-register"
              initial={{ opacity: 0, x: isAr ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isAr ? 30 : -30 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <span style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 700 }}>
                  {isAr ? 'خطوة 2 من 2' : 'Step 2 of 2'}
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0.3rem 0 0.5rem 0' }}>
                  {isAr ? 'أدخل بياناتك لإصدار التذكرة' : 'Enter Details for VIP Ticket'}
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
                  {isAr ? 'سننادي باسمك ورقم تذكرتك أثناء السحب المباشر في الجناح' : 'We will announce your name and ticket number during the live draw'}
                </p>
              </div>

              <form
                onSubmit={handleRegisterSubmit}
                style={{
                  background: 'linear-gradient(135deg, rgba(30,14,58,0.7) 0%, rgba(14,6,28,0.9) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: 22,
                  padding: '1.75rem',
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                }}
              >
                {errorMsg && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      padding: '0.85rem 1rem',
                      borderRadius: 12,
                      fontSize: '0.9rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                    }}
                  >
                    <AlertCircle size={20} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name Input */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                    {isAr ? 'الاسم الكريم (الثنائي أو الثلاثي)' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: محمد أحمد علي' : 'e.g. Mohammed Ahmed'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.1rem',
                      borderRadius: 12,
                      background: 'rgba(10, 4, 20, 0.7)',
                      border: '1px solid #7c3aed',
                      color: '#fff',
                      fontSize: '1.05rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Phone Input */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                    {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={isAr ? 'مثال: 771234567' : 'e.g. 771234567'}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.1rem',
                      borderRadius: 12,
                      background: 'rgba(10, 4, 20, 0.7)',
                      border: '1px solid #7c3aed',
                      color: '#fff',
                      fontSize: '1.05rem',
                      outline: 'none',
                      direction: 'ltr',
                      textAlign: isAr ? 'right' : 'left',
                      boxSizing: 'border-box',
                    }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.35rem', display: 'block' }}>
                    {isAr ? 'رقم واحد لكل زائر. محمي من التكرار والتلاعب.' : 'Unique phone number per visitor. Anti-cheat protected.'}
                  </small>
                </div>

                {/* City Selection */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                    {isAr ? 'المدينة' : 'City'}
                  </label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.1rem',
                      borderRadius: 12,
                      background: '#15092a',
                      border: '1px solid #7c3aed',
                      color: '#fff',
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="صنعاء">صنعاء (Sana’a)</option>
                    <option value="عدن">عدن (Aden)</option>
                    <option value="تعز">تعز (Taiz)</option>
                    <option value="المكلا">المكلا / حضرموت (Mukalla)</option>
                    <option value="إب">إب (Ibb)</option>
                    <option value="الحديدة">الحديدة (Hodeidah)</option>
                    <option value="ذمار">ذمار (Dhamar)</option>
                    <option value="أخرى">مدينة أخرى</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '1.15rem',
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#1a0730',
                    border: 'none',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    cursor: submitting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.7rem',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.45)',
                  }}
                >
                  <Sparkles size={22} />
                  <span>{submitting ? (isAr ? 'جارِ إصدار التذكرة...' : 'Issuing Ticket...') : (isAr ? 'إصدار التذكرة الذهبية الآن' : 'Get My Golden Ticket Now')}</span>
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 4: THE ULTRA LUXURIOUS GOLDEN VIP TICKET REVEAL */}
          {step === 'ticket' && ticket && (
            <motion.div
              key="step-ticket"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
            >
              {/* Congratulatory Badge */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#1a082f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.8rem auto',
                    boxShadow: '0 0 35px rgba(245, 158, 11, 0.6)',
                  }}
                >
                  <Trophy size={34} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '0 0 0.35rem 0' }}>
                  {isAr ? 'أهلاً بك! تم إصدار تذكرتك بنجاح' : 'Congratulations! Your Ticket is Issued'}
                </h2>
                <p style={{ color: '#d8b4fe', fontSize: '0.95rem', margin: 0 }}>
                  {isAr ? 'احتفظ بهذه التذكرة في هاتفك لإبرازها في الجناح عند إعلان اسمك' : 'Present this ticket to booth staff to claim your prize when drawn'}
                </p>
              </div>

              {/* HOLOGRAPHIC GOLD TICKET CARD */}
              <div
                style={{
                  background: 'linear-gradient(145deg, #241142 0%, #110524 100%)',
                  border: '2px solid rgba(251, 191, 36, 0.7)',
                  borderRadius: 24,
                  padding: '1.85rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 14px 45px rgba(114, 54, 234, 0.4), 0 0 35px rgba(245, 158, 11, 0.3)',
                  marginBottom: '1.6rem',
                }}
              >
                {/* Rainbow Metallic Glow Top Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    background: 'linear-gradient(90deg, #f59e0b, #ec4899, #7236ea, #06b6d4, #f59e0b)',
                  }}
                />

                {/* Ticket Brand Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.4rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 800, letterSpacing: 1 }}>
                      {isAr ? 'الجيل العربي الرقمي' : 'AL-JEEL AL-ARABI'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginTop: '0.2rem' }}>
                      {isAr ? 'تذكرة كبار الزوار (VIP RAFFLE)' : 'VIP RAFFLE TICKET'}
                    </div>
                  </div>

                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.25)',
                      border: '1px solid #fbbf24',
                      color: '#fef08a',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      padding: '0.3rem 0.75rem',
                      borderRadius: 10,
                    }}
                  >
                    EXPO 2026
                  </span>
                </div>

                {/* Ticket Serial Box */}
                <div
                  style={{
                    background: 'rgba(9, 3, 18, 0.85)',
                    border: '1px dashed rgba(251, 191, 36, 0.6)',
                    borderRadius: 16,
                    padding: '1.1rem',
                    textAlign: 'center',
                    marginBottom: '1.35rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {isAr ? 'رقم التذكرة الفريد للسحب' : 'UNIQUE TICKET NUMBER'}
                  </div>
                  <div
                    style={{
                      fontSize: '2.1rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: '#fbbf24',
                      letterSpacing: 2,
                      marginTop: '0.25rem',
                      direction: 'ltr',
                      textShadow: '0 0 20px rgba(251,191,36,0.4)',
                    }}
                  >
                    {ticket.ticketNumber}
                  </div>
                  <button
                    onClick={copyTicketCode}
                    style={{
                      marginTop: '0.5rem',
                      background: 'transparent',
                      border: 'none',
                      color: copied ? '#4ade80' : '#c084fc',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 600,
                    }}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    <span>{copied ? (isAr ? 'تم النسخ بنجاح!' : 'Copied!') : (isAr ? 'نسخ رقم التذكرة' : 'Copy Ticket Code')}</span>
                  </button>
                </div>

                {/* Entrant Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem', marginBottom: '1.35rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.76rem' }}>{isAr ? 'اسم المتسابق' : 'Entrant Name'}</span>
                    <strong style={{ color: '#fff', fontSize: '1rem' }}>{ticket.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.76rem' }}>{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                    <strong style={{ color: '#fff', fontSize: '1rem', direction: 'ltr', display: 'inline-block' }}>{ticket.phone}</strong>
                  </div>
                </div>

                {/* QR Code & Booth instructions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.9rem', borderRadius: 14 }}>
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      background: '#fff',
                      padding: 4,
                      borderRadius: 10,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(ticket.ticketNumber)}`}
                      alt="Ticket QR"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 800, color: '#f59e0b', marginBottom: '0.2rem' }}>
                      {isAr ? 'سحب مباشر بجناح المعرض' : 'Live Booth Raffle'}
                    </div>
                    {isAr
                      ? 'امسح الرمز أو أظهره لمسؤول الجناح لاستلام جائزتك فور إعلان اسمك في السحب المباشر.'
                      : 'Scan or present this QR to booth staff to claim your prize when your name is called.'}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Download Card + WhatsApp */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Save Image to Phone Button */}
                <button
                  onClick={downloadTicketImage}
                  disabled={downloading}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#1a0730',
                    border: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    cursor: downloading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
                  }}
                >
                  <Download size={20} />
                  <span>{downloading ? (isAr ? 'جارِ حفظ التذكرة...' : 'Saving...') : (isAr ? 'حفظ التذكرة كصورة في ألبوم هاتفي' : 'Save Ticket Card to Photos')}</span>
                </button>

                {/* Share WhatsApp Button */}
                <button
                  onClick={shareWhatsApp}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: 16,
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
                  }}
                >
                  <Share2 size={19} />
                  <span>{isAr ? 'مشاركة التذكرة عبر واتساب' : 'Share Ticket on WhatsApp'}</span>
                </button>

                {/* Browse Products Button */}
                <Link
                  to={`/${lang}/shop`}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: 16,
                    background: 'rgba(255, 255, 255, 0.07)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block',
                    boxSizing: 'border-box',
                  }}
                >
                  {isAr ? 'تصفح أجهزة وعروض الجيل العربي الرقمي' : 'Browse Hardware & Store Catalog'}
                </Link>
              </div>

              {/* Trust Footer */}
              <div style={{ textAlign: 'center', marginTop: '2rem', color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.5 }}>
                «الجيل العربي الرقمي» — تقنية تتكامل.. وضمان يستمر
                <br />
                صنعاء · شارع صخر (مقديشو) · جناح المعرض 2026
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
