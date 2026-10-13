"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { geoMercator, geoCentroid, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

const geoUrl = "/bd-districts.topo.json";
const SNAP_DISTANCE = 45;
const PERFECT_DISTANCE = 18;

// ============================================
// HELPERS
// ============================================
const e2b = (num) => String(num).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ============================================
// DIVISIONS
// ============================================
const bangladeshDivisions = [
  { name: "ঢাকা", districts: ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"] },
  { name: "চট্টগ্রাম", districts: ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"] },
  { name: "সিলেট", districts: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"] },
  { name: "খুলনা", districts: ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"] },
  { name: "রাজশাহী", districts: ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"] },
  { name: "রংপুর", districts: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"] },
  { name: "বরিশাল", districts: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"] },
  { name: "ময়মনসিংহ", districts: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"] },
];

const districtToDivision = {};
bangladeshDivisions.forEach((div) => {
  div.districts.forEach((d) => {
    districtToDivision[d] = div.name;
  });
});

const divisionColors = {
  "ঢাকা": "#3b82f6",
  "চট্টগ্রাম": "#ec4899",
  "সিলেট": "#a855f7",
  "খুলনা": "#10b981",
  "রাজশাহী": "#f59e0b",
  "রংপুর": "#06b6d4",
  "বরিশাল": "#8b5cf6",
  "ময়মনসিংহ": "#ef4444",
};

const getDivision = (name) => districtToDivision[name] || "ঢাকা";
const getColor = (name) => divisionColors[getDivision(name)] || "#64748b";

// ============================================
// DIFFICULTIES
// ============================================
const difficulties = [
  {
    id: "easy",
    title: "সহজ",
    subtitle: "১৫ জেলা • সময় নেই",
    icon: "fa-solid fa-seedling",
    color: "#10b981",
    gradient: "from-emerald-500 to-teal-500",
    pieces: 15,
    timer: null,
  },
  {
    id: "medium",
    title: "মাঝারি",
    subtitle: "৩০ জেলা • ৫ মিনিট",
    icon: "fa-solid fa-fire",
    color: "#f59e0b",
    gradient: "from-amber-500 to-orange-500",
    pieces: 30,
    timer: 300,
  },
  {
    id: "hard",
    title: "কঠিন",
    subtitle: "৬৪ জেলা • ৮ মিনিট",
    icon: "fa-solid fa-skull",
    color: "#ef4444",
    gradient: "from-red-500 to-pink-500",
    pieces: 64,
    timer: 480,
  },
];

// ============================================
// SOUND ENGINE (Web Audio API)
// ============================================
let audioCtx = null;
const initAudio = () => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
};

const playTone = (freq, duration, type = "sine", volume = 0.12, delay = 0) => {
  const ctx = initAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const startTime = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
};

const sounds = {
  correct: () => {
    playTone(800, 0.15, "sine", 0.12);
    playTone(1200, 0.22, "sine", 0.1, 0.08);
  },
  perfect: () => {
    playTone(900, 0.12, "sine", 0.12);
    playTone(1200, 0.12, "sine", 0.12, 0.07);
    playTone(1500, 0.28, "sine", 0.14, 0.14);
  },
  wrong: () => {
    playTone(180, 0.28, "sawtooth", 0.08);
  },
  pick: () => {
    playTone(550, 0.05, "sine", 0.06);
  },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      playTone(f, 0.4, "sine", 0.14, i * 0.13);
    });
  },
  lose: () => {
    [400, 350, 300, 250].forEach((f, i) => {
      playTone(f, 0.3, "triangle", 0.12, i * 0.15);
    });
  },
  tick: () => {
    playTone(1100, 0.04, "sine", 0.05);
  },
};

// ============================================
// DISTRICT PIECE SVG — render shape in small box
// ============================================
function DistrictPiece({ geo, size = 54, fill = "#94a3b8" }) {
  const pathD = useMemo(() => {
    if (!geo) return "";
    try {
      const proj = geoMercator().fitExtent(
        [
          [3, 3],
          [size - 3, size - 3],
        ],
        geo
      );
      const pathGen = geoPath(proj);
      return pathGen(geo) || "";
    } catch {
      return "";
    }
  }, [geo, size]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <path
        d={pathD}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function JigsawPage() {
  // ---- Phase: menu / playing / result ----
  const [phase, setPhase] = useState("menu");
  const [difficulty, setDifficulty] = useState(null);

  // ---- Data ----
  const [allDistricts, setAllDistricts] = useState(null);
  const [gamePieces, setGamePieces] = useState([]);
  const [placed, setPlaced] = useState(() => new Set());
  const [trayOrder, setTrayOrder] = useState([]);

  // ---- Map container dims ----
  const mapWrapRef = useRef(null);
  const [mapDims, setMapDims] = useState({ w: 0, h: 0 });

  // ---- Drag state ----
  const [dragging, setDragging] = useState(null);
  const dragRef = useRef(null);

  // ---- Game state ----
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);

  // ---- UI ----
  const [toast, setToast] = useState(null);
  const [snapFlash, setSnapFlash] = useState(null);

  // ============ LOAD DISTRICTS ============
  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    (async () => {
      try {
        const res = await fetch(geoUrl);
        const topo = await res.json();
        const key = Object.keys(topo.objects)[0];
        const features = topojson.feature(topo, topo.objects[key]).features;
        setAllDistricts(features);
      } catch (err) {
        console.error("Load failed:", err);
      }
    })();
  }, []);

  // ============ MAP DIMENSIONS ============
  useEffect(() => {
    if (phase !== "playing" || !mapWrapRef.current) return;
    const update = () => {
      const rect = mapWrapRef.current.getBoundingClientRect();
      setMapDims({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(mapWrapRef.current);
    return () => ro.disconnect();
  }, [phase]);

  // ============ PROJECTION ============
  const projection = useMemo(() => {
    if (!mapDims.w || !mapDims.h) return null;
    return geoMercator()
      .scale(6500)
      .center([90.35, 23.8])
      .translate([mapDims.w / 2, mapDims.h / 2]);
  }, [mapDims.w, mapDims.h]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // ============ CORRECT POSITIONS (screen px) ============
  const correctPositions = useMemo(() => {
    if (!projection || !gamePieces.length) return {};
    const pos = {};
    gamePieces.forEach((geo) => {
      const c = geoCentroid(geo);
      const p = projection(c);
      if (p && isFinite(p[0])) pos[geo.rsmKey] = { x: p[0], y: p[1] };
    });
    return pos;
  }, [projection, gamePieces]);

  // ============ TIMER ============
  useEffect(() => {
    if (phase !== "playing" || !startTime) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(el);
      if (difficulty?.timer) {
        const remaining = difficulty.timer - el;
        setTimeLeft(remaining);
        if (remaining <= 5 && remaining > 0) sounds.tick();
        if (remaining <= 0) {
          clearInterval(id);
          endGame(false);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, startTime, difficulty]);

  // ============ START GAME ============
  const startGame = (diff) => {
    if (!allDistricts) return;
    setDifficulty(diff);
    setPlaced(new Set());
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWrongTaps(0);
    setElapsed(0);
    setTimeLeft(diff.timer);
    setStartTime(Date.now());

    // Pick N districts (prioritize well-known)
    const shuffled = shuffle(allDistricts);
    let selected;
    if (diff.pieces >= allDistricts.length) {
      selected = allDistricts;
    } else {
      selected = shuffled.slice(0, diff.pieces);
    }
    setGamePieces(selected);
    setTrayOrder(shuffle([...selected.map((g) => g.rsmKey)]));
    setPhase("playing");
  };

  // ============ END GAME ============
  const endGame = (won = true) => {
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    setElapsed(finalTime);

    // Time bonus
    let timeBonus = 0;
    if (difficulty?.timer && won) {
      timeBonus = Math.max(0, difficulty.timer - finalTime) * 2;
    }

    const finalScore = score + timeBonus;

    // Save to localStorage
    try {
      const stats = JSON.parse(localStorage.getItem("game-hub-stats-v1") || "{}");
      const xpGain = Math.round(finalScore / 10) + 50;
      const newStats = {
        xp: (stats.xp || 0) + xpGain,
        totalPlays: (stats.totalPlays || 0) + 1,
        streak: stats.streak || 0,
        lastPlayDate: new Date().toISOString().slice(0, 10),
        unlockedAchievements: stats.unlockedAchievements || [],
        bestScores: {
          ...(stats.bestScores || {}),
          [`jigsaw-${difficulty.id}`]: Math.max(
            finalScore,
            stats.bestScores?.[`jigsaw-${difficulty.id}`] || 0
          ),
        },
      };
      localStorage.setItem("game-hub-stats-v1", JSON.stringify(newStats));
    } catch {}

    if (won) sounds.win();
    else sounds.lose();

    setPhase("result");
    setFinalScoreDisplay(finalScore);
    setFinalTimeDisplay(finalTime);
    setTimeBonusDisplay(timeBonus);
  };

  const [finalScoreDisplay, setFinalScoreDisplay] = useState(0);
  const [finalTimeDisplay, setFinalTimeDisplay] = useState(0);
  const [timeBonusDisplay, setTimeBonusDisplay] = useState(0);

  // ============ CHECK WIN ============
  useEffect(() => {
    if (phase !== "playing") return;
    if (placed.size === gamePieces.length && gamePieces.length > 0) {
      setTimeout(() => endGame(true), 500);
    }
  }, [placed, gamePieces]);

  // ============ DRAG HANDLERS ============
  const handlePointerDown = (e, geo) => {
    if (placed.has(geo.rsmKey)) return;
    e.preventDefault();
    sounds.pick();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const drag = {
      geo,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      offsetX: 0,
      offsetY: 0,
    };
    dragRef.current = drag;
    setDragging(drag);
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const updated = { ...d, x: e.clientX, y: e.clientY };
      dragRef.current = updated;
      setDragging(updated);
    };

    const onUp = (e) => {
      const d = dragRef.current;
      if (!d) return;

      // Check against correct position
      const mapRect = mapWrapRef.current?.getBoundingClientRect();
      if (!mapRect) {
        setDragging(null);
        dragRef.current = null;
        return;
      }

      const correct = correctPositions[d.geo.rsmKey];
      if (!correct) {
        setDragging(null);
        dragRef.current = null;
        return;
      }

      // Convert screen coords to map-local coords
      // The dragged piece is centered on the cursor, so subtract half piece size
      const dropX = e.clientX - mapRect.left;
      const dropY = e.clientY - mapRect.top;

      const dist = Math.hypot(dropX - correct.x, dropY - correct.y);

      if (dist < SNAP_DISTANCE) {
        // SNAP
        const perfect = dist < PERFECT_DISTANCE;
        const newCombo = combo + 1;
        let points = perfect ? 150 : 100;
        let multiplier = 1;
        if (newCombo >= 5) multiplier = 2;
        else if (newCombo >= 3) multiplier = 1.5;
        points = Math.round(points * multiplier);

        setScore((s) => s + points);
        setCombo(newCombo);
        setMaxCombo((m) => Math.max(m, newCombo));
        setPlaced((prev) => new Set([...prev, d.geo.rsmKey]));
        setSnapFlash({ x: correct.x, y: correct.y, perfect });
        setTimeout(() => setSnapFlash(null), 700);

        if (perfect) sounds.perfect();
        else sounds.correct();

        setToast({
          text: `+${e2b(points)}${multiplier > 1 ? ` (×${multiplier})` : ""}`,
          type: perfect ? "perfect" : "correct",
        });
        setTimeout(() => setToast(null), 900);
      } else {
        // WRONG
        setCombo(0);
        setWrongTaps((w) => w + 1);
        sounds.wrong();
        setToast({ text: "ভুল!", type: "wrong" });
        setTimeout(() => setToast(null), 800);
      }

      setDragging(null);
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, combo, correctPositions]);

  // ============ RENDER HELPERS ============
  const placedKeys = placed;
  const unplacedPieces = useMemo(() => {
    if (!gamePieces.length) return [];
    return trayOrder
      .map((k) => gamePieces.find((g) => g.rsmKey === k))
      .filter((g) => g && !placedKeys.has(g.rsmKey));
  }, [gamePieces, trayOrder, placedKeys]);

  const progressPct = gamePieces.length
    ? Math.round((placed.size / gamePieces.length) * 100)
    : 0;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${e2b(m.toString().padStart(2, "0"))}:${e2b(s.toString().padStart(2, "0"))}`;
  };

  // ============ RENDER: MENU ============
  if (phase === "menu") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/my-bangladesh/games"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold mb-6 text-sm transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> গেম হাব
          </Link>

          <div className="text-center mb-10" data-aos="fade-down">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl mb-5">
              <i className="fa-solid fa-puzzle-piece text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
              জিগস পাজল
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              জেলার টুকরো সঠিক জায়গায় বসিয়ে সম্পূর্ণ বাংলাদেশ তৈরি করুন। সময়, কম্বো, নিখুঁত স্ন্যাপ — সব মিলিয়ে সর্বোচ্চ স্কোর!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" data-aos="fade-up">
            {difficulties.map((diff, idx) => (
              <button
                key={diff.id}
                onClick={() => startGame(diff)}
                disabled={!allDistricts}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
                className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${diff.gradient} p-7 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 text-left disabled:opacity-50 disabled:cursor-wait`}
              >
                <div className="absolute -top-20 -right-20 w-44 h-44 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors"></div>
                <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-black/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 border border-white/30 group-hover:scale-110 transition-transform">
                    <i className={`${diff.icon} text-white text-2xl`}></i>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-1">{diff.title}</h3>
                  <p className="text-white/85 text-sm font-bold mb-5">{diff.subtitle}</p>
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                    শুরু করুন
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!allDistricts && (
            <div className="mt-8 text-center" data-aos="fade-up">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-purple-500"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                ম্যাপ লোড হচ্ছে...
              </p>
            </div>
          )}

          <div className="mt-10 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm" data-aos="fade-up">
            <h3 className="font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-blue-500"></i>
              খেলার নিয়ম
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                নিচের tray থেকে জেলার টুকরো ম্যাপে টেনে আনুন
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                সঠিক জায়গার কাছে ছাড়লেই স্ন্যাপ হবে — <b>+১০০</b>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                নিখুঁত স্ন্যাপ (একদম কেন্দ্রে) — <b>+১৫০</b>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                টানা ৩টি সঠিক — <b>×১.৫</b>, টানা ৫টি — <b>×২</b>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-xmark text-red-500 mt-1 text-xs"></i>
                ভুল জায়গায় ছাড়লে combo রিসেট, স্কোর -০
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ============ RENDER: RESULT ============
  if (phase === "result") {
    const won = placed.size === gamePieces.length;
    const xpGained = Math.round(finalScoreDisplay / 10) + 50;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="max-w-xl w-full">
          <div
            className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-2xl text-center ${
              won
                ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500"
                : "bg-gradient-to-br from-red-500 via-pink-500 to-orange-500"
            }`}
            data-aos="zoom-in"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-black/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 mb-5">
                <i className={`fa-solid ${won ? "fa-crown" : "fa-clock"} text-white text-4xl`}></i>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                {won ? "অভিনন্দন!" : "সময় শেষ!"}
              </h1>
              <p className="text-white/85 text-sm font-bold mb-6">
                {won
                  ? "আপনি সম্পূর্ণ বাংলাদেশ তৈরি করেছেন 🎉"
                  : `${e2b(placed.size)}/${e2b(gamePieces.length)} জেলা সম্পন্ন করতে পেরেছেন`}
              </p>

              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/25 mb-6">
                <p className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">
                  চূড়ান্ত স্কোর
                </p>
                <p className="text-5xl sm:text-6xl font-black text-white mb-1">
                  {e2b(finalScoreDisplay)}
                </p>
                <p className="text-white/70 text-xs font-bold">
                  + {e2b(xpGained)} XP
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <i className="fa-solid fa-stopwatch text-white/70 text-sm mb-1"></i>
                  <p className="text-lg font-black text-white">{formatTime(finalTimeDisplay)}</p>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                    সময়
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <i className="fa-solid fa-bolt text-white/70 text-sm mb-1"></i>
                  <p className="text-lg font-black text-white">{e2b(maxCombo)}</p>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                    সেরা কম্বো
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <i className="fa-solid fa-xmark text-white/70 text-sm mb-1"></i>
                  <p className="text-lg font-black text-white">{e2b(wrongTaps)}</p>
                  <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                    ভুল
                  </p>
                </div>
              </div>

              {timeBonusDisplay > 0 && (
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-6 border border-white/20">
                  <p className="text-xs font-bold text-white/90">
                    <i className="fa-solid fa-clock mr-1.5"></i>
                    টাইম বোনাস: <b>+{e2b(timeBonusDisplay)}</b>
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setPhase("menu")}
                  className="flex-1 py-3.5 bg-white/20 backdrop-blur-sm text-white font-black rounded-xl border border-white/30 hover:bg-white/30 transition-all"
                >
                  <i className="fa-solid fa-rotate-left mr-2"></i>
                  আবার খেলুন
                </button>
                <Link
                  href="/my-bangladesh/games"
                  className="flex-1 py-3.5 bg-white text-gray-900 font-black rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all text-center"
                >
                  <i className="fa-solid fa-home mr-2"></i>
                  গেম হাব
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ RENDER: PLAYING ============
  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-[#050b08] font-sans flex flex-col">
      {/* ============ HEADER ============ */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <Link
            href="/my-bangladesh/games"
            onClick={() => {
              if (window.confirm("গেম থেকে বের হয়ে যাবেন?")) return;
              // If user cancels, we need to prevent navigation — but Link will navigate anyway. 
              // Simplest: rely on browser's beforeunload-like behavior. For now, just allow back.
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-center">
            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm ${
                difficulty?.timer && timeLeft !== null && timeLeft < 30
                  ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              }`}
            >
              <i className="fa-solid fa-stopwatch text-xs"></i>
              <span>
                {difficulty?.timer
                  ? formatTime(Math.max(timeLeft || 0, 0))
                  : formatTime(elapsed)}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-sm shadow-md">
              <i className="fa-solid fa-star text-xs"></i>
              <span>{e2b(score)}</span>
            </div>

            {/* Combo */}
            {combo >= 3 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md animate-pulse">
                <i className="fa-solid fa-bolt text-xs"></i>
                <span>×{combo >= 5 ? "২" : "১.৫"}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="w-16 sm:w-28 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ============ MAP AREA ============ */}
      <div
        ref={mapWrapRef}
        className="flex-1 relative bg-gray-100 dark:bg-[#0a0d12] overflow-hidden"
      >
        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(168,85,247,0.08) 0%, transparent 60%)",
            }}
          ></div>
        </div>

        {projection && pathGen && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${mapDims.w} ${mapDims.h}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Base map (empty outline) */}
            {gamePieces.map((geo) => {
              const isPlaced = placed.has(geo.rsmKey);
              return (
                <path
                  key={`base-${geo.rsmKey}`}
                  d={pathGen(geo)}
                  fill={isPlaced ? getColor(geo.properties?.adm2_name || geo.properties?.name || "") : "#cbd5e1"}
                  stroke={isPlaced ? "rgba(255,255,255,0.9)" : "rgba(148,163,184,0.7)"}
                  strokeWidth={isPlaced ? 0.9 : 0.5}
                  style={{
                    transition: "fill 0.4s ease, stroke 0.4s ease",
                  }}
                />
              );
            })}

            {/* Snap flashes */}
            {snapFlash && (
              <circle
                cx={snapFlash.x}
                cy={snapFlash.y}
                r={30}
                fill="none"
                stroke={snapFlash.perfect ? "#fbbf24" : "#10b981"}
                strokeWidth={3}
                opacity={0.9}
                style={{
                  animation: "snapRing 0.7s ease-out forwards",
                }}
              />
            )}
          </svg>
        )}

        {/* Toast feedback */}
        {toast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full font-black text-sm shadow-lg backdrop-blur-md border animate-[fadeInOut_0.9s_ease-out]"
            style={{
              background:
                toast.type === "wrong"
                  ? "rgba(239,68,68,0.9)"
                  : toast.type === "perfect"
                  ? "rgba(251,191,36,0.95)"
                  : "rgba(16,185,129,0.9)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            {toast.text}
          </div>
        )}

        {/* Hint if user seems stuck */}
        {progressPct === 0 && elapsed > 15 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full pointer-events-none">
            <i className="fa-solid fa-lightbulb text-amber-400 mr-1.5"></i>
            টুকরো ম্যাপের সঠিক জায়গার কাছে ছাড়ুন
          </div>
        )}
      </div>

      {/* ============ TRAY ============ */}
      <div className="shrink-0 h-40 sm:h-44 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            <i className="fa-solid fa-hand-pointer mr-1 text-purple-500"></i>
            টুকরো টেনে ম্যাপে ছাড়ুন
          </p>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400">
            {e2b(unplacedPieces.length)} বাকি
          </p>
        </div>

        <div className="h-[calc(100%-36px)] overflow-y-auto overflow-x-hidden px-3 py-2">
          {unplacedPieces.length === 0 ? (
            <div className="flex items-center justify-center h-full text-emerald-500">
              <i className="fa-solid fa-check-circle text-2xl mr-2"></i>
              <span className="font-black">সব জেলা বসানো হয়েছে!</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {unplacedPieces.map((geo) => {
                const name =
                  geo.properties?.adm2_name ||
                  geo.properties?.ADM2_EN ||
                  geo.properties?.NAME_2 ||
                  geo.properties?.name ||
                  "Unknown";
                return (
                  <div
                    key={geo.rsmKey}
                    onPointerDown={(e) => handlePointerDown(e, geo)}
                    className="touch-none select-none cursor-grab active:cursor-grabbing flex items-center justify-center p-1 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:scale-105 transition-all"
                    style={{ touchAction: "none" }}
                  >
                    <DistrictPiece geo={geo} size={50} fill={getColor(name)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============ DRAG OVERLAY ============ */}
      {dragging && (
        <div
          className="fixed pointer-events-none z-[80]"
          style={{
            left: dragging.x,
            top: dragging.y,
            transform: "translate(-50%, -50%) scale(1.3)",
            filter: "drop-shadow(0 12px 24px rgba(168,85,247,0.5))",
          }}
        >
          <DistrictPiece
            geo={dragging.geo}
            size={64}
            fill={getColor(
              dragging.geo.properties?.adm2_name ||
                dragging.geo.properties?.ADM2_EN ||
                dragging.geo.properties?.NAME_2 ||
                dragging.geo.properties?.name ||
                ""
            )}
          />
        </div>
      )}

      {/* ============ GLOBAL STYLES ============ */}
      <style jsx>{`
        @keyframes snapRing {
          0% {
            transform-origin: center;
            opacity: 1;
            r: 30;
          }
          100% {
            opacity: 0;
            r: 55;
          }
        }
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
        }
      `}</style>
    </div>
  );
}
