import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Plus, Trash2, GripVertical, 
  Dumbbell, Settings, CheckCircle2, Circle, Clock, Coffee, Volume2, 
  VolumeX, X, Footprints, Activity, Zap, Bike, Waves, Flame, Star,
  Save, Download, Upload, FileJson, MoveHorizontal, Layers
} from 'lucide-react';

// --- CONSTANTS ---

const ICON_OPTIONS = [
  { id: 'dumbbell', icon: Dumbbell, label: 'Weights' },
  { id: 'running', icon: Footprints, label: 'Running' },
  { id: 'cardio', icon: Activity, label: 'Cardio' },
  { id: 'hiit', icon: Zap, label: 'HIIT' },
  { id: 'yoga', icon: Circle, label: 'Yoga' },
  { id: 'stretch', icon: MoveHorizontal, label: 'Stretching' },
  { id: 'bike', icon: Bike, label: 'Cycling' },
  { id: 'swim', icon: Waves, label: 'Swimming' },
  { id: 'core', icon: Flame, label: 'Core' },
];

const MOTIVATION = {
  start: ["Let's go!", "Crush it!", "Push hard!", "Work!", "Begin!"],
  rest: ["Recover.", "Breathe.", "Relax.", "Shake it out.", "Rest."],
  complete: ["Workout complete. Great job!", "You did it!", "Awesome work!"]
};

// --- AUDIO ENGINE ---

const AudioEngine = {
  ctx: null,
  
  init: () => {
    try {
      if (!AudioEngine.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) AudioEngine.ctx = new AudioContext();
      }
      if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') {
        AudioEngine.ctx.resume();
      }
    } catch (e) {
      console.error("Audio init failed", e);
    }
  },

  play: (type) => {
    try {
      AudioEngine.init();
      if (!AudioEngine.ctx) return;
      const ctx = AudioEngine.ctx;
      const t = ctx.currentTime;

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      } 
      else if (type === 'bell') {
        const fundamental = 400;
        const ratios = [1, 2.5, 3.8, 6.2];
        ratios.forEach((ratio, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = fundamental * ratio;
          osc.type = i === 0 ? 'triangle' : 'sine';
          gain.gain.setValueAtTime(0.2 / (i + 1), t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 1.5);
        });
      }
      else if (type === 'whistle') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.3);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
      else if (type === 'victory') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const start = t + (i * 0.1);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 2.0);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 2.0);
        });
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  },

  speak: (text, type = 'neutral') => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      let phrase = text;
      // Add motivation if applicable
      if (MOTIVATION[type]) {
        const options = MOTIVATION[type];
        const randomPhrase = options[Math.floor(Math.random() * options.length)];
        // If text is provided and distinct from type, combine them
        if (text && text.toLowerCase() !== type.toLowerCase()) {
           phrase = `${randomPhrase} ${text}`;
        } else {
           phrase = randomPhrase;
        }
      }

      const u = new SpeechSynthesisUtterance(phrase);
      u.rate = 1.1;
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha") || v.lang.startsWith('en'));
        if (preferred) u.voice = preferred;
      }

      window.speechSynthesis.speak(u);
    } catch (e) {
      console.error("Speech failed", e);
    }
  }
};

// --- HELPER COMPONENTS ---

const CircularProgress = ({ timeLeft, totalTime, phase, isWarning }) => {
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const safeTotal = totalTime > 0 ? totalTime : 1;
  const progress = timeLeft / safeTotal;
  const strokeDashoffset = circumference - (progress * circumference);

  let color = 'stroke-emerald-500';
  if (phase === 'rest' || phase === 'setRest') color = 'stroke-blue-500';
  if (isWarning) color = 'stroke-amber-500';
  if (phase === 'finished') color = 'stroke-purple-500';

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg] transition-all duration-300">
        <circle
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          className={`${color} transition-all duration-300`}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset: isNaN(strokeDashoffset) ? 0 : strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
         <span className={`text-6xl font-black font-mono tracking-tighter ${isWarning ? 'text-amber-500' : 'text-white'}`}>
           {timeLeft}
         </span>
         <span className="text-xs uppercase tracking-widest text-slate-400 mt-2 font-bold opacity-80">Seconds</span>
      </div>
    </div>
  );
};

