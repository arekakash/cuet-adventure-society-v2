// app/beginners-guide/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import { megaCurriculum } from "@/data/guideData"; 

export default function BeginnersGuidePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [survivalIQ, setSurvivalIQ] = useState(0);
  
  // Modal States
  const [activeLesson, setActiveLesson] = useState(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  // Quiz States
  const [timeLeft, setTimeLeft] = useState(180);
  const [quizTimer, setQuizTimer] = useState(null);
  const [answers, setAnswers] = useState({});
  const [earnedPoints, setEarnedPoints] = useState(0);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("profiles")
        .select("survival_iq, completed_lessons")
        .eq("id", session.user.id)
        .single();
        
      if (data) {
        setUserProfile(session.user);
        setSurvivalIQ(data.survival_iq || 0);
        setCompletedLessons(data.completed_lessons || []);
      }
    }
  };

  const getLevelName = (iq) => {
    if (iq < 400) return "Tenderfoot (Beginner)";
    if (iq < 1000) return "Trail Seeker";
    if (iq < 2000) return "Camp Ranger";
    if (iq < 3000) return "Survivalist";
    return "Master Explorer 👑";
  };

  // Lesson Logic
  const openLesson = (lesson) => {
    setActiveLesson(lesson);
    setIsLessonModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLessonModal = () => {
    setIsLessonModalOpen(false);
    document.body.style.overflow = "auto";
  };

  // Quiz Timer Logic
  useEffect(() => {
    if (isQuizModalOpen && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      setQuizTimer(timer);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isQuizModalOpen) {
      alert("সময় শেষ! আপনাকে লেসনটি আবার পড়ে নতুন করে কুইজ দিতে হবে।");
      closeQuizModal();
    }
  }, [isQuizModalOpen, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startQuiz = () => {
    setIsLessonModalOpen(false);
    setAnswers({});
    setTimeLeft(180); // 3 minutes
    setIsQuizModalOpen(true);
  };

  const closeQuizModal = () => {
    setIsQuizModalOpen(false);
    if (quizTimer) clearInterval(quizTimer);
    document.body.style.overflow = "auto";
  };

  const handleOptionChange = (qIndex, optionIndex) => {
    setAnswers({ ...answers, [qIndex]: optionIndex });
  };

  const submitQuiz = async () => {
    if (!activeLesson) return;
    
    let score = 0;
    const totalQuestions = activeLesson.quiz.length;

    if (Object.keys(answers).length < totalQuestions) {
      alert("অনুগ্রহ করে সবকটি প্রশ্নের উত্তর দিন!");
      return;
    }

    activeLesson.quiz.forEach((qObj, index) => {
      if (answers[index] === qObj.ans) score++;
    });

    if (score === totalQuestions) {
      closeQuizModal();
      
      const newIQ = survivalIQ + activeLesson.points;
      const newCompleted = [...completedLessons, activeLesson.id];
      
      if (userProfile) {
        await supabase.from("profiles").update({
          survival_iq: newIQ,
          completed_lessons: newCompleted
        }).eq("id", userProfile.id);
        
        setSurvivalIQ(newIQ);
        setCompletedLessons(newCompleted);
      }
      
      setEarnedPoints(activeLesson.points);
      setIsSuccessModalOpen(true);
    } else {
      alert(`উফফ! আপনি ${totalQuestions} টির মধ্যে ${score} টি সঠিক করেছেন।\nপাস করতে ১০০% সঠিক হতে হবে। লেসনটি আবার পড়ে চেষ্টা করুন!`);
      closeQuizModal();
    }
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-gray-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & IQ Bar */}
        <div className="glass-panel rounded-[2rem] p-8 md:p-12 mb-10 text-center relative overflow-hidden">
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">সারভাইভাল গাইড ও নলেজ বেস</h1>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-sm sm:text-base">লেসনগুলো পড়ুন, কুইজ দিন এবং আপনার <strong className="text-[#34d399]">Survival IQ</strong> বাড়িয়ে তুলুন!</p>
          
          <div className="max-w-xl mx-auto bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
            <div className="flex justify-between items-end mb-3">
              <div className="text-left">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Current Rank</p>
                <p className="text-xl font-black text-[#34d399]">{getLevelName(survivalIQ)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Points</p>
                <p className="text-2xl font-black text-white">{survivalIQ} <span className="text-sm text-gray-500">IQ</span></p>
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 mb-1 overflow-hidden">
              <div className="bg-gradient-to-r from-[#34d399] to-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min((survivalIQ / 4000) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Dynamic Modules Grid */}
        <div className="space-y-16">
          {megaCurriculum.map((module, mIndex) => {
            // Lock Logic: Check if previous module's lessons are all in completedLessons
            let isModuleLocked = false;
            if (mIndex > 0) {
              const prevModule = megaCurriculum[mIndex - 1];
              const prevCompletedCount = prevModule.lessons.filter(l => completedLessons.includes(l.id)).length;
              if (prevCompletedCount < prevModule.lessons.length) {
                isModuleLocked = true;
              }
            }

            return (
              <div key={module.moduleId} className={isModuleLocked ? "opacity-60" : ""}>
                <div className={`mb-6 pl-4 border-l-4 ${isModuleLocked ? "border-gray-500" : "border-[#e76f51]"}`}>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    {module.moduleTitle}
                    {isModuleLocked && <span className="text-xs bg-gray-500 text-white px-2 py-1 rounded-md"><i className="fa-solid fa-lock"></i> Locked</span>}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 font-medium">{module.moduleDesc}</p>
                  {isModuleLocked && <p className="text-xs text-[#e76f51] mt-1 font-bold">আগের মডিউলের সব লেসন শেষ করলে এটি আনলক হবে।</p>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {module.lessons.map((lesson) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    let cardStyle = "border-white/10 hover:border-blue-500/50 hover:-translate-y-2 cursor-pointer";
                    if (isCompleted) cardStyle = "border-[#34d399]/30 bg-[#34d399]/5 opacity-80 cursor-pointer";
                    if (isModuleLocked) cardStyle = "border-gray-500/30 bg-gray-500/5 module-locked";

                    return (
                      <div key={lesson.id} onClick={() => !isModuleLocked && openLesson(lesson)} className={`relative glass-panel rounded-2xl p-6 transition-all duration-300 ${cardStyle} group`}>
                        {isCompleted ? (
                          <span className="absolute -top-3 -right-3 bg-[#34d399] text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#050b08] shadow-lg"><i className="fa-solid fa-check"></i></span>
                        ) : isModuleLocked && (
                          <span className="absolute -top-3 -right-3 bg-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#050b08] shadow-lg"><i className="fa-solid fa-lock"></i></span>
                        )}
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                          <i className={`fa-solid ${lesson.icon}`}></i>
                        </div>
                        <h4 className="text-lg font-black text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">{lesson.title}</h4>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                          <span className="text-xs text-gray-400 font-bold"><i className="fa-solid fa-clock mr-1"></i> {lesson.readTime}</span>
                          <span className="text-xs text-[#34d399] font-black tracking-widest">+{lesson.points} IQ</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Lesson Modal */}
      {isLessonModalOpen && activeLesson && (
        <div className="fixed inset-0 z-50 flex justify-center items-start py-10 px-4 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <button onClick={closeLessonModal} className="fixed top-6 right-6 w-12 h-12 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all z-50">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
          <div className="glass-panel rounded-3xl p-8 sm:p-14 mb-10 w-full max-w-4xl mt-12 bg-[#0a1c13]">
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-8">{activeLesson.title}</h2>
            <div className="lesson-content text-base sm:text-lg" dangerouslySetInnerHTML={{ __html: activeLesson.content }}></div>
            
            <div className="mt-16 pt-10 border-t border-white/10 text-center">
              <h3 className="text-2xl font-black text-white mb-4">পড়া শেষ? এবার পরীক্ষা দেওয়ার পালা!</h3>
              <p className="text-gray-400 mb-8">কুইজের জন্য সময় পাবেন মাত্র ৩ মিনিট।</p>
              
              {completedLessons.includes(activeLesson.id) ? (
                <button disabled className="bg-gray-600 text-gray-300 px-10 py-5 rounded-2xl font-black text-xl transition-all cursor-not-allowed mx-auto block">
                  <i className="fa-solid fa-check-circle"></i> কমপ্লিটেড
                </button>
              ) : (
                <button onClick={startQuiz} className="bg-[#34d399] hover:bg-emerald-600 text-[#050b08] px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] mx-auto block">
                  <i className="fa-solid fa-brain"></i> টেক কুইজ & আর্ন পয়েন্ট!
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {isQuizModalOpen && activeLesson && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#0a1c13] border border-white/10 rounded-[2rem] p-6 sm:p-10 max-w-3xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 sticky top-0 bg-[#0a1c13] z-10">
              <h3 className="text-xl sm:text-2xl font-black text-[#34d399] flex items-center gap-2"><i className="fa-solid fa-stopwatch"></i> নলেজ টেস্ট</h3>
              <div className="text-2xl font-black text-red-500 animate-pulse">{formatTime(timeLeft)}</div>
              <button onClick={closeQuizModal} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            
            <div className="space-y-8">
              {activeLesson.quiz.map((qObj, qIndex) => (
                <div key={qIndex} className="bg-black/20 p-6 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-lg text-white mb-4">{qIndex + 1}. {qObj.q}</h4>
                  <div className="space-y-3">
                    {qObj.options.map((opt, oIndex) => (
                      <label key={oIndex} className="block relative cursor-pointer group">
                        <input type="radio" name={`q_${qIndex}`} value={oIndex} onChange={() => handleOptionChange(qIndex, oIndex)} checked={answers[qIndex] === oIndex} className="hidden" />
                        <div className={`border rounded-xl p-4 transition-all duration-200 flex items-center gap-3 font-medium ${answers[qIndex] === oIndex ? 'border-[#e76f51] bg-[#e76f51]/10 text-white' : 'border-white/10 text-gray-300 hover:bg-white/5'}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex shrink-0 items-center justify-center transition-colors ${answers[qIndex] === oIndex ? 'border-[#e76f51] bg-[#e76f51]' : 'border-gray-500'}`}>
                             {answers[qIndex] === oIndex && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                          <span>{opt}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t border-white/10">
              <button onClick={submitQuiz} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <i className="fa-solid fa-paper-plane"></i> সাবমিট উত্তর
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#0a1c13] border border-[#34d399]/50 rounded-[2rem] p-10 text-center max-w-sm w-full relative shadow-[0_0_40px_rgba(52,211,153,0.3)] animate-bounce">
            <div className="w-24 h-24 bg-[#34d399]/20 rounded-full flex items-center justify-center text-[#34d399] text-5xl mx-auto mb-6 shadow-inner border border-[#34d399]/30">
              <i className="fa-solid fa-check"></i>
            </div>
            <h3 className="text-3xl font-black text-white mb-2">অভিনন্দন!</h3>
            <p className="text-gray-400 mb-6">আপনি সফলভাবে লেসনটি সম্পন্ন করেছেন.</p>
            <div className="bg-[#34d399]/10 border border-[#34d399]/30 rounded-xl p-4 mb-8">
              <p className="text-[#34d399] font-black text-3xl">+{earnedPoints}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Survival IQ Added</p>
            </div>
            <button onClick={() => setIsSuccessModalOpen(false)} className="w-full bg-[#34d399] hover:bg-emerald-600 text-[#050b08] font-black py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              কন্টিনিউ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
