"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

// ============================================
// HELPERS
// ============================================
const e2b = (num) => String(num).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

// ============================================
// LEVEL SYSTEM
// ============================================
const LEVELS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 900 },
  { level: 6, xp: 1500 },
  { level: 7, xp: 2200 },
  { level: 8, xp: 3100 },
  { level: 9, xp: 4200 },
  { level: 10, xp: 5600 },
  { level: 11, xp: 7200 },
  { level: 12, xp: 9000 },
  { level: 13, xp: 11000 },
  { level: 14, xp: 13500 },
  { level: 15, xp: 16500 },
];

const getLevel = (xp) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return LEVELS[i];
  }
  return LEVELS[0];
};

const getNextLevel = (xp) => {
  for (const lvl of LEVELS) {
    if (xp < lvl.xp) return lvl;
  }
  return null;
};

// ============================================
// GAME MODES DATA
// ============================================
const games = [
  {
    id: "jigsaw",
    href: "/my-bangladesh/games/jigsaw",
    title: "জিগস পাজল",
    subtitle: "৬৪ জেলার টুকরো সাজান",
    description:
      "ম্যাপের প্রতিটা জেলা সঠিক জায়গায় টেনে বসান। Perfect snap, combo multiplier, time bonus — সব মিলিয়ে হাই স্কোর!",
    icon: "fa-solid fa-puzzle-piece",
    gradient: "from-blue-500 via-purple-500 to-pink-500",
    shadow: "shadow-purple-500/30",
    available: true,
    badge: "জনপ্রিয়",
    difficulty: "মাঝারি",
    points: 100,
    modes: 3,
  },
  {
    id: "tap-district",
    href: "/my-bangladesh/games/tap-district",
    title: "জেলা ট্যাপ",
    subtitle: "নাম শুনে ম্যাপে ট্যাপ",
    description:
      "উপরে জেলার নাম দেখাবে, ম্যাপে সঠিক জায়গায় ট্যাপ করুন। দ্রুত + কম ভুল = হাই স্কোর। Time bonus সহ।",
    icon: "fa-solid fa-hand-pointer",
    gradient: "from-orange-500 via-red-500 to-pink-500",
    shadow: "shadow-orange-500/30",
    available: true,
    badge: "নতুন",
    difficulty: "সহজ",
    points: 100,
    modes: 3,
  },
  {
    id: "quiz",
    href: "/my-bangladesh/games/quiz",
    title: "জেলা কুইজ",
    subtitle: "জেলা চিনুন, নাম বলুন",
    description:
      "ম্যাপে জেলা highlight হবে, ৪টি অপশন থেকে সঠিক নাম বেছে নিন। প্রতি প্রশ্নে ১০ সেকেন্ড সময়!",
    icon: "fa-solid fa-circle-question",
    gradient: "from-emerald-500 via-teal-500 to-blue-500",
    shadow: "shadow-emerald-500/30",
    available: true,
    badge: "নতুন",
    difficulty: "সহজ",
    points: 100,
    modes: 3,
  },
  {
    id: "shape",
    href: "/my-bangladesh/games/shape",
    title: "শেপ গেসার",
    subtitle: "আকৃতি দেখে চিনুন",
    description:
      "শুধু জেলার silhouette দেখে সঠিক নাম বলুন। নাম-সীমানা নেই — শুধু আকৃতির চ্যালেঞ্জ!",
    icon: "fa-solid fa-shapes",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    shadow: "shadow-pink-500/30",
    available: true,
    badge: "নতুন",
    difficulty: "কঠিন",
    points: 100,
    modes: 3,
  },
  {
    id: "sorter",
    href: "/my-bangladesh/games/sorter",
    title: "বিভাগ সর্টার",
    subtitle: "জেলা → বিভাগ মেলান",
    description:
      "৬৪ জেলাকে ৮টি বিভাগে সঠিকভাবে সাজান। ৩ মিনিটে শেষ করলে বোনাস পয়েন্ট।",
    icon: "fa-solid fa-layer-group",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    shadow: "shadow-amber-500/30",
    available: false,
    badge: "শীঘ্রই",
    difficulty: "মাঝারি",
    points: 30,
    modes: 0,
  },
  {
    id: "memory",
    href: "/my-bangladesh/games/memory",
    title: "মেমোরি চ্যালেঞ্জ",
    subtitle: "মনে রাখুন, খুঁজে বের করুন",
    description:
      "৩০ সেকেন্ড ম্যাপ দেখে মনে রাখুন, তারপর ১০টি জেলা খুঁজে বের করুন।",
    icon: "fa-solid fa-brain",
    gradient: "from-indigo-500 via-purple-500 to-fuchsia-500",
    shadow: "shadow-indigo-500/30",
    available: false,
    badge: "শীঘ্রই",
    difficulty: "কঠিন",
    points: 80,
    modes: 0,
  },
];

