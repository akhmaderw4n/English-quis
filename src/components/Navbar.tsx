import React from 'react';
import { BookOpen, ShieldCheck, Volume2, VolumeX, Award } from 'lucide-react';
import { QUIZ_METADATA } from '../data/quizData';
import { ViewState } from '../types';

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenTeacherAuth: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  studentName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenTeacherAuth,
  soundOn,
  onToggleSound,
  studentName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-amber-200/70 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Title */}
        <div 
          onClick={() => {
            if (currentView !== 'quiz') onNavigate('start');
          }}
          className={`flex items-center gap-3 ${currentView !== 'quiz' ? 'cursor-pointer hover:opacity-95' : ''}`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Kelas 7 SMP
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Kurikulum Merdeka
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              Procedure Text — Culinary and Me
            </h1>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
            className="p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 transition-colors"
            title={soundOn ? 'Suara Aktif' : 'Suara Mati'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Student Status indicator if in quiz or result */}
          {studentName && currentView !== 'dashboard' && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span className="truncate max-w-[120px]">{studentName}</span>
            </div>
          )}

          {/* Teacher Dashboard Button */}
          {currentView === 'dashboard' ? (
            <button
              onClick={() => onNavigate('start')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <BookOpen className="w-4 h-4" />
              <span>Menu Kuis</span>
            </button>
          ) : (
            <button
              onClick={onOpenTeacherAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Dashboard Guru</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