const SetAnnouncement = ({ setNumber }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* CSS Animation defined in styles below */}
        <style>{`
          @keyframes slideAcross {
            0% { transform: translateX(100%) skewX(-12deg); opacity: 0; }
            15% { transform: translateX(0) skewX(-12deg); opacity: 1; }
            85% { transform: translateX(0) skewX(-12deg); opacity: 1; }
            100% { transform: translateX(-150%) skewX(-12deg); opacity: 0; }
          }
          .banner-anim {
            animation: slideAcross 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        `}</style>
        <div className="banner-anim w-[120%] bg-emerald-500/90 backdrop-blur-md py-8 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)] border-y-4 border-emerald-300">
           <h2 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase drop-shadow-md">
             SET {setNumber}
           </h2>
        </div>
    </div>
  )
};


// --- MAIN APP ---

export default function App() {
  // --- STATE ---
  const [config, setConfig] = useState({ workDuration: 20, restDuration: 10, setRestDuration: 30, numSets: 3 });
  
  const [exercises, setExercises] = useState([
    { id: '1', name: 'Burpees', notes: 'Explode up!', customDuration: null, customRest: null, icon: 'hiit' },
    { id: '2', name: 'Mtn Climbers', notes: 'Drive knees', customDuration: null, customRest: null, icon: 'running' },
    { id: '3', name: 'Plank', notes: 'Tight core', customDuration: 45, customRest: 15, icon: 'core' },
  ]);
  
  const [status, setStatus] = useState('idle'); 
  const [timer, setTimer] = useState({
    currentSet: 1,
    exIndex: 0,
    phase: 'getReady',
    timeLeft: 5,
    maxTime: 5,
    completed: [],
  });

  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Banner State
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState(1);

  const intervalRef = useRef(null);

  // --- MOBILE / PWA ENHANCEMENTS ---
  useEffect(() => {
    // Inject Meta tags for mobile experience
    const metaTags = [
      { name: 'theme-color', content: '#0f172a' }, // Match bg-slate-900
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
    ];

    metaTags.forEach(tag => {
      // Check if exists to avoid duplicates in dev mode
      if (!document.querySelector(`meta[name="${tag.name}"]`)) {
        const el = document.createElement('meta');
        el.name = tag.name;
        el.content = tag.content;
        document.head.appendChild(el);
      }
    });
  }, []);

  // Load voices safely when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const loadVoices = () => { window.speechSynthesis.getVoices(); };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handler = () => setOpenDropdownId(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Watch for SetRest Phase to trigger banner
  useEffect(() => {
    if (timer.phase === 'setRest') {
        setBannerText(timer.currentSet + 1);
        setShowBanner(true);
        const t = setTimeout(() => setShowBanner(false), 2500);
        return () => clearTimeout(t);
    }
  }, [timer.phase, timer.currentSet]);

  // --- LOGIC ---

  const calculateTotalTime = () => {
    if (!exercises || exercises.length === 0) return 0;
    let singleRound = 0;
    exercises.forEach((ex, i) => {
      singleRound += (ex.customDuration || config.workDuration);
      if (i < exercises.length - 1) {
        // Safe access for customRest
        const rest = (ex.customRest !== undefined && ex.customRest !== null) ? ex.customRest : config.restDuration;
        singleRound += rest;
      }
    });
    return (singleRound * config.numSets) + ((config.numSets - 1) * config.setRestDuration);
  };

  const tick = useCallback(() => {
    setTimer(prev => {
      // Safety: If exercises deleted while running, pause/reset
      if (!exercises || exercises.length === 0) {
        setStatus('idle');
        return prev;
      }

      // 1. Countdown
      if (prev.timeLeft > 1) {
        const nextTime = prev.timeLeft - 1;
        if (!isMuted) {
          if (nextTime <= 3) AudioEngine.play('tick');
        }
        return { ...prev, timeLeft: nextTime };
      }

      // 2. Phase Transition
      let { phase, exIndex, currentSet, completed } = prev;
      let nextPhase = phase;
      let nextExIndex = exIndex;
      let nextSet = currentSet;
      let nextTimeLeft = 0;
      let nextMaxTime = 0;
      let nextCompleted = [...completed];

      // Logic Machine
      if (phase === 'getReady') {
        nextPhase = 'work';
        const ex = exercises[0];
        nextMaxTime = ex ? (ex.customDuration || config.workDuration) : config.workDuration;
        nextTimeLeft = nextMaxTime;
        if (!isMuted && ex) {
          AudioEngine.play('bell');
          AudioEngine.speak(ex.name, 'start');
        }
      }
      else if (phase === 'work') {
        const currentEx = exercises[exIndex];
        if (currentEx) nextCompleted.push(`${currentSet}-${currentEx.id}`);
        
        if (exIndex >= exercises.length - 1) {
          // End of Set
          if (currentSet >= config.numSets) {
            setStatus('finished');
            if (!isMuted) {
               AudioEngine.play('victory');
               AudioEngine.speak(null, 'complete');
            }
            return { ...prev, timeLeft: 0, phase: 'finished' };
          } else {
            // Set Rest
            nextPhase = 'setRest';
            nextMaxTime = config.setRestDuration;
            nextTimeLeft = nextMaxTime;
            if (!isMuted) {
               AudioEngine.play('whistle');
               AudioEngine.speak("Rest", 'rest');
            }
          }
        } else {
          // Exercise Rest
          nextPhase = 'rest';
          const nextRest = (currentEx && currentEx.customRest !== undefined && currentEx.customRest !== null) ? currentEx.customRest : config.restDuration;
          nextMaxTime = nextRest;
          nextTimeLeft = nextMaxTime;
          if (!isMuted) {
             AudioEngine.play('whistle');
             AudioEngine.speak("Rest", 'rest');
          }
        }
      }
      else if (phase === 'rest') {
        nextPhase = 'work';
        nextExIndex = exIndex + 1;
        const nextEx = exercises[nextExIndex];
        nextMaxTime = nextEx ? (nextEx.customDuration || config.workDuration) : config.workDuration;
        nextTimeLeft = nextMaxTime;
        if (!isMuted && nextEx) {
           AudioEngine.play('bell');
           AudioEngine.speak(nextEx.name, 'start');
        }
      }
      else if (phase === 'setRest') {
        nextPhase = 'work';
        nextSet = currentSet + 1;
        nextExIndex = 0;
        const firstEx = exercises[0];
        nextMaxTime = firstEx ? (firstEx.customDuration || config.workDuration) : config.workDuration;
        nextTimeLeft = nextMaxTime;
        if (!isMuted && firstEx) {
           AudioEngine.play('bell');
           AudioEngine.speak(`Set ${nextSet}, ${firstEx.name}`, 'start');
        }
      }

      return {
        ...prev,
        phase: nextPhase,
        exIndex: nextExIndex,
        currentSet: nextSet,
        timeLeft: nextTimeLeft,
        maxTime: nextMaxTime,
        completed: nextCompleted
      };
    });
  }, [config, exercises, isMuted]);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [status, tick]);

  // --- ACTIONS & DATA MANAGEMENT ---

  const handleDragStart = (e, index) => {
    setDraggedItem(exercises[index]);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index) => {
    const draggedOver = exercises[index];
    if (draggedItem === draggedOver) return;
    let items = exercises.filter(i => i !== draggedItem);
    items.splice(index, 0, draggedItem);
    setExercises(items);
  };

  const updateEx = (id, k, v) => setExercises(prev => prev.map(e => e.id === id ? {...e, [k]: v} : e));
  
  const removeEx = (id) => {
    if (status === 'running') {
        const idx = exercises.findIndex(e => e.id === id);
        if (idx === timer.exIndex) setStatus('idle'); 
    }
    setExercises(prev => prev.filter(e => e.id !== id));
  };
  
  const addEx = () => setExercises([...exercises, { id: Math.random().toString(36).substr(2,9), name: 'New Exercise', notes: '', icon: 'dumbbell' }]);

  const reset = () => {
    setStatus('idle');
    setTimer({ currentSet: 1, exIndex: 0, phase: 'getReady', timeLeft: 5, maxTime: 5, completed: [] });
  };

  // 1. Save to Local Storage
  const saveLocal = () => {
    localStorage.setItem('tabataX-data', JSON.stringify({ config, exercises }));
    alert("Workout saved to browser!");
  };

  // 2. Load from Local Storage
  const loadLocal = () => {
    const data = localStorage.getItem('tabataX-data');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed.config) setConfig(parsed.config);
            if (parsed.exercises) setExercises(parsed.exercises);
            alert("Workout loaded!");
        } catch (e) { alert("Corrupt data found"); }
    } else {
        alert("No saved workout found.");
    }
  };

  // 3. Export to JSON File
  const exportFile = () => {
    const dataStr = JSON.stringify({ config, exercises }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabata-workout-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. Import from JSON File
  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed.config && Array.isArray(parsed.exercises)) {
                setConfig(parsed.config);
                setExercises(parsed.exercises);
                setStatus('idle'); // Safety reset
                alert("Import successful!");
            } else {
                alert("Invalid JSON format");
            }
        } catch (err) { alert("Error parsing file"); }
    };
    reader.readAsText(file);
  };

  // Start Handler
  const handleStart = () => {
      AudioEngine.init();
      setStatus('running');
  };

  // --- RENDERING ---

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const isWarning = timer.timeLeft <= 3 && status === 'running';
  
  const bgClass = isWarning ? 'bg-amber-950/30' : 
                  timer.phase === 'work' ? 'bg-emerald-950/30' : 
                  timer.phase === 'rest' ? 'bg-blue-950/30' : 
                  'bg-slate-950';

  const activeExercise = exercises[timer.exIndex] || { name: 'Unknown', notes: '' };
  const nextExercise = exercises[timer.exIndex + 1] || null;

  return (
    // Added user-select-none to prevent highlighting text when tapping quickly on mobile
    <div className={`min-h-screen text-slate-100 font-sans pb-20 transition-colors duration-1000 ${bgClass} flex flex-col relative overflow-x-hidden select-none`}>
      
      {/* --- SET BANNER --- */}
      {showBanner && <SetAnnouncement setNumber={bannerText} />}

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings className="text-emerald-500"/> Configuration</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Work (s)</label>
                    <input type="number" value={config.workDuration} onChange={(e)=>setConfig({...config, workDuration: parseInt(e.target.value)||0})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 focus:border-emerald-500 outline-none"/>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Rest (s)</label>
                    <input type="number" value={config.restDuration} onChange={(e)=>setConfig({...config, restDuration: parseInt(e.target.value)||0})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 focus:border-blue-500 outline-none"/>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Set Rest (s)</label>
                <input type="number" value={config.setRestDuration} onChange={(e)=>setConfig({...config, setRestDuration: parseInt(e.target.value)||0})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 focus:border-indigo-500 outline-none"/>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl mt-2">Save & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
            <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-emerald-500" />
                <span className="font-bold tracking-tight">Tabata<span className="text-emerald-500">X</span></span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
             {/* Data Controls */}
             <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50 mr-2">
                <button onClick={saveLocal} title="Save to Browser" className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition-colors"><Save size={16}/></button>
                <button onClick={loadLocal} title="Load from Browser" className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><FileJson size={16}/></button>
                <div className="w-px bg-slate-700 mx-1"></div>
                <button onClick={exportFile} title="Export JSON" className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400 transition-colors"><Download size={16}/></button>
                <label title="Import JSON" className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-orange-400 transition-colors cursor-pointer">
                    <Upload size={16}/>
                    <input type="file" onChange={importFile} className="hidden" accept=".json"/>
                </label>
             </div>

             {/* Sets */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 shrink-0">
               <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Sets</span>
               <button onClick={() => setConfig({...config, numSets: Math.max(1, config.numSets - 1)})} className="w-6 h-6 hover:bg-slate-700 rounded text-slate-300">-</button>
               <span className="w-6 text-center font-mono font-bold text-sm">{config.numSets}</span>
               <button onClick={() => setConfig({...config, numSets: config.numSets + 1})} className="w-6 h-6 hover:bg-slate-700 rounded text-slate-300">+</button>
            </div>
            
            <div className="h-5 w-px bg-slate-800 mx-1"></div>
            
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 shrink-0">{isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 shrink-0"><Settings size={18}/></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 flex flex-col gap-6">

        {/* --- HERO TIMER SECTION --- */}
        <section className={`relative rounded-3xl overflow-hidden transition-all duration-500 border border-slate-800 bg-slate-900/60 backdrop-blur-md ${status !== 'idle' ? 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.2)]' : ''}`}>
           
           <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center relative z-10">
              {status === 'idle' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <div className="relative group cursor-pointer w-24 h-24 mx-auto" onClick={handleStart}>
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all"></div>
                      <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 group-hover:scale-105 transition-transform relative z-10">
                        <Play className="w-10 h-10 text-emerald-500" fill="currentColor" />
                      </div>
                   </div>
                   <div>
                     <h1 className="text-3xl font-black text-white mb-2">Ready to Train?</h1>
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
                        <Clock size={14} className="text-slate-400"/>
                        <span className="text-sm font-mono text-slate-300">{formatTime(calculateTotalTime())} Total</span>
                     </div>
                   </div>
                </div>
              ) : status === 'finished' ? (
                <div className="space-y-4 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white">WORKOUT COMPLETE</h2>
                  <button onClick={reset} className="px-8 py-2 bg-slate-700 hover:bg-slate-600 rounded-full font-bold transition-colors">Reset</button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-6">
                  {/* Phase Badge */}
                  <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-lg ${
                    isWarning ? 'bg-amber-500 text-amber-950 border-amber-400 animate-pulse' :
                    timer.phase === 'work' ? 'bg-emerald-500 text-emerald-950 border-emerald-400' :
                    'bg-blue-500 text-blue-950 border-blue-400'
                  }`}>
                    {timer.phase === 'work' ? 'WORK' : timer.phase === 'getReady' ? 'GET READY' : 'REST'}
                  </div>

                  {/* Circular Timer */}
                  <CircularProgress 
                    timeLeft={timer.timeLeft} 
                    totalTime={timer.maxTime} 
                    phase={timer.phase} 
                    isWarning={isWarning}
                  />

                  {/* Compact Progress Indicators */}
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Ex</span>
                        <span className="text-white font-mono">{timer.exIndex + 1}<span className="text-slate-600">/{exercises.length}</span></span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Set</span>
                        <span className="text-white font-mono">{timer.currentSet}<span className="text-slate-600">/{config.numSets}</span></span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1 w-full max-w-xs">
                     <h3 className="text-2xl font-bold truncate">
                       {timer.phase === 'work' || timer.phase === 'getReady' ? activeExercise.name : "Recover"}
                     </h3>
                     {timer.phase === 'work' && activeExercise.notes && (
                       <p className="text-emerald-400 text-sm animate-pulse">{activeExercise.notes}</p>
                     )}
                     {timer.phase === 'rest' && (
                       <p className="text-slate-400 text-sm">Up Next: <span className="text-white">{nextExercise?.name || "End of Set"}</span></p>
                     )}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-4">
                     {status === 'running' 
                       ? <button onClick={() => setStatus('paused')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full"><Pause size={24}/></button>
                       : <button onClick={() => setStatus('running')} className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-full"><Play size={24} fill="currentColor"/></button>
                     }
                     <button onClick={reset} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full"><RotateCcw size={24}/></button>
                  </div>
                </div>
              )}
           </div>
        </section>

        {/* --- EXERCISE LIST (Compact) --- */}
        <section className={`transition-all duration-500 ${status !== 'idle' ? 'opacity-40 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
            <div className="flex justify-between items-center mb-4 px-1">
               <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Circuit Breakdown</h2>
               <button onClick={addEx} className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 text-sm font-bold">
                 <Plus size={16} /> Add Exercise
               </button>
            </div>

            <div className="space-y-2">
              {exercises.map((ex, idx) => {
                const ActiveIcon = ICON_OPTIONS.find(i => i.id === ex.icon)?.icon || Dumbbell;
                const isCompleted = timer.completed.includes(`${timer.currentSet}-${ex.id}`);

                return (
                  <div 
                    key={ex.id}
                    draggable={status === 'idle'}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={() => handleDragOver(idx)}
                    className={`group bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-slate-700 transition-all ${draggedItem===ex ? 'opacity-50 border-dashed border-emerald-500':''}`}
                  >
                    <GripVertical className="text-slate-700 cursor-grab hover:text-slate-500 shrink-0" size={16} />
                    
                    {/* Icon Dropdown */}
                    <div className="relative shrink-0">
                      <button onClick={(e)=>{e.stopPropagation(); setOpenDropdownId(openDropdownId===ex.id?null:ex.id)}} 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${ex.icon ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                        <ActiveIcon size={18} />
                      </button>
                      {openDropdownId === ex.id && (
                        <div className="absolute top-12 left-0 z-20 bg-slate-800 border border-slate-700 p-2 grid grid-cols-4 gap-2 rounded-xl shadow-xl w-48">
                          {ICON_OPTIONS.map(opt => (
                            <button key={opt.id} onClick={()=>{updateEx(ex.id,'icon',opt.id); setOpenDropdownId(null)}} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white flex justify-center">
                              <opt.icon size={18}/>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 min-w-0">
                      <input 
                        className="w-full bg-transparent font-bold text-slate-200 placeholder-slate-600 focus:outline-none" 
                        placeholder="Exercise Name" 
                        value={ex.name} 
                        onChange={(e)=>updateEx(ex.id,'name',e.target.value)}
                      />
                      <input 
                        className="w-full bg-transparent text-xs text-slate-500 placeholder-slate-700 focus:outline-none focus:text-emerald-500" 
                        placeholder="Add notes..." 
                        value={ex.notes} 
                        onChange={(e)=>updateEx(ex.id,'notes',e.target.value)}
                      />
                    </div>

                    {/* Timers */}
                    <div className="flex items-center gap-2">
                       <div className="flex flex-col items-center w-10">
                          <label className="text-[9px] uppercase font-bold text-slate-600">Work</label>
                          <input type="number" placeholder={config.workDuration} value={ex.customDuration||''} onChange={(e)=>updateEx(ex.id,'customDuration',parseInt(e.target.value)||null)} 
                            className="w-full bg-slate-950 rounded border border-slate-800 text-center text-xs py-1 text-emerald-500 font-mono focus:border-emerald-500 outline-none"/>
                       </div>
                       <div className="flex flex-col items-center w-10">
                          <label className="text-[9px] uppercase font-bold text-slate-600">Rest</label>
                          <input type="number" placeholder={config.restDuration} value={ex.customRest !== undefined && ex.customRest !== null ? ex.customRest : ''} onChange={(e)=>updateEx(ex.id,'customRest',e.target.value === '' ? null : parseInt(e.target.value))} 
                            className="w-full bg-slate-950 rounded border border-slate-800 text-center text-xs py-1 text-blue-500 font-mono focus:border-blue-500 outline-none"/>
                       </div>
                    </div>

                    <button onClick={()=>removeEx(ex.id)} className="text-slate-700 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                  </div>
                )
              })}
            </div>
        </section>

      </main>
    </div>
  );
}