// ============================================
// ACHIEVEMENTS PREVIEW
// ============================================
const achievementsPreview = [
  { id: "first-blood", icon: "fa-solid fa-fire", title: "প্রথম পদক্ষেপ", hint: "প্রথম গেম খেলুন", color: "#ef4444" },
  { id: "puzzle-starter", icon: "fa-solid fa-puzzle-piece", title: "পাজল শুরু", hint: "জিগস পাজল শেষ করুন", color: "#3b82f6" },
  { id: "combo-10", icon: "fa-solid fa-bolt", title: "কম্বো মাস্টার", hint: "১০ কম্বো করুন", color: "#a855f7" },
  { id: "perfect-round", icon: "fa-solid fa-star", title: "পারফেক্ট রাউন্ড", hint: "০ ভুলে শেষ করুন", color: "#f59e0b" },
  { id: "all-64", icon: "fa-solid fa-crown", title: "সব ৬৪", hint: "৬৪ জেলা চিনুন", color: "#10b981" },
  { id: "speed-demon", icon: "fa-solid fa-gauge-high", title: "স্পিড ডেমন", hint: "দ্রুততম সময়ে শেষ", color: "#ec4899" },
  { id: "daily-3", icon: "fa-solid fa-calendar-check", title: "৩ দিন স্ট্রিক", hint: "৩ দিন টানা খেলুন", color: "#14b8a6" },
  { id: "ten-k", icon: "fa-solid fa-trophy", title: "১০ হাজার", hint: "১০K XP অর্জন", color: "#eab308" },
];

// ============================================
// LOCAL STORAGE
// ============================================
const STATS_KEY = "game-hub-stats-v1";

const defaultStats = {
  xp: 0,
  totalPlays: 0,
  streak: 0,
  lastPlayDate: null,
  unlockedAchievements: [],
  bestScores: {},
};

const loadStats = () => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      xp: Number(parsed.xp) || 0,
      totalPlays: Number(parsed.totalPlays) || 0,
      streak: Number(parsed.streak) || 0,
      lastPlayDate: parsed.lastPlayDate || null,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
      bestScores:
        parsed.bestScores && typeof parsed.bestScores === "object"
          ? parsed.bestScores
          : {},
    };
  } catch {
    return null;
  }
};

// ============================================
// BEST SCORE HELPERS
// ============================================
const getBestForGame = (bestScores, gameId) => {
  if (!bestScores || !gameId) return 0;
  const prefix = `${gameId}-`;
  const keys = Object.keys(bestScores).filter((k) => k.startsWith(prefix));
  if (keys.length === 0) return 0;
  return Math.max(...keys.map((k) => Number(bestScores[k]) || 0));
};

