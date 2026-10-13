"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { geoMercator, geoCentroid, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";

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

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${e2b(m.toString().padStart(2, "0"))}:${e2b(s.toString().padStart(2, "0"))}`;
};

// ============================================
// NAME EXTRACTION (robust, multi-key)
// ============================================
const extractRawName = (geo) => {
  const props = geo?.properties || {};
  const keys = [
    "adm2_name", "ADM2_NAME", "ADM2_EN", "adm2_en",
    "NAME_2", "name", "Name", "NAME",
    "Dist_Name", "dist_name", "DIST_NAME",
    "district", "District", "DISTRICT",
    "dist", "Dist",
  ];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim() && v.length < 60) return v.trim();
  }
  for (const k of Object.keys(props)) {
    const v = props[k];
    if (typeof v === "string" && v.trim() && v.length < 60) return v.trim();
  }
  return "";
};

const standardMap = {
  "Chapainababganj": "Chapainawabganj",
  "Nawabganj": "Chapainawabganj",
  "Netrakona": "Netrokona",
  "Panchagar": "Panchagarh",
  "Bramhanbaria": "Brahmanbaria",
  "Chittagong": "Chattogram",
  "Coxs Bazar": "Cox's Bazar",
};

const districtBn = {
  "Barguna": "বরগুনা", "Barishal": "বরিশাল", "Bhola": "ভোলা", "Jhalokati": "ঝালকাঠি", "Patuakhali": "পটুয়াখালী", "Pirojpur": "পিরোজপুর",
  "Bandarban": "বান্দরবান", "Brahmanbaria": "ব্রাহ্মণবাড়িয়া", "Chandpur": "চাঁদপুর", "Chattogram": "চট্টগ্রাম", "Cox's Bazar": "কক্সবাজার", "Cumilla": "কুমিল্লা", "Feni": "ফেনী", "Khagrachhari": "খাগড়াছড়ি", "Lakshmipur": "লক্ষ্মীপুর", "Noakhali": "নোয়াখালী", "Rangamati": "রাঙামাটি",
  "Dhaka": "ঢাকা", "Faridpur": "ফরিদপুর", "Gazipur": "গাজীপুর", "Gopalganj": "গোপালগঞ্জ", "Kishoreganj": "কিশোরগঞ্জ", "Madaripur": "মাদারীপুর", "Manikganj": "মানিকগঞ্জ", "Munshiganj": "মুন্সীগঞ্জ", "Narayanganj": "নারায়ণগঞ্জ", "Narsingdi": "নরসিংদী", "Rajbari": "রাজবাড়ী", "Shariatpur": "শরীয়তপুর", "Tangail": "টাঙ্গাইল",
  "Bagerhat": "বাগেরহাট", "Chuadanga": "চুয়াডাঙ্গা", "Jashore": "যশোর", "Jhenaidah": "ঝিনাইদহ", "Khulna": "খুলনা", "Kushtia": "কুষ্টিয়া", "Magura": "মাগুরা", "Meherpur": "মেহেরপুর", "Narail": "নড়াইল", "Satkhira": "সাতক্ষীরা",
  "Jamalpur": "জামালপুর", "Mymensingh": "ময়মনসিংহ", "Netrokona": "নেত্রকোনা", "Sherpur": "শেরপুর",
  "Bogura": "বগুড়া", "Chapainawabganj": "চাঁপাইনবাবগঞ্জ", "Joypurhat": "জয়পুরহাট", "Naogaon": "নওগাঁ", "Natore": "নাটোর", "Pabna": "পাবনা", "Rajshahi": "রাজশাহী", "Sirajganj": "সিরাজগঞ্জ",
  "Dinajpur": "দিনাজপুর", "Gaibandha": "গাইবান্ধা", "Kurigram": "কুড়িগ্রাম", "Lalmonirhat": "লালমনিরহাট", "Nilphamari": "নীলফামারী", "Panchagarh": "পঞ্চগড়", "Rangpur": "রংপুর", "Thakurgaon": "ঠাকুরগাঁও",
  "Habiganj": "হবিগঞ্জ", "Moulvibazar": "মৌলভীবাজার", "Sunamganj": "সুনামগঞ্জ", "Sylhet": "সিলেট",
};

const getNormalizedName = (raw) => standardMap[raw] || raw;
const getBnName = (raw) => {
  const n = getNormalizedName(raw);
  return districtBn[n] || n;
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

const getColorByRawName = (rawName) => {
  const n = getNormalizedName(rawName);
  const div = districtToDivision[n] || "ঢাকা";
  return divisionColors[div] || "#64748b";
};

// ============================================
// DIFFICULTIES
// ============================================
const difficulties = [
  { id: "easy", title: "সহজ", subtitle: "১৫ জেলা • সময় নেই", icon: "fa-solid fa-seedling", gradient: "from-emerald-500 to-teal-500", pieces: 15, timer: null },
  { id: "medium", title: "মাঝারি", subtitle: "৩০ জেলা • ৫ মিনিট", icon: "fa-solid fa-fire", gradient: "from-amber-500 to-orange-500", pieces: 30, timer: 300 },
  { id: "hard", title: "কঠিন", subtitle: "৬৪ জেলা • ৮ মিনিট", icon: "fa-solid fa-skull", gradient: "from-red-500 to-pink-500", pieces: 64, timer: 480 },
];

// ============================================
// SOUND ENGINE
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
  correct: () => { playTone(800, 0.15, "sine", 0.12); playTone(1200, 0.22, "sine", 0.1, 0.08); },
  perfect: () => { playTone(900, 0.12, "sine", 0.12); playTone(1200, 0.12, "sine", 0.12, 0.07); playTone(1500, 0.28, "sine", 0.14, 0.14); },
  wrong: () => { playTone(180, 0.28, "sawtooth", 0.08); },
  pick: () => { playTone(550, 0.05, "sine", 0.06); },
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.4, "sine", 0.14, i * 0.13)); },
  lose: () => { [400, 350, 300, 250].forEach((f, i) => playTone(f, 0.3, "triangle", 0.12, i * 0.15)); },
  tick: () => { playTone(1100, 0.04, "sine", 0.05); },
};

// ============================================
// DISTRICT PIECE SVG
// ============================================
function DistrictPiece({ geo, size = 54, fill = "#94a3b8" }) {
  const pathD = useMemo(() => {
    if (!geo) return "";
    try {
      const proj = geoMercator().fitExtent([[4, 4], [size - 4, size - 4]], geo);
      const pathGen = geoPath(proj);
      return pathGen(geo) || "";
    } catch {
      return "";
    }
  }, [geo, size]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <path d={pathD} fill={fill} stroke="#ffffff" strokeWidth={0.9} strokeLinejoin="round" />
    </svg>
  );
}

// ============================================
// SCORE BREAKDOWN COMPONENT
// ============================================
function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;

  const {
    totalPieces,
    placedCount,
    basePoints,
    perfectCount,
    perfectBonus,
    comboBonus,
    timeBonus,
    wrongTaps,
    finalScore,
    won,
  } = breakdown;

  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/25 mb-4 text-left">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/20">
        <i className="fa-solid fa-calculator text-yellow-300"></i>
        <h3 className="text-xs font-black text-white uppercase tracking-widest">
          স্কোর কীভাবে তৈরি হলো
        </h3>
      </div>

      <div className="space-y-2">
        {/* Placed districts base points */}
        {placedCount > 0 && (
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white/85">
              <i className="fa-solid fa-check text-emerald-300 mr-1.5 w-4 text-center"></i>
              {e2b(placedCount)}টি জেলা বসিয়েছেন × ১০০
            </span>
            <span className="text-emerald-300 font-black">
              +{e2b(placedCount * 100)}
            </span>
          </div>
        )}

        {/* Perfect snap bonus */}
        {perfectCount > 0 && (
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white/85">
              <i className="fa-solid fa-star text-yellow-300 mr-1.5 w-4 text-center"></i>
              {e2b(perfectCount)}টি perfect snap × ৫০ (বোনাস)
            </span>
            <span className="text-yellow-300 font-black">
              +{e2b(perfectBonus)}
            </span>
          </div>
        )}

        {/* Combo bonus */}
        {comboBonus > 0 && (
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white/85">
              <i className="fa-solid fa-bolt text-amber-300 mr-1.5 w-4 text-center"></i>
              কম্বো মাল্টিপ্লায়ার বোনাস
            </span>
            <span className="text-amber-300 font-black">
              +{e2b(comboBonus)}
            </span>
          </div>
        )}

        {/* Time bonus */}
        {timeBonus > 0 && (
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white/85">
              <i className="fa-solid fa-stopwatch text-blue-300 mr-1.5 w-4 text-center"></i>
              টাইম বোনাস (দ্রুত শেষ করেছেন)
            </span>
            <span className="text-blue-300 font-black">
              +{e2b(timeBonus)}
            </span>
          </div>
        )}

        {/* If empty (no points at all) */}
        {placedCount === 0 && !won && (
          <div className="text-center text-xs font-bold text-white/70 py-2">
            <i className="fa-solid fa-face-sad-tear mr-1.5"></i>
            কোনো জেলা বসাতে পারেননি
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/25 my-2"></div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-white uppercase tracking-wider">
            <i className="fa-solid fa-equals text-white/70 mr-1.5"></i>
            মোট স্কোর
          </span>
          <span className="text-xl font-black text-white">
            {e2b(finalScore)}
          </span>
        </div>
      </div>

      {/* Info line */}
      <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-center gap-2 text-[9px] font-bold text-white/60 flex-wrap">
        <span>
          <i className="fa-solid fa-cube mr-1"></i>
          মোট টুকরা: {e2b(totalPieces)}
        </span>
        <span>•</span>
        <span className="text-emerald-300">
          <i className="fa-solid fa-check mr-1"></i>
          বসানো: {e2b(placedCount)}
        </span>
        {wrongTaps > 0 && (
          <>
            <span>•</span>
            <span className="text-red-300">
              <i className="fa-solid fa-xmark mr-1"></i>
              ভুল ট্যাপ: {e2b(wrongTaps)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// LEADERBOARD MODAL
// ============================================
function LeaderboardModal({ onClose, currentUserId, initialDifficulty }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDifficulty, setActiveDifficulty] = useState(initialDifficulty || null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("game_scores")
          .select("id, score, time_seconds, wrong_taps, difficulty, user_id, profiles:user_id(full_name, photo_url)")
          .eq("game_mode", "jigsaw")
          .order("score", { ascending: false })
          .order("time_seconds", { ascending: true })
          .order("wrong_taps", { ascending: true })
          .limit(50);
        if (activeDifficulty) query = query.eq("difficulty", activeDifficulty);
        const { data, error } = await query;
        if (!error) setEntries(data || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [activeDifficulty]);

  const getMedalIcon = (rank) => {
    if (rank === 1) return "fa-crown text-yellow-400";
    if (rank === 2) return "fa-medal text-gray-300";
    if (rank === 3) return "fa-medal text-amber-600";
    return null;
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border-yellow-400/50";
    if (rank === 2) return "bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300/50";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-orange-700/20 border-amber-600/50";
    return "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-trophy text-amber-500"></i>
              টপ ৫০ লিডারবোর্ড
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">জিগস পাজল</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <i className="fa-solid fa-xmark text-gray-600 dark:text-gray-300"></i>
          </button>
        </div>
        <div className="px-5 py-3 flex gap-2 border-b overflow-x-auto">
          <button onClick={() => setActiveDifficulty(null)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeDifficulty === null ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}>সব</button>
          {difficulties.map((d) => (
            <button key={d.id} onClick={() => setActiveDifficulty(d.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeDifficulty === d.id ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}>{d.title}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-10"><i className="fa-solid fa-spinner fa-spin text-2xl text-purple-500"></i></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10"><i className="fa-solid fa-inbox text-3xl text-gray-300"></i><p className="text-sm text-gray-500 mt-3">এখনো কোনো স্কোর নেই</p></div>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((entry, idx) => {
                const rank = idx + 1;
                const isMe = entry.user_id === currentUserId;
                const profile = entry.profiles || {};
                const name = profile.full_name || "Explorer";
                const avatar = profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=a855f7&color=fff`;
                const medal = getMedalIcon(rank);
                return (
                  <div key={entry.id} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 ${getRankStyle(rank)} ${isMe ? "ring-2 ring-purple-500" : ""}`}>
                    <div className="w-8 text-center">
                      {medal ? <i className={`fa-solid ${medal} text-lg`}></i> : <span className="text-sm font-black text-gray-500">{e2b(rank)}</span>}
                    </div>
                    <img src={avatar} alt={name} className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                        {name}
                        {isMe && <span className="ml-1.5 text-[9px] text-purple-500">(আপনি)</span>}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                        {entry.difficulty === "easy" ? "সহজ" : entry.difficulty === "medium" ? "মাঝারি" : "কঠিন"} • {formatTime(entry.time_seconds)}
                      </p>
                    </div>
                    <p className="text-base font-black text-purple-600">{e2b(entry.score)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function JigsawPage() {
  const [phase, setPhase] = useState("menu");
  const [difficulty, setDifficulty] = useState(null);
  const [allDistricts, setAllDistricts] = useState(null);

  const [gamePieces, setGamePieces] = useState([]);
  const [placed, setPlaced] = useState(() => new Set());
  const [trayOrder, setTrayOrder] = useState([]);

  const mapWrapRef = useRef(null);
  const [mapDims, setMapDims] = useState({ w: 0, h: 0 });

  const [dragging, setDragging] = useState(null);
  const dragRef = useRef(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);

  // 🔴 NEW: Score breakdown tracking
  const [basePoints, setBasePoints] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [comboBonus, setComboBonus] = useState(0);

  const [toast, setToast] = useState(null);
  const [snapFlash, setSnapFlash] = useState(null);

  const [finalScoreDisplay, setFinalScoreDisplay] = useState(0);
  const [finalTimeDisplay, setFinalTimeDisplay] = useState(0);
  const [timeBonusDisplay, setTimeBonusDisplay] = useState(0);
  const [wasWin, setWasWin] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [scoreSubmitStatus, setScoreSubmitStatus] = useState("idle");
  const [userRank, setUserRank] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // 🔴 Refs for stale-closure prevention
  const stateRef = useRef({});
  stateRef.current = {
    score,
    combo,
    maxCombo,
    wrongTaps,
    basePoints,
    perfectCount,
    comboBonus,
    difficulty,
    startTime,
    placedCount: placed.size,
    totalPieces: gamePieces.length,
    user,
  };

  const gameEndedRef = useRef(false);

  // ============ AUTH ============
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (e) {
        console.error(e);
      }
      setAuthLoading(false);
    })();
  }, []);

  // ============ LOAD DISTRICTS ============
  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    (async () => {
      try {
        const res = await fetch(geoUrl);
        const topo = await res.json();
        const key = Object.keys(topo.objects)[0];
        const features = topojson.feature(topo, topo.objects[key]).features;

        const enriched = features.map((f, i) => ({
          ...f,
          _uid: i,
          _rawName: extractRawName(f),
        }));

        setAllDistricts(enriched);
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

  // ============ PROJECTION (DYNAMIC FIT) ============
  const projection = useMemo(() => {
    if (!mapDims.w || !mapDims.h || !allDistricts || allDistricts.length === 0) {
      return null;
    }
    const featureCollection = {
      type: "FeatureCollection",
      features: allDistricts,
    };
    return geoMercator().fitSize(
      [mapDims.w * 0.92, mapDims.h * 0.92],
      featureCollection
    );
  }, [mapDims.w, mapDims.h, allDistricts]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // ============ CORRECT POSITIONS ============
  const correctPositions = useMemo(() => {
    if (!projection || !gamePieces.length) return {};
    const pos = {};
    gamePieces.forEach((p) => {
      const c = geoCentroid(p.geo);
      const xy = projection(c);
      if (xy && isFinite(xy[0])) pos[p.uid] = { x: xy[0], y: xy[1] };
    });
    return pos;
  }, [projection, gamePieces]);

  const targetUidsSet = useMemo(
    () => new Set(gamePieces.map((p) => p.uid)),
    [gamePieces]
  );

  // ============ SUBMIT SCORE (with stateRef) ============
  const submitScoreToSupabase = useCallback(async (payload) => {
    const currentUser = stateRef.current.user;
    if (!currentUser) {
      setScoreSubmitStatus("not_logged_in");
      return;
    }
    setScoreSubmitStatus("pending");
    try {
      const { data, error } = await supabase.rpc("submit_game_score", {
        p_game_mode: "jigsaw",
        p_difficulty: payload.difficulty,
        p_score: payload.score,
        p_time_seconds: payload.timeSeconds,
        p_wrong_taps: payload.wrongTaps,
        p_max_combo: payload.maxCombo,
        p_accuracy: payload.accuracy,
        p_xp: payload.xp,
      });
      if (error) {
        setScoreSubmitStatus("error");
        return;
      }
      if (data?.saved) {
        setScoreSubmitStatus("saved");
        setUserRank(data.rank || null);
      } else if (data?.qualified === false) setScoreSubmitStatus("not_qualified");
      else if (data?.saved === false && data?.qualified) {
        setScoreSubmitStatus("existing_better");
        setUserRank(data.rank || null);
      } else setScoreSubmitStatus("error");

      if (data?.saved) {
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("game_xp, game_level")
            .eq("id", currentUser.id)
            .single();
          const currentXp = profileData?.game_xp || 0;
          const newXp = currentXp + (payload.xp || 0);
          const newLevel = Math.min(15, Math.floor(newXp / 500) + 1);
          await supabase
            .from("profiles")
            .update({ game_xp: newXp, game_level: newLevel })
            .eq("id", currentUser.id);
        } catch (e) {}
      }
    } catch (e) {
      setScoreSubmitStatus("error");
    }
  }, []);

  // ============ END GAME (STABLE) ============
  const endGame = useCallback(
    (won = true) => {
      if (gameEndedRef.current) return;
      gameEndedRef.current = true;

      try {
        const {
          startTime: st,
          difficulty: df,
          score: sc,
          combo: cm,
          maxCombo: mc,
          wrongTaps: wt,
          basePoints: bp,
          perfectCount: pc,
          comboBonus: cb,
          placedCount: pl,
          totalPieces: tp,
        } = stateRef.current;

        if (!st || !df) {
          // Fallback: force result screen
          setFinalScoreDisplay(0);
          setFinalTimeDisplay(0);
          setWasWin(false);
          setScoreBreakdown(null);
          setTimeout(() => setPhase("result"), 30);
          return;
        }

        const finalTime = Math.max(0, Math.floor((Date.now() - st) / 1000));
        const timeBonus = (df.timer && won)
          ? Math.max(0, df.timer - finalTime) * 2
          : 0;
        const finalScore = sc + timeBonus;
        const perfectBonus = pc * 50;

        // Build score breakdown
        const breakdown = {
          totalPieces: tp,
          placedCount: pl,
          basePoints: bp,
          perfectCount: pc,
          perfectBonus,
          comboBonus: cb,
          timeBonus,
          wrongTaps: wt,
          finalScore,
          won,
        };

        // localStorage
        try {
          const stats = JSON.parse(
            localStorage.getItem("game-hub-stats-v1") || "{}"
          );
          const xpGain = Math.round(finalScore / 10) + 50;
          localStorage.setItem(
            "game-hub-stats-v1",
            JSON.stringify({
              xp: (stats.xp || 0) + xpGain,
              totalPlays: (stats.totalPlays || 0) + 1,
              streak: stats.streak || 0,
              lastPlayDate: new Date().toISOString().slice(0, 10),
              unlockedAchievements: stats.unlockedAchievements || [],
              bestScores: {
                ...(stats.bestScores || {}),
                [`jigsaw-${df.id}`]: Math.max(
                  finalScore,
                  stats.bestScores?.[`jigsaw-${df.id}`] || 0
                ),
              },
            })
          );
        } catch {}

        if (won) sounds.win();
        else sounds.lose();

        setFinalScoreDisplay(finalScore);
        setFinalTimeDisplay(finalTime);
        setTimeBonusDisplay(timeBonus);
        setWasWin(won);
        setScoreBreakdown(breakdown);

        setTimeout(() => {
          setPhase("result");
        }, 50);

        const xpGain = Math.round(finalScore / 10) + 50;
        const accuracy = tp > 0 ? Math.round((pl / tp) * 100 * 100) / 100 : 0;

        setTimeout(() => {
          try {
            submitScoreToSupabase({
              difficulty: df.id,
              score: finalScore,
              timeSeconds: finalTime,
              wrongTaps: wt,
              maxCombo: mc,
              accuracy,
              xp: xpGain,
            });
          } catch (e) {}
        }, 300);
      } catch (err) {
        console.error("[Jigsaw] endGame error:", err);
        setFinalScoreDisplay(0);
        setFinalTimeDisplay(0);
        setWasWin(false);
        setScoreBreakdown(null);
        setPhase("result");
      }
    },
    [submitScoreToSupabase]
  );

  // ============ GAME TIMER ============
  useEffect(() => {
    if (phase !== "playing" || !startTime || !difficulty) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(el);
      if (difficulty.timer) {
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
  }, [phase, startTime, difficulty, endGame]);

  // ============ START GAME ============
  const startGame = (diff) => {
    if (!allDistricts) return;
    gameEndedRef.current = false;
    setDifficulty(diff);
    setPlaced(new Set());
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWrongTaps(0);
    setBasePoints(0);
    setPerfectCount(0);
    setComboBonus(0);
    setElapsed(0);
    setTimeLeft(diff.timer);
    setStartTime(Date.now());
    setScoreSubmitStatus("idle");
    setUserRank(null);
    setScoreBreakdown(null);

    const shuffled = shuffle(allDistricts);
    const selected = diff.pieces >= allDistricts.length
      ? allDistricts
      : shuffled.slice(0, diff.pieces);

    const pieces = selected.map((geo) => ({
      geo,
      uid: geo._uid,
      rawName: geo._rawName,
      bnName: getBnName(geo._rawName),
    }));

    setGamePieces(pieces);
    setTrayOrder(shuffle(pieces.map((p) => p.uid)));
    setPhase("playing");
  };

  // ============ CHECK WIN ============
  useEffect(() => {
    if (phase !== "playing") return;
    if (placed.size === gamePieces.length && gamePieces.length > 0) {
      setTimeout(() => endGame(true), 500);
    }
  }, [placed, gamePieces, phase, endGame]);

  // ============ DRAG ============
  const handlePointerDown = (e, piece) => {
    if (placed.has(piece.uid)) return;
    e.preventDefault();
    sounds.pick();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const drag = { piece, x: e.clientX, y: e.clientY };
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
      const mapRect = mapWrapRef.current?.getBoundingClientRect();
      if (!mapRect) {
        setDragging(null);
        dragRef.current = null;
        return;
      }
      const correct = correctPositions[d.piece.uid];
      if (!correct) {
        setDragging(null);
        dragRef.current = null;
        return;
      }
      const dropX = e.clientX - mapRect.left;
      const dropY = e.clientY - mapRect.top;
      const dist = Math.hypot(dropX - correct.x, dropY - correct.y);

      if (dist < SNAP_DISTANCE) {
        const perfect = dist < PERFECT_DISTANCE;
        const newCombo = combo + 1;
        const baseForThis = perfect ? 150 : 100;
        let multiplier = 1;
        if (newCombo >= 5) multiplier = 2;
        else if (newCombo >= 3) multiplier = 1.5;
        const finalPoints = Math.round(baseForThis * multiplier);

        // 🔴 Track score components
        const baseComp = 100;
        const perfectComp = perfect ? 50 : 0;
        const comboComp = finalPoints - baseComp - perfectComp;

        setScore((s) => s + finalPoints);
        setBasePoints((b) => b + baseComp);
        if (perfect) setPerfectCount((c) => c + 1);
        setComboBonus((b) => b + comboComp);
        setCombo(newCombo);
        setMaxCombo((m) => Math.max(m, newCombo));
        setPlaced((prev) => new Set([...prev, d.piece.uid]));
        setSnapFlash({ x: correct.x, y: correct.y, perfect });
        setTimeout(() => setSnapFlash(null), 700);

        if (perfect) sounds.perfect();
        else sounds.correct();

        setToast({
          text: `+${e2b(finalPoints)}${multiplier > 1 ? ` (×${multiplier})` : ""}`,
          type: perfect ? "perfect" : "correct",
        });
        setTimeout(() => setToast(null), 900);
      } else {
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

  // ============ HELPERS ============
  const unplacedPieces = useMemo(() => {
    if (!gamePieces.length) return [];
    return trayOrder
      .map((uid) => gamePieces.find((p) => p.uid === uid))
      .filter((p) => p && !placed.has(p.uid));
  }, [gamePieces, trayOrder, placed]);

  const progressPct = gamePieces.length
    ? Math.round((placed.size / gamePieces.length) * 100)
    : 0;

  // ============ RENDER: MENU ============
  if (phase === "menu") {
    return (
      <div key="menu" className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/my-bangladesh/games" className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold text-sm">
              <i className="fa-solid fa-arrow-left"></i> গেম হাব
            </Link>
            <button onClick={() => setShowLeaderboard(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-xs shadow-md">
              <i className="fa-solid fa-trophy"></i> লিডারবোর্ড
            </button>
          </div>

          <div className="text-center mb-10" data-aos="fade-down">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl mb-5">
              <i className="fa-solid fa-puzzle-piece text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">জিগস পাজল</h1>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              জেলার টুকরো সঠিক জায়গায় বসিয়ে সম্পূর্ণ বাংলাদেশ তৈরি করুন!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {difficulties.map((diff, idx) => (
              <button
                key={diff.id}
                onClick={() => startGame(diff)}
                disabled={!allDistricts}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
                className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${diff.gradient} p-7 shadow-xl hover:-translate-y-2 transition-all duration-500 text-left disabled:opacity-50`}
              >
                <div className="absolute -top-20 -right-20 w-44 h-44 bg-white/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 border border-white/30">
                    <i className={`${diff.icon} text-white text-2xl`}></i>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-1">{diff.title}</h3>
                  <p className="text-white/85 text-sm font-bold mb-5">{diff.subtitle}</p>
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase">
                    শুরু করুন <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!authLoading && !user && (
            <div className="mt-8 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-4 rounded-2xl flex items-start gap-3">
              <i className="fa-solid fa-circle-info text-blue-500 text-lg"></i>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">গেস্ট হিসেবে খেলছেন</p>
                <Link href="/login?redirect=/my-bangladesh/games/jigsaw" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-black rounded-lg">
                  <i className="fa-solid fa-right-to-bracket"></i> লগইন
                </Link>
              </div>
            </div>
          )}
        </div>
        {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} currentUserId={user?.id} initialDifficulty={null} />}
      </div>
    );
  }

  // ============ RENDER: RESULT ============
  if (phase === "result") {
    const won = wasWin;
    const xpGained = Math.round(finalScoreDisplay / 10) + 50;

    const renderSaveStatus = () => {
      if (scoreSubmitStatus === "pending") return (
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/20 flex items-center justify-center gap-2">
          <i className="fa-solid fa-spinner fa-spin text-white/90 text-sm"></i>
          <span className="text-xs font-bold text-white/90">স্কোর সংরক্ষণ হচ্ছে...</span>
        </div>
      );
      if (scoreSubmitStatus === "saved") return (
        <div className="bg-gradient-to-r from-yellow-400/30 to-amber-500/30 backdrop-blur-sm rounded-xl p-3 mb-4 border border-yellow-300/50 flex items-center justify-center gap-2">
          <i className="fa-solid fa-trophy text-yellow-300 text-lg"></i>
          <p className="text-xs font-black text-white">লিডারবোর্ডে #{e2b(userRank || 0)} হয়েছেন!</p>
        </div>
      );
      if (scoreSubmitStatus === "not_qualified") return (
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/20">
          <p className="text-xs font-bold text-white/90 text-center">টপ ৫০-এ জায়গা হয়নি — আরো চেষ্টা করুন!</p>
        </div>
      );
      if (scoreSubmitStatus === "existing_better") return (
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/20">
          <p className="text-xs font-bold text-white/90 text-center">আপনার আগের স্কোর-ই সেরা — #{e2b(userRank || 0)}</p>
        </div>
      );
      if (scoreSubmitStatus === "not_logged_in") return (
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/25">
          <p className="text-xs font-bold text-white/95 mb-2 text-center">
            <i className="fa-solid fa-lock mr-1.5"></i>স্কোর সেভ করতে লগইন করুন
          </p>
          <Link href="/login?redirect=/my-bangladesh/games/jigsaw" className="block w-full py-2.5 bg-white text-gray-900 font-black rounded-lg text-xs text-center">
            লগইন / রেজিস্টার
          </Link>
        </div>
      );
      return null;
    };

    return (
      <div
        key="result"
        className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 flex items-center justify-center"
      >
        <div className="max-w-xl w-full">
          <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl text-center ${won ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500" : "bg-gradient-to-br from-red-500 via-pink-500 to-orange-500"}`}>
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 mb-4">
                <i className={`fa-solid ${won ? "fa-crown" : "fa-clock"} text-white text-3xl`}></i>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                {won ? "অভিনন্দন!" : "সময় শেষ!"}
              </h1>
              <p className="text-white/85 text-xs font-bold mb-5">
                {won
                  ? "আপনি সম্পূর্ণ বাংলাদেশ তৈরি করেছেন 🎉"
                  : `${e2b(placed.size)}/${e2b(gamePieces.length)} জেলা সম্পন্ন করতে পেরেছেন`}
              </p>

              {/* Big final score */}
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/25 mb-4">
                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">
                  চূড়ান্ত স্কোর
                </p>
                <p className="text-5xl font-black text-white mb-1">
                  {e2b(finalScoreDisplay)}
                </p>
                <p className="text-white/70 text-[10px] font-bold">
                  + {e2b(xpGained)} XP
                </p>
              </div>

              {/* Stat pills */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                  <i className="fa-solid fa-stopwatch text-white/70 text-xs mb-0.5"></i>
                  <p className="text-base font-black text-white">{formatTime(finalTimeDisplay)}</p>
                  <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">সময়</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                  <i className="fa-solid fa-bolt text-white/70 text-xs mb-0.5"></i>
                  <p className="text-base font-black text-white">{e2b(maxCombo)}</p>
                  <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">সেরা কম্বো</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                  <i className="fa-solid fa-xmark text-white/70 text-xs mb-0.5"></i>
                  <p className="text-base font-black text-white">{e2b(wrongTaps)}</p>
                  <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">ভুল</p>
                </div>
              </div>

              {/* 🔴 Score Breakdown (NEW) */}
              {scoreBreakdown && <ScoreBreakdown breakdown={scoreBreakdown} />}

              {renderSaveStatus()}

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      gameEndedRef.current = false;
                      setPhase("menu");
                    }}
                    className="flex-1 py-3 bg-white/20 text-white font-black rounded-xl border border-white/30 text-xs"
                  >
                    <i className="fa-solid fa-rotate-left mr-1.5"></i> আবার খেলুন
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="flex-1 py-3 bg-white/20 text-white font-black rounded-xl border border-white/30 text-xs"
                  >
                    <i className="fa-solid fa-trophy mr-1.5"></i> লিডারবোর্ড
                  </button>
                </div>
                <Link
                  href="/my-bangladesh/games"
                  className="w-full py-3 bg-white text-gray-900 font-black rounded-xl text-center text-xs"
                >
                  <i className="fa-solid fa-home mr-1.5"></i> গেম হাব
                </Link>
              </div>
            </div>
          </div>
        </div>
        {showLeaderboard && (
          <LeaderboardModal
            onClose={() => setShowLeaderboard(false)}
            currentUserId={user?.id}
            initialDifficulty={difficulty?.id}
          />
        )}
      </div>
    );
  }

  // ============ RENDER: PLAYING ============
  return (
    <div
      key="playing"
      className="h-screen overflow-hidden bg-gray-50 dark:bg-[#050b08] font-sans flex flex-col"
    >
      {/* HEADER */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (window.confirm("গেম থেকে বের হয়ে যাবেন?")) {
                gameEndedRef.current = false;
                setPhase("menu");
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm ${difficulty?.timer && timeLeft !== null && timeLeft < 30 ? "bg-red-100 dark:bg-red-500/20 text-red-600 animate-pulse" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`}>
              <i className="fa-solid fa-stopwatch text-xs"></i>
              <span>{difficulty?.timer ? formatTime(Math.max(timeLeft || 0, 0)) : formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-sm">
              <i className="fa-solid fa-star text-xs"></i>
              <span>{e2b(score)}</span>
            </div>
            {combo >= 3 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm animate-pulse">
                <i className="fa-solid fa-bolt text-xs"></i>
                <span>×{combo >= 5 ? "২" : "১.৫"}</span>
              </div>
            )}
          </div>
          <div className="w-16 sm:w-28 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* MAP */}
      <div ref={mapWrapRef} className="flex-1 relative bg-gray-100 dark:bg-[#0a0d12] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%]" style={{ background: "radial-gradient(circle at center, rgba(168,85,247,0.08) 0%, transparent 60%)" }}></div>
        </div>

        {projection && pathGen && allDistricts && (
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${mapDims.w} ${mapDims.h}`} preserveAspectRatio="xMidYMid meet">
            {/* LAYER 1: Background */}
            {allDistricts.map((geo) => {
              if (targetUidsSet.has(geo._uid)) return null;
              return (
                <path key={`bg-${geo._uid}`} d={pathGen(geo)} fill="#cbd5e1" stroke="rgba(148,163,184,0.5)" strokeWidth={0.4} opacity={0.5} style={{ pointerEvents: "none" }} />
              );
            })}

            {/* LAYER 2: Target slots */}
            {gamePieces.map((piece) => {
              if (placed.has(piece.uid)) return null;
              const color = getColorByRawName(piece.rawName);
              return (
                <path key={`slot-${piece.uid}`} d={pathGen(piece.geo)} fill={`${color}20`} stroke={color} strokeWidth={0.9} strokeDasharray="3 2" opacity={0.85} style={{ pointerEvents: "none" }} />
              );
            })}

            {/* LAYER 3: Placed */}
            {gamePieces.map((piece) => {
              if (!placed.has(piece.uid)) return null;
              const color = getColorByRawName(piece.rawName);
              return (
                <path key={`placed-${piece.uid}`} d={pathGen(piece.geo)} fill={color} stroke="#ffffff" strokeWidth={1} strokeLinejoin="round" style={{ transition: "fill 0.4s ease", filter: `drop-shadow(0 0 4px ${color}80)` }} />
              );
            })}

            {snapFlash && (
              <circle cx={snapFlash.x} cy={snapFlash.y} r={30} fill="none" stroke={snapFlash.perfect ? "#fbbf24" : "#10b981"} strokeWidth={3} opacity={0.9} style={{ animation: "snapRing 0.7s ease-out forwards" }} />
            )}
          </svg>
        )}

        {toast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full font-black text-sm shadow-lg backdrop-blur-md border animate-[fadeInOut_0.9s_ease-out]"
            style={{
              background: toast.type === "wrong" ? "rgba(239,68,68,0.95)" : toast.type === "perfect" ? "rgba(251,191,36,0.95)" : "rgba(16,185,129,0.95)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)"
            }}
          >
            {toast.text}
          </div>
        )}

        {progressPct === 0 && elapsed > 15 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full pointer-events-none">
            <i className="fa-solid fa-lightbulb text-amber-400 mr-1.5"></i>
            ম্যাপে dashed slot দেখুন — সেখানে টুকরা ছাড়ুন
          </div>
        )}
      </div>

      {/* TRAY */}
      <div className="shrink-0 h-44 sm:h-48 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            <i className="fa-solid fa-hand-pointer mr-1 text-purple-500"></i>
            টুকরা টেনে ম্যাপে ছাড়ুন
          </p>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400">{e2b(unplacedPieces.length)} বাকি</p>
        </div>

        <div className="h-[calc(100%-36px)] overflow-y-auto px-3 py-2">
          {unplacedPieces.length === 0 ? (
            <div className="flex items-center justify-center h-full text-emerald-500">
              <i className="fa-solid fa-check-circle text-2xl mr-2"></i>
              <span className="font-black">সব জেলা বসানো হয়েছে!</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {unplacedPieces.map((piece) => {
                const color = getColorByRawName(piece.rawName);
                return (
                  <div
                    key={piece.uid}
                    onPointerDown={(e) => handlePointerDown(e, piece)}
                    className="touch-none select-none cursor-grab active:cursor-grabbing flex flex-col items-center p-1 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:scale-105 transition-all"
                    style={{ touchAction: "none" }}
                  >
                    <DistrictPiece geo={piece.geo} size={44} fill={color} />
                    <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 mt-0.5 truncate max-w-full">
                      {piece.bnName}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DRAG OVERLAY */}
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
            geo={dragging.piece.geo}
            size={64}
            fill={getColorByRawName(dragging.piece.rawName)}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes snapRing {
          0% { opacity: 1; r: 30; }
          100% { opacity: 0; r: 55; }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          20%, 80% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      `}</style>
    </div>
  );
}
