'use client'

// ============================================================
// 🎮 ম্যাপ গেম লিডারবোর্ড — Map Game Leaderboard
// ------------------------------------------------------------
// ⚠️ এটি ক্যাম্পাস লিডারবোর্ড থেকে সম্পূর্ণ আলাদা পেজ।
//    - ক্যাম্পাস লিডারবোর্ড: /leaderboard (profiles + survival_iq)
//    - ম্যাপ গেম লিডারবোর্ড: /my-bangladesh/games/map-leaderboard (game_scores)
//    কোনো query, state বা function share করে না।
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

// ============================================
// HELPERS
// ============================================
const e2b = (num) => String(num ?? 0).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d])

const formatTime = (sec) => {
  const safe = Math.max(0, Math.floor(Number(sec) || 0))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${e2b(m.toString().padStart(2, '0'))}:${e2b(s.toString().padStart(2, '0'))}`
}

// ============================================
// GAME MODES & DIFFICULTIES
// ============================================
const gameModes = [
  {
    id: 'jigsaw',
    title: 'জিগস পাজল',
    shortTitle: 'জিগস',
    icon: 'fa-solid fa-puzzle-piece',
    activeClass:
      'bg-purple-500 text-white shadow-md dark:shadow-[0_0_15px_rgba(168,85,247,0.4)] sm:scale-105',
  },
  {
    id: 'tap-district',
    title: 'জেলা ট্যাপ',
    shortTitle: 'ট্যাপ',
    icon: 'fa-solid fa-hand-pointer',
    activeClass:
      'bg-orange-500 text-white shadow-md dark:shadow-[0_0_15px_rgba(249,115,22,0.4)] sm:scale-105',
  },
  {
    id: 'quiz',
    title: 'জেলা কুইজ',
    shortTitle: 'কুইজ',
    icon: 'fa-solid fa-circle-question',
    activeClass:
      'bg-emerald-500 text-white shadow-md dark:shadow-[0_0_15px_rgba(16,185,129,0.4)] sm:scale-105',
  },
  {
    id: 'shape',
    title: 'শেপ গেসার',
    shortTitle: 'শেপ',
    icon: 'fa-solid fa-shapes',
    activeClass:
      'bg-pink-500 text-white shadow-md dark:shadow-[0_0_15px_rgba(236,72,153,0.4)] sm:scale-105',
  },
]

const difficulties = [
  { id: 'easy', title: 'সহজ', icon: 'fa-solid fa-seedling' },
  { id: 'medium', title: 'মাঝারি', icon: 'fa-solid fa-fire' },
  { id: 'hard', title: 'কঠিন', icon: 'fa-solid fa-skull' },
]

// ============================================
// MAIN COMPONENT
// ============================================
export default function MapGameLeaderboardPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeMode, setActiveMode] = useState('jigsaw')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)

  const filterDropdownRef = useRef(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [activeMode, filterDifficulty])

  useEffect(() => {
    AOS.init({ once: true, offset: 50 })

    function handleClickOutside(event) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setIsFilterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('game_scores')
        .select(
          'id, score, time_seconds, wrong_taps, max_combo, accuracy, difficulty, user_id, created_at, profiles:user_id(full_name, photo_url)'
        )
        .eq('game_mode', activeMode)
        .order('score', { ascending: false })
        .order('time_seconds', { ascending: true })
        .order('wrong_taps', { ascending: true })
        .limit(50)

      if (filterDifficulty !== 'all') {
        query = query.eq('difficulty', filterDifficulty)
      }

      const { data, error } = await query

      if (error) {
        console.error('[MapGameLeaderboard] fetch error:', error)
        setLeaders([])
      } else {
        setLeaders(data || [])
      }
    } catch (e) {
      console.error('[MapGameLeaderboard] exception:', e)
      setLeaders([])
    }
    setLoading(false)
  }

  // ============================================
  // RANK STYLE
  // ============================================
  const getRankStyle = (index) => {
    if (index === 0)
      return {
        color: 'text-yellow-600 dark:text-yellow-400',
        innerBg: 'bg-yellow-50/95 dark:bg-moss/95',
        avatarBorder: 'border-yellow-400',
        shadow: 'shadow-md dark:shadow-[0_0_20px_rgba(250,204,21,0.3)]',
        icon: 'fa-trophy',
        label: 'চ্যাম্পিয়ন',
        isTop3: true,
        gradient: '#eab308',
      }
    if (index === 1)
      return {
        color: 'text-gray-600 dark:text-gray-400',
        innerBg: 'bg-gray-50/95 dark:bg-moss/95',
        avatarBorder: 'border-gray-400',
        shadow: 'shadow-md dark:shadow-[0_0_15px_rgba(209,213,219,0.2)]',
        icon: 'fa-medal',
        label: 'রানার-আপ',
        isTop3: true,
        gradient: '#9ca3af',
      }
    if (index === 2)
      return {
        color: 'text-amber-700 dark:text-amber-600',
        innerBg: 'bg-orange-50/95 dark:bg-moss/95',
        avatarBorder: 'border-amber-500',
        shadow: 'shadow-sm dark:shadow-[0_0_15px_rgba(217,119,6,0.2)]',
        icon: 'fa-award',
        label: 'তৃতীয় স্থান',
        isTop3: true,
        gradient: '#d97706',
      }
    return {
      color: 'text-emerald-600 dark:text-[#34d399]',
      bg: 'bg-white dark:bg-white/5',
      border: 'border-gray-200 dark:border-white/10',
      avatarBorder: 'border-gray-200 dark:border-white/10',
      shadow: 'shadow-sm dark:shadow-none',
      icon: 'fa-star',
      label: 'এক্সপ্লোরার',
      isTop3: false,
    }
  }

  const getDifficultyLabel = (diff) => {
    if (diff === 'easy') return 'সহজ'
    if (diff === 'medium') return 'মাঝারি'
    if (diff === 'hard') return 'কঠিন'
    return '—'
  }

  const getDifficultyBadgeClass = (diff) => {
    if (diff === 'easy')
      return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
    if (diff === 'medium')
      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
    if (diff === 'hard')
      return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
    return 'bg-gray-100 text-gray-500 border-gray-200'
  }

  const activeModeData = gameModes.find((m) => m.id === activeMode)
  const activeDifficultyData = difficulties.find(
    (d) => d.id === filterDifficulty
  )
  const hasActiveFilter = filterDifficulty !== 'all'

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-pastel-bg dark:bg-darkForest pt-24 pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <div className="max-w-4xl mx-auto">
        {/* BACK LINK */}
        <div className="mb-4">
          <Link
            href="/my-bangladesh/games"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold text-sm transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> ম্যাপ গেম হাব
          </Link>
        </div>

        {/* HEADER */}
        <div className="text-center mb-8 sm:mb-10 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-campfire/10 dark:bg-campfire/10 rounded-full blur-3xl pointer-events-none transition-colors"></div>
          <h1 className="text-3xl sm:text-6xl font-black text-gray-900 dark:text-white mb-2 sm:mb-4 tracking-tight relative z-10 drop-shadow-sm dark:drop-shadow-lg transition-colors">
            ম্যাপ গেম{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-campfire to-yellow-500">
              লিডারবোর্ড
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-lg relative z-10 max-w-2xl mx-auto transition-colors">
            চারটি ম্যাপ গেমের টপ ৫০ খেলোয়াড়। ক্যাটাগরি বেছে নিন এবং সেরাদের
            তালিকা দেখুন!
          </p>
        </div>

        {/* GAME MODE TABS + DIFFICULTY FILTER */}
        <div className="flex justify-center items-center gap-1.5 sm:gap-3 mb-8 sm:mb-10 relative z-20 w-full overflow-visible flex-wrap">
          {gameModes.map((mode) => {
            const isActive = activeMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                aria-label={`${mode.title} — ম্যাপ গেম লিডারবোর্ড`}
                className={`px-3 sm:px-5 py-2 sm:py-3 rounded-full font-bold text-[10px] sm:text-sm transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  isActive
                    ? mode.activeClass
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                }`}
              >
                <i className={mode.icon}></i>
                <span className="hidden sm:inline">{mode.title}</span>
                <span className="sm:hidden">{mode.shortTitle}</span>
              </button>
            )
          })}

          {/* Difficulty Filter Dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              aria-label="ডিফিকাল্টি ফিল্টার"
              className={`px-3 sm:px-5 py-2 sm:py-3 rounded-full font-bold text-[10px] sm:text-sm transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                hasActiveFilter
                  ? 'bg-blue-500 text-white shadow-md dark:shadow-[0_0_15px_rgba(59,130,246,0.4)] sm:scale-105'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
              }`}
            >
              <i className="fa-solid fa-filter"></i>
              <span className="hidden sm:inline">
                {hasActiveFilter && activeDifficultyData
                  ? activeDifficultyData.title
                  : 'ফিল্টার'}
              </span>
              <i
                className={`fa-solid fa-chevron-down text-[8px] sm:text-xs transition-transform ${
                  isFilterDropdownOpen ? 'rotate-180' : ''
                }`}
              ></i>
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 sm:mt-3 w-48 bg-white dark:bg-moss border border-gray-200 dark:border-white/10 rounded-xl sm:rounded-2xl shadow-xl dark:shadow-2xl z-50 overflow-hidden py-1 sm:py-2 animate-[fadeIn_0.2s_ease-out]">
                <button
                  onClick={() => {
                    setFilterDifficulty('all')
                    setIsFilterDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-colors ${
                    filterDifficulty === 'all'
                      ? 'bg-emerald-50 dark:bg-white/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <i className="fa-solid fa-layer-group w-4 sm:w-5 text-center"></i>
                  সব লেভেল
                </button>
                {difficulties.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setFilterDifficulty(d.id)
                      setIsFilterDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-colors ${
                      filterDifficulty === d.id
                        ? 'bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <i className={`${d.icon} w-4 sm:w-5 text-center`}></i>
                    {d.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE MODE INFO BAR */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <i className={`${activeModeData?.icon} text-lg text-campfire`}></i>
            <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
              {activeModeData?.title}
            </h2>
          </div>
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
            {loading ? '...' : `${e2b(leaders.length)} জন`}
          </span>
        </div>

        {/* LOADING / LIST */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fa-solid fa-compass fa-spin text-4xl text-campfire"></i>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {leaders.map((entry, index) => {
              const rank = getRankStyle(index)
              const profile = entry.profiles || {}
              const name = profile.full_name || 'Explorer'
              const avatar =
                profile.photo_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  name
                )}&background=0a1c13&color=fff`

              const innerContentJSX = (
                <div className="flex items-center gap-3 sm:gap-6 w-full">
                  {/* Rank */}
                  <div className="w-6 sm:w-12 text-center shrink-0">
                    <span
                      className={`text-xl sm:text-3xl font-black ${rank.color} transition-colors`}
                    >
                      {index < 3 ? (
                        <i className={`fa-solid ${rank.icon}`}></i>
                      ) : (
                        `#${e2b(index + 1)}`
                      )}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt={name}
                      className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 ${rank.avatarBorder} bg-gray-100 dark:bg-white/10 transition-colors`}
                    />
                    {index < 3 && (
                      <div
                        className={`absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-xs bg-white dark:bg-darkForest border ${rank.avatarBorder} ${rank.color} transition-colors`}
                      >
                        <i className={`fa-solid ${rank.icon}`}></i>
                      </div>
                    )}
                  </div>

                  {/* Name & Meta */}
                  <div className="flex-grow min-w-0 pr-2">
                    <p className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white line-clamp-1 transition-colors">
                      {name}
                    </p>

                    <div className="flex items-center gap-1.5 sm:gap-3 mt-0.5 sm:mt-1 flex-wrap">
                      <p
                        className={`text-[8px] sm:text-[10px] font-black tracking-widest uppercase ${rank.color} transition-colors`}
                      >
                        {rank.label}
                      </p>

                      <span className="hidden sm:block w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full transition-colors"></span>

                      {/* Difficulty badge */}
                      <span
                        className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border ${getDifficultyBadgeClass(
                          entry.difficulty
                        )}`}
                      >
                        {getDifficultyLabel(entry.difficulty)}
                      </span>

                      {/* Sub-meta: time + wrong taps */}
                      <span className="hidden sm:flex items-center gap-2 text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider transition-colors">
                        <i className="fa-solid fa-stopwatch text-blue-500"></i>
                        {formatTime(entry.time_seconds)}
                        <span className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></span>
                        <i className="fa-solid fa-xmark text-red-500"></i>
                        {e2b(entry.wrong_taps ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-lg sm:text-4xl font-black text-gray-900 dark:text-white leading-none mb-1 transition-colors">
                      {e2b(entry.score ?? 0)}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest transition-colors">
                      পয়েন্ট
                    </p>
                  </div>
                </div>
              )

              // Top 3
              if (rank.isTop3) {
                return (
                  <div
                    key={entry.id}
                    data-aos="fade-up"
                    className={`relative rounded-2xl overflow-hidden p-[1.5px] transition-all duration-300 hover:-translate-y-1 ${rank.shadow} group`}
                  >
                    <div
                      className="absolute inset-[-50%] animate-[spin_6s_linear_infinite] motion-reduce:animate-none will-change-transform opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        backgroundImage: `conic-gradient(from 90deg at 50% 50%, transparent 0%, transparent 75%, ${rank.gradient})`,
                      }}
                    ></div>
                    <div
                      className={`relative flex items-center justify-between h-full w-full ${rank.innerBg} backdrop-blur-xl rounded-2xl p-3 sm:p-6 transition-colors`}
                    >
                      {innerContentJSX}
                    </div>
                  </div>
                )
              }

              // Others
              return (
                <div
                  key={entry.id}
                  data-aos="fade-up"
                  className={`flex items-center justify-between p-3 sm:p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${rank.bg} border ${rank.border} ${rank.shadow}`}
                >
                  {innerContentJSX}
                </div>
              )
            })}

            {/* Empty state */}
            {leaders.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-soft dark:shadow-none transition-colors">
                <i className="fa-solid fa-ghost text-5xl text-gray-400 dark:text-gray-600 mb-4 opacity-50 transition-colors"></i>
                <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 transition-colors">
                  ম্যাপ গেম লিডারবোর্ড ফাঁকা!
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 transition-colors">
                  এই গেম ও ফিল্টারে কাউকে পাওয়া যায়নি।
                </p>
                <Link
                  href="/my-bangladesh/games"
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-campfire text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <i className="fa-solid fa-gamepad"></i>
                  প্রথম হওয়ার সুযোগ নিন
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
