"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import * as topojson from "topojson-client";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";

const geoUrl = "/bd-districts.topo.json";
const QUESTION_TIME = 10; // 🔴 প্রতি প্রশ্নে ১০ সেকেন্ড

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
// NAME NORMALIZATION
// ============================================
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

const getNormalizedName = (raw) => standardMap[raw] || raw;
const getBnName = (raw) => {
  const n = getNormalizedName(raw);
  return districtBn[n] || n;
};

// ============================================
// DIFFICULTY DATA
// ============================================
const easyDistricts = [
  "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet",
  "Barishal", "Rangpur", "Mymensingh", "Bogura", "Cumilla",
  "Narayanganj", "Gazipur", "Cox's Bazar", "Jashore",
  "Dinajpur", "Pabna", "Tangail", "Faridpur", "Noakhali", "Jamalpur",
];

const mediumDistricts = easyDistricts.concat([
  "Bagerhat", "Barguna", "Bhola", "Chandpur", "Chuadanga",
  "Feni", "Gopalganj", "Habiganj", "Jhenaidah", "Kishoreganj",
  "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat",
  "Madaripur", "Magura", "Manikganj", "Moulvibazar",
  "Munshiganj", "Naogaon", "Narail", "Narsingdi", "Natore",
  "Netrokona", "Nilphamari", "Patuakhali", "Pirojpur",
  "Rajbari", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
  "Sunamganj", "Thakurgaon",
]);

