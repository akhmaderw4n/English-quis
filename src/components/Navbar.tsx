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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & Title */}
        <div 
          onClick={() => {
            if (currentView !== 'quiz') onNavigate('start');
          }}
          className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${currentView !== 'quiz' ? 'cursor-pointer active:scale-98 transition-transform' : ''}`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                Kelas 7 SMP
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 hidden sm:inline">
                Kurikulum Merdeka
              </span>
            </div>
            <h1 className="text-xs sm:text-base font-extrabold text-slate-900 leading-tight truncate">
              Procedure Text <span className="text-amber-700 hidden sm:inline">&bull; Culinary and Me</span>
            </h1>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 active:bg-amber-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title={soundOn ? 'Suara Aktif' : 'Suara Mati'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Student Status indicator if in quiz or result */}
          {studentName && currentView !== 'dashboard' && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span className="truncate max-w-[100px]">{studentName}</span>
            </div>
          )}

          {/* Teacher Dashboard Button */}
          {currentView === 'dashboard' ? (
            <button
              onClick={() => onNavigate('start')}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-600 active:bg-amber-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Menu Kuis</span>
            </button>
          ) : (
            <button
              onClick={onOpenTeacherAuth}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 active:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span><span className="hidden xs:inline">Dashboard </span>Guru</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
