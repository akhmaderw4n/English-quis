import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Flag, 
  AlertCircle, 
  BookOpen, 
  ChefHat, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Headphones,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import { Question, StudentInfo } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';
import { playClickSound, speakEnglish, stopSpeech } from '../utils/audio';

interface QuizScreenProps {
  student: StudentInfo;
  onFinishQuiz: (answers: Record<number, 'A' | 'B' | 'C' | 'D'>, timeSpentSeconds: number, violationsCount?: number) => void;
  onExitQuiz: () => void;
  soundOn?: boolean;
  onToggleSound?: () => void;
  initialIndex?: number;
  initialAnswers?: Record<number, 'A' | 'B' | 'C' | 'D'>;
  initialFlagged?: Record<number, boolean>;
  initialSeconds?: number;
  initialViolationsCount?: number;
  onViolationOccurred?: (state: {
    lastQuestionIndex: number;
    answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
    flagged: Record<number, boolean>;
    seconds: number;
    reason: string;
  }) => void;
  resumedBannerNotice?: boolean;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  student,
  onFinishQuiz,
  onExitQuiz,
  soundOn = true,
  onToggleSound,
  initialIndex = 0,
  initialAnswers = {},
  initialFlagged = {},
  initialSeconds = 0,
  initialViolationsCount = 0,
  onViolationOccurred,
  resumedBannerNotice = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>(initialAnswers);
  const [flagged, setFlagged] = useState<Record<number, boolean>>(initialFlagged);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [violationsCount, setViolationsCount] = useState(initialViolationsCount);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResumedToast, setShowResumedToast] = useState(resumedBannerNotice);
  const isSubmittedRef = useRef(false);

  // Audio Playback states for listening questions
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.80);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);

  // Tab-switch and window-blur violation detection (Anti-Curang CBT)
  useEffect(() => {
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;

    const reportViolation = (reason: string) => {
      if (isSubmittedRef.current) return;
      stopSpeech();
      onViolationOccurred?.({
        lastQuestionIndex: currentIndex,
        answers,
        flagged,
        seconds,
        reason,
      });
    };

    const handleVisibility = () => {
      if (document.hidden && !isSubmittedRef.current) {
        reportViolation('Terdeteksi membuka tab lain atau meminimalkan browser');
      }
    };

    const handleBlur = () => {
      if (isSubmittedRef.current) return;
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (!isSubmittedRef.current && (document.hidden || !document.hasFocus())) {
          reportViolation('Terdeteksi beralih jendela atau membuka aplikasi lain');
        }
      }, 250);
    };

    const handleFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentIndex, answers, flagged, seconds, onViolationOccurred]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = answeredCount === QUIZ_QUESTIONS.length;

  // Auto-play audio when arriving at a question with audio enabled
  useEffect(() => {
    stopSpeech();
    setIsPlayingAudio(false);

    if (currentQuestion.hasAudio && autoPlayAudio && soundOn) {
      const textToSpeak = currentQuestion.audioScript || currentQuestion.question;
      const timer = setTimeout(() => {
        setIsPlayingAudio(true);
        speakEnglish(textToSpeak, {
          rate: speechRate,
          onStart: () => setIsPlayingAudio(true),
          onEnd: () => setIsPlayingAudio(false),
          onError: () => setIsPlayingAudio(false),
        });
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, autoPlayAudio, soundOn]);

  // Clean up speech when unmounting
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleSetSpeechRate = (newRate: number) => {
    playClickSound();
    setSpeechRate(newRate);
    if (isPlayingAudio) {
      stopSpeech();
      setTimeout(() => {
        const textToSpeak = currentQuestion.audioScript || currentQuestion.question;
        setIsPlayingAudio(true);
        speakEnglish(textToSpeak, {
          rate: newRate,
          onStart: () => setIsPlayingAudio(true),
          onEnd: () => setIsPlayingAudio(false),
          onError: () => setIsPlayingAudio(false),
        });
      }, 120);
    }
  };

  const handleTogglePlayAudio = (overrideText?: string) => {
    playClickSound();
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
    } else {
      const textToSpeak = overrideText || currentQuestion.audioScript || currentQuestion.question;
      setIsPlayingAudio(true);
      speakEnglish(textToSpeak, {
        rate: speechRate,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    }
  };

  const handleReplayAudio = () => {
    playClickSound();
    stopSpeech();
    setIsPlayingAudio(false);
    const textToSpeak = currentQuestion.audioScript || currentQuestion.question;
    setTimeout(() => {
      setIsPlayingAudio(true);
      speakEnglish(textToSpeak, {
        rate: speechRate,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    }, 150);
  };

  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    playClickSound();
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: key,
    }));
  };

  const handleToggleFlag = () => {
    playClickSound();
    setFlagged(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleNext = () => {
    playClickSound();
    stopSpeech();
    setIsPlayingAudio(false);
    if (currentIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    playClickSound();
    stopSpeech();
    setIsPlayingAudio(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    playClickSound();
    stopSpeech();
    setIsPlayingAudio(false);
    setCurrentIndex(index);
  };

  const handleAttemptFinish = () => {
    playClickSound();
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    isSubmittedRef.current = true;
    stopSpeech();
    setIsPlayingAudio(false);
    setShowConfirmModal(false);
    onFinishQuiz(answers, seconds, violationsCount);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="py-4 sm:py-6 max-w-5xl mx-auto px-3 sm:px-6">
      {/* Resumed Notification Banner */}
      <AnimatePresence>
        {showResumedToast && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3.5 p-3 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300/90 text-emerald-950 flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="leading-snug">
                <span className="font-extrabold text-emerald-900 block sm:inline mr-1.5">
                  Aplikasi Dibuka Kembali:
                </span>
                <span>
                  Anda melanjutkan pengerjaan tepat di <strong className="text-emerald-900 underline underline-offset-2">Soal Nomor {currentIndex + 1}</strong>.
                  Seluruh jawaban sebelumnya tersimpan aman.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowResumedToast(false)}
              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/80 transition-colors shrink-0 cursor-pointer"
              title="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Student Info, Timer & Linear Progress */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-amber-200/80 shadow-xs mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                {student.name}
              </span>
              <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-200 shrink-0">
                Kelas {student.studentClass} &bull; No. {student.studentNumber}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
              {QUIZ_METADATA.chapter} &bull; {QUIZ_METADATA.branding}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {/* Anti-Cheat Tab Protection Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold shadow-2xs ${
                violationsCount > 0 
                  ? 'bg-rose-50 text-rose-900 border-rose-200' 
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}
              title={violationsCount > 0 ? `Pernah terkunci (${violationsCount}x). Membuka tab lain akan otomatis mengunci kuis.` : 'Anti-Curang Aktif: Membuka tab lain akan otomatis mengunci aplikasi.'}
            >
              {violationsCount > 0 ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{violationsCount}x Terkunci</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Anti-Curang:</span>
                  <span>Proteksi Tab ON</span>
                </>
              )}
            </div>

            {/* Direct Sound Toggle in Quiz Screen */}
            {onToggleSound && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onToggleSound();
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                  soundOn 
                    ? 'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                }`}
                title={soundOn ? 'Suara Aktif (Klik untuk bisukan)' : 'Suara Mati (Klik untuk aktifkan)'}
              >
                {soundOn ? (
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                )}
                <span className="hidden xs:inline text-[11px] sm:text-xs">
                  {soundOn ? 'Suara ON' : 'Mute'}
                </span>
              </button>
            )}

            {/* Timer */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs sm:text-sm font-bold shadow-2xs">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 animate-pulse" />
              <span>{formatTime(seconds)}</span>
            </div>

            {/* Progress summary */}
            <div className="text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
              <span className="text-amber-700">{answeredCount}</span>/{QUIZ_QUESTIONS.length} Terjawab
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(answeredCount / QUIZ_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Progress Numbers Pills (5 cols on mobile for large tap target, 10 cols on tablet/desktop) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 mb-4 sm:mb-6 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Nomor Soal ({currentIndex + 1} dari 10):</span>
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Headphones className="w-3 h-3 text-amber-600" />
            <span>Ikon headphone = Soal Audio</span>
          </span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {QUIZ_QUESTIONS.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = !!answers[q.id];
            const isFlagged = !!flagged[q.id];

            let pillStyle = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 active:bg-amber-100';
            if (isCurrent) {
              pillStyle = 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 font-extrabold shadow-xs';
            } else if (isFlagged) {
              pillStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
            } else if (isAnswered) {
              pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleJumpTo(idx)}
                className={`py-2 sm:py-2.5 min-h-[38px] sm:min-h-[42px] rounded-xl text-xs sm:text-sm font-bold border transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${pillStyle}`}
              >
                <span>{idx + 1}</span>
                {q.hasAudio && !isFlagged && (
                  <Headphones className={`w-2.5 h-2.5 absolute top-1 right-1 opacity-75 ${isCurrent ? 'text-white' : 'text-amber-600'}`} />
                )}
                {isFlagged && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1 right-1" />
                )}
                {isAnswered && !isCurrent && (
                  <span className="w-1 h-1 rounded-full bg-emerald-600 absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Box */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-amber-200 shadow-sm mb-4 sm:mb-6"
      >
        {/* Question Header & Tags */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 mb-4 sm:mb-5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {currentIndex + 1}
            </span>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider block truncate">
                Topik: {currentQuestion.topic}
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                {currentQuestion.unitReference}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleFlag}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 shrink-0 ${
              flagged[currentQuestion.id]
                ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">{flagged[currentQuestion.id] ? 'Ragu-ragu' : 'Tandai Ragu'}</span>
          </button>
        </div>

        {/* Dedicated Audio Listening Box for Listening Questions */}
        {currentQuestion.hasAudio && (
          <div className="mb-4 sm:mb-6 p-3.5 sm:p-5 rounded-2xl bg-linear-to-r from-amber-50 via-orange-50/60 to-amber-50 border-2 border-amber-300/90 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs transition-all ${
                  isPlayingAudio ? 'bg-amber-600 scale-105 ring-3 ring-amber-300' : 'bg-amber-500'
                }`}>
                  <Headphones className={`w-5 h-5 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide truncate">
                      {currentQuestion.audioTitle || 'Soal Berbasis Audio / Listening'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1 shrink-0 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Audio Siap Diputar
                    </span>
                  </div>
                  {currentQuestion.listeningInstruction && (
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-snug">
                      {currentQuestion.listeningInstruction}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls: Speed & Auto-Play Switch */}
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 shrink-0">
                {/* Speed Segmented Selector */}
                <div className="flex items-center bg-white border border-amber-300/90 rounded-xl p-0.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-900 px-1.5 sm:px-2 hidden sm:inline">
                    Tempo:
                  </span>
                  {[
                    { rate: 0.70, label: '0.70x Lambat', title: '0.70x (Sangat perlahan & jelas kata demi kata)' },
                    { rate: 0.80, label: '0.80x Jelas ★', title: '0.80x (Tempo paling pas untuk siswa SMP Kelas 7)' },
                    { rate: 0.90, label: '0.90x Sedang', title: '0.90x (Kecepatan bicara wajar)' },
                    { rate: 1.00, label: '1.0x Normal', title: '1.0x (Kecepatan standar native speaker)' },
                  ].map(opt => (
                    <button
                      key={opt.rate}
                      type="button"
                      onClick={() => handleSetSpeechRate(opt.rate)}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        speechRate === opt.rate
                          ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-amber-950 hover:bg-amber-100/60'
                      }`}
                      title={opt.title}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Auto-Play Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAutoPlayAudio(!autoPlayAudio);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                    autoPlayAudio 
                      ? 'bg-amber-500 text-white border-amber-600' 
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                  title="Putar audio secara otomatis ketika nomor soal dibuka"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Auto:</span>
                  <span>{autoPlayAudio ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Audio Action Bar */}
            <div className="flex items-center gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-amber-200/90 shadow-2xs">
              {/* Play / Pause Primary Button */}
              <button
                type="button"
                onClick={() => handleTogglePlayAudio()}
                className={`px-4 sm:px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isPlayingAudio
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                }`}
              >
                {isPlayingAudio ? (
                  <>
                    <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span>Hentikan Suara</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Putar Audio Soal</span>
                  </>
                )}
              </button>

              {/* Replay Button */}
              <button
                type="button"
                onClick={handleReplayAudio}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Putar Ulang dari Awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Wave Visualizer & Status */}
              <div className="flex-1 flex items-center gap-2 min-w-0 px-1">
                {isPlayingAudio ? (
                  <div className="flex items-center gap-1 h-5 overflow-hidden">
                    <span className="w-1 bg-amber-500 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-3"></span>
                    <span className="w-1 bg-orange-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-5"></span>
                    <span className="w-1 bg-amber-600 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-4"></span>
                    <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-5"></span>
                    <span className="w-1 bg-amber-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3"></span>
                    <span className="text-[11px] sm:text-xs font-bold text-amber-900 ml-1.5 truncate">
                      Sedang memperdengarkan audio pelafalan bahasa Inggris...
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] sm:text-xs text-slate-500 italic truncate">
                    Suara siap diputar. Klik tombol untuk mendengarkan.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Optional Context Box (Recipe Text / Worksheet Excerpt) */}
        {currentQuestion.contextText && (
          <div className="mb-4 sm:mb-6 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-800">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">{currentQuestion.contextTitle || 'Teks Rujukan Resep (English for Nusantara)'}</span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePlayAudio(currentQuestion.contextText)}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-amber-200/60 transition-colors"
                title="Dengarkan teks bacaan ini"
              >
                <Volume2 className="w-3 h-3" />
                <span>Dengarkan Teks</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/90 p-3 sm:p-4 rounded-xl border border-amber-100 overflow-x-auto">
              {currentQuestion.contextText}
            </pre>
          </div>
        )}

        {/* Question Text with listen button */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-relaxed">
            {currentQuestion.question}
          </h2>
          <button
            type="button"
            onClick={() => handleTogglePlayAudio(currentQuestion.question)}
            className="shrink-0 p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Dengarkan pembacaan pertanyaan ini"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-2.5 sm:space-y-3">
          {currentQuestion.options.map(option => {
            const isSelected = currentAnswer === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSelectOption(option.key)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer group active:scale-[0.99] ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/90 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 text-slate-700 bg-white'
                }`}
              >
                <span
                  className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-colors ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-900'
                  }`}
                >
                  {option.key}
                </span>
                <span className="text-xs sm:text-base leading-relaxed pt-0.5 font-medium">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Navigation Buttons Bar (Thumb friendly on mobile) */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1 sm:flex-initial px-4 py-3 sm:py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Sebelumnya</span>
        </button>

        <div className="flex-1 sm:flex-initial flex items-center justify-end">
          {currentIndex < QUIZ_QUESTIONS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAttemptFinish}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Kumpulkan Kuis</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAllAnswered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isAllAnswered ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Konfirmasi Pengumpulan Kuis</h3>
                  <p className="text-xs text-slate-500">Pastikan seluruh jawaban telah diperiksa</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 mb-5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Soal:</span>
                  <span className="font-bold text-slate-800">{QUIZ_QUESTIONS.length} Soal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sudah Dijawab:</span>
                  <span className="font-bold text-emerald-700">{answeredCount} Soal</span>
                </div>
                {!isAllAnswered && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Belum Dijawab:</span>
                    <span>{QUIZ_QUESTIONS.length - answeredCount} Soal</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Waktu Pengerjaan:</span>
                  <span className="font-mono text-slate-800 font-semibold">{formatTime(seconds)}</span>
                </div>
              </div>

              {!isAllAnswered && (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mb-4 font-medium">
                  Perhatian: Kamu masih memiliki soal yang belum dijawab. Yakin ingin mengumpulkan sekarang?
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Periksa Lagi
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Ya, Kumpulkan Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
