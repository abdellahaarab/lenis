import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Users,
  Download,
  Sparkles,
  Search,
  RefreshCw,
  Gift,
  Smartphone,
  X,
  Volume2,
  VolumeX,
  PlusCircle,
  RotateCcw,
  Radio,
} from 'lucide-react';
import { api, ApiError } from './api';
import { Loading, ErrorBox } from './components';

interface Prize {
  id: string;
  title: Record<string, string> | string;
  description?: Record<string, string> | string;
  imageUrl?: string;
  category: string;
  quantity: number;
  sort: number;
  winners: Array<{
    id: string;
    ticketNumber: string;
    name: string;
    phone: string;
    claimedAt: string | null;
    wonAt: string | null;
  }>;
}

interface Entry {
  id: string;
  ticketNumber: string;
  name: string;
  phone: string;
  city?: string | null;
  interests: string[];
  isWinner: boolean;
  wonPrize?: { title: Record<string, string> | string } | null;
  claimedAt?: string | null;
  createdAt: string;
  notes?: string | null;
}

interface ContestOverview {
  contest: {
    id: string;
    slug: string;
    title: Record<string, string>;
    description: Record<string, string>;
    isActive: boolean;
  };
  prizes: Prize[];
  totalCount: number;
  winnersCount: number;
  recentEntries: Entry[];
  interestCounts: Record<string, number>;
}

// Synthesized Audio Engine for Live Stage (Zero external dependencies)
class LiveStageSoundFX {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(550 + Math.random() * 250, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio not permitted
    }
  }

  fanfare() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chords.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.18, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.8);
      });
    } catch {
      // Audio not permitted
    }
  }
}

const liveSound = new LiveStageSoundFX();

// Fullscreen Confetti Canvas for TV Stage
function StageConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#fbbf24', '#a855f7', '#c084fc', '#38bdf8', '#ec4899', '#ffffff'];
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.6,
      size: Math.random() * 12 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 4 + 3,
      speedX: Math.random() * 3 - 1.5,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 5 - 2.5,
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
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();

        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
      animationFrame = requestAnimationFrame(render);
    };

    render();
    const timer = setTimeout(() => cancelAnimationFrame(animationFrame), 9000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }} />;
}

