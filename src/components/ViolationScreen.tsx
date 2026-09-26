import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Clock, 
  User, 
  GraduationCap, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  Home,
  Bell
} from 'lucide-react';
import { ViolationLockSession } from '../types';
import { playClickSound, playUnlockSuccessSound } from '../utils/audio';

interface ViolationScreenProps {
  session: ViolationLockSession;
  teacherPin?: string;
  onUnlock: () => void;
  onNormalizeScreen?: () => void;
}

export const ViolationScreen: React.FC<ViolationScreenProps> = ({
  session,
  onUnlock,
  onNormalizeScreen,
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(session.answers).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 select-none relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-900/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-900/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-xl bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl shadow-2xl overflow-hidden relative z-10 backdrop-blur-md"
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 px-5 sm:px-6 py-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase bg-rose-950/50 px-2 py-0.5 rounded-md text-rose-200">
                Peringatan Pelanggaran Kuis
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight mt-0.5">
                Notifikasi Terkirim ke Akun Guru
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-950/60 border border-rose-400/40 text-rose-200 text-xs font-mono font-bold shrink-0">
            <Bell className="w-3.5 h-3.5" />
            <span>NOTIFIKASI</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Reason Alert Callout */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-bold text-rose-100 block mb-0.5">
                Peringatan: {session.reason || 'Terdeteksi membuka tab lain atau beralih aplikasi'}
              </span>
              Notifikasi aktivitas ini telah dikirimkan secara otomatis ke <strong>Akun Guru (Dashboard Guru)</strong>. Anda dapat langsung melanjutkan pengerjaan kuis tanpa memerlukan token.
            </div>
          </div>

          {/* Student Status & Position Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Siswa</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                {session.student.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {session.student.studentClass} ({session.student.studentNumber})
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Posisi Terakhir</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-emerald-400">
                Soal No. {session.lastQuestionIndex + 1}
              </p>
              <p className="text-[10px] text-slate-400">
                Tersimpan Aman
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Jawaban Aman</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-100">
                {answeredCount} Terjawab
              </p>
              <p className="text-[10px] text-slate-400">
                Tersimpan Otomatis
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Waktu Berjalan</span>
              </div>
              <p className="text-xs sm:text-sm font-mono font-bold text-cyan-300">
                {formatTime(session.seconds)}
              </p>
              <p className="text-[10px] text-slate-400">
                Pelanggaran ke-{session.violationCount}
              </p>
            </div>
          </div>

          {/* Direct Resume Button (No Token Required) */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                playUnlockSuccessSound();
                onUnlock();
              }}
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98"
            >
              <span>Lanjutkan Mengerjakan Kuis</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {onNormalizeScreen && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onNormalizeScreen();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Kembali ke Beranda</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
