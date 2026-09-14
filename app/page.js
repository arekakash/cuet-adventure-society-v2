<!DOCTYPE html>
<html lang="bn" class="scroll-smooth" id="html-root">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CUET Adventure Society (CAS)</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class', 
            theme: {
                extend: {
                    colors: {
                        darkForest: '#050b08',
                        moss: '#0a1c13',
                        trail: '#2d6a4f',
                        campfire: '#e76f51', 
                        facebook: '#0866FF',
                        mistBg: '#e2e8f0', 
                        mistPanel: '#f8fafc',
                        mistText: '#1e293b',
                        gold: '#FFD700',
                        silver: '#C0C0C0',
                        bronze: '#CD7F32'
                    },
                    boxShadow: {
                        'glow': '0 0 20px rgba(231, 111, 81, 0.3)',
                        'glow-gold': '0 0 25px rgba(255, 215, 0, 0.4)'
                    }
                }
            },
            plugins: [
                tailwind.plugin(function({ addVariant }) {
                    addVariant('light-mode', '.light-mode &');
                })
            ]
        }
    </script>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">

    <style>
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--scroll-bg, #050b08); }
        ::-webkit-scrollbar-thumb { background: #2d6a4f; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #e76f51; }
        
        .glass-dark {
            background: rgba(10, 28, 19, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .light-mode .glass-dark {
            background: rgba(248, 250, 252, 0.7);
            border: 1px solid rgba(0, 0, 0, 0.1);
            color: #1e293b;
        }

        @keyframes pulseGlowBlue {
            0%, 100% { text-shadow: 0 0 15px rgba(6, 182, 212, 0.5), 0 0 30px rgba(6, 182, 212, 0.3); }
            50% { text-shadow: 0 0 25px rgba(6, 182, 212, 0.9), 0 0 50px rgba(6, 182, 212, 0.6), 0 0 80px rgba(6, 182, 212, 0.4); }
        }
        .text-glow-futuristic {
            animation: pulseGlowBlue 4s ease-in-out infinite;
        }

        .light-mode .text-glow-futuristic {
            animation: none !important;
            text-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
            color: #0f172a !important; 
        }
        .light-mode .bg-campfire { color: #ffffff !important; }

        .toggle-checkbox:checked { right: 0; border-color: #e76f51; }
        .toggle-checkbox:checked + .toggle-label { background-color: #e76f51; }
        
        .podium-1 { border-top-width: 4px; border-color: #FFD700; transform: scale(1.05); z-index: 10; }
        .podium-2 { border-top-width: 4px; border-color: #C0C0C0; }
        .podium-3 { border-top-width: 4px; border-color: #CD7F32; }
    </style>
</head>

<body class="bg-darkForest text-gray-300 dark:bg-darkForest dark:text-gray-300 font-sans antialiased selection:bg-campfire selection:text-white overflow-x-hidden relative transition-colors duration-500" id="body-content">

    <div class="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000">
        <img id="bg-dark-img" src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1920" alt="Dark Forest" class="absolute w-full h-full object-cover opacity-50 scale-105 filter brightness-75 contrast-125 transition-opacity duration-1000">
        <div id="bg-dark-overlay" class="absolute inset-0 bg-gradient-to-b from-darkForest/40 via-darkForest/80 to-[#030705]/95 transition-opacity duration-1000"></div>

        <img id="bg-light-img" src="https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?auto=format&fit=crop&q=80&w=1920" alt="Dense Misty Forest" class="absolute w-full h-full object-cover opacity-0 scale-105 filter transition-opacity duration-1000">
        <div id="bg-light-overlay" class="absolute inset-0 bg-gradient-to-b from-white/70 via-white/80 to-mistBg/95 opacity-0 transition-opacity duration-1000"></div>
    </div>

    <nav class="fixed w-full z-40 glass-dark transition-all duration-300 shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
            
            <div class="flex items-center gap-4 sm:gap-6">
                <button id="sidebar-open-btn" class="text-white light-mode:text-gray-800 text-xl sm:text-2xl hover:text-campfire transition-colors focus:outline-none">
                    <i class="fa-solid fa-bars-staggered"></i>
                </button>
                
                <a href="#" class="flex items-center gap-2 sm:gap-3 group">
                    <i class="fa-solid fa-compass text-campfire text-2xl sm:text-3xl group-hover:rotate-45 transition-transform duration-500"></i>
                    <span class="font-black text-lg sm:text-xl tracking-widest text-white light-mode:text-gray-900 drop-shadow-md hidden sm:block" data-i18n="nav_title">CUET AS</span>
                </a>
            </div>

            <div class="flex items-center gap-4 relative">
                
                <div id="nav-auth-wrap" class="flex items-center gap-4">
                    <a href="login.html" class="hidden sm:block text-sm font-bold text-gray-300 light-mode:text-gray-800 hover:text-white light-mode:hover:text-black transition-colors border-b border-transparent hover:border-white pb-0.5" data-i18n="nav_login">লগইন</a>
                    <a href="signup.html" class="inline-flex items-center gap-2 bg-campfire hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-glow transition-all hover:scale-105">
                        <i class="fa-solid fa-fire"></i> <span data-i18n="nav_create_acc">অ্যাকাউন্ট খুলুন</span>
                    </a>
                </div>

                <div id="nav-user-profile" class="hidden flex items-center gap-3 sm:gap-4">
                    <div class="text-right hidden md:block pr-4 border-r border-white/10 light-mode:border-gray-400">
                        <p id="nav-user-name" class="text-xs font-bold text-gray-200 light-mode:text-gray-900">Loading...</p>
                        <p class="text-[10px] text-campfire uppercase tracking-widest">Explorer</p>
                    </div>
                    
                    <div class="relative">
                        <button id="profile-btn" class="block w-10 h-10 rounded-full border-2 border-campfire p-0.5 overflow-hidden bg-white/5 focus:outline-none hover:border-white transition-colors shadow-glow">
                            <img id="nav-profile-img" src="https://ui-avatars.com/api/?name=User&background=e76f51&color=fff" alt="Profile" class="w-full h-full rounded-full object-cover">
                        </button>

                        <div id="profile-dropdown" class="hidden absolute right-0 mt-3 w-56 bg-moss light-mode:bg-white border border-white/10 light-mode:border-gray-200 rounded-2xl shadow-2xl py-2 transform transition-all duration-200 z-50 origin-top-right text-gray-300 light-mode:text-gray-700">
                            <div class="px-4 py-3 border-b border-white/10 light-mode:border-gray-200 md:hidden">
                                <p id="dropdown-user-name" class="text-sm font-bold text-white light-mode:text-black truncate">Loading...</p>
                                <p class="text-[10px] text-campfire uppercase tracking-widest mt-0.5">Explorer</p>
                            </div>
                            <a href="dashboard.html" class="block px-4 py-3 text-sm hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-colors flex items-center gap-3">
                                <i class="fa-solid fa-user w-5 text-center text-trail"></i> <span data-i18n="nav_profile">আমার প্রোফাইল</span>
                            </a>
                            <button onclick="openSettingsModal()" class="w-full text-left px-4 py-3 text-sm hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-colors flex items-center gap-3">
                                <i class="fa-solid fa-gear w-5 text-center text-blue-400"></i> <span data-i18n="nav_settings">সেটিংস</span>
                            </button>
                            <div class="border-t border-white/10 light-mode:border-gray-200 my-1"></div>
                            <a href="#" id="logout-btn" class="block px-4 py-3 text-sm text-red-400 font-bold hover:bg-red-500/10 transition-colors flex items-center gap-3">
                                <i class="fa-solid fa-right-from-bracket w-5 text-center"></i> <span data-i18n="nav_logout">লগ-আউট</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <div id="sidebar-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden transition-opacity"></div>
    
    <div id="sidebar" class="fixed inset-y-0 left-0 transform -translate-x-full transition-transform duration-500 ease-in-out z-50 w-72 sm:w-80 bg-moss light-mode:bg-white border-r border-white/5 light-mode:border-gray-200 shadow-2xl flex flex-col h-full overflow-y-auto">
        
        <div class="p-6 flex justify-between items-center border-b border-white/5 light-mode:border-gray-200">
            <span class="font-black text-xl tracking-widest text-white light-mode:text-black"><span class="text-campfire">C</span>UET <span class="text-campfire">A</span>S</span>
            <button id="sidebar-close-btn" class="text-gray-400 hover:text-white light-mode:hover:text-black text-2xl transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div class="px-6 py-8 flex-grow space-y-2 text-gray-300 light-mode:text-gray-700">
            <p class="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-4" data-i18n="sidebar_activities">আমাদের কার্যক্রম</p>
            
            <a href="events.html" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-campfire group-hover:scale-110 transition-transform"><i class="fa-solid fa-calendar-day"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_upcoming">আপকামিং ইভেন্ট</span>
            </a>
            <a href="#" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:scale-110 transition-transform"><i class="fa-solid fa-clock-rotate-left"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_past">পূর্ববর্তী ইভেন্ট</span>
            </a>
            
            <a href="stories.html" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><i class="fa-solid fa-book-open-reader"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_stories">অ্যাডভেঞ্চারের গল্প</span>
            </a>

            <!-- 🟢 LEADERBOARD LINK IN SIDEBAR -->
            <a href="leaderboard.html" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4 border border-white/5 light-mode:border-gray-200">
                <div class="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors shadow-glow-gold"><i class="fa-solid fa-trophy"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_leaderboard">লিডারবোর্ড</span>
            </a>
            
            <a href="#" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform"><i class="fa-solid fa-store"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_store">অ্যাডভেঞ্চার স্টোর</span>
            </a>
            
            <!-- 🟢 BEGINNER'S GUIDE LINK ENABLED HERE 🟢 -->
            <a href="beginner-guide.html" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><i class="fa-solid fa-map"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_guide">বিগিনার গাইড</span>
            </a>

            <a href="#" class="block py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><i class="fa-solid fa-users-viewfinder"></i></div>
                <span class="font-bold text-sm" data-i18n="menu_crew">নেপথ্যে যারা</span>
            </a>
            
            <div class="border-t border-white/5 light-mode:border-gray-200 my-4"></div>
            <button onclick="openSettingsModal()" class="w-full text-left py-3 px-4 rounded-xl hover:bg-white/5 light-mode:hover:bg-gray-100 hover:text-white light-mode:hover:text-black transition-all group flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-white/5 light-mode:bg-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform"><i class="fa-solid fa-gear"></i></div>
                <span class="font-bold text-sm" data-i18n="nav_settings">সেটিংস</span>
            </button>

            <a href="admin.html" id="sidebar-admin-link" class="hidden py-3 px-4 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-red-400 transition-all group flex items-center gap-4 mt-2">
                <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><i class="fa-solid fa-shield-halved"></i></div>
                <span class="font-bold text-sm uppercase tracking-widest">Admin Panel</span>
            </a>
        </div>

        <div class="p-6 border-t border-white/5 light-mode:border-gray-200 glass-dark">
            <div id="mobile-auth-section" class="space-y-3">
                <a href="signup.html" class="w-full flex items-center justify-center gap-2 bg-campfire hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-glow">
                    <i class="fa-solid fa-user-astronaut"></i> <span data-i18n="nav_create_acc">অ্যাকাউন্ট খুলুন</span>
                </a>
                <a href="login.html" class="w-full flex items-center justify-center gap-2 border border-white/10 light-mode:border-gray-400 text-gray-300 light-mode:text-gray-800 hover:bg-white/5 light-mode:hover:bg-gray-100 py-3 rounded-xl font-bold transition-all">
                    <i class="fa-solid fa-right-to-bracket"></i> <span data-i18n="nav_login">লগইন করুন</span>
                </a>
            </div>
            
            <div id="mobile-user-section" class="hidden space-y-3">
                <a href="dashboard.html" class="w-full flex items-center justify-center gap-2 bg-trail hover:bg-mountain text-white py-3 rounded-xl font-bold transition-all">
                    <i class="fa-solid fa-user"></i> <span data-i18n="nav_profile">আমার প্রোফাইল</span>
                </a>
                <a href="#" id="mobile-logout-btn" class="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 rounded-xl font-bold transition-all">
                    <i class="fa-solid fa-right-from-bracket"></i> <span data-i18n="nav_logout">লগ-আউট</span>
                </a>
            </div>
        </div>
    </div>

    <div id="settings-modal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onclick="closeSettingsModal()"></div>
        
        <div class="bg-moss light-mode:bg-white border border-white/10 light-mode:border-gray-200 rounded-3xl p-8 max-w-sm w-full mx-4 relative z-10 shadow-2xl transform scale-95 transition-transform duration-300" id="settings-content">
            
            <div class="flex justify-between items-center mb-6 border-b border-white/10 light-mode:border-gray-200 pb-4">
                <h3 class="text-xl font-black text-white light-mode:text-black flex items-center gap-2">
                    <i class="fa-solid fa-sliders text-campfire"></i> <span data-i18n="modal_settings">সেটিংস</span>
                </h3>
                <button onclick="closeSettingsModal()" class="text-gray-400 hover:text-white light-mode:hover:text-black transition-colors">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-white light-mode:text-black text-sm" data-i18n="modal_theme">থিম (Theme)</p>
                        <p class="text-xs text-gray-500" data-i18n="modal_theme_desc">ডার্ক ফরেস্ট বা মিস্ট মোড</p>
                    </div>
                    <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" id="theme-toggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 transition-transform duration-300"/>
                        <label for="theme-toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-white light-mode:text-black text-sm" data-i18n="modal_lang">ভাষা (Language)</p>
                        <p class="text-xs text-gray-500" data-i18n="modal_lang_desc">বাংলা অথবা English</p>
                    </div>
                    <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" id="lang-toggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 transition-transform duration-300"/>
                        <label for="lang-toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-blue-500 cursor-pointer"></label>
                    </div>
                </div>
            </div>

            <div class="mt-8">
                <button onclick="closeSettingsModal()" class="w-full bg-white/5 light-mode:bg-gray-100 hover:bg-white/10 light-mode:hover:bg-gray-200 border border-white/10 light-mode:border-gray-300 text-white light-mode:text-black font-bold py-3 rounded-xl transition-all" data-i18n="modal_done">
                    সম্পন্ন
                </button>
            </div>
        </div>
    </div>

    <section class="relative min-h-screen flex items-center justify-center text-white light-mode:text-gray-900 overflow-hidden pt-20">
        
        <div class="relative z-10 text-center px-6 max-w-5xl mx-auto" data-aos="zoom-out" data-aos-duration="1500">
            <div class="inline-block px-5 py-2 rounded-full border border-campfire/30 light-mode:border-campfire/60 text-campfire font-bold text-xs sm:text-sm mb-8 tracking-widest backdrop-blur-md shadow-glow animate-pulse bg-black/20 light-mode:bg-white/60">
                <i class="fa-solid fa-fire mr-2"></i> <span data-i18n="hero_badge">২০১৫ সাল থেকে পথচলা</span>
            </div>
            
            <h1 class="text-4xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tighter mb-8 text-glow-futuristic" data-i18n="hero_title">
                চুয়েট অ্যাডভেঞ্চার <br>সোসাইটি
            </h1>
            
            <p class="text-lg sm:text-2xl text-gray-300 light-mode:text-gray-700 font-medium mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-md" data-i18n="hero_desc">
                পাহাড়ের গহীনে, মেঘের চূড়ায় কিংবা অরণ্যের গভীরে—চুয়েটিয়ানদের পদচারণায় জেগে উঠুক নতুন ট্রেইল।
            </p>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href="signup.html" id="hero-auth-btn" class="w-full sm:w-auto bg-campfire hover:bg-orange-600 px-8 py-4 sm:py-5 rounded-2xl font-black transition-all shadow-glow flex items-center justify-center gap-3 text-lg sm:text-xl text-white hover:-translate-y-1">
                    <i id="hero-auth-icon" class="fa-solid fa-shoe-prints"></i> <span id="hero-auth-text" data-i18n="hero_explore">এক্সপ্লোর শুরু করুন</span>
                </a>
                
                <a href="login.html" id="hero-login-btn" class="w-full sm:w-auto bg-white/5 light-mode:bg-white/80 hover:bg-white/10 light-mode:hover:bg-white border border-white/10 light-mode:border-gray-400 text-white light-mode:text-gray-900 px-8 py-4 sm:py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg sm:text-xl backdrop-blur-sm hover:-translate-y-1 shadow-lg">
                    <i class="fa-solid fa-right-to-bracket text-gray-400 light-mode:text-gray-600"></i> <span data-i18n="hero_login">লগইন</span>
                </a>
            </div>
        </div>

        <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50 z-10 text-white light-mode:text-gray-800">
            <i class="fa-solid fa-angles-down text-2xl"></i>
        </div>
    </section>

    <section class="py-24 sm:py-32 max-w-4xl mx-auto px-6 relative z-10">
        <div class="absolute top-40 left-0 w-72 h-72 bg-trail/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="absolute bottom-40 right-0 w-96 h-96 bg-campfire/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div class="space-y-16 sm:space-y-24 text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose text-gray-200 light-mode:text-gray-800 font-light relative z-10">
            
            <div data-aos="fade-up" data-aos-duration="1000" class="text-center drop-shadow-md">
                <i class="fa-solid fa-quote-left text-4xl text-white/20 light-mode:text-black/20 mb-6"></i>
                <p class="font-bold text-white light-mode:text-black text-2xl sm:text-4xl leading-tight" data-i18n="story_q1">পাহাড় আর সমুদ্রের সীমানায় আমরা—<span class="text-campfire">চুয়েটিয়ান!</span></p>
                <p class="mt-4 font-medium" data-i18n="story_q2">দেশের সবচেয়ে সুন্দর রুটগুলো যাদের ক্যাম্পাসের ঠিক দোরগোড়ায়।</p>
            </div>

            <div data-aos="fade-up" data-aos-duration="1000" class="border-l-4 border-trail pl-6 sm:pl-8 py-2 drop-shadow-md">
                <p class="font-medium" data-i18n="story_p1">কখনো ভেবে দেখেছেন, ক্যাম্পাস লোকেশনের দিক থেকে আমরা চুয়েটিয়ানরা কতটা ভাগ্যবান?</p>
                <p class="mt-4" data-i18n="story_p2">রাউজানের পাশেই রাঙ্গুনিয়া, আর তার পরই রাঙামাটির নীল জল ও পাহাড়। লিচুবাগান থেকে অল্প দূরত্বেই মেঘের দেশ বান্দরবান, কাছেই খাগড়াছড়ির সবুজ উপত্যকা আর একদিকে বঙ্গোপসাগরের উত্তাল ঢেউ।</p>
                <p class="mt-4 font-bold text-white light-mode:text-black" data-i18n="story_p3">বাংলাদেশের আর কোনো ক্যাম্পাসের শিক্ষার্থীরা কি প্রকৃতির এত বৈচিত্র্য হাতের নাগালে পায়?</p>
            </div>

            <div data-aos="fade-up" data-aos-duration="1000" class="bg-[#0a1c13]/60 light-mode:bg-white/80 p-8 sm:p-12 rounded-3xl backdrop-blur-md border border-white/10 light-mode:border-gray-300 shadow-xl">
                <p class="font-bold text-campfire mb-6 text-xl sm:text-2xl" data-i18n="story_box_title">ঘুরতে যাওয়ার ইচ্ছে সবারই থাকে, কিন্তু...</p>
                <ul class="space-y-4 text-base sm:text-lg font-medium">
                    <li class="flex items-start gap-4"><i class="fa-solid fa-circle-xmark text-red-500 mt-1.5 opacity-70"></i> <span data-i18n="story_li1">পর্যাপ্ত যোগাযোগ বা সঠিক প্ল্যানিংয়ের অভাব?</span></li>
                    <li class="flex items-start gap-4"><i class="fa-solid fa-circle-xmark text-red-500 mt-1.5 opacity-70"></i> <span data-i18n="story_li2">একা একা ঘুরতে ভালো লাগে ঘন জঙ্গলে?</span></li>
                    <li class="flex items-start gap-4"><i class="fa-solid fa-circle-xmark text-red-500 mt-1.5 opacity-70"></i> <span data-i18n="story_li3">ছুটির দিনে ট্রাভেল পার্টনার খুঁজে পান না?</span></li>
                </ul>
                <div class="mt-10 pt-8 border-t border-white/10 light-mode:border-gray-300">
                    <p class="font-bold text-white light-mode:text-black text-xl sm:text-2xl" data-i18n="story_box_conc1">আর কোনো অজুহাত নয়!</p>
                    <p class="mt-2 text-base sm:text-lg font-medium" data-i18n="story_box_conc2">ভ্রমণপিপাসু চুয়েটিয়ানদের এক ছাদের নিচে আনতেই আমাদের এই প্ল্যাটফর্ম। একা নন, এবার পুরো ক্যাম্পাসের ট্রাভেলাররা আপনার সাথে।</p>
                </div>
            </div>

            <div data-aos="fade-up" data-aos-duration="1000">
                <h3 class="text-3xl font-black text-white light-mode:text-black mb-10 text-center uppercase tracking-widest drop-shadow-md" data-i18n="spec_title"><span class="text-trail">আমাদের</span> বিশেষত্ব</h3>
                <div class="grid sm:grid-cols-3 gap-6 sm:gap-8 text-base">
                    <div class="bg-[#0a1c13]/60 light-mode:bg-white/80 p-8 rounded-2xl backdrop-blur-md border border-white/5 light-mode:border-gray-300 hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                        <i class="fa-solid fa-calendar-check text-4xl text-trail mb-6 drop-shadow-md"></i>
                        <h4 class="font-bold text-white light-mode:text-black mb-3" data-i18n="spec_1_title">নিয়মিত ট্যুর</h4>
                        <p class="text-sm text-gray-300 light-mode:text-gray-700 font-medium" data-i18n="spec_1_desc">প্রতি মাসেই আয়োজন করা হয় দারুণ সব রোমাঞ্চকর ট্যুর।</p>
                    </div>
                    <div class="bg-[#0a1c13]/60 light-mode:bg-white/80 p-8 rounded-2xl backdrop-blur-md border border-white/5 light-mode:border-gray-300 hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                        <i class="fa-solid fa-map-location-dot text-4xl text-campfire mb-6 drop-shadow-md"></i>
                        <h4 class="font-bold text-white light-mode:text-black mb-3" data-i18n="spec_2_title">হিডেন স্পট শেয়ারিং</h4>
                        <p class="text-sm text-gray-300 light-mode:text-gray-700 font-medium" data-i18n="spec_2_desc">ক্যাম্পাসের আশপাশের অজানা ঝিরি বা পাহাড় খুঁজে পেলে শেয়ার করুন। সঙ্গী পেতে দেরি হবে না!</p>
                    </div>
                    <div class="bg-[#0a1c13]/60 light-mode:bg-white/80 p-8 rounded-2xl backdrop-blur-md border border-white/5 light-mode:border-gray-300 hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                        <i class="fa-solid fa-people-group text-4xl text-blue-400 mb-6 drop-shadow-md"></i>
                        <h4 class="font-bold text-white light-mode:text-black mb-3" data-i18n="spec_3_title">কমিউনিটি পাওয়ার</h4>
                        <p class="text-sm text-gray-300 light-mode:text-gray-700 font-medium" data-i18n="spec_3_desc">একাকী ভ্রমণ নয়, দল বেঁধে ঘুরে বেড়ানোর নিখাদ আনন্দ।</p>
                    </div>
                </div>
            </div>

            <!-- 🟢 NEW: HOME LEADERBOARD HOOK -->
            <div data-aos="fade-up" data-aos-duration="1000" class="pt-10">
                <h3 class="text-3xl font-black text-white light-mode:text-black mb-4 text-center uppercase tracking-widest drop-shadow-md" data-i18n="home_lb_title">ক্যাম্পাসের <span class="text-yellow-500">সেরা এক্সপ্লোরার</span></h3>
                <p class="text-base text-gray-400 light-mode:text-gray-600 text-center mb-10" data-i18n="home_lb_desc">লিডারবোর্ডের শীর্ষে থাকা ৩ জন অ্যাডভেঞ্চারার</p>
                
                <!-- Loading State for Home Leaderboard -->
                <div id="home-lb-loader" class="flex justify-center py-10">
                    <i class="fa-solid fa-trophy text-4xl text-yellow-500 animate-pulse drop-shadow-md"></i>
                </div>
                
                <div id="home-podium" class="flex flex-col md:flex-row items-end justify-center gap-4 sm:gap-6 mt-12 hidden">
                    <!-- Top 3 Injected via JS -->
                </div>

                <div class="text-center mt-12">
                    <a href="leaderboard.html" class="inline-flex items-center gap-2 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black px-6 py-3 rounded-full font-bold text-sm transition-all shadow-glow-gold">
                        <span data-i18n="home_lb_btn">সম্পূর্ণ লিডারবোর্ড দেখুন</span> <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </div>

            <div data-aos="zoom-in" data-aos-duration="1200" class="text-center pt-24">
                <p class="font-black text-3xl sm:text-5xl text-white light-mode:text-black mb-10 drop-shadow-lg" data-i18n="call_title">প্রস্তুত তো পরবর্তী রোমাঞ্চের জন্য?</p>
                <p class="text-base sm:text-xl font-medium mb-12 max-w-2xl mx-auto drop-shadow-md" data-i18n="call_desc">যুক্ত হোন আমাদের কমিউনিটিতে, অংশ নিন আগামী ট্যুরে এবং উপভোগ করুন বাংলার সেরা প্রাকৃতিক সৌন্দর্য।</p>
                
                <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a href="signup.html" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-campfire hover:bg-orange-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-glow hover:scale-105 transition-all">
                        <i class="fa-solid fa-compass"></i> <span data-i18n="call_join">জয়েন করুন</span>
                    </a>
                    <a href="login.html" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white/10 light-mode:bg-white/80 border border-white/20 light-mode:border-gray-400 hover:bg-white/20 light-mode:hover:bg-white text-white light-mode:text-gray-900 px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all backdrop-blur-md shadow-lg">
                        <i class="fa-solid fa-right-to-bracket"></i> <span data-i18n="call_login">লগইন করুন</span>
                    </a>
                </div>
            </div>

        </div>
    </section>

    <footer class="relative z-10 bg-[#030705]/80 light-mode:bg-white/95 backdrop-blur-lg border-t border-white/10 light-mode:border-gray-200 pt-20 pb-10 mt-10">
        <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 sm:gap-20 mb-16">
            <div data-aos="fade-up" data-aos-delay="0">
                <div class="flex items-center gap-3 mb-6">
                    <i class="fa-solid fa-compass text-campfire text-3xl"></i>
                    <span class="font-black text-2xl text-white light-mode:text-black tracking-widest" data-i18n="nav_title">CUET AS</span>
                </div>
                <p class="text-sm text-gray-400 light-mode:text-gray-600 leading-relaxed mb-4 font-medium" data-i18n="footer_addr">
                    চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয় (চুয়েট), রাউজান, চট্টগ্রাম।
                </p>
                <p class="text-sm text-gray-400 light-mode:text-gray-600 font-bold">Email: <span class="text-gray-300 light-mode:text-gray-800 font-normal">adventure@cuet.ac.bd</span></p>
            </div>
            <div class="hidden md:block"></div>
            <div data-aos="fade-up" data-aos-delay="100" class="md:text-right">
                <h4 class="font-black text-sm mb-6 text-white light-mode:text-black uppercase tracking-widest" data-i18n="footer_conn">কানেক্টেড থাকুন</h4>
                <div class="flex flex-wrap md:justify-end gap-3 sm:gap-4 text-xl">
                    <a href="#" class="w-12 h-12 rounded-full glass-dark flex items-center justify-center hover:bg-facebook hover:text-white transition-all hover:-translate-y-1"><i class="fa-brands fa-facebook-f"></i></a>
                    <a href="#" class="w-12 h-12 rounded-full glass-dark flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:-translate-y-1"><i class="fa-solid fa-users"></i></a>
                    <a href="#" class="w-12 h-12 rounded-full glass-dark flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all hover:-translate-y-1"><i class="fa-brands fa-instagram"></i></a>
                    <a href="#" class="w-12 h-12 rounded-full glass-dark flex items-center justify-center hover:bg-red-600 hover:text-white transition-all hover:-translate-y-1"><i class="fa-brands fa-youtube"></i></a>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-6 border-t border-white/10 light-mode:border-gray-200 pt-8 flex flex-col sm:flex-row justify-between items-center text-[11px] sm:text-xs text-gray-500 light-mode:text-gray-600 font-bold">
            <p data-i18n="footer_copy">&copy; ২০২৬ CUET Adventure Society (CAS)। সর্বস্বত্ব সংরক্ষিত।</p>
            <p class="mt-4 sm:mt-0 tracking-widest uppercase">Designed And developed by CUET adventure society</p>
        </div>
    </footer>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script> AOS.init({ once: true, offset: 100 }); </script>

    <script src="https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.11.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore-compat.js"></script>

    <script>
        // ==========================================
        // 1. I18N DICTIONARY & LANGUAGE ENGINE
        // ==========================================
        const translations = {
            "nav_title": { bn: "CUET AS", en: "CUET AS" },
            "nav_login": { bn: "লগইন", en: "Login" },
            "nav_create_acc": { bn: "অ্যাকাউন্ট খুলুন", en: "Create Account" },
            "nav_profile": { bn: "আমার প্রোফাইল", en: "My Profile" },
            "nav_settings": { bn: "সেটিংস", en: "Settings" },
            "nav_logout": { bn: "লগ-আউট", en: "Logout" },
            "sidebar_activities": { bn: "আমাদের কার্যক্রম", en: "OUR ACTIVITIES" },
            "menu_upcoming": { bn: "আপকামিং ইভেন্ট", en: "Upcoming Events" },
            "menu_past": { bn: "পূর্ববর্তী ইভেন্ট", en: "Past Events" },
            "menu_stories": { bn: "অ্যাডভেঞ্চারের গল্প", en: "Adventure Stories" },
            "menu_leaderboard": { bn: "লিডারবোর্ড", en: "Leaderboard" },
            "menu_store": { bn: "অ্যাডভেঞ্চার স্টোর", en: "Adventure Store" },
            "menu_guide": { bn: "বিগিনার গাইড", en: "Beginner's Guide" },
            "menu_crew": { bn: "নেপথ্যে যারা", en: "Behind the Scenes" },
            "modal_settings": { bn: "সেটিংস", en: "Settings" },
            "modal_theme": { bn: "থিম (Theme)", en: "Theme" },
            "modal_theme_desc": { bn: "ডার্ক ফরেস্ট বা মিস্ট মোড", en: "Dark Forest or Mist Mode" },
            "modal_lang": { bn: "ভাষা (Language)", en: "Language" },
            "modal_lang_desc": { bn: "বাংলা অথবা English", en: "Bangla or English" },
            "modal_done": { bn: "সম্পন্ন", en: "Done" },
            "hero_badge": { bn: "২০১৫ সাল থেকে পথচলা", en: "Journey since 2015" },
            "hero_title": { bn: "চুয়েট অ্যাডভেঞ্চার <br>সোসাইটি", en: "CUET Adventure <br>Society" },
            "hero_desc": { bn: "পাহাড়ের গহীনে, মেঘের চূড়ায় কিংবা অরণ্যের গভীরে—চুয়েটিয়ানদের পদচারণায় জেগে উঠুক নতুন ট্রেইল।", en: "Deep in the mountains, at cloud peaks or inside dense forests—let new trails awaken with the footsteps of CUETians." },
            "hero_explore": { bn: "এক্সপ্লোর শুরু করুন", en: "Start Exploring" },
            "hero_dashboard": { bn: "আমার অ্যাডভেঞ্চার অ্যাকাউন্ট", en: "My Adventure Account" },
            "hero_login": { bn: "লগইন", en: "Login" },
            "story_q1": { bn: "পাহাড় আর সমুদ্রের সীমানায় আমরা—<span class='text-campfire'>চুয়েটিয়ান!</span>", en: "At the border of mountains and sea, we are—<span class='text-campfire'>CUETians!</span>" },
            "story_q2": { bn: "দেশের সবচেয়ে সুন্দর রুটগুলো যাদের ক্যাম্পাসের ঠিক দোরগোড়ায়।", en: "The most beautiful routes of the country are right at our campus doorstep." },
            "story_p1": { bn: "কখনো ভেবে দেখেছেন, ক্যাম্পাস লোকেশনের দিক থেকে আমরা চুয়েটিয়ানরা কতটা ভাগ্যবান?", en: "Have you ever wondered how lucky we CUETians are in terms of campus location?" },
            "story_p2": { bn: "রাউজানের পাশেই রাঙ্গুনিয়া, আর তার পরই রাঙামাটির নীল জল ও পাহাড়। লিচুবাগান থেকে অল্প দূরত্বেই মেঘের দেশ বান্দরবান, কাছেই খাগড়াছড়ির সবুজ উপত্যকা আর একদিকে বঙ্গোপসাগরের উত্তাল ঢেউ।", en: "Beside Raozan is Rangunia, followed by the blue waters and hills of Rangamati. Bandarban is a short distance from Lichubagan, the green valleys of Khagrachhari are nearby, and the turbulent waves of the Bay of Bengal on one side." },
            "story_p3": { bn: "বাংলাদেশের আর কোনো ক্যাম্পাসের শিক্ষার্থীরা কি প্রকৃতির এত বৈচিত্র্য হাতের নাগালে পায়?", en: "Do students of any other campus in Bangladesh get such diversity of nature at their fingertips?" },
            "story_box_title": { bn: "ঘুরতে যাওয়ার ইচ্ছে সবারই থাকে, কিন্তু...", en: "Everyone wishes to travel, but..." },
            "story_li1": { bn: "পর্যাপ্ত যোগাযোগ বা সঠিক প্ল্যানিংয়ের অভাব?", en: "Lack of proper communication or correct planning?" },
            "story_li2": { bn: "একা একা ঘুরতে ভালো লাগে ঘন জঙ্গলে?", en: "Don't like traveling alone in deep forests?" },
            "story_li3": { bn: "ছুটির দিনে ট্রাভেল পার্টনার খুঁজে পান না?", en: "Can't find a travel partner on holidays?" },
            "story_box_conc1": { bn: "আর কোনো অজুহাত নয়!", en: "No more excuses!" },
            "story_box_conc2": { bn: "ভ্রমণপিপাসু চুয়েটিয়ানদের এক ছাদের নিচে আনতেই আমাদের এই প্ল্যাটফর্ম। একা নন, এবার পুরো ক্যাম্পাসের ট্রাভেলাররা আপনার সাথে।", en: "Our platform aims to bring travel-thirsty CUETians under one roof. You are not alone, the whole campus of travelers is with you." },
            "spec_title": { bn: "<span class='text-trail'>আমাদের</span> বিশেষত্ব", en: "<span class='text-trail'>Our</span> Specialties" },
            "spec_1_title": { bn: "নিয়মিত ট্যুর", en: "Regular Tours" },
            "spec_1_desc": { bn: "প্রতি মাসেই আয়োজন করা হয় দারুণ সব রোমাঞ্চকর ট্যুর।", en: "Awesome adventurous tours are organized every month." },
            "spec_2_title": { bn: "হিডেন স্পট শেয়ারিং", en: "Hidden Spot Sharing" },
            "spec_2_desc": { bn: "ক্যাম্পাসের আশপাশের অজানা ঝিরি বা পাহাড় খুঁজে পেলে শেয়ার করুন। সঙ্গী পেতে দেরি হবে মাতৃ না!", en: "Share if you find unknown streams or hills around the campus. It won't take long to find companions!" },
            "spec_3_title": { bn: "কমিউনিটি পাওয়ার", en: "Community Power" },
            "spec_3_desc": { bn: "একাকী ভ্রমণ নয়, দল বেঁধে ঘুরে বেড়ানোর নিখাদ আনন্দ।", en: "Not solo travel, but the pure joy of roaming in groups." },
            "home_lb_title": { bn: "ক্যাম্পাসের <span class='text-yellow-500'>সেরা এক্সপ্লোরার</span>", en: "Campus <span class='text-yellow-500'>Top Explorers</span>" },
            "home_lb_desc": { bn: "লিডারবোর্ডের শীর্ষে থাকা ৩ জন অ্যাডভেঞ্চারার", en: "The top 3 adventurers on the leaderboard" },
            "home_lb_btn": { bn: "সম্পূর্ণ লিডারবোর্ড দেখুন", en: "View Full Leaderboard" },
            "call_title": { bn: "প্রস্তুত তো পরবর্তী রোমাঞ্চের জন্য?", en: "Ready for the next adventure?" },
            "call_desc": { bn: "যুক্ত হোন আমাদের কমিউনিটিতে, অংশ নিন আগামী ট্যুরে এবং উপভোগ করুন বাংলার সেরা প্রাকৃতিক সৌন্দর্য।", en: "Join our community, participate in upcoming tours and enjoy the best natural beauty of Bengal." },
            "call_join": { bn: "জয়েন করুন", en: "Join Now" },
            "call_login": { bn: "লগইন করুন", en: "Log In" },
            "footer_addr": { bn: "চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয় (চুয়েট), রাউজান, চট্টগ্রাম।", en: "Chittagong University of Engineering & Technology (CUET), Raozan, Chattogram." },
            "footer_conn": { bn: "কানেক্টেড থাকুন", en: "Stay Connected" },
            "footer_copy": { bn: "&copy; ২০২৬ CUET Adventure Society (CAS)। সর্বস্বত্ব সংরক্ষিত।", en: "&copy; 2026 CUET Adventure Society (CAS). All rights reserved." }
        };

        const langToggle = document.getElementById('lang-toggle');
        let currentLang = localStorage.getItem('lang') || 'bn';

        if(currentLang === 'en') {
            langToggle.checked = true;
        }

        function applyTranslations(lang) {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[key] && translations[key][lang]) {
                    el.innerHTML = translations[key][lang];
                }
            });
            // Re-render Home Podium to update "Treks" label translation
            if(window.topUsersCached) renderHomePodium(window.topUsersCached);
        }

        langToggle.addEventListener('change', function() {
            currentLang = this.checked ? 'en' : 'bn';
            localStorage.setItem('lang', currentLang);
            applyTranslations(currentLang);
        });

        applyTranslations(currentLang);

        // ==========================================
        // UI & Sidebar Logic
        // ==========================================
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarOpenBtn = document.getElementById('sidebar-open-btn');
        const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');

        function openSidebar() { sidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden'); }
        function closeSidebar() { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); }

        sidebarOpenBtn.addEventListener('click', openSidebar);
        sidebarCloseBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);

        if(profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
            });
        }
        window.addEventListener('click', () => {
            if (profileDropdown && !profileDropdown.classList.contains('hidden')) profileDropdown.classList.add('hidden');
        });

        // ==========================================
        // THEME ENGINE LOGIC
        // ==========================================
        const htmlRoot = document.documentElement;
        const bodyContent = document.getElementById('body-content');
        const themeToggle = document.getElementById('theme-toggle');
        
        const bgDarkImg = document.getElementById('bg-dark-img');
        const bgDarkOverlay = document.getElementById('bg-dark-overlay');
        const bgLightImg = document.getElementById('bg-light-img');
        const bgLightOverlay = document.getElementById('bg-light-overlay');

        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'light') {
            enableLightMode();
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                enableLightMode();
                localStorage.setItem('theme', 'light');
            } else {
                enableDarkMode();
                localStorage.setItem('theme', 'dark');
            }
        });

        function enableLightMode() {
            htmlRoot.classList.add('light'); 
            bodyContent.classList.add('light-mode'); 
            bgDarkImg.classList.replace('opacity-50', 'opacity-0');
            bgDarkOverlay.classList.replace('opacity-100', 'opacity-0');
            bgLightImg.classList.replace('opacity-0', 'opacity-40');
            bgLightOverlay.classList.replace('opacity-0', 'opacity-100');
        }

        function enableDarkMode() {
            htmlRoot.classList.remove('light');
            bodyContent.classList.remove('light-mode');
            bgLightImg.classList.replace('opacity-40', 'opacity-0');
            bgLightOverlay.classList.replace('opacity-100', 'opacity-0');
            bgDarkImg.classList.replace('opacity-0', 'opacity-50');
            bgDarkOverlay.classList.replace('opacity-0', 'opacity-100');
        }

        // ==========================================
        // SETTINGS MODAL
        // ==========================================
        const settingsModal = document.getElementById('settings-modal');
        const settingsContent = document.getElementById('settings-content');

        function openSettingsModal() {
            settingsModal.classList.remove('hidden');
            setTimeout(() => { settingsContent.classList.remove('scale-95'); settingsContent.classList.add('scale-100'); }, 10);
            if (!profileDropdown.classList.contains('hidden')) profileDropdown.classList.add('hidden'); 
            closeSidebar(); 
        }

        function closeSettingsModal() {
            settingsContent.classList.remove('scale-100');
            settingsContent.classList.add('scale-95');
            setTimeout(() => { settingsModal.classList.add('hidden'); }, 300);
        }

        // ==========================================
        // FIREBASE LOGIC & HOME LEADERBOARD SYNC
        // ==========================================
        const firebaseConfig = {
            apiKey: "AIzaSyDX3usovY7xlO4wY8GfJ3bk6pnRClGf1Ag",
            authDomain: "cuet-as.firebaseapp.com",
            projectId: "cuet-as",
            storageBucket: "cuet-as.firebasestorage.app",
            messagingSenderId: "869959746091",
            appId: "1:869959746091:web:fa2c086441fc429a14606e",
            measurementId: "G-WNJBJT9K5K"
        };

        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        auth.onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('nav-auth-wrap').classList.add('hidden');
                const mobileAuthSection = document.getElementById('mobile-auth-section');
                if(mobileAuthSection) mobileAuthSection.classList.add('hidden');
                
                const heroLoginBtn = document.getElementById('hero-login-btn');
                if(heroLoginBtn) heroLoginBtn.classList.add('hidden');
                document.getElementById('nav-user-profile').classList.remove('hidden');
                
                const mobileUserSection = document.getElementById('mobile-user-section');
                if(mobileUserSection) mobileUserSection.classList.remove('hidden');
                
                const heroAuthBtn = document.getElementById('hero-auth-btn');
                document.getElementById('hero-auth-icon').className = 'fa-solid fa-user-astronaut';
                document.getElementById('hero-auth-text').setAttribute('data-i18n', 'hero_dashboard');
                heroAuthBtn.href = 'dashboard.html';
                heroAuthBtn.classList.replace('bg-campfire', 'bg-trail');
                heroAuthBtn.classList.replace('hover:bg-orange-600', 'hover:bg-mountain');
                
                applyTranslations(currentLang); 

                db.collection("users").doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        document.getElementById('nav-user-name').innerText = userData.fullName || "Explorer";
                        document.getElementById('dropdown-user-name').innerText = userData.fullName || "Explorer";
                        const finalAvatarUrl = userData.photoURL ? userData.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName || "User")}&background=e76f51&color=fff&size=256&bold=true`;
                        const navProfileImg = document.getElementById('nav-profile-img');
                        if (navProfileImg) navProfileImg.src = finalAvatarUrl;

                        if(userData.role === 'admin') {
                            const adminLink = document.getElementById('sidebar-admin-link');
                            if(adminLink) adminLink.classList.remove('hidden');
                        }
                    }
                });
            } else {
                document.getElementById('nav-auth-wrap').classList.remove('hidden');
                const mobileAuthSection = document.getElementById('mobile-auth-section');
                if(mobileAuthSection) mobileAuthSection.classList.remove('hidden');
                
                const heroLoginBtn = document.getElementById('hero-login-btn');
                if(heroLoginBtn) heroLoginBtn.classList.remove('hidden');
                document.getElementById('nav-user-profile').classList.add('hidden');
                
                const mobileUserSection = document.getElementById('mobile-user-section');
                if(mobileUserSection) mobileUserSection.classList.add('hidden');
            }
        });

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => { window.location.reload(); });
        });

        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        if(mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut().then(() => { window.location.reload(); });
            });
        }

        // 🟢 HOME LEADERBOARD LOGIC
        window.topUsersCached = [];

        function getAvatar(name, photo) {
            return photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0a1c13&color=fff&size=256`;
        }

        function createMiniPodiumCard(user, rank) {
            const colors = {
                1: { border: 'border-gold', shadow: 'shadow-glow-gold', icon: 'fa-crown text-gold', height: 'md:h-64', scale: 'scale-110', delay: '100' },
                2: { border: 'border-silver', shadow: 'shadow-[0_0_15px_rgba(192,192,192,0.4)]', icon: 'fa-medal text-silver', height: 'md:h-56', scale: 'scale-100', delay: '200' },
                3: { border: 'border-bronze', shadow: 'shadow-[0_0_15px_rgba(205,127,50,0.4)]', icon: 'fa-award text-bronze', height: 'md:h-48', scale: 'scale-95', delay: '300' }
            };
            const c = colors[rank];
            const trekLabel = currentLang === 'en' ? 'Treks' : 'ট্রেক';
            
            return `
                <div class="podium-${rank} order-${rank === 1 ? '1 md:order-2' : (rank === 2 ? '2 md:order-1' : '3 md:order-3')} w-full md:w-1/3 flex flex-col justify-end" data-aos="zoom-in" data-aos-delay="${c.delay}">
                    <div onclick="window.location.href='public-profile.html?uid=${user.id}'" class="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:-translate-y-2 border-t-4 ${c.border} ${c.shadow} ${c.height} ${c.scale}">
                        <div class="relative mb-3">
                            <i class="fa-solid ${c.icon} text-2xl absolute -top-4 left-1/2 transform -translate-x-1/2 drop-shadow-md"></i>
                            <img src="${getAvatar(user.fullName, user.photoURL)}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 ${c.border} object-cover">
                        </div>
                        <h3 class="font-black text-white light-mode:text-black text-sm sm:text-base leading-tight mb-1 truncate w-full px-2">${user.fullName.split(' ')[0]}</h3>
                        <div class="bg-black/30 light-mode:bg-gray-100 px-3 py-1.5 rounded-lg border border-white/10 light-mode:border-gray-300 w-full mt-2">
                            <p class="text-lg font-black text-white light-mode:text-black leading-none">${user.totalTreks || 0}</p>
                            <p class="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">${trekLabel}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        function renderHomePodium(users) {
            const podiumContainer = document.getElementById('home-podium');
            const loader = document.getElementById('home-lb-loader');

            if(loader) loader.classList.add('hidden');
            
            if (users.length === 0) return; // If no users have treks, hide section

            if(podiumContainer) {
                podiumContainer.innerHTML = '';
                podiumContainer.classList.remove('hidden');
                
                if(users[0]) podiumContainer.innerHTML += createMiniPodiumCard(users[0], 1);
                if(users[1]) podiumContainer.innerHTML += createMiniPodiumCard(users[1], 2);
                if(users[2]) podiumContainer.innerHTML += createMiniPodiumCard(users[2], 3);
            }
        }

        // Fetch Top 3 Users from Firestore
        db.collection("users")
          .where("totalTreks", ">", 0)
          .get()
          .then((querySnapshot) => {
              let users = [];
              querySnapshot.forEach(doc => { users.push({ id: doc.id, ...doc.data() }); });

              // Smart Sorting: totalTreks first, totalDistance second
              users.sort((a, b) => {
                  const treksA = a.totalTreks || 0; const treksB = b.totalTreks || 0;
                  if (treksB !== treksA) return treksB - treksA;
                  const distA = a.totalDistance || 0; const distB = b.totalDistance || 0;
                  return distB - distA;
              });

              window.topUsersCached = users.slice(0, 3); // Get only Top 3
              renderHomePodium(window.topUsersCached);
          })
          .catch(error => console.error("Error fetching home leaderboard:", error));
    </script>
</body>
</html>