export function ExpoContest() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterInterest, setFilterInterest] = useState<string>('all');
  const [isLiveStageOpen, setIsLiveStageOpen] = useState(false);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnWinner, setDrawnWinner] = useState<{
    id: string;
    ticketNumber: string;
    name: string;
    phone: string;
    city?: string | null;
  } | null>(null);
  const [shuffleText, setShuffleText] = useState('جاهز للسحب المباشر...');
  const [soundOn, setSoundOn] = useState(true);
  const [claimInput, setClaimInput] = useState('');
  const [claimMsg, setClaimMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const shuffleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading, error, refetch } = useQuery<ContestOverview>({
    queryKey: ['contest-overview'],
    queryFn: () => api<ContestOverview>('/contest/overview'),
    refetchInterval: isLiveStageOpen ? 4000 : 12000,
  });

  useEffect(() => {
    if (data?.prizes?.length && !selectedPrizeId) {
      setSelectedPrizeId(data.prizes[0].id);
    }
  }, [data, selectedPrizeId]);

  // Live Draw Mutation
  const drawMutation = useMutation({
    mutationFn: (vars: { prizeId: string }) => api<{ ok: boolean; winner: Entry; prize: Prize }>('/contest/draw', {
      method: 'POST',
      body: vars,
    }),
    onSuccess: (res) => {
      setDrawnWinner(res.winner);
      liveSound.fanfare();
      queryClient.invalidateQueries({ queryKey: ['contest-overview'] });
    },
    onError: (err: ApiError) => {
      alert(`تعذر إتمام السحب: ${err.message || 'لا يوجد مشتركين مؤهلين'}`);
      setIsDrawing(false);
    },
  });

  // Redraw Mutation
  const redrawMutation = useMutation({
    mutationFn: (vars: { previousWinnerId: string; reason?: string }) => api('/contest/draw/redraw', {
      method: 'POST',
      body: vars,
    }),
    onSuccess: () => {
      setDrawnWinner(null);
      queryClient.invalidateQueries({ queryKey: ['contest-overview'] });
    },
  });

  // Seed Demo Entrants Mutation
  const seedMutation = useMutation({
    mutationFn: () => api<{ ok: boolean; addedCount: number }>('/contest/seed-demo', { method: 'POST' }),
    onSuccess: (res) => {
      alert(`تم بنجاح إضافة ${res.addedCount} مشتركاً تجريبياً واقعياً للمعرض!`);
      queryClient.invalidateQueries({ queryKey: ['contest-overview'] });
    },
  });

  // Reset All Winners Mutation
  const resetWinnersMutation = useMutation({
    mutationFn: () => api<{ ok: boolean }>('/contest/reset-winners', { method: 'POST' }),
    onSuccess: () => {
      alert('تمت إعادة ضبط جميع الفائزين بنجاح! يمكنك الآن بدء سحب تجريبي أو حي جديد.');
      setDrawnWinner(null);
      queryClient.invalidateQueries({ queryKey: ['contest-overview'] });
    },
  });

  // Claim Prize Mutation
  const claimMutation = useMutation({
    mutationFn: (ticketNumber: string) => api<{ ok: boolean; ticketNumber: string }>('/contest/claim', {
      method: 'POST',
      body: { ticketNumber },
    }),
    onSuccess: (res) => {
      setClaimMsg({ type: 'ok', text: `تم تأكيد استلام الجائزة للتذكرة ${res.ticketNumber}` });
      setClaimInput('');
      queryClient.invalidateQueries({ queryKey: ['contest-overview'] });
    },
    onError: (err: ApiError) => {
      setClaimMsg({ type: 'err', text: err.code === 'entry_not_winner' ? 'هذه التذكرة لم تفز بعد' : 'رقم التذكرة غير موجود' });
    },
  });

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    liveSound.enabled = next;
  };

  const handleStartDraw = () => {
    if (!selectedPrizeId || !data) return;
    setIsDrawing(true);
    setDrawnWinner(null);

    const eligibleEntrants = data.recentEntries
      .filter(e => !e.isWinner)
      .map(e => `${e.ticketNumber} — ${e.name} (${e.city || 'صنعاء'})`);

    const pool = eligibleEntrants.length > 0 ? eligibleEntrants : ['JEEL-1042 — جارِ السحب...'];

    let count = 0;
    const maxTicks = 40;
    const interval = setInterval(() => {
      count++;
      const randomPick = pool[Math.floor(Math.random() * pool.length)];
      setShuffleText(randomPick);
      liveSound.tick();

      if (count >= maxTicks) {
        clearInterval(interval);
        drawMutation.mutate({ prizeId: selectedPrizeId }, {
          onSettled: () => {
            setIsDrawing(false);
          },
        });
      }
    }, 80);

    shuffleIntervalRef.current = interval;
  };

  useEffect(() => {
    return () => {
      if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    };
  }, []);

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorBox code="failed" />;

  const interestLabels: Record<string, string> = {
    laptops: 'لابتوبات وأعمال',
    security_cameras: 'كاميرات ومراقبة',
    networking: 'شبكات وسيرفرات',
    power_energy: 'طاقة وبطاريات',
    accessories: 'ملحقات وإكسسوارات',
    maintenance: 'صيانة وفحص',
  };

  const getPrizeName = (p: Prize | undefined) => {
    if (!p) return '';
    if (typeof p.title === 'object' && p.title) return (p.title as Record<string, string>).ar || (p.title as Record<string, string>).en;
    return String(p.title);
  };

  const filteredEntries = data.recentEntries.filter(entry => {
    const matchSearch =
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.phone.includes(search) ||
      entry.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchInterest = filterInterest === 'all' || (Array.isArray(entry.interests) && entry.interests.includes(filterInterest));
    return matchSearch && matchInterest;
  });

  return (
    <div className="expo-contest-container" style={{ padding: '1.5rem', direction: 'rtl', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header & Fast Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ background: '#7236ea', color: '#fff', padding: '0.2rem 0.65rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
              معرض 2026
            </span>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: 0, color: 'var(--ink, #1f1435)' }}>
              مسابقة وسحوبات المعارض التفاعلية
            </h1>
          </div>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--muted, #6b6375)', fontSize: '0.95rem' }}>
            لوحة إدارة المشتركين بالمعرض، السحب المباشر على الشاشات الكبيرة، وتصدير العملاء لحملات الواتساب.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Big Screen TV Stage Button */}
          <button
            onClick={() => setIsLiveStageOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7236ea 0%, #a855f7 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(114, 54, 234, 0.4)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Sparkles size={19} />
            شاشة السحب المباشر (TV Stage)
          </button>

          {/* Seed Demo Button */}
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.7rem 1.1rem',
              borderRadius: 10,
              background: '#faf5ff',
              color: '#7236ea',
              border: '1px solid #d8b4fe',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
            title="توليد 12 مشتركاً تجريبياً ببيانات واقعية"
          >
            <PlusCircle size={17} />
            {seedMutation.isPending ? 'جارِ التوليد...' : 'توليد مشتركين تجريبيين'}
          </button>

          {/* Reset Winners Button */}
          <button
            onClick={() => {
              if (confirm('هل ترغب بإلغاء جميع الفائزين السابقين لبدء سحب تجريبي أو رسمي جديد من الصفر؟')) {
                resetWinnersMutation.mutate();
              }
            }}
            disabled={resetWinnersMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.7rem 1.1rem',
              borderRadius: 10,
              background: '#fff',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
            title="إعادة ضبط السحب للبدء من جديد"
          >
            <RotateCcw size={16} />
            إعادة ضبط الفائزين
          </button>

          {/* Export CSV Button */}
          <a
            href="/api/admin/contest/export"
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.7rem 1.2rem',
              borderRadius: 10,
              background: '#fff',
              color: '#2e1f47',
              border: '1px solid #dcd3e9',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <Download size={17} />
            تصدير إلى Excel/CSV
          </a>
        </div>
      </div>

      {/* Live Booth Marquee / Ticker */}
      <div
        style={{
          background: 'linear-gradient(90deg, #1f0b3d 0%, #0d041a 100%)',
          color: '#e9d5ff',
          padding: '0.65rem 1.25rem',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.75rem',
          fontSize: '0.85rem',
          overflow: 'hidden',
          border: '1px solid rgba(168, 85, 247, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 800, flexShrink: 0 }}>
          <Radio size={16} />
          <span>بث مباشر من الجناح:</span>
        </div>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.recentEntries.slice(0, 5).map((e, idx) => (
            <span key={e.id} style={{ marginLeft: '1.5rem' }}>
              👤 <strong>{e.name}</strong> ({e.city || 'صنعاء'}) — <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{e.ticketNumber}</span>
              {idx < 4 ? ' •' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Key Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #e7e0ef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#70657e', fontSize: '0.88rem' }}>
            <span>إجمالي المشتركين بالمعرض</span>
            <Users size={20} color="#7236ea" />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#201532', marginTop: '0.4rem' }}>
            {data.totalCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.2rem', fontWeight: 600 }}>
            ● مؤهلين للدخول في السحب المباشر
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #e7e0ef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#70657e', fontSize: '0.88rem' }}>
            <span>الفائزون المعتمدون</span>
            <Trophy size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.4rem' }}>
            {data.winnersCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#70657e', marginTop: '0.2rem' }}>
            من أصل {data.prizes.reduce((acc, p) => acc + p.quantity, 0)} جوائز متاحة بالمعرض
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #e7e0ef', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#70657e', fontSize: '0.88rem' }}>
            <span>الأكثر طلباً واهتماماً</span>
            <Smartphone size={20} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#201532', marginTop: '0.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {Object.entries(data.interestCounts).sort((a, b) => b[1] - a[1])[0] ? (
              `${interestLabels[Object.entries(data.interestCounts).sort((a, b) => b[1] - a[1])[0][0]] || Object.entries(data.interestCounts).sort((a, b) => b[1] - a[1])[0][0]} (${Object.entries(data.interestCounts).sort((a, b) => b[1] - a[1])[0][1]})`
            ) : 'لابتوبات وأعمال'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#70657e', marginTop: '0.2rem' }}>
            رغبات الزوار للشراء اللاحق
          </div>
        </div>

        {/* Quick Ticket Claim Tool */}
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #e7e0ef' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#201532', marginBottom: '0.5rem' }}>
            تسليم جائزة (مطابقة التذكرة)
          </div>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <input
              type="text"
              placeholder="مثال: JEEL-0001-..."
              value={claimInput}
              onChange={e => setClaimInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.55rem 0.7rem',
                borderRadius: 8,
                border: '1px solid #dcd3e9',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                direction: 'ltr',
              }}
            />
            <button
              onClick={() => claimInput.trim() && claimMutation.mutate(claimInput.trim())}
              disabled={claimMutation.isPending}
              style={{
                padding: '0.55rem 0.9rem',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {claimMutation.isPending ? '...' : 'تأكيد'}
            </button>
          </div>
          {claimMsg && (
            <div style={{ fontSize: '0.78rem', marginTop: '0.45rem', color: claimMsg.type === 'ok' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
              {claimMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Prizes Overview */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#201532' }}>
          الجوائز المعتمدة في سحب الجناح
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {data.prizes.map(p => {
            const winnersCount = p.winners?.length || 0;
            const remaining = Math.max(0, p.quantity - winnersCount);
            return (
              <div
                key={p.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e7e0ef',
                  borderRadius: 14,
                  padding: '1.1rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: 54, height: 54, borderRadius: 12, background: '#eee6fc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7236ea', flexShrink: 0 }}>
                  <Gift size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#201532' }}>{getPrizeName(p)}</div>
                  <div style={{ fontSize: '0.84rem', color: '#70657e', marginTop: '0.2rem' }}>
                    الكمية: {p.quantity} | تم سحب: <span style={{ color: '#f59e0b', fontWeight: 800 }}>{winnersCount}</span> | متبقي: <span style={{ color: remaining > 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>{remaining}</span>
                  </div>
                  {p.winners && p.winners.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#7236ea', marginTop: '0.35rem', fontWeight: 600 }}>
                      الفائز: {p.winners.map(w => w.name).join('، ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e0ef', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #eee6fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#201532' }}>
            سجل المشتركين ({filteredEntries.length})
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ابحث بالاسم، الهاتف، التذكرة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '0.5rem 2.2rem 0.5rem 0.9rem',
                  borderRadius: 10,
                  border: '1px solid #dcd3e9',
                  fontSize: '0.88rem',
                  minWidth: 240,
                }}
              />
              <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9d91ad' }} />
            </div>

            <select
              value={filterInterest}
              onChange={e => setFilterInterest(e.target.value)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 10,
                border: '1px solid #dcd3e9',
                fontSize: '0.88rem',
                background: '#fff',
              }}
            >
              <option value="all">كل الاهتمامات</option>
              <option value="laptops">لابتوبات</option>
              <option value="security_cameras">كاميرات مراقبة</option>
              <option value="networking">شبكات</option>
              <option value="power_energy">طاقة وبطاريات</option>
              <option value="accessories">إكسسوارات</option>
            </select>

            <button
              onClick={() => refetch()}
              style={{
                padding: '0.5rem 0.8rem',
                borderRadius: 10,
                border: '1px solid #dcd3e9',
                background: '#fff',
                cursor: 'pointer',
              }}
              title="تحديث القائمة"
            >
              <RefreshCw size={16} color="#70657e" />
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#faf8ff', borderBottom: '1px solid #e7e0ef', color: '#70657e', fontSize: '0.82rem' }}>
                <th style={{ padding: '0.9rem 1rem' }}>رقم التذكرة</th>
                <th style={{ padding: '0.9rem 1rem' }}>الاسم</th>
                <th style={{ padding: '0.9rem 1rem' }}>الهاتف</th>
                <th style={{ padding: '0.9rem 1rem' }}>المدينة</th>
                <th style={{ padding: '0.9rem 1rem' }}>الاهتمامات</th>
                <th style={{ padding: '0.9rem 1rem' }}>الحالة في السحب</th>
                <th style={{ padding: '0.9rem 1rem' }}>التوقيت</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#8e829d' }}>
                    لا توجد بيانات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredEntries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f2ecf8', background: e.isWinner ? '#fffbeb' : 'transparent' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#7236ea', direction: 'ltr', textAlign: 'right' }}>
                      {e.ticketNumber}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#201532' }}>
                      {e.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', direction: 'ltr', textAlign: 'right', color: '#443b52' }}>
                      <a href={`tel:${e.phone}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {e.phone}
                      </a>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#70657e' }}>
                      {e.city || 'صنعاء'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {Array.isArray(e.interests) && e.interests.map(i => (
                          <span
                            key={i}
                            style={{
                              background: '#eee6fc',
                              color: '#7236ea',
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 6,
                              fontWeight: 600,
                            }}
                          >
                            {interestLabels[i] || i}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {e.isWinner ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fef3c7', color: '#b45309', padding: '0.25rem 0.65rem', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem' }}>
                          <Trophy size={14} />
                          فاز: {e.wonPrize ? (typeof e.wonPrize.title === 'object' ? (e.wonPrize.title as Record<string, string>).ar : String(e.wonPrize.title)) : 'جائزة'}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.82rem' }}>مؤهل في الصندوق</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#8e829d', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(e.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLSCREEN LIVE STAGE TV THEATER FOR BOOTH SCREENS */}
      {isLiveStageOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'radial-gradient(ellipse at center, #1c0a38 0%, #080312 100%)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.5rem',
            boxSizing: 'border-box',
            fontFamily: 'LinaRound, system-ui, sans-serif',
          }}
        >
          {/* Confetti Celebration on Winner Reveal */}
          {drawnWinner && <StageConfetti />}

          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#7236ea', padding: '0.45rem 1.2rem', borderRadius: 10, fontWeight: 900, fontSize: '1.1rem', letterSpacing: 1 }}>
                الجيل العربي الرقمي
              </div>
              <div style={{ color: '#c084fc', fontSize: '1.25rem', fontWeight: 700 }}>
                مسرح السحب المباشر — جناح المعرض 2026
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={toggleSound}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '0.6rem', borderRadius: 10, cursor: 'pointer' }}
                title={soundOn ? 'كتم الصوت' : 'تشغيل المؤثرات الصوتية'}
              >
                {soundOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
              <button
                onClick={() => setIsLiveStageOpen(false)}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                <X size={20} /> خروج من وضع العرض
              </button>
            </div>
          </div>

          {/* Central Live Raffle Roller Stage */}
          <div style={{ textAlign: 'center', margin: 'auto 0', maxWidth: 960, alignSelf: 'center', width: '100%' }}>
            {/* Prize Selector Pill */}
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', padding: '0.45rem', borderRadius: 16, marginBottom: '2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              {data.prizes.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPrizeId(p.id)}
                  disabled={isDrawing}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: 12,
                    border: 'none',
                    background: selectedPrizeId === p.id ? '#7236ea' : 'transparent',
                    color: '#fff',
                    fontWeight: selectedPrizeId === p.id ? 800 : 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {getPrizeName(p)}
                </button>
              ))}
            </div>

            {/* Current Prize Name Display */}
            <div style={{ fontSize: '1.6rem', color: '#e9d5ff', marginBottom: '1.75rem', fontWeight: 700 }}>
              السحب المباشر على: <span style={{ color: '#fbbf24', fontWeight: 900 }}>{getPrizeName(data.prizes.find(p => p.id === selectedPrizeId))}</span>
            </div>

            {/* THE BIG LUXURY ROLLING CYLINDER */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(35,16,68,0.8) 0%, rgba(16,7,32,0.95) 100%)',
                border: '2px solid rgba(168,85,247,0.5)',
                borderRadius: 28,
                padding: '3.5rem 2.5rem',
                boxShadow: isDrawing
                  ? '0 0 60px rgba(168,85,247,0.7), inset 0 0 35px rgba(114,54,234,0.5)'
                  : drawnWinner
                  ? '0 0 75px rgba(251,191,36,0.7), inset 0 0 35px rgba(245,158,11,0.4)'
                  : '0 15px 50px rgba(0,0,0,0.6)',
                transition: 'all 0.4s ease',
              }}
            >
              {drawnWinner ? (
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: '#fbbf24', color: '#1f1435', padding: '0.5rem 1.6rem', borderRadius: 30, fontWeight: 900, fontSize: '1.3rem', marginBottom: '1.75rem' }}>
                    <Trophy size={26} /> ألف مبروك للفائز بالجائزة!
                  </div>
                  <div style={{ fontSize: '3.8rem', fontWeight: 900, color: '#fff', textShadow: '0 4px 25px rgba(0,0,0,0.6)' }}>
                    {drawnWinner.name}
                  </div>
                  <div style={{ fontSize: '2.4rem', fontFamily: 'monospace', color: '#c084fc', marginTop: '1rem', direction: 'ltr', fontWeight: 800 }}>
                    {drawnWinner.ticketNumber}
                  </div>
                  <div style={{ fontSize: '1.35rem', color: '#d8b4fe', marginTop: '0.6rem' }}>
                    رقم الهاتف: {drawnWinner.phone.slice(0, 4)}***{drawnWinner.phone.slice(-3)}  |  المدينة: {drawnWinner.city || 'صنعاء'}
                  </div>

                  {/* Actions for Winner on Big Screen */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', marginTop: '2.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        claimMutation.mutate(drawnWinner.ticketNumber);
                        setIsLiveStageOpen(false);
                      }}
                      style={{
                        padding: '0.9rem 2.5rem',
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 14,
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(22,163,74,0.4)',
                      }}
                    >
                      ✓ تأكيد وتسليم الجائزة فوراً في الجناح
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل ترغب بإلغاء فوز هذا المشترك (لعدم حضوره في الجناح) وإجراء سحب بديل فوراً؟')) {
                          redrawMutation.mutate({ previousWinnerId: drawnWinner.id, reason: 'عدم الحضور في الجناح' });
                        }
                      }}
                      style={{
                        padding: '0.9rem 2rem',
                        background: 'rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        border: '1px solid #ef4444',
                        borderRadius: 14,
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      سحب بديل (غير حاضر)
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: isDrawing ? '3rem' : '2.4rem',
                      fontWeight: 900,
                      color: isDrawing ? '#c084fc' : '#94a3b8',
                      minHeight: '5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      letterSpacing: isDrawing ? 2 : 0,
                    }}
                  >
                    {shuffleText}
                  </div>

                  <div style={{ marginTop: '2.75rem' }}>
                    <button
                      onClick={handleStartDraw}
                      disabled={isDrawing}
                      style={{
                        padding: '1.2rem 4rem',
                        background: isDrawing
                          ? '#581c87'
                          : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: isDrawing ? '#d8b4fe' : '#1e0c38',
                        border: 'none',
                        borderRadius: 18,
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        cursor: isDrawing ? 'wait' : 'pointer',
                        boxShadow: '0 10px 35px rgba(245, 158, 11, 0.45)',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isDrawing) e.currentTarget.style.transform = 'scale(1.04)';
                      }}
                      onMouseLeave={e => {
                        if (!isDrawing) e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {isDrawing ? 'جارِ السحب العشوائي الآن...' : '🎲 بدء السحب المباشر'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Stage Footer */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem' }}>
            «الجيل العربي الرقمي» — تقنية تتكامل.. وضمان يستمر • سحب إلكتروني مشفر وعشوائي 100%
          </div>
        </div>
      )}
    </div>
  );
}

