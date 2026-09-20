import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  KeyRound, 
  CheckCircle2, 
  Copy, 
  Clock, 
  User, 
  GraduationCap, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Lock,
  Radio
} from 'lucide-react';
import { ViolationLockSession } from '../types';
import { playClickSound, playUnlockSuccessSound, playWrongSound } from '../utils/audio';
import { listenToViolationStatus } from '../services/firebase';

interface ViolationScreenProps {
  session: ViolationLockSession;
  teacherPin: string;
  onUnlock: (tokenUsed: string) => void;
}

export const ViolationScreen: React.FC<ViolationScreenProps> = ({
  session,
  teacherPin,
  onUnlock,
}) => {
  const [inputToken, setInputToken] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoteUnlocked, setIsRemoteUnlocked] = useState(false);

  // Listen to remote unlock command from Teacher Dashboard in real-time
  useEffect(() => {
    if (!session.id) return;
    const unsubscribe = listenToViolationStatus(session.id, (status) => {
      if (status === 'unlocked' && !isRemoteUnlocked) {
        setIsRemoteUnlocked(true);
        playUnlockSuccessSound();
        setTimeout(() => {
          onUnlock('GURU_REMOTE_UNLOCKED');
        }, 1200);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [session.id, onUnlock, isRemoteUnlocked]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyToken = () => {
    playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(session.unlockToken);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleAutoFillToken = () => {
    playClickSound();
    setInputToken(session.unlockToken);
    setErrorMsg(null);
  };

  const handleSubmitUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanedInput = inputToken.trim().toUpperCase();
    const expectedToken = session.unlockToken.trim().toUpperCase();
    const teacherMasterPin = teacherPin.trim().toUpperCase();

    if (!cleanedInput) {
      playWrongSound();
      setErrorMsg('Silakan masukkan token buka kunci terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    // Validate against generated token OR teacher PIN master key
    if (cleanedInput === expectedToken || cleanedInput === teacherMasterPin) {
      playUnlockSuccessSound();
      setTimeout(() => {
        setIsSubmitting(false);
        onUnlock(cleanedInput);
      }, 400);
    } else {
      playWrongSound();
      setIsSubmitting(false);
      setErrorMsg('Token salah atau tidak sesuai. Periksa kembali token Anda atau hubungi guru/pengawas.');
    }
  };

  const answeredCount = Object.keys(session.answers).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 select-none relative overflow-hidden">
      {/* Background Warning Ambience */}
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
        {/* Top Emergency Red Banner */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 px-5 sm:px-6 py-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase bg-rose-950/50 px-2 py-0.5 rounded-md text-rose-200">
                Deteksi Anti-Curang CBT
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight mt-0.5">
                Aplikasi Ditutup & Terkunci Otomatis
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-950/60 border border-rose-400/40 text-rose-200 text-xs font-mono font-bold shrink-0">
            <Lock className="w-3.5 h-3.5" />
            <span>LOCKED</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Remote Unlocked Notification from Teacher */}
          {isRemoteUnlocked ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 flex items-center gap-3 shadow-lg"
            >
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold text-emerald-100 block text-sm">
                  Kunci Berhasil Dibuka oleh Guru!
                </span>
                <span className="text-xs text-emerald-300">
                  Guru telah memberikan izin melanjutkan ujian dari Dashboard. Mengalihkan ke soal terakhir Anda...
                </span>
              </div>
            </motion.div>
          ) : (
            /* Reason Alert Callout */
            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-bold text-rose-100 block mb-0.5">
                  Peringatan: {session.reason || 'Terdeteksi membuka tab lain atau beralih aplikasi'}
                </span>
                Aplikasi kuis otomatis menutup tampilan soal untuk menjaga integritas ujian. Notifikasi pelanggaran telah dikirimkan ke Dashboard Guru.
              </div>
            </div>
          )}

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
                dari 10 Soal Kuis
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Jawaban Aman</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-100">
                {answeredCount} / 10 Soal
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

          {/* Token Display Box (Provided by System) */}
          <div className="bg-linear-to-b from-amber-950/40 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 relative">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-black tracking-widest text-amber-400 block">
                    Token Buka Kunci Diberikan
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Gunakan kode ini untuk masuk kembali ke aplikasi
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
                Aktif
              </span>
            </div>

            {/* Big Monospace Token */}
            <div className="my-3 py-3 px-4 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">TOKEN:</span>
                <span className="text-xl sm:text-2xl font-mono font-black tracking-widest text-amber-300 select-all">
                  {session.unlockToken}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer active:scale-95"
                  title="Salin Token ke Clipboard"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAutoFillToken}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                  title="Tempel token ke kolom input"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Isi Otomatis</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-amber-200/80 leading-relaxed">
              💡 Masukkan token di atas pada formulir di bawah. Setelah diverifikasi, kuis akan langsung dilanjutkan persis di <strong className="text-amber-200 underline underline-offset-2">Soal Nomor {session.lastQuestionIndex + 1}</strong> tanpa kehilangan waktu maupun jawaban.
            </p>
          </div>

          {/* Unlock Form */}
          <form onSubmit={handleSubmitUnlock} className="space-y-3">
            <div>
              <label htmlFor="unlock-token-input" className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                Masukkan Token Buka Kunci:
              </label>
              <div className="relative">
                <input
                  id="unlock-token-input"
                  type="text"
                  value={inputToken}
                  onChange={(e) => {
                    setInputToken(e.target.value.toUpperCase());
                    setErrorMsg(null);
                  }}
                  placeholder="Contoh: CBT-8291..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 sm:py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 text-slate-100 font-mono text-base sm:text-lg font-bold tracking-widest uppercase transition-all outline-none"
                />
              </div>
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 rounded-xl bg-rose-950/70 border border-rose-700/80 text-rose-200 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <KeyRound className="w-5 h-5 text-slate-950" />
              <span>Buka Kunci & Lanjut Soal No. {session.lastQuestionIndex + 1}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-400">
                Khusus Pengawas: Guru juga dapat membuka kunci ini menggunakan <strong className="text-slate-300">PIN Pengawas Guru</strong>.
              </span>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
