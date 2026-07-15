import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Bookmark, ArrowRight, Check, X, Zap, Search, Crown,
  Laptop, Smartphone, Tablet, ChevronDown, Star, Sparkles, Loader2,
  Bell, Users, Timer, Clipboard, Play, Shield, Folder, FolderTree
} from 'lucide-react';
import { AuthForm } from '../Auth/AuthView';
import { useTheme } from '../../context/ThemeContext';
import appLogo from '../../assets/logo.png';

const trackEvent = (action: string, category: string, label?: string) => {
  console.log(`[Analytics] ${action} | ${category}${label ? ` | ${label}` : ''}`);
};

// ─── FLOATING PARTICLE ─────────────────────────────────────────────────────
const Particle: React.FC<{ x: number; y: number; size: number; delay: number; color: string }> = ({ x, y, size, delay, color }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, opacity: 0 }}
    animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0] }}
    transition={{ duration: 4 + Math.random() * 3, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

// ─── ANIMATED GRADIENT ORB ─────────────────────────────────────────────────
const GradientOrb: React.FC<{ className: string; animate?: boolean }> = ({ className, animate: anim = true }) => (
  <motion.div
    className={className}
    animate={anim ? { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] } : undefined}
    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
  />
);

// ─── COUNTER ANIMATION ────────────────────────────────────────────────────
const CountUp: React.FC<{ to: number; suffix?: string }> = ({ to, suffix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = to / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 40);
    return () => clearInterval(timer);
  }, [to]);
  return <>{count.toLocaleString()}{suffix}</>;
};