// ============================================
// COMPACT GAME CARD (available)
// ============================================
function GameCard({ game, bestScore, idx }) {
  return (
    <Link
      href={game.href}
      aria-label={`${game.title} খেলুন`}
      className="group block focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-2xl"
      data-aos="zoom-in"
      data-aos-delay={idx * 60}
    >
      <div
        className={`h-full relative overflow-hidden rounded-2xl bg-gradient-to-br ${game.gradient} p-4 shadow-lg ${game.shadow} hover:shadow-2xl transition-all duration-400 hover:-translate-y-1.5 flex flex-col min-h-[190px]`}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

        {/* Badge */}
        {game.badge && (
          <div className="absolute top-2.5 right-2.5 bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/40 z-10">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">
              {game.badge}
            </span>
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full">
          {/* Icon */}
          <div className="w-10 h-10 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2.5 border border-white/30 group-hover:scale-110 transition-transform duration-400">
            <i className={`${game.icon} text-white text-base`}></i>
          </div>

          {/* Title + subtitle */}
          <h3 className="text-base font-black text-white leading-tight">
            {game.title}
          </h3>
          <p className="text-white/85 text-[10px] font-bold mt-0.5 mb-2 line-clamp-1">
            {game.subtitle}
          </p>

          {/* Description — 2-line clamp */}
          <p className="text-white/70 text-[10px] leading-snug flex-grow line-clamp-2">
            {game.description}
          </p>

          {/* Compact stats */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-md px-2 py-1 border border-white/15">
              <p className="text-[8px] font-black text-white/70 uppercase tracking-wider">
                পয়েন্ট
              </p>
              <p className="text-[10px] font-black text-white leading-tight">
                +{e2b(game.points)}
              </p>
            </div>
            <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-md px-2 py-1 border border-white/15">
              <p className="text-[8px] font-black text-white/70 uppercase tracking-wider">
                মোড
              </p>
              <p className="text-[10px] font-black text-white leading-tight">
                {e2b(game.modes)}
              </p>
            </div>
          </div>

          {/* Best score */}
          {bestScore > 0 && (
            <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-md px-2 py-1 border border-white/25 flex items-center justify-between">
              <span className="text-[8px] font-black text-white/90 uppercase tracking-wider">
                <i className="fa-solid fa-crown text-yellow-300 mr-0.5"></i>
                সেরা
              </span>
              <span className="text-[11px] font-black text-white leading-tight">
                {e2b(bestScore)}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
            <div className="flex items-center gap-1 text-white/75 text-[9px] font-bold uppercase tracking-wider">
              <i className="fa-solid fa-signal text-[8px]"></i>
              <span>{game.difficulty}</span>
            </div>
            <div className="flex items-center gap-1 text-white text-[10px] font-black uppercase tracking-wider group-hover:gap-2 transition-all">
              খেলুন
              <i className="fa-solid fa-arrow-right text-[9px]"></i>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// COMPACT COMING SOON CARD
// ============================================
function ComingSoonCard({ game, idx }) {
  return (
    <div
      className="h-full relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col min-h-[190px] hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      data-aos="zoom-in"
      data-aos-delay={idx * 60}
    >
      <div className="flex justify-between items-start mb-2.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${game.gradient} opacity-80`}
        >
          <i className={`${game.icon} text-white text-base`}></i>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          <span className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {game.badge}
          </span>
        </div>
      </div>

      <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
        {game.title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold mt-0.5 mb-2 line-clamp-1">
        {game.subtitle}
      </p>
      <p className="text-gray-400 dark:text-gray-500 text-[10px] leading-snug flex-grow line-clamp-2">
        {game.description}
      </p>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-wider">
          <i className="fa-solid fa-signal text-[8px]"></i>
          <span>{game.difficulty}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[9px] font-black uppercase tracking-wider">
          <i className="fa-solid fa-lock text-[8px]"></i>
          শীঘ্রই
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function GameHubPage() {
  const [stats, setStats] = useState(defaultStats);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    const loaded = loadStats();
    if (loaded) setStats(loaded);
    setHydrated(true);
  }, []);

  const currentLevel = getLevel(stats.xp);
  const nextLevel = getNextLevel(stats.xp);
  const progressPercent = nextLevel
    ? Math.round(
        ((stats.xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100
      )
    : 100;

  const availableGames = games.filter((g) => g.available);
  const comingSoonGames = games.filter((g) => !g.available);
  const unlockedCount = stats.unlockedAchievements.length;
  const totalAchievements = achievementsPreview.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-10">
        {/* ============================================ */}
        {/* HERO */}
        {/* ============================================ */}
        <div className="flex flex-col" data-aos="fade-down">
          <div className="w-full">
            <Link
              href="/my-bangladesh"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold mb-4 text-sm transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i> My Bangladesh হোম
            </Link>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3 uppercase tracking-tight leading-tight">
              ম্যাপ{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
                গেমস
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              <i className="fa-solid fa-gamepad text-purple-500 mr-2"></i>
              {e2b(availableGames.length)} টি গেম এখনই খেলার জন্য প্রস্তুত —
              ট্যাপ করে শুরু করুন!
            </p>
          </div>
        </div>

        {/* ============================================ */}
        {/* AVAILABLE GAMES — TOP PRIORITY, COMPACT GRID */}
        {/* ============================================ */}
        {availableGames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4" data-aos="fade-up">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
                এখনই খেলুন
              </h2>
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                {e2b(availableGames.length)} টি
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {availableGames.map((game, idx) => (
                <GameCard
                  key={game.id}
                  game={game}
                  bestScore={getBestForGame(stats.bestScores, game.id)}
                  idx={idx}
                />
              ))}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PLAYER STATS */}
        {/* ============================================ */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          data-aos="fade-up"
        >
          {/* Level Card */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-purple-500/10 blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <i
                  className="fa-solid fa-medal text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                ></i>
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  লেভেল
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {hydrated ? e2b(currentLevel.level) : "—"}
              </p>
              <div className="mt-2 w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${hydrated ? progressPercent : 0}%`,
                    background: "linear-gradient(90deg, #a855f7, #ec4899)",
                  }}
                ></div>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 font-bold">
                {nextLevel
                  ? `${e2b(Math.max(nextLevel.xp - stats.xp, 0))} XP বাকি`
                  : "সর্বোচ্চ"}
              </p>
            </div>
          </div>

          {/* XP Card */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-amber-500/10 blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <i
                  className="fa-solid fa-star text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                ></i>
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  XP
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {hydrated ? e2b(stats.xp) : "—"}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 font-bold">
                মোট অর্জিত
              </p>
            </div>
          </div>

          {/* Plays Card */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <i
                  className="fa-solid fa-play text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500"
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                ></i>
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  খেলা
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {hydrated ? e2b(stats.totalPlays) : "—"}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 font-bold">
                মোট ম্যাচ
              </p>
            </div>
          </div>

          {/* Streak Card */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-red-500/10 blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <i
                  className="fa-solid fa-fire text-xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500"
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                ></i>
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  স্ট্রিক
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {hydrated ? e2b(stats.streak) : "—"}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 font-bold">
                টানা দিন
              </p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* COMING SOON GAMES */}
        {/* ============================================ */}
        {comingSoonGames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4" data-aos="fade-up">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
                শীঘ্রই আসছে
              </h2>
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                {e2b(comingSoonGames.length)} টি
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {comingSoonGames.map((game, idx) => (
                <ComingSoonCard key={game.id} game={game} idx={idx} />
              ))}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* ACHIEVEMENTS PREVIEW */}
        {/* ============================================ */}
        <div
          className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm"
          data-aos="fade-up"
        >
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <i className="fa-solid fa-trophy text-amber-500"></i> অ্যাচিভমেন্ট
            </h3>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {e2b(unlockedCount)} / {e2b(totalAchievements)}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {achievementsPreview.map((ach) => {
              const unlocked = stats.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    unlocked
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/30"
                      : "bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 opacity-60"
                  }`}
                  title={unlocked ? ach.title : `লক করা — ${ach.hint}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110 relative"
                    style={{ background: unlocked ? ach.color : "#cbd5e1" }}
                  >
                    <i className={`${ach.icon} text-white text-sm`}></i>
                    {!unlocked && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                        <i className="fa-solid fa-lock text-gray-400 text-[8px]"></i>
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[9px] font-bold text-center leading-tight ${
                      unlocked
                        ? "text-gray-800 dark:text-gray-200"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {ach.title}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              <i className="fa-solid fa-info-circle mr-1"></i>
              গেম খেলে অ্যাচিভমেন্ট unlock করুন
            </p>
          </div>
        </div>

        {/* ============================================ */}
        {/* LEADERBOARD CTA */}
        {/* ============================================ */}
        <div
          className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl"
          data-aos="fade-up"
        >
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-black/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4 border border-white/30">
                <i className="fa-solid fa-crown text-yellow-300 text-xs"></i>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  Top 50 লিডারবোর্ড
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
                সেরা খেলোয়াড়দের সাথে প্রতিযোগিতা করুন
              </h3>
              <p className="text-white/90 text-sm leading-relaxed mb-5">
                টপ ৫০-এ জায়গা করে নিন। প্রথম তিনজন পাবেন বিশেষ গোল্ড, সিলভার
                ও ব্রোঞ্জ কার্ড!
              </p>
              <Link
                href="/my-bangladesh/games/map-leaderboard"
                className="inline-flex items-center gap-3 px-6 py-3 bg-white text-orange-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                <i className="fa-solid fa-list-ol"></i>
                ম্যাপ গেম লিডারবোর্ড
              </Link>
            </div>

            {/* Podium Illustration */}
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/50 mb-2">
                  <i className="fa-solid fa-user text-white text-sm"></i>
                </div>
                <div className="w-16 h-12 bg-white/30 backdrop-blur-sm rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-black text-xl">
                    {e2b(2)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <i className="fa-solid fa-crown text-yellow-300 text-2xl mb-1 drop-shadow-lg"></i>
                <div className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center border-2 border-yellow-300 mb-2">
                  <i className="fa-solid fa-user text-white"></i>
                </div>
                <div className="w-16 h-20 bg-white/40 backdrop-blur-sm rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-black text-2xl">
                    {e2b(1)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/50 mb-2">
                  <i className="fa-solid fa-user text-white text-sm"></i>
                </div>
                <div className="w-16 h-10 bg-white/30 backdrop-blur-sm rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-black text-xl">
                    {e2b(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* DAILY CHALLENGE TEASER */}
        {/* ============================================ */}
        <div
          className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] border-2 border-dashed border-purple-200 dark:border-purple-500/30 shadow-sm text-center"
          data-aos="fade-up"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg mb-4">
            <i className="fa-solid fa-calendar-day text-white text-2xl"></i>
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            ডেইলি চ্যালেঞ্জ
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            প্রতিদিন একটি বিশেষ puzzle — ৩x পয়েন্ট এবং unique badge!
          </p>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-full text-xs font-black uppercase tracking-widest">
            <i className="fa-solid fa-hourglass-half"></i>
            শীঘ্রই আসছে
          </span>
        </div>

        {/* ============================================ */}
        {/* FOOTER */}
        {/* ============================================ */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <i className="fa-solid fa-shield-halved mr-1 text-emerald-500"></i>
            আপনার সব data শুধু আপনার ব্রাউজারে save থাকে
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2 font-bold tracking-widest uppercase">
            Powered by CUET Adventure Society
          </p>
        </div>
      </div>
    </div>
  );
}
