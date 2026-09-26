import React from 'react';
import { BookOpen, ShieldCheck, Volume2, VolumeX, Award, Cloud, CloudOff, FileText, RotateCcw } from 'lucide-react';
import { QUIZ_METADATA } from '../data/quizData';
import { ViewState } from '../types';

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenTeacherAuth: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  studentName?: string;
  isDbConnected?: boolean;
  onOpenProcedureStudy?: () => void;
  onNormalizeScreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenTeacherAuth,
  soundOn,
  onToggleSound,
  studentName,
  isDbConnected = true,
  onOpenProcedureStudy,
  onNormalizeScreen,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & Title */}
        <div 
          onClick={() => {
            if (currentView === 'violation_locked' && onNormalizeScreen) {
              onNormalizeScreen();
            } else if (currentView !== 'quiz') {
              onNavigate('start');
            }
          }}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer active:scale-98 transition-transform"
          title="Klik untuk ke Halaman Awal"
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
              Introducing My self and other <span className="text-amber-700 hidden sm:inline">&bull; English for Nusantara</span>
            </h1>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Screen Normalization Button when in locked screen */}
          {currentView === 'violation_locked' && onNormalizeScreen && (
            <button
              type="button"
              onClick={onNormalizeScreen}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer active:scale-95"
              title="Normalkan Tampilan Layar & Kembali ke Beranda"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Normalkan Layar</span>
            </button>
          )}

          {/* Procedure Text study material quick button */}
          {onOpenProcedureStudy && currentView !== 'quiz' && currentView !== 'violation_locked' && (
            <button
              type="button"
              onClick={onOpenProcedureStudy}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Materi Procedure Text</span>
            </button>
          )}
          {/* Cloud Database Sync Status */}
          <div 
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
              isDbConnected 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={isDbConnected ? 'Terkoneksi ke Database Cloud (Data muncul otomatis di perangkat lain)' : 'Menghubungkan ke Database Cloud...'}
          >
            {isDbConnected ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="hidden md:inline">Database Online</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden md:inline">Menghubungkan...</span>
              </>
            )}
          </div>

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
