"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";
import {
  motion,
  useScroll,
  useSpring,
  useInView,
  useReducedMotion,
} from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   MOTION PRESETS — একবার লিখে সব জায়গায় ব্যবহার
   ═══════════════════════════════════════════════════════════════ */
const EASE = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1, ease: EASE } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* ═══════════════════════════════════════════════════════════════
   ANIMATED COUNTER — requestAnimationFrame, GPU-friendly
   ═══════════════════════════════════════════════════════════════ */
function AnimatedNumber({ value = 0, suffix = "", duration = 1.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) return setDisplay(value);

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, prefersReduced]);

  return (
    <span ref={ref} className="tabular-nums">
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER — animated label + title + underline draw
   ═══════════════════════════════════════════════════════════════ */
function SectionHeader({ label, title, highlight, subtitle }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className="text-center mb-12"
    >
      {label && (
        <motion.p
          variants={fadeUp}
          className="text-xs font-bold tracking-[0.3em] uppercase text-[#e76f51] mb-3"
        >
          {label}
        </motion.p>
      )}
      <motion.h2
        variants={fadeUp}
        className="text-3xl sm:text-5xl font-black text-pastel-text dark:text-white leading-tight"
      >
        {title}{" "}
        {highlight && <span className="text-[#e76f51]">{highlight}</span>}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="mt-4 text-sm sm:text-base text-pastel-muted dark:text-gray-400 max-w-xl mx-auto leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        variants={fadeUp}
        className="mt-5 mx-auto h-[3px] w-16 rounded-full bg-gradient-to-r from-[#e76f51] to-orange-300"
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO PARTICLES — ৮টা subtle dot (CSS-based, perf-safe)
   ═══════════════════════════════════════════════════════════════ */
function HeroParticles() {
  const dots = [
    { x: "8%", y: "20%", size: 4, delay: 0, dur: 14 },
    { x: "22%", y: "70%", size: 6, delay: 2, dur: 16 },
    { x: "38%", y: "15%", size: 3, delay: 1.5, dur: 18 },
    { x: "55%", y: "80%", size: 5, delay: 0.8, dur: 15 },
    { x: "68%", y: "25%", size: 4, delay: 3, dur: 17 },
    { x: "82%", y: "65%", size: 6, delay: 1.2, dur: 19 },
    { x: "92%", y: "35%", size: 3, delay: 2.5, dur: 13 },
    { x: "48%", y: "50%", size: 4, delay: 0.4, dur: 16 },
  ];

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#e76f51]/40 dark:bg-[#e76f51]/50"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            animation: `cas-float ${d.dur}s ease-in-out ${d.delay}s infinite`,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEMORY CARD — compact infinity scroll card
   ═══════════════════════════════════════════════════════════════ */
function MemoryCard({ ev }) {
  return (
    <Link
      href={`/event-details?id=${ev.id}`}
      className="group relative shrink-0 w-[180px] sm:w-[240px] h-[230px] sm:h-[300px] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black"
    >
      {ev.cover_photo ? (
        <img
          src={ev.cover_photo}
          alt={ev.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-700">
          <i className="fa-solid fa-mountain-sun text-3xl" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {ev.difficulty && (
        <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-widest bg-white/90 dark:bg-black/70 text-gray-700 dark:text-white px-2 py-0.5 rounded-full backdrop-blur">
          {ev.difficulty}
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
        <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">
          {ev.destination || "Bangladesh"}
        </div>
        <h4 className="font-black text-sm sm:text-base leading-tight line-clamp-2 mt-0.5">
          {ev.title}
        </h4>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <i className="fa-solid fa-arrow-right" /> দেখে আসুন
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sliders, setSliders] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [topLeaders, setTopLeaders] = useState([]);

  const [userId, setUserId] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const IMGBB_API_KEY = "c8e142b508f46f59807dbb6a3a2ccb23";

  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [stats, setStats] = useState(null);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);

  const prefersReduced = useReducedMotion();

  // Scroll progress bar
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // Hero parallax
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useSpring(heroScroll, { stiffness: 60, damping: 20 });

  /* ─── Countdown ─── */
  useEffect(() => {
    let interval;
    const fetchUpcoming = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("events")
        .select("title, start_date")
        .is("deleted_at", null)
        .gt("start_date", now)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setUpcomingEvent(data);
        const target = new Date(data.start_date).getTime();
        interval = setInterval(() => {
          const dist = target - Date.now();
          if (dist < 0) return clearInterval(interval);
          setTimeLeft({
            days: Math.floor(dist / 86400000),
            hours: Math.floor((dist % 86400000) / 3600000),
            minutes: Math.floor((dist % 3600000) / 60000),
            seconds: Math.floor((dist % 60000) / 1000),
          });
        }, 1000);
      }
    };
    fetchUpcoming();
    return () => clearInterval(interval);
  }, []);

  /* ─── Initial ─── */
  useEffect(() => {
    AOS.init({ once: true, offset: 50 });
    checkUserStatus();
    fetchSliders();
    fetchTopLeaders();
    fetchStats();
    fetchFeaturedEvents();
    fetchPastEvents();
  }, []);

  /* ─── Slider autoplay ─── */
  useEffect(() => {
    if (!sliders.length) return;
    const t = setInterval(
      () => setCurrentSlide((p) => (p + 1) % sliders.length),
      4000
    );
    return () => clearInterval(t);
  }, [sliders]);

  /* ─── Auth ─── */
  const checkUserStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", session.user.id)
      .single();
    if (data) {
      if (data.role === "admin") setIsAdmin(true);
      if (data.full_name === "New Explorer") setShowNameModal(true);
    }
  };

  const fetchSliders = async () => {
    const { data } = await supabase
      .from("hero_sliders")
      .select("*")
      .order("id", { ascending: true });
    if (data?.length) setSliders(data);
  };

  const fetchTopLeaders = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, photo_url, total_events")
      .order("total_events", { ascending: false, nullsFirst: false })
      .limit(3);
    if (data) setTopLeaders(data);
  };

  const fetchStats = async () => {
    try {
      const [members, events, bookings, donors, districtsRes, games] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .is("deleted_at", null),
          supabase.from("bookings").select("*", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("is_donor", true),
          supabase.from("profiles").select("visited_districts"),
          supabase
            .from("game_scores")
            .select("*", { count: "exact", head: true }),
        ]);

      const set = new Set();
      districtsRes.data?.forEach((p) =>
        (p.visited_districts || []).forEach((d) => set.add(d))
      );

      setStats({
        members: members.count || 0,
        events: events.count || 0,
        bookings: bookings.count || 0,
        donors: donors.count || 0,
        districts: set.size,
        games: games.count || 0,
      });
    } catch (err) {
      console.warn("Stats load failed:", err);
    }
  };

  const fetchFeaturedEvents = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("events")
      .select(
        "id, title, destination, cover_photo, start_date, tour_fee, difficulty, tour_vibe"
      )
      .is("deleted_at", null)
      .gt("start_date", now)
      .order("start_date", { ascending: true })
      .limit(3);
    if (data) setFeaturedEvents(data);
  };

  const fetchPastEvents = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("events")
      .select("id, title, destination, cover_photo, date, difficulty")
      .is("deleted_at", null)
      .lte("start_date", now)
      .order("start_date", { ascending: false })
      .limit(10);
    if (data) setPastEvents(data);
  };

  /* ─── Name save ─── */
  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !userId) return;
    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newName })
        .eq("id", userId);
      if (error) throw error;
      setShowNameModal(false);
      fetchTopLeaders();
    } catch {
      alert("নামটা সেভ করা গেল না। একটু পরে আবার চেষ্টা করুন।");
    } finally {
      setIsUpdatingName(false);
    }
  };

  /* ─── Admin crop/upload ─── */
  const handleImageSelect = (e, id) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setEditingId(id);
      setIsEditModalOpen(true);
      setIsAdminPanelOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCropAndUpload = async () => {
    setIsUploading(true);
    try {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((r) => (img.onload = r));

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      let q = 0.9;
      let b64 = canvas.toDataURL("image/jpeg", q);
      while (b64.length > 270000 && q > 0.2) {
        q -= 0.1;
        b64 = canvas.toDataURL("image/jpeg", q);
      }

      const blob = await fetch(b64).then((r) => r.blob());
      const fd = new FormData();
      fd.append("image", new File([blob], "hero.jpg", { type: "image/jpeg" }));
      const up = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        { method: "POST", body: fd }
      );
      const j = await up.json();
      if (!j.success) throw new Error("upload");

      await supabase
        .from("hero_sliders")
        .update({ image_url: j.data.url })
        .eq("id", editingId);

      setIsEditModalOpen(false);
      fetchSliders();
    } catch {
      alert("ছবিটা আপলোড করা গেল না।");
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
      });
    } catch {
      return "";
    }
  };

  const marqueeRow = pastEvents.length ? [...pastEvents, ...pastEvents] : [];
  const reverseRow = pastEvents.length
    ? [...pastEvents.slice().reverse(), ...pastEvents.slice().reverse()]
    : [];

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <main className="bg-pastel-bg dark:bg-[#030705] text-pastel-text dark:text-gray-300 font-sans antialiased overflow-x-hidden min-h-screen flex flex-col transition-colors duration-500">
      {/* ── Global CSS animations ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scroll-text {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: scroll-text 20s linear infinite;
        }
        @keyframes cas-marquee-l {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
        @keyframes cas-marquee-r {
          0%   { transform: translate3d(-50%,0,0); }
          100% { transform: translate3d(0,0,0); }
        }
        .cas-marquee-l { animation: cas-marquee-l 55s linear infinite; will-change: transform; }
        .cas-marquee-r { animation: cas-marquee-r 65s linear infinite; will-change: transform; }
        .cas-marquee-wrap:hover .cas-marquee-l,
        .cas-marquee-wrap:hover .cas-marquee-r { animation-play-state: paused; }
        @keyframes cas-float {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: .35; }
          50%      { transform: translate3d(12px, -22px, 0); opacity: .75; }
        }
        .card-shine::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgba(231,111,81,0.18), transparent 45%);
          opacity: 0;
          transition: opacity .4s ease;
          pointer-events: none;
          border-radius: inherit;
        }
        .card-shine:hover::before { opacity: 1; }
      `,
        }}
      />

      {/* ── Scroll Progress Bar ── */}
      <motion.div
        style={{ scaleX: progressX, transformOrigin: "0% 50%" }}
        className="fixed top-0 left-0 right-0 h-[3px] z-[999] bg-gradient-to-r from-[#e76f51] via-orange-400 to-yellow-400"
      />

      {/* ═══ 1. SLIDER ═══ */}
      <section className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-gray-100 dark:bg-[#0a1c13] overflow-hidden mt-16 shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div
          className="flex w-full h-full transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {sliders.length === 0 ? (
            <div className="min-w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#050b08] animate-pulse">
              <i className="fa-solid fa-mountain-sun text-6xl text-gray-300 dark:text-gray-700/50" />
            </div>
          ) : (
            sliders.map((s, i) => (
              <div key={s.id} className="min-w-full h-full relative shrink-0">
                <motion.img
                  src={s.image_url}
                  alt=""
                  className="w-full h-full object-cover bg-gray-50 dark:bg-[#050b08]"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  initial={i === 0 ? { scale: 1.06 } : false}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.6, ease: EASE }}
                />
              </div>
            ))
          )}
        </div>

        {sliders.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {sliders.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentSlide
                    ? "w-8 bg-[#e76f51]"
                    : "w-2 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className="bg-white/80 dark:bg-black/60 hover:bg-[#e76f51] dark:hover:bg-[#e76f51] backdrop-blur-md text-gray-800 hover:text-white dark:text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg border border-gray-200 dark:border-white/20"
            >
              <i className="fa-solid fa-gear" />
            </button>
          </div>
        )}
      </section>

      {/* ═══ 2. TICKER ═══ */}
      <div className="bg-orange-100 dark:bg-[#e76f51] text-orange-900 dark:text-[#030705] py-2 overflow-hidden flex items-center border-y border-orange-200 dark:border-y-yellow-500/30 shadow-sm dark:shadow-md relative z-20 transition-colors duration-500">
        <div className="whitespace-nowrap w-full">
          <span className="animate-marquee font-bold text-xs sm:text-sm tracking-wide">
            <i className="fa-solid fa-bolt mr-2" /> চুয়েট অ্যাডভেঞ্চার
            সোসাইটি — এক কাপ চা, এক ব্যাগ, আর বাকিটা পাহাড়। নিয়ম মেনে
            ঘুরি, প্রকৃতিকে ভয় পাই না — ভয় পাই প্রকৃতির কাছে হেরে যাওয়ার।
            <i className="fa-solid fa-bolt ml-2" />
          </span>
        </div>
      </div>

      {/* ═══ 3. COUNTDOWN ═══ */}
      {upcomingEvent && (
        <section className="relative z-20 mt-8 mb-[-2rem] flex justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: EASE }}
            className="bg-white/80 dark:bg-[#0a1c13]/80 backdrop-blur-xl border border-orange-100 dark:border-[#e76f51]/40 p-5 sm:p-8 rounded-[2rem] shadow-soft dark:shadow-[0_0_40px_rgba(231,111,81,0.15)] max-w-2xl w-full flex flex-col items-center text-center"
          >
            <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#e76f51] animate-pulse" />
              পরের ট্রেইলে আপনি আছেন?
            </h3>

            <h2 className="text-gray-800 dark:text-white font-black text-2xl sm:text-3xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-[#e76f51] to-red-500">
              {upcomingEvent.title}
            </h2>

            <div className="flex gap-2 sm:gap-5 justify-center items-center">
              {[
                { v: timeLeft.days, l: "Days", hi: false },
                { v: timeLeft.hours, l: "Hours", hi: false },
                { v: timeLeft.minutes, l: "Mins", hi: false },
                { v: timeLeft.seconds, l: "Secs", hi: true },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-5">
                  {i > 0 && (
                    <div
                      className={`text-xl sm:text-3xl font-black mb-4 ${
                        b.hi
                          ? "text-[#e76f51] animate-pulse"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    >
                      :
                    </div>
                  )}
                  <div
                    className={`flex flex-col items-center rounded-2xl w-16 h-16 sm:w-20 sm:h-20 justify-center shadow-inner transition-colors duration-500 ${
                      b.hi
                        ? "bg-orange-50 dark:bg-[#e76f51]/10 border border-orange-200 dark:border-[#e76f51]/40"
                        : "bg-gray-50 dark:bg-black/60 border border-gray-100 dark:border-white/10"
                    }`}
                  >
                    <motion.span
                      key={b.v}
                      initial={{ y: -14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className={`text-2xl sm:text-4xl font-black ${
                        b.hi
                          ? "text-[#e76f51]"
                          : "text-gray-700 dark:text-white"
                      }`}
                    >
                      {b.v}
                    </motion.span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                        b.hi
                          ? "text-[#e76f51]"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {b.l}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* ═══ 4. LIVE STATS COUNTER ═══ */}
      {stats && (
        <section className="relative pt-24 pb-16 px-6">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-30"
            style={{
              background:
                "radial-gradient(700px circle at 50% 40%, rgba(231,111,81,0.10), transparent 55%)",
            }}
          />
          <div className="max-w-5xl mx-auto relative">
            <SectionHeader
              label="এক নজরে"
              title="আমরা একা হাঁটিনি"
              highlight="কখনো"
              subtitle="এই সোসাইটির প্রতিটা সংখ্যা একেকটা গল্প — একটা পার্ক, একটা ট্রেইল, একটা নতুন বন্ধু।"
            />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5"
            >
              {[
                { i: "fa-solid fa-user-group", v: stats.members, l: "এক্সপ্লোরার", c: "text-emerald-500" },
                { i: "fa-solid fa-mountain-sun", v: stats.events, l: "ট্যুর আয়োজিত", c: "text-[#e76f51]" },
                { i: "fa-solid fa-ticket", v: stats.bookings, l: "সিট বুকড", c: "text-blue-500" },
                { i: "fa-solid fa-droplet", v: stats.donors, l: "রক্তদাতা", c: "text-red-500" },
                { i: "fa-solid fa-map-location-dot", v: stats.districts, l: "জেলা ছোঁয়া", c: "text-violet-500" },
                { i: "fa-solid fa-gamepad", v: stats.games, l: "গেম সেশন", c: "text-amber-500" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={prefersReduced ? {} : { y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="card-shine relative overflow-hidden bg-white/80 dark:bg-[#0a1c13]/80 backdrop-blur-sm border border-gray-100 dark:border-white/5 rounded-2xl p-5 flex flex-col items-center text-center"
                >
                  <i className={`${s.i} ${s.c} text-2xl sm:text-3xl mb-3`} />
                  <div className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-white">
                    <AnimatedNumber value={s.v} />
                    <span className="text-[#e76f51]">+</span>
                  </div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-1">
                    {s.l}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══ 5. HERO (Mask reveal + parallax + particles) ═══ */}
      <section ref={heroRef} className="relative py-16 sm:py-24 px-6 overflow-hidden">
        {!prefersReduced && <HeroParticles />}

        <motion.div
          style={prefersReduced ? {} : { y: heroY }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              className="inline-block px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold text-xs sm:text-sm mb-8 bg-white/50 dark:bg-white/5"
            >
              <i className="fa-solid fa-fire text-[#e76f51] mr-2" /> ২০১৫
              সাল থেকে পথচলা
            </motion.div>

            {/* Mask reveal for title */}
            <div className="overflow-hidden mb-8">
              <motion.h1
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: EASE }}
                className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.05] tracking-tight text-pastel-text dark:text-white"
              >
                চুয়েট অ্যাডভেঞ্চার{" "}
                <span className="text-[#e76f51]">সোসাইটি</span>
              </motion.h1>
            </div>

            <motion.p
              variants={fadeUp}
              className="text-base sm:text-xl text-pastel-muted dark:text-gray-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              পাহাড়ের গহীনে, মেঘের চূড়ায় কিংবা অরণ্যের গভীরে —
              চুয়েটিয়ানদের পদচারণায় জেগে উঠুক নতুন ট্রেইল।
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {userId ? (
                <>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href="/beginners-guide"
                      className="w-full sm:w-auto bg-[#e76f51] hover:bg-orange-600 px-8 py-3.5 rounded-xl font-black transition-colors flex items-center justify-center gap-3 text-white shadow-md dark:shadow-lg"
                    >
                      <i className="fa-solid fa-compass" /> শেখা শুরু করুন
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href="/past-events"
                      className="w-full sm:w-auto bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-emerald-900/50 text-gray-700 dark:text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm dark:shadow-lg"
                    >
                      <i className="fa-solid fa-images text-emerald-500" />{" "}
                      আগের ট্যুরগুলো
                    </Link>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href="/signup"
                      className="w-full sm:w-auto bg-[#e76f51] hover:bg-orange-600 px-8 py-3.5 rounded-xl font-black transition-colors flex items-center justify-center gap-3 text-white shadow-md dark:shadow-lg"
                    >
                      <i className="fa-solid fa-shoe-prints" /> প্রথম পদক্ষেপ
                      নিন
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href="/login"
                      className="w-full sm:w-auto bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-emerald-900/50 text-gray-700 dark:text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm dark:shadow-lg"
                    >
                      <i className="fa-solid fa-right-to-bracket text-emerald-500" />{" "}
                      লগইন
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ 6. FEATURED UPCOMING EVENTS ═══ */}
      {featuredEvents.length > 0 && (
        <section className="py-14 sm:py-20 px-6 border-t border-gray-200 dark:border-white/5">
          <div className="max-w-6xl mx-auto">
            <SectionHeader
              label="আসছে"
              title="পরের ট্যুরে"
              highlight="পা বাড়াবেন?"
              subtitle="যে ট্যুরগুলো এখন বুকিং ওপেন। আপনার পছন্দটা বেছে নিন — বাকিটা আমরা সামলে নেব।"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {featuredEvents.map((ev) => (
                <motion.div key={ev.id} variants={fadeUp}>
                  <motion.div
                    whileHover={prefersReduced ? {} : { y: -8 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <Link
                      href={`/event-details?id=${ev.id}`}
                      className="card-shine group relative block overflow-hidden rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a1c13] shadow-soft dark:shadow-none"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-black">
                        {ev.cover_photo ? (
                          <motion.img
                            src={ev.cover_photo}
                            alt={ev.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            whileHover={{ scale: 1.06 }}
                            transition={{ duration: 0.7, ease: EASE }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <i className="fa-solid fa-mountain-sun text-4xl" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {ev.difficulty && (
                          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest bg-white/90 dark:bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-gray-700 dark:text-white">
                            {ev.difficulty}
                          </span>
                        )}

                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                            {formatDate(ev.start_date)}
                            {ev.destination ? ` • ${ev.destination}` : ""}
                          </div>
                          <h3 className="font-black text-lg sm:text-xl leading-tight line-clamp-1 mt-0.5">
                            {ev.title}
                          </h3>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between">
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                          {ev.tour_vibe || "ট্রেইল ট্যুর"}
                        </div>
                        <div className="text-right">
                          {ev.tour_fee ? (
                            <>
                              <div className="text-lg font-black text-gray-800 dark:text-white">
                                ৳ {Number(ev.tour_fee).toLocaleString()}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-gray-400">
                                জনপ্রতি
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400">
                              যোগাযোগ করুন
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
              className="text-center mt-10"
            >
              <Link
                href="/events"
                className="inline-flex items-center gap-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white px-7 py-3 rounded-xl font-bold transition-colors"
              >
                সব ইভেন্ট <i className="fa-solid fa-arrow-right" />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══ 7. FEATURE HUB ═══ */}
      <section className="py-14 sm:py-20 px-6 border-t border-gray-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            label="এইখানে সব আছে"
            title="আপনার জন্য যা যা"
            highlight="রাখা আছে"
            subtitle="বুকিং থেকে রক্তদান, গিয়ার ভাড়া থেকে জেলা ঘোরা — সব এক জায়গায়।"
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5"
          >
            {[
              { href: "/bloodbank", i: "fa-solid fa-droplet", t: "ব্লাড ব্যাংক", d: "জরুরি মুহূর্তে পাশে দাঁড়ান, রক্ত দিন বা নিন।", c: "text-red-500", bg: "from-red-500/10" },
              { href: "/store", i: "fa-solid fa-shop", t: "গিয়ার স্টোর", d: "ট্রেকিং-ক্যাম্পিং গিয়ার ভাড়া বা কিনুন।", c: "text-emerald-500", bg: "from-emerald-500/10" },
              { href: "/my-bangladesh", i: "fa-solid fa-map-location-dot", t: "মাই বাংলাদেশ", d: "৬৪ জেলার ম্যাপে আপনার পদচিহ্ন বসান।", c: "text-violet-500", bg: "from-violet-500/10" },
              { href: "/leaderboard", i: "fa-solid fa-trophy", t: "লিডারবোর্ড", d: "কে কতদূর হাঁটল, দেখে নিন একবার।", c: "text-amber-500", bg: "from-amber-500/10" },
              { href: "/stories", i: "fa-solid fa-book-open", t: "ট্রেইল স্টোরিজ", d: "নিজের অভিজ্ঞতা লিখুন, অন্যকে উৎসাহ দিন।", c: "text-sky-500", bg: "from-sky-500/10" },
              { href: "/certificate", i: "fa-solid fa-award", t: "সার্টিফিকেট", d: "প্রতিটা ট্রেইলের দাম দেওয়া রসিদ, ডিজিটাল।", c: "text-pink-500", bg: "from-pink-500/10" },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <motion.div
                  whileHover={prefersReduced ? {} : { y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                >
                  <Link
                    href={f.href}
                    className="card-shine relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a1c13] overflow-hidden group"
                  >
                    <div
                      className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <i className={`${f.i} ${f.c} text-2xl sm:text-3xl`} />
                    <h3 className="font-black text-gray-800 dark:text-white text-base sm:text-lg">
                      {f.t}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {f.d}
                    </p>
                    <span className="text-[#e76f51] text-xs font-bold mt-1 flex items-center gap-1.5 group-hover:gap-3 transition-all">
                      দেখুন <i className="fa-solid fa-arrow-right" />
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ 8. MEMORY WALL — Infinity Scroll ═══ */}
      {pastEvents.length >= 3 && (
        <section className="py-14 sm:py-20 border-t border-gray-200 dark:border-white/5 bg-gray-50/60 dark:bg-[#050b08]">
          <div className="max-w-6xl mx-auto px-6 mb-10">
            <SectionHeader
              label="স্মৃতির ঝুলি"
              title="পুরনো ট্যুরগুলো"
              highlight="একবার ঘুরে আসুন"
              subtitle="যে পথগুলো আমরা হেঁটেছি, সেই গল্পগুলো এখনো ছবিতে বেঁচে আছে।"
            />
          </div>

          <div className="cas-marquee-wrap relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-gray-50/90 dark:from-[#050b08]/95 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-gray-50/90 dark:from-[#050b08]/95 to-transparent z-10" />

            <div className="cas-marquee-l flex gap-3 sm:gap-4 w-max mb-3 sm:mb-4">
              {marqueeRow.map((ev, i) => (
                <MemoryCard key={`a-${i}`} ev={ev} />
              ))}
            </div>

            <div className="cas-marquee-r flex gap-3 sm:gap-4 w-max">
              {reverseRow.map((ev, i) => (
                <MemoryCard key={`b-${i}`} ev={ev} />
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/past-events"
              className="inline-flex items-center gap-3 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white px-7 py-3 rounded-xl font-bold transition-colors"
            >
              সব স্মৃতি <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ 9. LEADERBOARD ═══ */}
      <section className="py-16 sm:py-24 max-w-4xl mx-auto px-6 border-t border-gray-200 dark:border-white/5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-10"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-500/10 mb-4 shadow-sm dark:shadow-[0_0_30px_rgba(234,179,8,0.2)]"
          >
            <i className="fa-solid fa-trophy text-3xl text-yellow-500" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-black text-pastel-text dark:text-white mb-4"
          >
            ক্যাম্পাস <span className="text-[#e76f51]">লিডারবোর্ড</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-pastel-muted dark:text-gray-400 text-sm sm:text-base"
          >
            কে কতদূর হেঁটেছেন — এই মুহূর্তে সবার উপরে যাঁরা আছেন।
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="space-y-4"
        >
          {topLeaders.map((user, index) => {
            const isChampion = index === 0;
            return (
              <motion.div
                key={user.id}
                variants={fadeUp}
                whileHover={prefersReduced ? {} : { y: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-colors shadow-sm dark:shadow-none ${
                  isChampion
                    ? "border-yellow-200 dark:border-yellow-400/50 bg-yellow-50 dark:bg-yellow-400/10"
                    : "bg-white dark:bg-[#0a1c13] border-gray-100 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-8 sm:w-10 text-center shrink-0">
                    <span
                      className={`text-2xl sm:text-3xl font-black ${
                        isChampion
                          ? "text-yellow-500 dark:text-yellow-400"
                          : index === 1
                          ? "text-gray-400 dark:text-gray-300"
                          : "text-amber-600 dark:text-amber-600"
                      }`}
                    >
                      #{index + 1}
                    </span>
                  </div>

                  <div className="relative shrink-0">
                    <img
                      src={
                        user.photo_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.full_name || "User"
                        )}&background=0a1c13&color=fff`
                      }
                      alt={user.full_name}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 object-cover ${
                        isChampion
                          ? "border-yellow-400"
                          : "border-gray-200 dark:border-white/10"
                      }`}
                    />
                    {isChampion && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#050b08] border border-yellow-400 flex items-center justify-center text-[10px] text-yellow-500 dark:text-yellow-400 shadow-sm">
                        <i className="fa-solid fa-crown" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-gray-800 dark:text-white font-bold text-base sm:text-lg line-clamp-1">
                      {user.full_name || "Unknown Explorer"}
                    </h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                      {isChampion ? "Grand Champion" : "Top Explorer"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xl sm:text-3xl font-black text-gray-800 dark:text-white">
                    {user.total_events || 0}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                    Events
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="text-center mt-10">
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center gap-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:border-gray-300 dark:hover:border-white/30"
          >
            পূর্ণ লিডারবোর্ড <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>
      </section>

      {/* ═══ 10. SOCIAL ═══ */}
      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-[#050b08] border-t border-gray-200 dark:border-white/5 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.h3
              variants={fadeUp}
              className="text-2xl sm:text-4xl font-black text-pastel-text dark:text-white mb-4"
            >
              আমাদের সাথে <span className="text-[#e76f51]">যুক্ত হোন</span>
            </motion.h3>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 dark:text-gray-400 text-sm mb-12"
            >
              নতুন ট্যুর, নতুন গল্প — সবার আগে পেতে আমাদের সাথে থাকুন।
            </motion.p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {[
              { href: "https://www.facebook.com/share/1PoWHdyPeV/", i: "fa-brands fa-facebook", l: "FB Page", c: "1877F2" },
              { href: "https://facebook.com/share/g/1JGXYcNPhC/", i: "fa-solid fa-users", l: "FB Group", c: "1877F2" },
              { href: "https://www.instagram.com/cuet_adventure_society", i: "fa-brands fa-instagram", l: "Instagram", c: "E1306C" },
              { href: "https://ig.me/j/neGUu-76jpsZK6Pv/", i: "fa-regular fa-comment-dots", l: "Insta Chat", c: "833AB4" },
              { href: "https://chat.whatsapp.com/ETpX1KFvtqeL6bHqzEvmxy", i: "fa-brands fa-whatsapp", l: "WhatsApp", c: "25D366" },
              { href: "https://t.me/+-CZ_HsryVLA1NzNl", i: "fa-brands fa-telegram", l: "Telegram", c: "0088cc" },
              { href: "https://m.me/j/wU6N1jDd8iNDP_ea/", i: "fa-brands fa-facebook-messenger", l: "Messenger", c: "006AFF" },
            ].map((s, i) => (
              <motion.a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                whileHover={{ y: -8 }}
                className="group bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center shadow-soft dark:shadow-none transition-colors"
                style={{ "--brand": `#${s.c}` }}
              >
                <i
                  className={`${s.i} text-3xl text-gray-400 dark:text-gray-500 mb-2 transition-colors group-hover:text-[var(--brand)]`}
                />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {s.l}
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 11. FOOTER ═══ */}
      <footer className="mt-auto bg-gray-100 dark:bg-[#020504] border-t border-gray-200 dark:border-white/10 py-8 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="text-2xl font-black tracking-widest text-gray-800 dark:text-white mb-2">
            <span className="text-[#e76f51]">C</span>UET{" "}
            <span className="text-[#e76f51]">A</span>S
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
            © {new Date().getFullYear()} CUET Adventure Society. সর্বস্বত্ব
            সংরক্ষিত।
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            যারা হাঁটতে ভালোবাসে, তাদের জন্য — যারা হাঁটতে শেখাচ্ছে,
            তাদের দ্বারাও।
          </p>
        </div>
      </footer>

      {/* ═══ MODALS (all preserved) ═══ */}

      {showNameModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="bg-white dark:bg-[#0a1c13] border border-orange-200 dark:border-[#e76f51]/50 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl dark:shadow-[0_0_40px_rgba(231,111,81,0.2)] relative"
          >
            <button
              onClick={() => setShowNameModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-50 dark:bg-[#e76f51]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-200 dark:border-[#e76f51]/30">
                <i className="fa-solid fa-id-card text-3xl text-[#e76f51]" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
                আপনার নামটা বলুন
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                আপাতত আপনার প্রোফাইলে "New Explorer" লেখা আছে। আপনার
                আসল নামটা বসিয়ে দিলে বন্ধুরা আপনাকে খুঁজে পাবে সহজে।
              </p>
            </div>

            <form onSubmit={handleNameUpdate}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">
                  আপনার পুরো নাম *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="যেমন: Osman Gani"
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-xl text-gray-800 dark:text-white outline-none focus:border-[#e76f51] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isUpdatingName}
                className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md dark:shadow-[0_0_20px_rgba(231,111,81,0.3)] flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isUpdatingName ? (
                  <i className="fa-solid fa-circle-notch fa-spin" />
                ) : (
                  <i className="fa-solid fa-check" />
                )}
                {isUpdatingName ? "সেভ হচ্ছে..." : "নাম সেভ করুন"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {isAdminPanelOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setIsAdminPanelOpen(false)
          }
        >
          <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-800 dark:text-white font-bold">
                <i className="fa-solid fa-images text-[#e76f51] mr-2" />{" "}
                ব্যানার স্লাইডার এডিট
              </h3>
              <button
                onClick={() => setIsAdminPanelOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark text-xl" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              যেকোনো একটা ছবিতে ক্লিক করে নতুন ছবি বেছে নিন (১৬:৯):
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sliders.map((slide, i) => (
                <label
                  key={slide.id}
                  className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-white/10 hover:border-[#e76f51] cursor-pointer group transition-colors"
                >
                  <img
                    src={slide.image_url}
                    alt=""
                    className="w-full h-full object-cover opacity-80 dark:opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition-colors">
                    <span className="bg-white/90 dark:bg-black/80 text-gray-800 dark:text-white text-xs font-bold px-2 py-1 rounded">
                      Slide {i + 1}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e, slide.id)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-gray-50 dark:bg-[#030705]">
          <div className="relative flex-grow">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="bg-white dark:bg-[#0a1c13] px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-4">
            <i className="fa-solid fa-magnifying-glass-minus text-gray-500 dark:text-gray-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#e76f51]"
            />
            <i className="fa-solid fa-magnifying-glass-plus text-gray-500 dark:text-gray-400" />
          </div>

          <div className="pb-8 pt-4 bg-white dark:bg-[#0a1c13] flex items-center justify-between px-6 border-t border-gray-100 dark:border-black">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setIsAdminPanelOpen(true);
              }}
              className="text-red-500 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-500/20 px-5 py-3 rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              onClick={handleCropAndUpload}
              disabled={isUploading}
              className="bg-[#e76f51] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isUploading ? (
                <i className="fa-solid fa-circle-notch fa-spin" />
              ) : (
                <i className="fa-solid fa-crop-simple" />
              )}
              {isUploading ? "সেভ হচ্ছে..." : "ক্রপ ও সেভ"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