export const LandingView: React.FC = () => {
  useTheme();
  const [showIntro, setShowIntro] = useState(true);
  const [authModal, setAuthModal] = useState<{ open: boolean; isRegister: boolean }>({ open: false, isRegister: false });
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [activePricingTier, setActivePricingTier] = useState<'free' | 'pro' | 'team'>('pro');

  // ROI Calculator States
  const [dailyLinks, setDailyLinks] = useState(5);
  const [teamSize, setTeamSize] = useState(5);

  const yearlyTimeSaved = useMemo(() => {
    // 5 mins per search * dailyLinks * 250 work days * teamSize
    const minutes = 5 * dailyLinks * 250 * teamSize;
    return Math.round(minutes / 60);
  }, [dailyLinks, teamSize]);

  const yearlyMoneySaved = useMemo(() => {
    return yearlyTimeSaved * 35; // average hourly developer/professional rate
  }, [yearlyTimeSaved]);

  // Interactive demo simulation
  const [searchText, setSearchText] = useState('');
  const [dashboardSearchFilter, setDashboardSearchFilter] = useState('');
  const [simulationState, setSimulationState] = useState<'idle' | 'typing_search' | 'searching' | 'typing_url' | 'adding' | 'added' | 'favoriting' | 'alarming'>('idle');
  const [typedUrl, setTypedUrl] = useState('');
  const [extraKeeps, setExtraKeeps] = useState<any[]>([]);
  const [alarmKeepId, setAlarmKeepId] = useState<number | null>(null);

  // 3D Card Tilt
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 0.25], [0.88, 1.02]);
  const rotateX = useTransform(scrollYProgress, [0, 0.25], [8, 0]);
  const y = useTransform(scrollYProgress, [0, 0.25], [48, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0.85, 1]);

  const [scrolled, setScrolled] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Multi-stage demo loop
  useEffect(() => {
    if (showIntro) return;
    let isCancelled = false;

    const runSimulation = async () => {
      if (isCancelled) return;
      setSimulationState('idle'); setSearchText(''); setDashboardSearchFilter(''); setTypedUrl(''); setExtraKeeps([]); setAlarmKeepId(null);
      await new Promise(r => setTimeout(r, 1800));

      if (isCancelled) return;
      setSimulationState('typing_search');
      const searchTarget = 'Tasarım';
      for (let i = 1; i <= searchTarget.length; i++) {
        if (isCancelled) return;
        setSearchText(searchTarget.substring(0, i));
        setDashboardSearchFilter(searchTarget.substring(0, i));
        await new Promise(r => setTimeout(r, 120));
      }
      await new Promise(r => setTimeout(r, 1500));

      if (isCancelled) return;
      setSearchText(''); setDashboardSearchFilter('');
      setSimulationState('typing_url');
      const urlTarget = 'dribbble.com/shots/ui-kit';
      for (let i = 1; i <= urlTarget.length; i++) {
        if (isCancelled) return;
        setTypedUrl(urlTarget.substring(0, i));
        await new Promise(r => setTimeout(r, 80));
      }
      await new Promise(r => setTimeout(r, 600));

      if (isCancelled) return;
      setSimulationState('adding');
      await new Promise(r => setTimeout(r, 1600));

      if (isCancelled) return;
      const newCard = { id: 99, title: 'Modern UI Kit — Dribbble Collection', domain: 'dribbble.com', category: 'Tasarım', isPinned: false, isNew: true, is_favorite: false, reading_time: 3 };
      setExtraKeeps([newCard]);
      setSimulationState('added');
      setTypedUrl('');
      await new Promise(r => setTimeout(r, 1200));

      if (isCancelled) return;
      setSimulationState('favoriting');
      setExtraKeeps(prev => prev.map(k => k.id === 99 ? { ...k, is_favorite: true } : k));
      await new Promise(r => setTimeout(r, 1200));

      if (isCancelled) return;
      setSimulationState('alarming');
      setAlarmKeepId(99);
      await new Promise(r => setTimeout(r, 3000));
      setAlarmKeepId(null);
      await new Promise(r => setTimeout(r, 1000));
    };

    const loop = async () => { while (!isCancelled) await runSimulation(); };
    const t = setTimeout(loop, 1200);
    return () => { isCancelled = true; clearTimeout(t); };
  }, [showIntro]);

  const handleOpenAuth = (isRegister: boolean) => {
    setAuthModal({ open: true, isRegister });
    trackEvent('auth_modal_opened', 'Navigation', isRegister ? 'Register' : 'Login');
  };
  const handleCloseAuth = () => setAuthModal({ open: false, isRegister: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: (e.clientX - rect.left) / rect.width - 0.5, y: (e.clientY - rect.top) / rect.height - 0.5 });
  };

  const mockKeeps = [
    { id: 1, title: 'Pratik Akşam Yemeği Tarifleri', domain: 'nefisyemektarifleri.com', category: 'Tarifler', isPinned: true, is_favorite: true, reading_time: 4 },
    { id: 2, title: 'En İyi Bilim Kurgu Filmleri 2025', domain: 'imdb.com', category: 'İzleme', isPinned: true, is_favorite: false, reading_time: null },
    { id: 3, title: 'Ergonomik Ofis Sandalyesi Rehberi', domain: 'trendyol.com', category: 'Alışveriş', isPinned: false, is_favorite: false, reading_time: 6 },
    { id: 4, title: 'Ege Turu Gezi Rotası 2025', domain: 'gezimanya.com', category: 'Seyahat', isPinned: false, is_favorite: true, reading_time: 8 },
    { id: 5, title: 'Haftalık Mutfak Alışveriş Listesi', domain: 'notion.so', category: 'Notlar', isPinned: false, is_favorite: false, reading_time: 2 },
  ];

  const allKeeps = [...extraKeeps, ...mockKeeps];
  const filteredKeeps = allKeeps.filter(k =>
    k.title.toLowerCase().includes(dashboardSearchFilter.toLowerCase()) ||
    k.domain.toLowerCase().includes(dashboardSearchFilter.toLowerCase())
  );

  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 4,
    color: i % 3 === 0 ? 'rgba(16,185,129,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.5)' : 'rgba(59,130,246,0.5)'
  }));

  return (
    <div className="bg-[#fcfcfd] dark:bg-[#070708] text-slate-800 dark:text-slate-100 min-h-screen selection:bg-accent/20 font-sans transition-colors duration-300 overflow-x-hidden">

      {/* ── INTRO ── */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro" exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
            className="fixed inset-0 z-[99999] bg-[#070708] flex flex-col items-center justify-center select-none"
          >
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }} className="flex flex-col items-center gap-6"
            >
              <motion.div animate={{ boxShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 60px rgba(16,185,129,0.4)', '0 0 0px rgba(16,185,129,0)'] }}
                transition={{ duration: 2, repeat: Infinity }}>
                <img src={appLogo} alt="Keepr" className="w-16 h-16 rounded-2xl object-cover" />
              </motion.div>
              <h1 className="text-3xl font-black text-white tracking-[0.35em] uppercase">KEEPR</h1>
              <div className="w-12 h-0.5 bg-[#10b981]/30 rounded-full overflow-hidden relative">
                <motion.div initial={{ left: '-100%' }} animate={{ left: '120%' }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#10b981] to-transparent"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/85 dark:bg-[#070708]/85 backdrop-blur-xl border-b border-gray-100 dark:border-[#1c1c1e] py-3'
        : 'bg-transparent py-5'}`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={appLogo} alt="Keepr" className="w-7 h-7 rounded-lg object-cover shadow-md shadow-accent/20" />
            <span className="font-black text-sm text-slate-800 dark:text-slate-200 tracking-[0.2em] uppercase">Keepr</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-2 border-l border-slate-200 dark:border-[#2c2c2e] pl-2 hidden sm:block">Dijital Havuz</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => handleOpenAuth(false)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-accent transition-colors bg-transparent border-none cursor-pointer hidden sm:block">
              Giriş Yap
            </button>
            <button onClick={() => handleOpenAuth(true)}
              className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-accent/20 active:scale-95 border-none">
              Ücretsiz Başla
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-36 md:pt-52 pb-28 px-6 max-w-6xl mx-auto flex flex-col items-center text-center relative overflow-hidden select-none">
        {/* Animated background orbs */}
        <GradientOrb className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-r from-accent/12 via-violet-500/8 to-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <GradientOrb className="absolute top-20 left-1/4 w-[350px] h-[350px] bg-emerald-500/6 rounded-full blur-[90px] pointer-events-none" animate={false} />
        <GradientOrb className="absolute top-10 right-1/4 w-[280px] h-[280px] bg-violet-500/6 rounded-full blur-[80px] pointer-events-none" />
        {/* Floating particles */}
        {particles.map((p, i) => <Particle key={i} {...p} />)}

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }} className="space-y-8 max-w-4xl z-10">

          <motion.span
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/8 dark:bg-accent/12 border border-accent/15 dark:border-accent/25 text-[10px] font-bold text-accent uppercase tracking-widest">
            <Sparkles size={10} className="fill-accent/30 animate-pulse" />
            Kaydettiğiniz Ama Unuttuğunuz O Linklerin Hikayesini Değiştirin
          </motion.span>

          <h1 className="text-5xl md:text-7xl lg:text-[88px] font-black text-slate-900 dark:text-white leading-[1.02] tracking-[-0.04em] text-center">
            Sekmeler arasında<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-emerald-400 to-[#059669]">can çekişen</span>
            <br />fikirleri kurtarın.
          </h1>

          <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed text-center">
            WhatsApp gruplarında çürüyen, tarayıcı yer imlerinde tozlanan tüm bağlantılarınızı; yapay zeka destekli okuma süreleri, akıllı hatırlatıcı alarmlar ve muhteşem görsel kartlarla <span className="text-slate-800 dark:text-slate-200 font-bold">dijital ikinci beyninizde</span> saklayın.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <motion.button
              onClick={() => handleOpenAuth(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-accent text-white text-sm font-bold px-8 py-4 rounded-2xl shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/25 group border-none cursor-pointer">
              <span>Zihnimi Hafifletmek İstiyorum — Ücretsiz</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.a href="#mockup" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-bold px-7 py-4 rounded-2xl border border-gray-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#121215] transition-all no-underline">
              <Play size={13} className="fill-current" />
              Sihirli Arayüzü İncele
            </motion.a>
          </div>

          {/* Social proof micro-bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {['🧑‍💻','👩‍🎨','👨‍💼','👩‍🔬','🧑‍🏫'].map((emoji, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#1c1c1e] dark:to-[#2c2c2e] border-2 border-white dark:border-[#070708] flex items-center justify-center text-xs">{emoji}</div>
              ))}
            </div>
            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}</div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">500+ dijital üretici Keepr ile organize oluyor</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="px-6 py-24 bg-white dark:bg-[#070708] border-t border-gray-100 dark:border-[#121215] relative overflow-hidden">
        <div className="absolute left-1/4 top-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="flex-1 space-y-6 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">ZİHİNSEL DAĞINIKLIK</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Zihniniz sekmeleriniz kadar dolu. Ve bu durum sizi sessizce tüketiyor.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              İnternet her gün karşımıza harika makaleler, videolar, tasarımlar ve ilham verici fikirler çıkarıyor. Ama onları saklamak tam bir kaos. Tarayıcınızda biriken 40 açık sekme cihazınızı yavaşlatırken zihninizi de yorar. Kendi kendinize WhatsApp'tan attığınız linkler sohbet geçmişinde kaybolur; yer imi (bookmark) klasörleriniz ise bir daha hiç açılmayacak tozlu link mezarlıklarına dönüşür.
            </p>
          </div>
          <div className="w-full md:w-[320px] bg-red-500/5 border border-red-500/10 rounded-3xl p-6 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xl">🤯</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sekme Yorgunluğu (Tab Fatigue)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Bilgisayarınızda açık bıraktığınız her sekme, aslında zihninizde açık kalan ve odaklanmanızı engelleyen bitmemiş birer görevdir.</p>
            <div className="w-full h-[1px] bg-red-500/10" />
            <div className="flex items-center gap-3">
              <span className="text-xl">🗑️</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Unutulan Değerli Fikirler</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Pocket veya tarayıcı listelerine "sonra okurum" diye kaydettiğiniz bağlantıların %87'sini bir daha asla açıp bakmazsınız.</p>
          </div>
        </div>
      </section>

      {/* ── SOLUTION ── */}
      <section className="px-6 py-24 bg-slate-50/50 dark:bg-[#0a0a0c]/50 border-y border-gray-100 dark:border-[#121215] relative overflow-hidden">
        <div className="absolute right-1/4 top-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row-reverse items-center gap-12 relative z-10">
          <div className="flex-1 space-y-6 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">DİJİTAL İKİNCİ BEYİN</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Sekmeleri korkusuzca kapatın. Keepr sizin yerinize hatırlar.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Keepr, dijital dünyadaki düzenli arşivinizdir. Kopyaladığınız bir bağlantıyı webde veya mobilde anında otomatik algılar ve sizi yormadan kaydeder. Yapay zekayla okuma süreleri çıkarılır, akıllı alarmlarla makaleleriniz tam okumak istediğiniz anda karşınıza getirilir. Zihninizi hafifletin, sekmeleri kapatın; Keepr her şeyi organize etsin.
            </p>
          </div>
          <div className="w-full md:w-[320px] bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pano Algılama (Auto-Paste)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Tek tek link yapıştırmakla uğraşmayın. Panonuza kopyaladığınız linki Keepr anında bulur ve kaydetmenizi önerir.</p>
            <div className="w-full h-[1px] bg-emerald-500/10" />
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Zamanlı Alarm Hatırlatıcı</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">İçerikleri kaydetmek yetmez. Onlara alarm kurun, zamanı geldiğinde şık bir bildirim ve e-postayla hatırlatalım.</p>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section ref={statsRef} className="py-10 border-y border-gray-100 dark:border-[#121215] bg-white/60 dark:bg-[#09090b]/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Kayıtlı Bağlantı', value: 12500, suffix: '+' },
            { label: 'Aktif Kullanıcı', value: 520, suffix: '+' },
            { label: 'Kategori Oluşturuldu', value: 3200, suffix: '+' },
            { label: 'Zaman Tasarrufu', value: 99, suffix: '%' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {statsVisible ? <CountUp to={stat.value} suffix={stat.suffix} /> : `0${stat.suffix}`}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERACTIVE DEMO ── */}
      <section id="mockup" className="px-6 py-20 bg-slate-50/40 dark:bg-[#09090b]/40">
        <div className="max-w-5xl mx-auto" ref={containerRef}>
          <div className="text-center mb-10 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Canlı Demo</span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Gerçek zamanlı izleyin</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Link ekleme, arama, favorileme ve alarm kurma — hepsi otomatik simüle ediliyor.</p>
          </div>

          <motion.div
            className="w-full bg-white dark:bg-[#121212] border border-gray-200/80 dark:border-[#222] rounded-2xl shadow-2xl overflow-hidden transform origin-top"
            style={{ scale, rotateX, y, opacity, perspective: 1000 } as any}
          >
            {/* Browser chrome */}
            <div className="bg-slate-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-[#222] px-4 py-2.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 max-w-xs mx-auto">
                <div className="bg-white dark:bg-[#0c0c0d] border border-gray-200 dark:border-[#2c2c2e] rounded-md py-1 px-3 text-[9px] text-slate-400 text-center font-mono">
                  app.keepr.co/dashboard
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[9px] text-accent font-bold">CANLI</span>
              </div>
            </div>

            {/* Dashboard */}
            <div className="flex overflow-hidden" style={{ height: '360px' }}>
              {/* Sidebar */}
              <div className="w-44 border-r border-gray-100 dark:border-[#1c1c1e] bg-slate-50/60 dark:bg-[#0e0e0f] p-3 flex flex-col gap-4 flex-shrink-0">
                <div className="space-y-0.5">
                  <div className="px-2 py-1.5 rounded-lg bg-accent/10 text-accent font-bold text-[9px] flex items-center justify-between">
                    <span>📚 Tüm Linkler</span>
                    <span className="bg-accent/15 px-1.5 rounded text-[8px]">{allKeeps.length}</span>
                  </div>
                  <div className="px-2 py-1.5 text-slate-500 text-[9px] flex items-center justify-between">
                    <span>❤️ Favoriler</span>
                    <span>{allKeeps.filter(k => k.is_favorite).length}</span>
                  </div>
                  <div className="px-2 py-1.5 text-slate-500 text-[9px] flex items-center justify-between">
                    <span>📌 Sabitlenmiş</span>
                    <span>{allKeeps.filter(k => k.isPinned).length}</span>
                  </div>
                  <div className="px-2 py-1.5 text-slate-500 text-[9px] flex items-center gap-1">
                    <Bell size={9} className="text-violet-500" />
                    <span className="text-violet-500 font-semibold">Alarmlar</span>
                    <span className="ml-auto text-[8px] bg-violet-500/10 text-violet-500 px-1.5 rounded font-bold">PRO</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-[#1c1c1e]" />
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-2">Kategoriler</span>
                  {['Tarifler','Tasarım','İzleme','Seyahat','Notlar'].map((cat, i) => (
                    <div key={cat} className="px-2 py-1 text-slate-500 text-[9px] flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${['bg-emerald-500','bg-violet-500','bg-blue-500','bg-rose-500','bg-amber-500'][i]}`} />
                      {cat}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main area */}
              <div className="flex-1 bg-white dark:bg-[#0c0c0d] p-3 flex flex-col min-w-0">
                {/* Input + search */}
                <div className="space-y-2 mb-3 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Bookmark size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" readOnly value={typedUrl} placeholder="Yeni bağlantı (URL) yapıştırın..."
                        className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-[#151515] border border-gray-100 dark:border-[#222] rounded-lg text-[9px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
                    </div>
                    <button type="button"
                      className={`px-3 rounded-lg text-[9px] font-bold text-white flex items-center gap-1 border-none flex-shrink-0 ${simulationState === 'adding' ? 'bg-amber-500' : 'bg-accent'}`}>
                      {simulationState === 'adding' ? <><Loader2 size={9} className="animate-spin" />Çözümleniyor</> : 'Ekle →'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" readOnly value={searchText} placeholder="Koleksiyonda ara..."
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-[#151515] border border-gray-100/50 dark:border-[#222] rounded-lg text-[9px] text-slate-600 dark:text-slate-400 focus:outline-none" />
                  </div>
                </div>

                {/* Cards grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-0.5">
                  <AnimatePresence>
                    {simulationState === 'adding' && (
                      <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="p-2.5 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl flex flex-col gap-1 min-h-[72px]">
                        <div className="flex items-center gap-1">
                          <Loader2 size={9} className="animate-spin text-amber-500" />
                          <span className="text-[8px] text-amber-500 font-bold uppercase">Metadata Çekiliyor</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">dribbble.com/shots...</span>
                      </motion.div>
                    )}
                    {filteredKeeps.map(keep => {
                      const isNew = keep.id === 99;
                      const isFav = isNew && keep.is_favorite;
                      const hasAlarm = keep.id === alarmKeepId;
                      return (
                        <motion.div key={keep.id} layout
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, borderColor: isNew ? '#10b981' : undefined }} exit={{ opacity: 0, scale: 0.9 }}
                          className="p-2.5 bg-[#fcfcfd] dark:bg-[#151515] border border-gray-100 dark:border-[#222] rounded-xl flex flex-col justify-between min-h-[72px] relative group overflow-hidden">
                          {hasAlarm && (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="absolute inset-x-0 top-0 bg-violet-500 text-white text-[7px] font-bold flex items-center justify-center gap-1 py-0.5">
                              <Bell size={7} /> Alarm Kuruldu
                            </motion.div>
                          )}
                          <div className={hasAlarm ? 'mt-3' : ''}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[7px] bg-accent/8 text-accent font-bold px-1.5 py-0.5 rounded uppercase tracking-wide truncate max-w-[70%]">{keep.category}</span>
                              <div className="flex gap-1 items-center">
                                {keep.isPinned && <span className="text-[9px]">📌</span>}
                                {isFav && <motion.span animate={{ scale: [1,1.4,1] }} transition={{ duration: 0.5, repeat: 2 }} className="text-[9px]">❤️</motion.span>}
                                {!isFav && keep.is_favorite && <span className="text-[9px]">❤️</span>}
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">{keep.title}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[7px] text-slate-400">{keep.domain}</span>
                            {keep.reading_time && <span className="text-[7px] text-slate-400 font-semibold">{keep.reading_time} dk</span>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Status bar */}
            <div className="border-t border-gray-100 dark:border-[#1c1c1e] bg-slate-50 dark:bg-[#0e0e0f] px-4 py-1.5 flex items-center gap-4 text-[8px] text-slate-400">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Senkronize</span>
              {simulationState === 'added' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-500 font-semibold">✓ Link eklendi</motion.span>}
              {simulationState === 'favoriting' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-400 font-semibold">❤️ Favorilere eklendi</motion.span>}
              {simulationState === 'alarming' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-violet-400 font-semibold">🔔 Alarm kuruldu — Pro</motion.span>}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BENTO GRID ── */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-14 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Olağanüstü Özellikler</span>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Link kaydetmekten çok daha fazlası.</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Her özellik, dijital yaşamınızdaki dağınıklığı yok etmek için tasarlandı.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 auto-rows-auto">
          {/* Large: Alarm */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="col-span-2 md:col-span-2 bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-8 shadow-sm relative overflow-hidden cursor-default">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6">
              <Bell size={22} className="text-violet-500" />
            </div>
            <div className="flex items-start justify-between">
              <div className="space-y-2 max-w-xs">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Akıllı Alarm Sistemi</h3>
                  <span className="text-[8px] font-black bg-violet-500/10 text-violet-500 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wide">PRO</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Herhangi bir link kartı için hatırlatma tarihi belirleyin. Zamanı geldiğinde anlık bildirim veya e-posta alın. Hiçbir şeyi unutmayın.</p>
              </div>
              {/* Mini alarm demo */}
              <div className="hidden md:flex flex-col gap-2 flex-shrink-0 ml-8">
                <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-3 text-[9px] w-40">
                  <div className="font-bold text-violet-700 dark:text-violet-300 mb-1">🔔 Alarm Kuruldu</div>
                  <div className="text-slate-500">Pazartesi 09:00</div>
                  <div className="text-slate-400 truncate mt-0.5">dribbble.com/ui-kit</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-xl p-3 text-[9px] w-40 opacity-60">
                  <div className="font-bold text-slate-600 dark:text-slate-300 mb-1">📅 Yaklaşan</div>
                  <div className="text-slate-400">Cuma 18:00</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Clipboard */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm relative overflow-hidden cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
              <Clipboard size={20} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Pano Algılama</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Kopyaladığınız linki otomatik algılar. Ekranın altında beliren kapsülle tek dokunuşta kaydedin.</p>
            {/* Mini demo */}
            <motion.div animate={{ y: [6, 0, 6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-4 bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-xl px-3 py-2 flex items-center gap-2 text-[9px]">
              <div className="w-5 h-5 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Bookmark size={9} className="text-accent" />
              </div>
              <span className="text-slate-500 truncate flex-1">notion.so/doc</span>
              <span className="text-accent font-bold">Kaydet →</span>
            </motion.div>
          </motion.div>

          {/* Reading time */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
              <Timer size={20} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Okuma Süresi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Her link için otomatik hesaplanan okuma süresi. Hangi içeriğe ne kadar vakit harcayacağınızı önceden bilin.</p>
            <div className="mt-4 flex gap-2">
              {['3 dk', '8 dk', '12 dk'].map((t, i) => (
                <span key={i} className="text-[9px] font-bold bg-amber-50 dark:bg-amber-500/8 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/15 px-2 py-1 rounded-lg">{t}</span>
              ))}
            </div>
          </motion.div>

          {/* Auto metadata — wide */}
          <motion.div
            onMouseMove={handleMouseMove} onMouseEnter={() => setHoveredCard(1)} onMouseLeave={() => { setHoveredCard(null); setMousePosition({x:0,y:0}); }}
            style={{ transform: hoveredCard === 1 ? `perspective(1000px) rotateX(${mousePosition.y * 10}deg) rotateY(${mousePosition.x * -10}deg)` : 'perspective(1000px)', transition: hoveredCard === 1 ? 'none' : 'transform 0.5s ease' }}
            className="md:col-span-2 bg-gradient-to-br from-accent to-emerald-600 rounded-3xl p-8 shadow-xl relative overflow-hidden cursor-default select-none">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Zap size={20} className="text-white" fill="rgba(255,255,255,0.3)" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Yapay Zeka Destekli Akıllı Analiz</h3>
            <p className="text-xs text-emerald-100 leading-relaxed max-w-sm">Manuel veri girişi devri bitti! Linki yapıştırdığınız milisaniyeler içinde başlığı, site logolarını, detaylı açıklamaları ve hatta okuma süresi tahminini arka planda otomatik çekip hazırlarız.</p>
          </motion.div>

          {/* Team / Shared folders */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm relative cursor-default overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[8px] font-black bg-violet-500/10 text-violet-500 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase">TEAM</span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-5">
              <Users size={20} className="text-violet-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ortak Klasörler & Ekip Rolleri</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Ekibinizle klasör paylaşın. Kullanıcıları "Editör" veya "İzleyici (Salt Okunur)" yetkileriyle sınırlandırın. 48 saatlik güvenli token davet linkleriyle anında ortak çalışmaya başlayın.</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex -space-x-2">
                {['🧑‍💻','👩‍🎨','👨‍💼','👩‍🔬'].map((e, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#1c1c1e] border-2 border-white dark:border-[#121212] flex items-center justify-center text-xs">{e}</div>
                ))}
              </div>
              <span className="text-[8px] font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-md uppercase">AKTİF</span>
            </div>
          </motion.div>

          {/* Keyboard shortcuts */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#1c1c1e] flex items-center justify-center mb-5">
              <span className="text-lg">⌨️</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Linear Hızında Kısayollar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">Fareye dokunmadan ışık hızında yönetim. Seçili kartlarda F (Favori), P (Sabitle), A (Alarm) ve Backspace (Sil) tuşlarıyla saniyeler kazanın.</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[['F','Favori'],['P','Sabitle'],['A','Alarm']].map(([key, label]) => (
                <div key={key} className="bg-slate-50 dark:bg-[#1c1c1e] rounded-lg p-2 text-center">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono">{key}</span>
                  <div className="text-[7px] text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Subfolders */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm cursor-default relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[8px] font-black bg-violet-500/10 text-violet-500 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase">TEAM</span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
              <FolderTree size={20} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Alt Klasör Hiyerarşisi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Derinlemesine kitaplık düzeni. Ana kategorilerinizin altına alt klasörler ekleyerek "Tasarım &gt; İlham &gt; Mobil" gibi kusursuz bir kütüphane ağaç yapısı oluşturun.</p>
            <div className="mt-4 flex gap-1.5 items-center text-[9px] text-slate-400">
              <Folder size={11} className="text-slate-400" />
              <span>Klasör</span>
              <span>→</span>
              <FolderTree size={11} className="text-accent" />
              <span className="font-bold text-slate-600 dark:text-slate-300">Alt Klasör</span>
            </div>
          </motion.div>

          {/* Themes & Dark Mode */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm cursor-default relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[8px] font-black bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full uppercase">PRO</span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-5">
              <Sparkles size={20} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Özel Premium Temalar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Görsel zevkinize uydurun. 5 farklı ultra-şık accent rengi ve kusursuz OLED koyu mod (dark mode) geçişi ile arayüzü tamamen kendinize özel kılın.</p>
            <div className="mt-4 flex items-center gap-1.5">
              {['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'].map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-[#121212] shadow-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[8px] font-bold text-slate-400 ml-1">+ Dark Mode</span>
            </div>
          </motion.div>

          {/* Grid & List View */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl p-7 shadow-sm cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-5">
              <Laptop size={20} className="text-sky-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Grid & Liste Düzenleri</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Pinterest tarzı zengin kartlar veya ultra-kompakt liste modu. Çalışma alışkanlıklarınıza ve ekran yapınıza göre tek tıkla düzeninizi değiştirin.</p>
            <div className="mt-4 flex gap-2">
              <div className="flex-1 bg-accent/5 border border-accent/15 rounded-lg p-2 text-center">
                <span className="text-[9px] font-bold text-accent">Grid</span>
                <div className="grid grid-cols-3 gap-0.5 mt-1">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-1.5 bg-accent/20 rounded" />)}
                </div>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-[#2c2c2e] rounded-lg p-2 text-center">
                <span className="text-[9px] font-bold text-slate-400">List</span>
                <div className="flex flex-col gap-0.5 mt-1">
                  {[1,2,3].map(i => <div key={i} className="h-1.5 bg-slate-200 dark:bg-[#2c2c2e] rounded" />)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Favorites & Pinning — full width */}
          <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}
            className="md:col-span-3 bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 rounded-3xl p-8 shadow-xl relative overflow-hidden cursor-default select-none">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="space-y-2 max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Star size={20} className="text-white" fill="rgba(255,255,255,0.4)" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Favoriler & Başa Sabitleme</h3>
                    <span className="text-[8px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full uppercase">PRO</span>
                  </div>
                </div>
                <p className="text-xs text-white/80 leading-relaxed max-w-sm">Gün içinde elinizin altında olması gereken en kritik linklerinizi ❤️ ile favorileyin veya 📌 ile listenin en tepesine kilitleyin. Mobilde sola kaydırarak anında silme, toplu seçim ile saniyeler içinde klasörler arası taşıma gücü.</p>
              </div>
              <div className="hidden md:flex flex-col gap-2 flex-shrink-0 ml-6">
                <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-[9px] text-white flex items-center gap-2">
                  <span>❤️</span> <span className="font-bold">Favorilere Eklendi</span>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-[9px] text-white/70 flex items-center gap-2">
                  <span>📌</span> <span className="font-bold">Başa Sabitlendi</span>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-[9px] text-white/70 flex items-center gap-2">
                  <span>🗑️</span> <span className="font-bold">Sola Kaydır → Sil</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-24 bg-white dark:bg-[#0a0a0c] border-y border-gray-100 dark:border-[#121215]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Nasıl Çalışır?</span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">3 adımda dijital düzen.</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Hesap oluşturun, bağlantılarınızı yapıştırın, gerisini Keepr halletsin.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Ücretsiz Kaydolun', desc: '30 saniyede hesap oluşturun. Kredi kartı gerekmez, kurulum yok. E-posta ve şifrenizle hemen başlayın.', icon: '🚀', gradient: 'from-accent to-emerald-500' },
              { step: '02', title: 'Linkleri Yapıştırın', desc: 'URL yapıştırın veya kopyaladığınızda otomatik algılansın. Keepr başlık, açıklama, favicon ve okuma süresini saniyeler içinde çeker.', icon: '📋', gradient: 'from-blue-500 to-violet-500' },
              { step: '03', title: 'Düzenleyin & Paylaşın', desc: 'Kategorilere ayırın, alt klasörler oluşturun, alarm kurun. Ekibinizle güvenli davet linkleriyle ortak klasörler açın.', icon: '✨', gradient: 'from-violet-500 to-rose-500' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative text-center space-y-4">
                <div className="relative inline-flex mx-auto">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black flex items-center justify-center shadow">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                {i < 2 && <div className="hidden md:block absolute top-8 -right-4 w-8 text-center text-slate-300 dark:text-slate-600 text-lg">→</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEVICE SYNC ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Anında Senkronizasyon</span>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Keepr her yerde elinizin altında.</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Web, tablet ve mobil arasında saniyeler içinde senkronize.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-end">
          {[
            { title: 'Keepr Web', subtitle: 'Safari · Chrome · Firefox', icon: <Laptop size={18} className="text-accent" />, height: 'aspect-video' },
            { title: 'Keepr Tablet', subtitle: 'iPad · Android Tablet', icon: <Tablet size={18} className="text-accent" />, height: 'aspect-[4/3]' },
            { title: 'Keepr Mobile', subtitle: 'iOS · Android', icon: <Smartphone size={18} className="text-accent" />, height: '' },
          ].map((device, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}>
              <div className={`bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-2xl shadow-lg overflow-hidden ${device.height || ''} ${i === 2 ? 'w-44 mx-auto' : ''}`}>
                <div className="bg-slate-50 dark:bg-[#161618] px-3 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-[#1c1c1e]">
                  {i !== 2 && <><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /></>}
                  <span className="text-[8px] text-slate-400 ml-1 font-medium">{device.subtitle}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-accent/5 border border-accent/15 rounded-lg p-2.5">
                    <span className="text-[9px] font-bold text-accent">{device.title}</span>
                    {device.icon}
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-slate-100 dark:bg-[#1c1c1e] rounded w-full" />
                    <div className="h-1.5 bg-slate-100 dark:bg-[#1c1c1e] rounded w-3/4" />
                    <div className="h-1.5 bg-slate-100 dark:bg-[#1c1c1e] rounded w-1/2" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 3-TIER PRICING ── */}
      <section className="px-6 py-24 border-t border-gray-100 dark:border-[#1c1c1e] relative overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-accent/5 via-violet-500/4 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-14 relative z-10">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Planlar</span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Basit ve şeffaf fiyatlandırma.</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ücretsiz başlayın. İstediğiniz an yükseltin. İstediğiniz an iptal edin.</p>
          </div>

          {/* Tier tabs */}
          <div className="flex justify-center">
            <div className="flex bg-slate-100 dark:bg-[#1c1c1e] rounded-2xl p-1 gap-1">
              {(['free','pro','team'] as const).map(tier => (
                <button key={tier} onClick={() => setActivePricingTier(tier)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${activePricingTier === tier
                    ? tier === 'team' ? 'bg-violet-500 text-white shadow' : 'bg-accent text-white shadow'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                  {tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Team'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* Free */}
            <motion.div animate={{ scale: activePricingTier === 'free' ? 1.03 : 1, opacity: activePricingTier !== 'free' ? 0.7 : 1 }} transition={{ type: 'spring', stiffness: 300 }}
              className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2c2c2e] rounded-3xl p-7 flex flex-col shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ücretsiz</span>
                <div className="flex items-baseline gap-1 mt-3 mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">0</span>
                  <span className="text-slate-400 text-xs">TL / ömür boyu</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  {['Sınırsız bağlantı kaydetme','Otomatik metadata çekimi','Sınırsız kategori','Temel arama'].map(f => (
                    <li key={f} className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><Check size={9} className="text-emerald-500" strokeWidth={3} /></div>{f}</li>
                  ))}
                  {['Özel Temalar & Koyu Mod','Sabitleme & Favorileme','Akıllı Alarmlar'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 opacity-50"><div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-[#2c2c2e] flex items-center justify-center flex-shrink-0"><X size={9} className="text-slate-400" strokeWidth={2} /></div><span className="line-through">{f}</span></li>
                  ))}
                </ul>
              </div>
              <button onClick={() => handleOpenAuth(true)}
                className="w-full mt-8 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1c1e] dark:hover:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border-none">
                Hemen Başla
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div animate={{ scale: activePricingTier === 'pro' ? 1.03 : 1, opacity: activePricingTier !== 'pro' ? 0.7 : 1 }} transition={{ type: 'spring', stiffness: 300 }}
              className="bg-accent border-2 border-accent rounded-3xl p-7 flex flex-col shadow-2xl shadow-accent/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-white/20 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                <Crown size={8} fill="currentColor" /> POPÜLER
              </div>
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Pro</span>
                  <span className="text-[8px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full uppercase">PRO</span>
                </div>
                <div className="flex items-baseline gap-1 mt-3 mb-6">
                  <span className="text-4xl font-black text-white">4.99$</span>
                  <span className="text-white/60 text-xs">/ aylık</span>
                </div>
                <ul className="space-y-3 text-xs text-white/90">
                  {['Ücretsiz paketteki tüm özellikler','Özel Renkli Temalar & Koyu Mod','Bağlantıları Sabitleme (Pins)','Sınırsız Favorileme','🔔 Akıllı Alarm Sistemi (APScheduler)','Gelişmiş Arama Filtreleri','Otomatik Okuma Süresi Analizi'].map((f, i) => (
                    <li key={f} className={`flex items-center gap-2.5 ${i >= 5 ? 'opacity-70' : ''}`}>
                      <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><Check size={9} className="text-white" strokeWidth={3} /></div>{f}
                    </li>
                  ))}
                  <li className="flex items-center gap-2.5 opacity-50">
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><X size={9} className="text-white/50" strokeWidth={2} /></div>
                    <span className="line-through">Ortak Klasörler & Ekip Rolleri</span>
                  </li>
                </ul>
              </div>
              <button onClick={() => handleOpenAuth(true)}
                className="w-full mt-8 py-4 bg-white text-accent text-xs font-black rounded-xl transition-all cursor-pointer border-none shadow-lg hover:bg-white/95 hover:scale-[1.02] active:scale-98 relative z-10">
                Keepr Pro'yu Keşfet →
              </button>
            </motion.div>

            {/* Team */}
            <motion.div animate={{ scale: activePricingTier === 'team' ? 1.03 : 1, opacity: activePricingTier !== 'team' ? 0.7 : 1 }} transition={{ type: 'spring', stiffness: 300 }}
              className="bg-white dark:bg-[#121212] border-2 border-violet-200 dark:border-violet-500/30 rounded-3xl p-7 flex flex-col shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-violet-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-bl-xl">
                TEAM
              </div>
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />
              <div>
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Studio / Team</span>
                <div className="flex items-baseline gap-1 mt-3 mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">9.99$</span>
                  <span className="text-slate-400 text-xs">/ aylık</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  {['Pro paketteki tüm özellikler'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 font-semibold"><div className="w-4 h-4 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0"><Check size={9} className="text-violet-500" strokeWidth={3} /></div>{f}</li>
                  ))}
                  {['Ekip Ortak Klasör Paylaşımı','Secure Token Davet Linkleri (48 saat)','Rol & Yetki Yönetimi (Editor vs Viewer)','Hiyerarşik Alt Klasörler (Subfolders)','Pano Algılama & Hızlı Kayıt (Web & Mobil)'].map(f => (
                    <li key={f} className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><Check size={9} className="text-emerald-500" strokeWidth={3} /></div><span>{f}</span></li>
                  ))}
                </ul>
              </div>
              <button onClick={() => handleOpenAuth(true)}
                className="w-full mt-8 py-3.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-none shadow-md shadow-violet-500/20 hover:scale-[1.02]">
                Team'e Katıl →
              </button>
            </motion.div>
          </div>

          {/* Comparison table */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-center text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 mb-6">
              <Sparkles size={14} className="text-accent fill-accent/10" /> Detaylı Özellik Karşılaştırması
            </h3>
            <div className="border border-gray-200 dark:border-[#2c2c2e] rounded-2xl overflow-hidden bg-white dark:bg-[#121212] shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#2c2c2e] bg-slate-50 dark:bg-[#18181a]">
                    <th className="p-4 pl-6 font-bold text-slate-400 uppercase tracking-wider">Özellik</th>
                    <th className="p-4 text-center font-bold text-slate-400 uppercase tracking-wider">Free</th>
                    <th className="p-4 text-center font-black text-accent uppercase tracking-wider flex items-center justify-center gap-1"><Crown size={10} fill="currentColor" />Pro</th>
                    <th className="p-4 text-center font-black text-violet-500 uppercase tracking-wider">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1c1c1f] text-slate-600 dark:text-slate-300">
                  {[
                    ['Sınırsız Bağlantı Kaydetme', true, true, true],
                    ['Otomatik Metadata & Favicon', true, true, true],
                    ['Temel Arama', true, true, true],
                    ['Özel Renkli Temalar & Koyu Mod', false, true, true],
                    ['Bağlantıları Sabitleme (Pins)', false, true, true],
                    ['Sınırsız Favorileme', false, true, true],
                    ['🔔 Akıllı Alarm Sistemi', false, true, true],
                    ['Okuma Süresi Tahmini', false, true, true],
                    ['Ortak Klasörler', false, false, true],
                    ['Canlı Ekip Çalışması', false, false, true],
                  ].map(([label, free, pro, team], i) => (
                    <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-[#18181a]/30 transition-colors">
                      <td className="p-4 pl-6 font-medium text-slate-700 dark:text-slate-200">{label as string}</td>
                      <td className="p-4 text-center">{free ? <Check size={14} className="text-emerald-500 mx-auto" strokeWidth={3} /> : <X size={14} className="text-slate-300 dark:text-slate-700 mx-auto" strokeWidth={2} />}</td>
                      <td className="p-4 text-center">{pro ? <Check size={14} className="text-emerald-500 mx-auto" strokeWidth={3} /> : <X size={14} className="text-slate-300 dark:text-slate-700 mx-auto" strokeWidth={2} />}</td>
                      <td className="p-4 text-center">{team ? <Check size={14} className="text-violet-500 mx-auto" strokeWidth={3} /> : <X size={14} className="text-slate-300 dark:text-slate-700 mx-auto" strokeWidth={2} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ROI Calculator Card */}
          <div className="max-w-3xl mx-auto mt-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-white select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 space-y-6 w-full text-left">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">VERİMLİLİK HESAPLAYICI</span>
                  <h3 className="text-xl font-bold mt-3">Keepr ile ne kadar tasarruf edebilirsiniz?</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">Ekibinizin link arayarak ve dağınık tarayıcı sekmelerinde kaybolarak kaybettiği zamanı ve yıllık maliyetini hesaplayın.</p>
                </div>

                <div className="space-y-4">
                  {/* Slider 1 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Günlük Aranan/Kaybolan Link:</span>
                      <span className="text-accent font-bold">{dailyLinks} Adet</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={dailyLinks}
                      onChange={(e) => setDailyLinks(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>

                  {/* Slider 2 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Ekip Üyesi Sayısı:</span>
                      <span className="text-violet-400 font-bold">{teamSize} Kişi</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={teamSize}
                      onChange={(e) => setTeamSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Display panel */}
              <div className="w-full md:w-64 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-4 shadow-xl">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">YILLIK KAZANILAN ZAMAN</div>
                  <div className="text-3xl font-black text-emerald-400 mt-1">{yearlyTimeSaved} Saat</div>
                </div>
                <div className="w-full h-[1px] bg-white/10" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">YILLIK KAZANILAN VERİMLİLİK</div>
                  <div className="text-3xl font-black text-accent mt-1">${yearlyMoneySaved.toLocaleString()}</div>
                </div>
                <button
                  onClick={() => handleOpenAuth(true)}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-none shadow-md shadow-accent/20 hover:scale-[1.02] active:scale-98"
                >
                  Verimliliğinizi Artırın
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── FAQ ── */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">SSS</span>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Aklınıza takılan sorular</h2>
        </div>
        <div className="space-y-3">
          {[
            { 
              q: 'Keepr nedir ve bana dijital yaşamımda nasıl yardımcı olur?', 
              a: 'Keepr, internette gezinirken karşılaştığınız fakat o an okumaya veya incelemeye vakit bulamadığınız her türlü bağlantıyı (makale, video, ürün, tasarım referansı vb.) tek bir yerde depolamanızı sağlayan akıllı, görsel ve minimalist bir dijital kitaplık havuzudur. Keepr, sadece basit bir yer imi (bookmark) yöneticisi değildir; kaydettiğiniz URL\'lerin başlık, açıklama ve görsel gibi metadata bilgilerini arka planda otomatik çözer, okuma sürelerini hesaplar, ekip arkadaşlarınızla ortak klasörler kurmanıza izin verir ve unutmamanız için akıllı alarmlar kurmanızı sağlar.' 
            },
            { 
              q: 'Klasör hiyerarşisi nasıl çalışır ve alt klasör sınırları nelerdir?', 
              a: 'Keepr, gelişmiş bir klasör ağacı yapısını destekler. Dijital kütüphanenizi düzenli tutabilmek için ana kategorilerinizin altına alt klasörler (subfolders) yerleştirebilirsiniz. Sistemimizin sadeliğini ve yüksek okunabilirliğini korumak amacıyla derinlik sınırı maksimum 2 seviye (Ana Klasör -> Alt Klasör) olarak sınırlandırılmıştır. Bu sayede karmaşık klasör yığınlarında kaybolmadan, aradığınız bağlantılara çok hızlı bir şekilde ulaşabilirsiniz. Alt klasör yönetimi Team abonelik planımıza dahil bir özelliktir.' 
            },
            { 
              q: 'Ortak klasörler ve Ekip (Team) çalışma modeli nasıl çalışıyor?', 
              a: 'Team paketi kullanıcıları, kategorilerini ekip arkadaşlarıyla veya dış ortaklarıyla paylaşabilir. Davetler, 48 saat geçerliliği olan güvenli ve benzersiz davetiye linkleri (token) üzerinden yürütülür. Ortak klasör davetiyesi gönderirken kullanıcılara iki farklı rol atayabilirsiniz: "Editör" rolündeki kullanıcılar klasöre yeni bağlantılar ekleyebilir, mevcut bağlantıları düzenleyebilir ve silebilirler. "İzleyici" (Viewer) rolündeki kullanıcılar ise sadece klasör içeriğini görüntüleyebilir; ekleme, düzenleme veya silme yapamazlar. Bu yetki sınırlandırması web ve mobil uygulamalarımızda anında devreye girer.' 
            },
            { 
              q: 'Akıllı Hatırlatıcı (Alarm) özelliği nasıl çalışır ve e-posta gönderir mi?', 
              a: 'Pro ve Team kullanıcıları, kaydettikleri bağlantılar için özel bir hatırlatma alarmı kurabilir. Belirlediğiniz tarih ve saat geldiğinde, arka planda her dakika çalışan güçlü APScheduler tabanlı servisimiz alarmınızı tetikler. Hem uygulama içi anlık bildirim alırsınız hem de kayıtlı e-posta adresinize şık bir hatırlatma e-postası yollanır. Böylece daha sonra okumak üzere kaydettiğiniz teknik makaleleri veya izlemek istediğiniz videoları asla gözden kaçırmazsınız.' 
            },
            { 
              q: 'Okuma Süresi (Reading Time) hesaplaması nasıl yapılıyor?', 
              a: 'Keepr\'a yeni bir bağlantı eklediğinizde, kazıma (scraping) servisimiz sayfa içeriğindeki metin gövdesini analiz eder. Metindeki kelime sayısını analiz eden akıllı algoritmamız, ortalama bir insanın dakikada okuduğu kelime sayısını (200 kelime/dk) referans alarak içeriğin tahmini okuma süresini (örn: "3 dk", "12 dk") hesaplar ve kartın üzerinde gösterir. Bu sayede bir içeriği açmadan önce ne kadar vaktinizi alacağını önceden görebilirsiniz.' 
            },
            { 
              q: 'Klavye kısayolları ve Pano (Clipboard) algılama özellikleri nelerdir?', 
              a: 'Keepr hız ve verimlilik odaklıdır. Uygulamaya odaklandığınızda (veya focus olduğunuzda), panonuzdaki kopyalanmış URL\'leri otomatik tespit eder ve ekranın altında şık bir bildirim kapsülü açarak tek tıklamayla kaydetmenizi önerir. Ayrıca mouse kullanmadan kütüphanenizi yönetebilmeniz için klavye kısayollarını destekler: Seçili bir kartın üzerindeyken "F" tuşuna basarak favorilere ekleyebilir, "P" tuşuyla başa sabitleyebilir, "A" tuşuyla alarm kurabilir veya "Delete/Backspace" tuşlarıyla kartı silebilirsiniz.' 
            },
            { 
              q: 'Ücretsiz (Free), Pro ve Team paketleri arasındaki farklar nelerdir?', 
              a: 'Ücretsiz planda sınırsız bağlantı kaydetme, sınırsız kategori oluşturma ve otomatik metadata analizi standart olarak sunulur. Pro planımızda; sabitleme, favorileme, özel temalar ve akıllı alarm (hatırlatıcı) sistemi yer alır. Team planımızda ise tüm Pro özelliklerine ek olarak; ortak klasör paylaşımı, secure davet linkleri, Editör/İzleyici rol yetkilendirmeleri ve hiyerarşik alt klasör (subfolder) ağacı desteği sunulmaktadır.' 
            },
            { 
              q: 'Verilerimizin güvenliği ve gizlilik politikası nasıldır?', 
              a: 'Keepr verileriniz üzerinde tam kontrol sahibi olmanızı garanti eder. Verileriniz endüstri standardı 256-bit SSL/TLS ile şifrelenir ve güvenli JWT token yapısıyla korunur. Reklam verenlerle veya üçüncü taraflarla hiçbir verinizi asla paylaşmayız veya satmayız. Ayrıca dilediğiniz an ayarlar sayfasından hesabınızı kalıcı olarak silebilirsiniz; bu işlem gerçekleştiğinde tüm klasörleriniz, bağlantılarınız ve oturum bilgileriniz sunucularımızdan kalıcı ve geri döndürülemez olarak anında silinir (Unutulma Hakkı).' 
            }
          ].map((item, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-[#2c2c2e] rounded-xl overflow-hidden bg-white dark:bg-[#121212]">
              <button onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200 cursor-pointer bg-transparent border-none text-sm">
                <span>{item.q}</span>
                <ChevronDown size={16} className={`transition-transform duration-300 flex-shrink-0 ml-4 ${faqOpen === idx ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {faqOpen === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}>
                    <div className="px-4 pb-4 text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6 text-center relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/3 to-accent/6 pointer-events-none" />
        <GradientOrb className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-accent/10 to-violet-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto space-y-7 z-10 relative">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Dijital düzeninizi<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-emerald-500">bugün kurun.</span>
          </motion.h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Binlerce linkin tarayıcı sekmelerinde kaybolup gitmesine izin vermeyin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button onClick={() => handleOpenAuth(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-bold px-10 py-4 rounded-2xl shadow-lg shadow-accent/20 hover:shadow-xl border-none cursor-pointer">
              Hemen Kaydol — Ücretsiz <ArrowRight size={16} />
            </motion.button>
          </div>
          <p className="text-[10px] text-slate-400">Kredi kartı gerekmez · Kurulum yok · 30 saniyede başla</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 border-t border-gray-100 dark:border-[#121215]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={appLogo} alt="Keepr" className="w-5 h-5 rounded-md object-cover" />
            <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Keepr</span>
          </div>
          <p className="text-[10px] text-slate-400">© 2026 Keepr. Tüm hakları saklıdır. Minimalist Dijital Kütüphane Havuzu.</p>
          <div className="flex gap-4 text-[10px] text-slate-400">
            <button onClick={() => setPrivacyModalOpen(true)} className="hover:text-accent transition-colors bg-transparent border-none cursor-pointer">Gizlilik</button>
            <button onClick={() => setTermsModalOpen(true)} className="hover:text-accent transition-colors bg-transparent border-none cursor-pointer">Şartlar</button>
            <button onClick={() => handleOpenAuth(false)} className="hover:text-accent transition-colors bg-transparent border-none cursor-pointer">Giriş Yap</button>
          </div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      <AnimatePresence>
        {authModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className="relative bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-md p-8 overflow-hidden">
              <button onClick={handleCloseAuth}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
              <AuthForm initialRegister={authModal.isRegister} onSuccess={handleCloseAuth} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GİZLİLİK POLİTİKASI MODAL ── */}
      <AnimatePresence>
        {privacyModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className="relative bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[85vh] flex flex-col overflow-hidden">
              <button onClick={() => setPrivacyModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-accent" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Gizlilik Politikası (KVKK & GDPR)</h3>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Son Güncelleme: 13 Temmuz 2026
                </p>
                <p>
                  Keepr ("biz", "hizmetimiz"), kişisel verilerinizin korunmasına ve gizliliğinize en üst düzeyde önem vermektedir. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve Avrupa Birliği Genel Veri Koruma Yönetmeliği ("GDPR") uyumluluğu kapsamında veri işleme süreçlerimizi açıklamak üzere hazırlanmıştır.
                </p>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">1. İşlenen Veriler ve Veri Minimizasyonu</h4>
                <p>
                  Güvenlik ve gizlilik odaklı mimarimiz gereği, yalnızca hizmetimizi sunabilmek için kesinlikle gerekli olan minimum verileri işleriz:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Hesap Bilgileri:</strong> E-posta adresiniz, kullanıcı adınız ve şifrenizin tek yönlü kriptografik özeti (PBKDF2 hash). Şifrenizin açık hali sunucularımızda asla tutulmaz.</li>
                  <li><strong>Depolanan İçerikler:</strong> Kaydettiğiniz web bağlantıları (URL), başlıklar, açıklamalar ve kategoriler.</li>
                  <li><strong>Sistem Tercihleri:</strong> Arayüz renkleri ve tema seçimleriniz.</li>
                </ul>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">2. Veri Güvenliği Standartları</h4>
                <p>
                  Verilerinizin güvenliğini sağlamak amacıyla endüstri standardı teknik tedbirler uygulanmaktadır:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tüm veri iletişimleri 256-bit SSL/TLS şifreleme protokolleri ile korunur.</li>
                  <li>Kullanıcı oturumları kriptografik olarak imzalanmış JWT (JSON Web Token) yapısıyla yönetilir.</li>
                  <li>Veritabanı erişimleri izole edilmiş ve sadece yetkili servislerin erişimine izin verilmiştir.</li>
                </ul>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">3. Üçüncü Şahıslarla Veri Paylaşımı</h4>
                <p>
                  Keepr, verileriniz üzerinden gelir elde etmez. Kişisel veya depolanan verileriniz reklam verenler, veri simsarları veya herhangi bir üçüncü şahıs ile <strong>asla paylaşılmaz, satılmaz veya kiralanmaz</strong>.
                </p>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">4. Veri Sahibi Hakları ve Veri Silme (Unutulma Hakkı)</h4>
                <p>
                  GDPR ve KVKK kapsamında, dilediğiniz an verileriniz üzerinde tam kontrol sahibisiniz:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Verilerinizin kopyasını talep etme hakkı.</li>
                  <li>Hatalı veya eksik verilerin düzeltilmesini talep etme hakkı.</li>
                  <li><strong>Hesap ve Veri Silme:</strong> Ayarlar ekranından hesabınızı kalıcı olarak sildiğinizde, kaydettiğiniz tüm bağlantılar, kategoriler, profiller ve loglar veritabanımızdan geri döndürülemez şekilde anında silinir.</li>
                </ul>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">5. Çerezler (Cookies)</h4>
                <p>
                  Uygulamamızda reklam amaçlı takip çerezleri kullanılmaz. Sadece tarayıcınızda oturumunuzu açık tutmak için gereken teknik/zorunlu yerel depolama araçları (localStorage) kullanılır.
                </p>
              </div>

              <div className="mt-6 flex justify-end border-t border-gray-100 dark:border-[#2c2c2e] pt-4">
                <button onClick={() => setPrivacyModalOpen(false)}
                  className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-6 py-2 rounded-xl transition-all cursor-pointer border-none shadow-sm">
                  Okudum, Kabul Ediyorum
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KULLANIM ŞARTLARI MODAL ── */}
      <AnimatePresence>
        {termsModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              className="relative bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[85vh] flex flex-col overflow-hidden">
              <button onClick={() => setTermsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-accent" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Kullanım Şartları ve Koşulları</h3>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Son Güncelleme: 13 Temmuz 2026
                </p>
                <p>
                  Keepr platformuna hoş geldiniz. Hizmetlerimize kaydolarak veya kullanarak, aşağıdaki kullanım şartlarını kabul etmiş sayılmaktasınız. Lütfen bu şartları dikkatle okuyunuz.
                </p>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">1. Kabul Edilebilir Kullanım Kuralları</h4>
                <p>
                  Keepr, yasal ve etik sınırlar çerçevesinde bir kişisel havuz uygulamasıdır. Kullanıcılar, aşağıdaki faaliyetlerde bulunmayacaklarını taahhüt ederler:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Yasa dışı, telif hakkı ihlali barındıran, kötü amaçlı yazılım yayan veya tehditkar bağlantıları depolamak ve paylaşmak.</li>
                  <li>Sunucu altyapısına zarar verecek nitelikte otomatik istek göndermek, kazıma (scraping) araçlarıyla platformu aşırı yüklemek veya DDoS saldırıları düzenlemek.</li>
                  <li>Hizmeti spam veya istenmeyen ticari mesaj yayma aracı olarak kullanmak.</li>
                </ul>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">2. Hesap Güvenliği ve Sorumluluk</h4>
                <p>
                  Hesap şifrenizin gizliliğini korumak ve hesabınız altında gerçekleşen tüm aktivitelerin sorumluluğu tamamen size aittir. Güçlü bir şifre seçmeniz ve hesap güvenliğinizin ihlal edildiğini hissettiğinizde durumu derhal bize bildirmeniz gerekmektedir.
                </p>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">3. Abonelik Modeli ve Hizmet Değişiklikleri</h4>
                <p>
                  Keepr, Free, Pro ve Team olmak üzere 3 kademeli hizmet sunar. Ücretli abonelikler aylık/yıllık faturalandırılır. Keepr, ücretlendirme modellerinde, sunulan özelliklerde veya şartlarda değişiklik yapma hakkını saklı tutar. Değişiklikler önceden kullanıcılara e-posta yoluyla bildirilecektir.
                </p>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">4. Sorumluluk Sınırları</h4>
                <p>
                  Keepr, bağlantılarınızın içeriğinden sorumlu değildir. Dış web sitelerine ait verilerin kaybolması, silinmesi veya ulaşılamaz hale gelmesi durumunda herhangi bir hak iddia edilemez. Hizmetimizi "olduğu gibi" ve "kullanılabilir olduğu sürece" sunmaktayız.
                </p>

                <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2 text-[13px]">5. Fesih ve Askıya Alma</h4>
                <p>
                  Bu kullanım kurallarının ihlal edilmesi durumunda, Keepr bildirimde bulunmaksızın hesabınızı askıya alma veya kalıcı olarak sonlandırma hakkına sahiptir. Dilediğiniz an hesabınızı silerek hizmet kullanımını sonlandırabilirsiniz.
                </p>
              </div>

              <div className="mt-6 flex justify-end border-t border-gray-100 dark:border-[#2c2c2e] pt-4">
                <button onClick={() => setTermsModalOpen(false)}
                  className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-6 py-2 rounded-xl transition-all cursor-pointer border-none shadow-sm">
                  Okudum, Kabul Ediyorum
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
