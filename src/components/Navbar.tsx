import React from 'react';
import { Camera, ShieldCheck, Volume2, VolumeX, FolderHeart, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  isAdminLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, isAdminLoggedIn }) => {
  const [soundOn, setSoundOn] = React.useState(sounds.isSoundEnabled());

  const toggleSound = () => {
    const newState = !soundOn;
    sounds.setSoundEnabled(newState);
    setSoundOn(newState);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#080d1c]/80 border-b border-cyan-500/10 px-4 py-3.5 transition-all">
      <div className="max-w-[560px] mx-auto flex items-center justify-between">
        {/* Brand Header */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
        >
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-all duration-300">
            <div className="w-full h-full bg-[#080d1c] rounded-[14px] flex items-center justify-center">
              <Camera className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1">
                <span className="text-cyan-400">📁</span> SufiSnapShare
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-md">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Take a photo. Share the magic.</p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute camera sounds' : 'Enable camera sounds'}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 hover:text-cyan-300 transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Admin Dashboard */}
          <button
            onClick={() => onNavigate('admin')}
            title="Admin Dashboard"
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium ${
              currentView === 'admin'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/30'
                : 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700/50 text-slate-300 hover:text-cyan-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {isAdminLoggedIn && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