const difficulties = [
  {
    id: "easy",
    title: "সহজ",
    subtitle: "১০ প্রশ্ন • ১০ সেকেন্ড/প্রশ্ন",
    description: "পরিচিত বড় জেলা দিয়ে শুরু",
    icon: "fa-solid fa-seedling",
    gradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/30",
    totalQuestions: 10,
    districts: easyDistricts,
  },
  {
    id: "medium",
    title: "মাঝারি",
    subtitle: "১৫ প্রশ্ন • ১০ সেকেন্ড/প্রশ্ন",
    description: "সব ধরনের জেলা, তাড়াহুড়ো আছে",
    icon: "fa-solid fa-fire",
    gradient: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/30",
    totalQuestions: 15,
    districts: mediumDistricts,
  },
  {
    id: "hard",
    title: "কঠিন",
    subtitle: "২০ প্রশ্ন • ১০ সেকেন্ড/প্রশ্ন",
    description: "ছোট জেলাও আছে — চরম চ্যালেঞ্জ",
    icon: "fa-solid fa-skull",
    gradient: "from-red-500 to-pink-500",
    shadow: "shadow-red-500/30",
    totalQuestions: 20,
    districts: null,
  },
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
  correct: () => {
    playTone(800, 0.12, "sine", 0.13);
    playTone(1200, 0.2, "sine", 0.11, 0.07);
  },
  wrong: () => {
    playTone(180, 0.25, "sawtooth", 0.09);
  },
  countdown: () => {
    playTone(700, 0.1, "sine", 0.1);
  },
  go: () => {
    playTone(900, 0.15, "sine", 0.14);
    playTone(1300, 0.3, "sine", 0.12, 0.1);
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
  timeout: () => {
    playTone(300, 0.15, "sawtooth", 0.09);
    playTone(200, 0.25, "sawtooth", 0.08, 0.1);
  },
};

// ============================================
// MEMOIZED GEOGRAPHY (Highlight target district)
// ============================================
const MemoizedGeography = ({ geo, isTarget, onClick }) => {
  let fill = "#cbd5e1";
  let stroke = "rgba(148,163,184,0.4)";
  let strokeWidth = 0.5;
  let filter = "none";

  if (isTarget) {
    fill = "#10b981";
    stroke = "#ffffff";
    strokeWidth = 1.5;
    filter = "drop-shadow(0 0 8px rgba(16,185,129,0.9))";
  }

  return (
    <Geography
      geography={geo}
      onClick={onClick}
      style={{
        default: {
          fill,
          outline: "none",
          stroke,
          strokeWidth,
          transition: "fill 0.3s ease, stroke 0.3s ease",
          filter,
          cursor: "default",
        },
        hover: {
          fill: isTarget ? "#10b981" : "#94a3b8",
          outline: "none",
          stroke: isTarget ? "#ffffff" : "#cbd5e1",
          strokeWidth: isTarget ? 1.5 : 0.8,
          filter,
        },
        pressed: { outline: "none" },
      }}
    />
  );
};

// ============================================
// LEADERBOARD MODAL
// ============================================
function LeaderboardModal({ onClose, currentUserId, initialDifficulty }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDifficulty, setActiveDifficulty] = useState(
    initialDifficulty || null
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("game_scores")
          .select(
            "id, score, time_seconds, wrong_taps, difficulty, user_id, profiles:user_id(full_name, photo_url)"
          )
          .eq("game_mode", "quiz")
          .order("score", { ascending: false })
          .order("time_seconds", { ascending: true })
          .order("wrong_taps", { ascending: true })
          .limit(50);

        if (activeDifficulty) {
          query = query.eq("difficulty", activeDifficulty);
        }

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
    if (rank === 1)
      return "bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border-yellow-400/50";
    if (rank === 2)
      return "bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300/50";
    if (rank === 3)
      return "bg-gradient-to-r from-amber-600/20 to-orange-700/20 border-amber-600/50";
    return "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-trophy text-amber-500"></i>
              টপ ৫০ লিডারবোর্ড
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              জেলা কুইজ
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark text-gray-600 dark:text-gray-300"></i>
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveDifficulty(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeDifficulty === null
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            সব
          </button>
          {difficulties.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDifficulty(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeDifficulty === d.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {d.title}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-10">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-500"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                লোড হচ্ছে...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10">
              <i className="fa-solid fa-inbox text-3xl text-gray-300 dark:text-gray-600"></i>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                এখনো কোনো স্কোর নেই
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                প্রথম হওয়ার সুযোগ নিন!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((entry, idx) => {
                const rank = idx + 1;
                const isMe = entry.user_id === currentUserId;
                const profile = entry.profiles || {};
                const name = profile.full_name || "Explorer";
                const avatar =
                  profile.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    name
                  )}&background=10b981&color=fff`;
                const medal = getMedalIcon(rank);

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all ${getRankStyle(
                      rank
                    )} ${
                      isMe
                        ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-900"
                        : ""
                    }`}
                  >
                    <div className="w-8 shrink-0 text-center">
                      {medal ? (
                        <i className={`fa-solid ${medal} text-lg`}></i>
                      ) : (
                        <span className="text-sm font-black text-gray-500 dark:text-gray-400">
                          {e2b(rank)}
                        </span>
                      )}
                    </div>

                    <img
                      src={avatar}
                      alt={name}
                      className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-700 shrink-0 object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                        {name}
                        {isMe && (
                          <span className="ml-1.5 text-[9px] text-emerald-500 font-bold">
                            (আপনি)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-500 dark:text-gray-400 font-bold">
                        <span className="uppercase">
                          {entry.difficulty === "easy"
                            ? "সহজ"
                            : entry.difficulty === "medium"
                            ? "মাঝারি"
                            : "কঠিন"}
                        </span>
                        <span>•</span>
                        <span>
                          <i className="fa-solid fa-stopwatch mr-0.5"></i>
                          {formatTime(entry.time_seconds)}
                        </span>
                        <span>•</span>
                        <span>
                          <i className="fa-solid fa-xmark mr-0.5"></i>
                          {e2b(entry.wrong_taps)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {e2b(entry.score)}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        পয়েন্ট
                      </p>
                    </div>
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
export default function QuizPage() {
  const [phase, setPhase] = useState("menu");
  const [difficulty, setDifficulty] = useState(null);
  const [allDistricts, setAllDistricts] = useState(null);

  // 🔴 Question queue: [{ uid, name, bnName, options: [4 names] }]
  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // 🔴 Per-question timer
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [tapLocked, setTapLocked] = useState(false);
  const [toast, setToast] = useState(null);

  const [countdownValue, setCountdownValue] = useState(3);

  const [finalScoreDisplay, setFinalScoreDisplay] = useState(0);
  const [finalTimeDisplay, setFinalTimeDisplay] = useState(0);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [finalWrong, setFinalWrong] = useState(0);
  const [finalMaxCombo, setFinalMaxCombo] = useState(0);
  const [wasWin, setWasWin] = useState(false);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [scoreSubmitStatus, setScoreSubmitStatus] = useState("idle");
  const [userRank, setUserRank] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Refs for stale closure prevention
  const stateRef = useRef({});
  stateRef.current = {
    score,
    correctCount,
    wrongCount,
    maxCombo,
    difficulty,
    startTime,
    questionQueue,
    user,
  };

  const gameEndedRef = useRef(false);

  // ============ AUTH CHECK ============
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
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

        // Attach _uid and _rawName
        const enriched = features.map((f, i) => ({
          ...f,
          _uid: i,
          _rawName: extractRawName(f),
        }));

        setAllDistricts(enriched);
      } catch (e) {
        console.error("Load failed:", e);
      }
    })();
  }, []);

  // ============ COUNTDOWN ============
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownValue <= 0) {
      sounds.go();
      setPhase("playing");
      setStartTime(Date.now());
      return;
    }
    sounds.countdown();
    const t = setTimeout(() => setCountdownValue((v) => v - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdownValue]);

  // ============ SUBMIT SCORE ============
  const submitScoreToSupabase = useCallback(async (payload) => {
    const currentUser = stateRef.current.user;
    if (!currentUser) {
      setScoreSubmitStatus("not_logged_in");
      return;
    }
    setScoreSubmitStatus("pending");

    try {
      const { data, error } = await supabase.rpc("submit_game_score", {
        p_game_mode: "quiz",
        p_difficulty: payload.difficulty,
        p_score: payload.score,
        p_time_seconds: payload.timeSeconds,
        p_wrong_taps: payload.wrongTaps,
        p_max_combo: payload.maxCombo,
        p_accuracy: payload.accuracy,
        p_xp: payload.xp,
      });

      if (error) {
        console.error("Score submit failed:", error);
        setScoreSubmitStatus("error");
        return;
      }

      if (data?.saved) {
        setScoreSubmitStatus("saved");
        setUserRank(data.rank || null);
      } else if (data?.qualified === false) {
        setScoreSubmitStatus("not_qualified");
      } else if (data?.saved === false && data?.qualified) {
        setScoreSubmitStatus("existing_better");
        setUserRank(data.rank || null);
      } else {
        setScoreSubmitStatus("error");
      }

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
        } catch (e) {
          console.warn("XP update failed:", e);
        }
      }
    } catch (e) {
      console.error("Submit error:", e);
      setScoreSubmitStatus("error");
    }
  }, []);

  // ============ END GAME ============
  const endGame = useCallback(
    (won = true) => {
      if (gameEndedRef.current) return;
      gameEndedRef.current = true;

      try {
        const {
          startTime: st,
          difficulty: df,
          score: sc,
          correctCount: cc,
          wrongCount: wc,
          maxCombo: mc,
        } = stateRef.current;

        if (!st || !df) {
          setFinalScoreDisplay(0);
          setFinalTimeDisplay(0);
          setFinalCorrect(0);
          setFinalWrong(0);
          setFinalMaxCombo(0);
          setWasWin(false);
          setTimeout(() => setPhase("result"), 30);
          return;
        }

        const finalTime = Math.max(0, Math.floor((Date.now() - st) / 1000));

        const baseScore = cc * 100 - wc * 20;
        const perfectBonus = won && wc === 0 ? 200 : 0;
        const finalScore = Math.max(0, baseScore + perfectBonus);

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
                [`quiz-${df.id}`]: Math.max(
                  finalScore,
                  stats.bestScores?.[`quiz-${df.id}`] || 0
                ),
              },
            })
          );
        } catch (e) {
          console.warn("localStorage save failed:", e);
        }

        if (won) sounds.win();
        else sounds.lose();

        setFinalScoreDisplay(finalScore);
        setFinalTimeDisplay(finalTime);
        setFinalCorrect(cc);
        setFinalWrong(wc);
        setFinalMaxCombo(mc);
        setWasWin(won);

        setTimeout(() => {
          setPhase("result");
        }, 50);

        const xpGain = Math.round(finalScore / 10) + 50;
        const accuracy =
          cc + wc > 0 ? Math.round((cc / (cc + wc)) * 100 * 100) / 100 : 0;

        setTimeout(() => {
          try {
            submitScoreToSupabase({
              difficulty: df.id,
              score: finalScore,
              timeSeconds: finalTime,
              wrongTaps: wc,
              maxCombo: mc,
              accuracy,
              xp: xpGain,
            });
          } catch (e) {
            console.warn("submit failed:", e);
          }
        }, 300);
      } catch (err) {
        console.error("[Quiz] endGame error:", err);
        setFinalScoreDisplay(0);
        setFinalTimeDisplay(0);
        setFinalCorrect(0);
        setFinalWrong(0);
        setFinalMaxCombo(0);
        setWasWin(false);
        setPhase("result");
      }
    },
    [submitScoreToSupabase]
  );

  // ============ TOTAL ELAPSED TIMER ============
  useEffect(() => {
    if (phase !== "playing" || !startTime) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(el);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, startTime]);

  // ============ PER-QUESTION TIMER ============
  useEffect(() => {
    if (phase !== "playing") return;
    if (tapLocked) return;
    if (questionTimeLeft <= 0) return;
    if (currentIndex >= questionQueue.length) return;

    // Play tick in last 3 seconds
    if (questionTimeLeft <= 3) sounds.tick();

    const t = setTimeout(() => {
      setQuestionTimeLeft((v) => v - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [phase, questionTimeLeft, tapLocked, currentIndex, questionQueue.length]);

  // ============ TIME UP HANDLER ============
  useEffect(() => {
    if (phase !== "playing") return;
    if (tapLocked) return;
    if (questionTimeLeft > 0) return;
    if (currentIndex >= questionQueue.length) return;

    // Time's up — count as wrong
    setTapLocked(true);
    sounds.timeout();
    setWrongCount((w) => w + 1);
    setCombo(0);
    setScore((s) => Math.max(0, s - 20));
    setSelectedAnswer("__timeout__");
    setShowResult(true);
    setToast({ text: "⏰ সময় শেষ!", type: "wrong" });

    setTimeout(() => {
      setToast(null);
      const nextIdx = currentIndex + 1;
      if (nextIdx >= questionQueue.length) {
        endGame(true);
      } else {
        setCurrentIndex(nextIdx);
        setQuestionTimeLeft(QUESTION_TIME);
        setSelectedAnswer(null);
        setShowResult(false);
        setTapLocked(false);
      }
    }, 1200);
  }, [
    phase,
    questionTimeLeft,
    tapLocked,
    currentIndex,
    questionQueue.length,
    endGame,
  ]);

  // ============ START GAME ============
  const startGame = (diff) => {
    if (!allDistricts) return;
    gameEndedRef.current = false;
    setDifficulty(diff);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setCombo(0);
    setMaxCombo(0);
    setElapsed(0);
    setCurrentIndex(0);
    setCountdownValue(3);
    setScoreSubmitStatus("idle");
    setUserRank(null);
    setSelectedAnswer(null);
    setShowResult(false);
    setTapLocked(false);
    setQuestionTimeLeft(QUESTION_TIME);

    // Build pool
    const pool = diff.districts
      ? allDistricts.filter((g) => {
          const normalized = getNormalizedName(g._rawName);
          return diff.districts.includes(normalized);
        })
      : allDistricts;

    const shuffledPool = shuffle(pool);
    const selected = shuffledPool.slice(0, diff.totalQuestions);

    // 🔴 Build question queue with 4 options per question
    const queue = selected.map((correctGeo) => {
      const correctName = getNormalizedName(correctGeo._rawName);
      const correctBn = districtBn[correctName] || correctName;

      // Pick 3 distractors from the same pool (excluding correct answer)
      const distractorPool = pool.filter(
        (g) => g._uid !== correctGeo._uid
      );
      const shuffledDistractors = shuffle(distractorPool);
      const distractors = shuffledDistractors.slice(0, 3).map((g) => {
        const n = getNormalizedName(g._rawName);
        return {
          name: n,
          bnName: districtBn[n] || n,
        };
      });

      // Combine + shuffle 4 options
      const options = shuffle([
        { name: correctName, bnName: correctBn, isCorrect: true },
        ...distractors.map((d) => ({ ...d, isCorrect: false })),
      ]);

      return {
        uid: correctGeo._uid,
        name: correctName,
        bnName: correctBn,
        options,
      };
    });

    setQuestionQueue(queue);
    setPhase("countdown");
  };

  // ============ HANDLE ANSWER ============
  const handleAnswer = useCallback(
    (option) => {
      if (phase !== "playing") return;
      if (tapLocked) return;
      if (currentIndex >= questionQueue.length) return;

      const currentQ = questionQueue[currentIndex];
      if (!currentQ) return;

      setTapLocked(true);
      setSelectedAnswer(option.name);
      setShowResult(true);

      if (option.isCorrect) {
        // ✅ CORRECT
        sounds.correct();
        const newCombo = combo + 1;
        let points = 100;
        let multiplier = 1;
        if (newCombo >= 5) multiplier = 2;
        else if (newCombo >= 3) multiplier = 1.5;
        points = Math.round(points * multiplier);

        setScore((s) => s + points);
        setCorrectCount((c) => c + 1);
        setCombo(newCombo);
        setMaxCombo((m) => Math.max(m, newCombo));

        setToast({
          text: `+${e2b(points)}${multiplier > 1 ? ` (×${multiplier})` : ""}`,
          type: "correct",
        });
      } else {
        // ❌ WRONG
        sounds.wrong();
        setWrongCount((w) => w + 1);
        setCombo(0);
        setScore((s) => Math.max(0, s - 20));
        setToast({ text: "✗ ভুল", type: "wrong" });
      }

      // Advance to next question
      setTimeout(() => {
        setToast(null);
        const nextIdx = currentIndex + 1;
        if (nextIdx >= questionQueue.length) {
          endGame(true);
        } else {
          setCurrentIndex(nextIdx);
          setQuestionTimeLeft(QUESTION_TIME);
          setSelectedAnswer(null);
          setShowResult(false);
          setTapLocked(false);
        }
      }, 1200);
    },
    [phase, tapLocked, currentIndex, questionQueue, combo, endGame]
  );

  // ============ CURRENT QUESTION ============
  const currentQuestion =
    phase === "playing" && currentIndex < questionQueue.length
      ? questionQueue[currentIndex]
      : null;

  const progressPct =
    questionQueue.length > 0
      ? Math.round((currentIndex / questionQueue.length) * 100)
      : 0;

  // ============ RENDER: MENU ============
  if (phase === "menu") {
    return (
      <div
        key="menu"
        className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/my-bangladesh/games"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold text-sm transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i> গেম হাব
            </Link>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <i className="fa-solid fa-trophy"></i>
              লিডারবোর্ড
            </button>
          </div>

          <div className="text-center mb-10" data-aos="fade-down">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 shadow-2xl mb-5">
              <i className="fa-solid fa-circle-question text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
              জেলা কুইজ
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              ম্যাপে highlight করা জেলার সঠিক নাম বেছে নিন। প্রতি প্রশ্নে ১০ সেকেন্ড সময়!
            </p>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
            data-aos="fade-up"
          >
            {difficulties.map((diff, idx) => (
              <button
                key={diff.id}
                onClick={() => startGame(diff)}
                disabled={!allDistricts}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
                className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${diff.gradient} p-7 shadow-xl ${diff.shadow} hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 text-left disabled:opacity-50 disabled:cursor-wait`}
              >
                <div className="absolute -top-20 -right-20 w-44 h-44 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors"></div>
                <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-black/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 border border-white/30 group-hover:scale-110 transition-transform">
                    <i className={`${diff.icon} text-white text-2xl`}></i>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-1">
                    {diff.title}
                  </h3>
                  <p className="text-white/85 text-sm font-bold mb-3">
                    {diff.subtitle}
                  </p>
                  <p className="text-white/70 text-xs mb-5">
                    {diff.description}
                  </p>
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                    শুরু করুন
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!allDistricts && (
            <div className="mt-8 text-center">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-emerald-500"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                ম্যাপ লোড হচ্ছে...
              </p>
            </div>
          )}

          {!authLoading && !user && (
            <div className="mt-8 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-4 rounded-2xl flex items-start gap-3">
              <i className="fa-solid fa-circle-info text-blue-500 text-lg mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                  গেস্ট হিসেবে খেলছেন
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                  স্কোর সেভ করতে ও লিডারবোর্ডে জায়গা পেতে লগইন করুন।
                </p>
                <Link
                  href="/login?redirect=/my-bangladesh/games/quiz"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-lg transition-colors"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  লগইন
                </Link>
              </div>
            </div>
          )}

          <div className="mt-10 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-emerald-500"></i>
              খেলার নিয়ম
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                ম্যাপে একটা জেলা <b>সবুজ রঙে</b> highlight হবে
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                নিচে ৪টি অপশন দেখাবে — ১০ সেকেন্ডের মধ্যে সঠিকটা বেছে নিন
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-emerald-500 mt-1 text-xs"></i>
                সঠিক উত্তর: <b>+১০০ পয়েন্ট</b>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-xmark text-red-500 mt-1 text-xs"></i>
                ভুল / টাইমআউট: <b>−২০ পয়েন্ট</b>, combo রিসেট
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-bolt text-amber-500 mt-1 text-xs"></i>
                টানা ৩টি সঠিক: <b>×১.৫</b>, টানা ৫টি: <b>×২</b>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-crown text-yellow-500 mt-1 text-xs"></i>
                কোনো ভুল না করলে <b>+২০০ পারফেক্ট বোনাস</b>
              </li>
            </ul>
          </div>
        </div>

        {showLeaderboard && (
          <LeaderboardModal
            onClose={() => setShowLeaderboard(false)}
            currentUserId={user?.id}
            initialDifficulty={null}
          />
        )}
      </div>
    );
  }

  // ============ RENDER: COUNTDOWN ============
  if (phase === "countdown") {
    return (
      <div
        key="countdown"
        className="h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500"
      >
        <div className="text-center">
          {countdownValue > 0 ? (
            <div
              key={countdownValue}
              className="text-white font-black"
              style={{
                fontSize: "clamp(120px, 30vw, 240px)",
                lineHeight: 1,
                animation: "countPulse 0.8s ease-out",
                textShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}
            >
              {e2b(countdownValue)}
            </div>
          ) : (
            <div
              className="text-white font-black"
              style={{
                fontSize: "clamp(60px, 15vw, 120px)",
                lineHeight: 1,
                animation: "countPulse 0.5s ease-out",
                textShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}
            >
              শুরু!
            </div>
          )}
          <p className="text-white/80 text-sm font-bold mt-6 tracking-widest uppercase">
            প্রস্তুত হোন...
          </p>
        </div>
        <style jsx>{`
          @keyframes countPulse {
            0% {
              transform: scale(0.5);
              opacity: 0;
            }
            40% {
              transform: scale(1.15);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  // ============ RENDER: RESULT ============
  if (phase === "result") {
    const won = wasWin;
    const xpGained = Math.round(finalScoreDisplay / 10) + 50;

    const renderSaveStatus = () => {
      if (scoreSubmitStatus === "pending") {
        return (
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/20 flex items-center justify-center gap-2">
            <i className="fa-solid fa-spinner fa-spin text-white/90 text-sm"></i>
            <span className="text-xs font-bold text-white/90">
              স্কোর সংরক্ষণ হচ্ছে...
            </span>
          </div>
        );
      }

      if (scoreSubmitStatus === "saved") {
        return (
          <div className="bg-gradient-to-r from-yellow-400/30 to-amber-500/30 backdrop-blur-sm rounded-xl p-3 mb-4 border border-yellow-300/50">
            <div className="flex items-center justify-center gap-2">
              <i className="fa-solid fa-trophy text-yellow-300 text-lg"></i>
              <div className="text-left">
                <p className="text-xs font-black text-white">
                  লিডারবোর্ডে #{e2b(userRank || 0)} হয়েছেন!
                </p>
                <p className="text-[9px] text-white/80 font-bold">
                  স্কোর সফলভাবে সংরক্ষিত হয়েছে
                </p>
              </div>
            </div>
          </div>
        );
      }

      if (scoreSubmitStatus === "not_qualified") {
        return (
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/20">
            <p className="text-xs font-bold text-white/90 text-center">
              <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
              টপ ৫০-এ জায়গা হয়নি — আরো চেষ্টা করুন!
            </p>
          </div>
        );
      }

      if (scoreSubmitStatus === "existing_better") {
        return (
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/20">
            <p className="text-xs font-bold text-white/90 text-center">
              <i className="fa-solid fa-crown mr-1.5 text-yellow-300"></i>
              আপনার আগের স্কোর-ই সেরা — #{e2b(userRank || 0)}
            </p>
          </div>
        );
      }

      if (scoreSubmitStatus === "not_logged_in") {
        return (
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/25">
            <p className="text-xs font-bold text-white/95 mb-2 text-center">
              <i className="fa-solid fa-lock mr-1.5"></i>
              স্কোর সেভ করতে লগইন করুন
            </p>
            <Link
              href="/login?redirect=/my-bangladesh/games/quiz"
              className="block w-full py-2.5 bg-white text-gray-900 font-black rounded-lg text-xs text-center hover:shadow-lg transition-all"
            >
              <i className="fa-solid fa-right-to-bracket mr-1.5"></i>
              লগইন / রেজিস্টার
            </Link>
          </div>
        );
      }

      if (scoreSubmitStatus === "error") {
        return (
          <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-3 mb-4 border border-red-300/30">
            <p className="text-xs font-bold text-white/90 text-center">
              <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
              স্কোর সেভ করা যায়নি
            </p>
          </div>
        );
      }

      return null;
    };

    return (
      <div
        key="result"
        className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center"
      >
        <div className="max-w-xl w-full">
          <div
            className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl text-center ${
              won
                ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500"
                : "bg-gradient-to-br from-red-500 via-pink-500 to-orange-500"
            }`}
            data-aos="zoom-in"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-black/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 mb-4">
                <i
                  className={`fa-solid ${
                    won ? "fa-crown" : "fa-clock"
                  } text-white text-3xl`}
                ></i>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                {won ? "অভিনন্দন!" : "সময় শেষ!"}
              </h1>
              <p className="text-white/85 text-xs font-bold mb-5">
                {won
                  ? `আপনি ${e2b(finalCorrect)}টি সঠিক উত্তর দিয়েছেন 🎉`
                  : `${e2b(finalCorrect)}/${e2b(
                      difficulty?.totalQuestions || 0
                    )} সঠিক উত্তর`}
              </p>

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

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                  <i className="fa-solid fa-stopwatch text-white/70 text-xs mb-0.5"></i>
                  <p className="text-base font-black text-white">
                    {formatTime(finalTimeDisplay)}
                  </p>
                  <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">
                    সময়
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                  <i className="fa-solid fa-check text-white/70 text-xs mb-0.5"></i>
                  <p className="text-base font-black text-white">
                    {e2b(finalCorrect)}
                  </p>
                  <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">
                    সঠিক
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                  <i className="fa-solid fa-xmark text-white/70 text-xs mb-0.5"></i>
                  <p className="text-base font-black text-white">
                    {e2b(finalWrong)}
                  </p>
                  <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider">
                    ভুল
                  </p>
                </div>
              </div>

              {renderSaveStatus()}

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      gameEndedRef.current = false;
                      setPhase("menu");
                    }}
                    className="flex-1 py-3 bg-white/20 backdrop-blur-sm text-white font-black rounded-xl border border-white/30 hover:bg-white/30 transition-all text-xs"
                  >
                    <i className="fa-solid fa-rotate-left mr-1.5"></i>
                    আবার খেলুন
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="flex-1 py-3 bg-white/20 backdrop-blur-sm text-white font-black rounded-xl border border-white/30 hover:bg-white/30 transition-all text-xs"
                  >
                    <i className="fa-solid fa-trophy mr-1.5"></i>
                    লিডারবোর্ড
                  </button>
                </div>
                <Link
                  href="/my-bangladesh/games"
                  className="w-full py-3 bg-white text-gray-900 font-black rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all text-center text-xs"
                >
                  <i className="fa-solid fa-home mr-1.5"></i>
                  গেম হাব
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
  const timeWarning = questionTimeLeft <= 3 && questionTimeLeft > 0;
  const questionProgress = questionQueue.length
    ? Math.round(((currentIndex + 1) / questionQueue.length) * 100)
    : 0;

  return (
    <div
      key="playing"
      className="h-screen overflow-hidden bg-gray-50 dark:bg-[#050b08] font-sans flex flex-col"
    >
      {/* HEADER */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (window.confirm("গেম থেকে বের হয়ে যাবেন?")) {
                gameEndedRef.current = false;
                setPhase("menu");
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shrink-0">
              <i className="fa-solid fa-star text-[10px] sm:text-xs"></i>
              <span>{e2b(score)}</span>
            </div>

            {combo >= 3 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-md animate-pulse shrink-0">
                <i className="fa-solid fa-bolt text-[10px]"></i>
                <span>×{combo >= 5 ? "২" : "১.৫"}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {e2b(currentIndex + 1)}/{e2b(questionQueue.length)}
            </span>
            <div className="w-12 sm:w-20 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${questionProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* PER-QUESTION TIMER BAR */}
      <div className="shrink-0 bg-white dark:bg-gray-900 px-3 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <i
            className={`fa-solid fa-stopwatch text-lg ${
              timeWarning
                ? "text-red-500 animate-pulse"
                : "text-emerald-500"
            }`}
          ></i>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                প্রতি প্রশ্নে সময়
              </span>
              <span
                className={`text-sm font-black ${
                  timeWarning
                    ? "text-red-500 animate-pulse"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {e2b(questionTimeLeft)}s
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timeWarning
                    ? "bg-gradient-to-r from-red-500 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
                }`}
                style={{
                  width: `${(questionTimeLeft / QUESTION_TIME) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* MAP */}
      <div className="flex-1 relative bg-gray-100 dark:bg-[#0a0d12] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(16,185,129,0.06) 0%, transparent 60%)",
            }}
          ></div>
        </div>

        {allDistricts && currentQuestion && (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 6500, center: [90.35, 23.8] }}
            className="w-full h-full outline-none"
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const raw = extractRawName(geo);
                  const normalized = getNormalizedName(raw);
                  // Find the corresponding enriched district to get _uid
                  const enriched = allDistricts.find(
                    (d) => getNormalizedName(d._rawName) === normalized
                  );
                  const uid = enriched?._uid;
                  const isTarget = uid === currentQuestion.uid;
                  return (
                    <MemoizedGeography
                      key={geo.rsmKey}
                      geo={geo}
                      isTarget={isTarget}
                      onClick={() => {}}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        )}

        {/* Toast */}
        {toast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full font-black text-sm shadow-lg backdrop-blur-md border animate-[fadeInOut_1.2s_ease-out]"
            style={{
              background:
                toast.type === "correct"
                  ? "rgba(16,185,129,0.95)"
                  : "rgba(239,68,68,0.95)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            {toast.text}
          </div>
        )}
      </div>

      {/* OPTIONS AREA */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 sm:px-6 py-3 sm:py-4">
        {currentQuestion && (
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">
              <i className="fa-solid fa-crosshairs mr-1 text-emerald-500"></i>
              এই জেলার নাম কী?
            </p>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {currentQuestion.options.map((opt) => {
                const isThisSelected = selectedAnswer === opt.name;
                const isCorrectAnswer = opt.isCorrect;

                let style =
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-emerald-400 hover:scale-[1.02]";

                if (showResult) {
                  if (isThisSelected && isCorrectAnswer) {
                    style =
                      "bg-emerald-500 border-emerald-400 text-white shadow-lg scale-[1.03]";
                  } else if (isThisSelected && !isCorrectAnswer) {
                    style =
                      "bg-red-500 border-red-400 text-white shadow-lg scale-[1.03]";
                  } else if (isCorrectAnswer) {
                    style =
                      "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400 text-emerald-700 dark:text-emerald-300";
                  } else {
                    style = "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={opt.name}
                    onClick={() => handleAnswer(opt)}
                    disabled={tapLocked}
                    className={`relative rounded-2xl px-3 sm:px-5 py-4 sm:py-5 border-2 font-black text-sm sm:text-lg transition-all duration-300 active:scale-95 disabled:cursor-not-allowed ${style}`}
                  >
                    <span className="block truncate">{opt.bnName}</span>
                    {showResult && isCorrectAnswer && (
                      <span className="absolute top-2 right-2">
                        <i className="fa-solid fa-check-circle text-white text-sm"></i>
                      </span>
                    )}
                    {showResult && isThisSelected && !isCorrectAnswer && (
                      <span className="absolute top-2 right-2">
                        <i className="fa-solid fa-times-circle text-white text-sm"></i>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          20%,
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
