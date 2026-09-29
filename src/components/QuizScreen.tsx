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
  Smartphone,
  Fingerprint,
  EyeOff,
  Lock,
  X
} from 'lucide-react';
import { Question, StudentInfo } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';
import { playClickSound, speakEnglish, stopSpeech, playViolationAlertSound } from '../utils/audio';

interface QuizScreenProps {
  questions?: Question[];
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
  timeLimitMinutes?: number;
  shuffleQuestions?: boolean;
  antiScreenshotMode?: 'touch_hold' | 'auto_sensor' | 'off';
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  questions = QUIZ_QUESTIONS,
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
  timeLimitMinutes = 0,
  shuffleQuestions = true,
  antiScreenshotMode = 'touch_hold',
}) => {
  const draftStorageKey = `en_nusantara_quiz_draft_${student.studentClass.trim().toUpperCase()}_${student.studentNumber.trim()}_${student.name.trim().toLowerCase()}`;

  const savedDraft = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed as {
            currentIndex?: number;
            answers?: Record<number, 'A' | 'B' | 'C' | 'D'>;
            flagged?: Record<number, boolean>;
            seconds?: number;
            questionOrderIds?: number[];
          };
        }
      }
    } catch {}
    return null;
  }, [draftStorageKey]);

  const [questionOrderIds] = useState<number[]>(() => {
    const baseIds = questions.map((q) => q.id);
    if (
      savedDraft?.questionOrderIds &&
      Array.isArray(savedDraft.questionOrderIds) &&
      savedDraft.questionOrderIds.length === baseIds.length
    ) {
      return savedDraft.questionOrderIds;
    }
    if (!shuffleQuestions) {
      return baseIds;
    }
    const arr = [...baseIds];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const orderedQuestions = React.useMemo(() => {
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const ordered: Question[] = [];
    questionOrderIds.forEach((id) => {
      const found = qMap.get(id);
      if (found) {
        ordered.push(found);
        qMap.delete(id);
      }
    });
    qMap.forEach((remaining) => ordered.push(remaining));
    return ordered.length > 0 ? ordered : questions;
  }, [questions, questionOrderIds]);

  const hasRecoveredDraft = Boolean(
    savedDraft &&
      ((savedDraft.answers && Object.keys(savedDraft.answers).length > 0) ||
        (savedDraft.seconds && savedDraft.seconds > 5))
  );

  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    hasRecoveredDraft && typeof savedDraft?.currentIndex === 'number'
      ? Math.min(savedDraft.currentIndex, Math.max(0, questions.length - 1))
      : initialIndex
  );
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>(() =>
    hasRecoveredDraft && savedDraft?.answers ? savedDraft.answers : initialAnswers
  );
  const [flagged, setFlagged] = useState<Record<number, boolean>>(() =>
    hasRecoveredDraft && savedDraft?.flagged ? savedDraft.flagged : initialFlagged
  );
  const [seconds, setSeconds] = useState<number>(() =>
    hasRecoveredDraft && typeof savedDraft?.seconds === 'number' ? savedDraft.seconds : initialSeconds
  );
  const [violationsCount, setViolationsCount] = useState(initialViolationsCount);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResumedToast, setShowResumedToast] = useState(resumedBannerNotice || hasRecoveredDraft);
  const isSubmittedRef = useRef(false);

  // Auto-save quiz progress to localStorage on every change
  useEffect(() => {
    if (isSubmittedRef.current) return;
    try {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          currentIndex,
          answers,
          flagged,
          seconds,
          questionOrderIds,
        })
      );
    } catch {}
  }, [draftStorageKey, currentIndex, answers, flagged, seconds, questionOrderIds]);

  // Audio Playback states for listening questions
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.80);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);

  // Anti-Curang CBT & Mode Anti-Screenshot HP Siswa states
  const [antiCheatEnabled] = useState(true);
  const isAntiScreenshotEnabled = antiScreenshotMode !== 'off';
  const isTouchHoldMode = antiScreenshotMode === 'touch_hold';

  const questionGuardRef = useRef<HTMLDivElement | null>(null);
  const [isHoldingSingleFinger, setIsHoldingSingleFinger] = useState(false);
  const [screenshotBlockState, setScreenshotBlockState] = useState<{
    isLocked: boolean;
    reason: string;
    blockedCount: number;
    cooldownSeconds: number;
  }>({
    isLocked: false,
    reason: '',
    blockedCount: 0,
    cooldownSeconds: 0,
  });
  const lastViolationReportTsRef = useRef<number>(0);

  // Cooldown countdown for Screenshot Blackout Lock Screen
  useEffect(() => {
    if (!screenshotBlockState.isLocked || screenshotBlockState.cooldownSeconds <= 0) return;
    const t = setInterval(() => {
      setScreenshotBlockState((prev) => ({
        ...prev,
        cooldownSeconds: Math.max(0, prev.cooldownSeconds - 1),
      }));
    }, 1000);
    return () => clearInterval(t);
  }, [screenshotBlockState.isLocked, screenshotBlockState.cooldownSeconds]);

  // Clean up body blackout class on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('anti-screenshot-blackout');
    };
  }, []);

  // Reset touch reveal when moving between question numbers
  useEffect(() => {
    questionGuardRef.current?.classList.remove('touch-reveal-active');
    setIsHoldingSingleFinger(false);
  }, [currentIndex]);

  // Zero-Latency (0ms) Anti-Screenshot HP Siswa & Tab-Switch Violation Engine
  useEffect(() => {
    if (!antiCheatEnabled && !isAntiScreenshotEnabled) return;

    const reportViolationDebounced = (reason: string) => {
      if (isSubmittedRef.current) return;
      const now = Date.now();
      if (now - lastViolationReportTsRef.current < 2200) return;
      lastViolationReportTsRef.current = now;

      setViolationsCount((prev) => prev + 1);
      onViolationOccurred?.({
        lastQuestionIndex: currentIndex,
        answers,
        flagged,
        seconds,
        reason,
      });
    };

    const triggerInstantScreenshotBlackout = (reason: string, reportToTeacher: boolean = true) => {
      if (isSubmittedRef.current || !isAntiScreenshotEnabled) return;
      // 1. Synchronous 0ms DOM hiding before mobile OS framebuffer captures the screen
      document.body.classList.add('anti-screenshot-blackout');
      questionGuardRef.current?.classList.remove('touch-reveal-active');
      setIsHoldingSingleFinger(false);

      // 2. Haptic & sound alert + clear clipboard
      try {
        navigator.vibrate?.([200, 80, 200]);
      } catch {}
      try {
        navigator.clipboard?.writeText?.('SCREENSHOT DIBLOKIR - MODE UJIAN HP SISWA').catch(() => {});
      } catch {}
      playViolationAlertSound();

      // 3. Activate full-screen blackout lock state
      setScreenshotBlockState((prev) => ({
        isLocked: true,
        reason,
        blockedCount: prev.blockedCount + 1,
        cooldownSeconds: 3,
      }));

      if (reportToTeacher) {
        reportViolationDebounced(reason);
      }
    };

    // 1. Multi-touch (2 or 3 fingers) gesture detection on mobile phone (3-finger swipe screenshot)
    const handleGlobalTouchStart = (e: TouchEvent) => {
      if (!isAntiScreenshotEnabled || isSubmittedRef.current) return;
      if (e.touches && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        triggerInstantScreenshotBlackout(
          `Terdeteksi percobaan Screenshot HP (Sentuhan ${e.touches.length} Jari pada Soal No. ${currentIndex + 1})`,
          true
        );
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isAntiScreenshotEnabled || isSubmittedRef.current) return;
      if (e.touches && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        triggerInstantScreenshotBlackout(
          `Terdeteksi gestur geser ${e.touches.length} Jari (Screenshot HP) pada Soal No. ${currentIndex + 1}`,
          true
        );
      }
    };

    // 2. TouchCancel fires on Android/iOS when hardware Power+VolumeDown screenshot or system overlay interrupts touch
    const handleGlobalTouchCancel = () => {
      if (!isAntiScreenshotEnabled || isSubmittedRef.current) return;
      questionGuardRef.current?.classList.remove('touch-reveal-active');
      setIsHoldingSingleFinger(false);
      triggerInstantScreenshotBlackout(
        `Terdeteksi interupsi tombol fisik HP / tangkapan layar sistem pada Soal No. ${currentIndex + 1}`,
        true
      );
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) {
        questionGuardRef.current?.classList.remove('touch-reveal-active');
        setIsHoldingSingleFinger(false);
      }
    };

    // 3. Visibility & Window Blur (Notification shade pull-down, Control Center, Screen Recorder, Recent Apps)
    const handleVisibility = () => {
      if (document.hidden && !isSubmittedRef.current) {
        if (isAntiScreenshotEnabled) {
          document.body.classList.add('anti-screenshot-blackout');
          questionGuardRef.current?.classList.remove('touch-reveal-active');
          setIsHoldingSingleFinger(false);
          setScreenshotBlockState((prev) => ({
            isLocked: true,
            reason: 'Layar otomatis dikunci karena aplikasi diminimalkan / panel layar HP dibuka',
            blockedCount: prev.blockedCount + 1,
            cooldownSeconds: 2,
          }));
        }
        reportViolationDebounced('Terdeteksi membuka tab/aplikasi lain atau menarik panel sistem HP');
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittedRef.current || !isAntiScreenshotEnabled) return;
      document.body.classList.add('anti-screenshot-blackout');
      questionGuardRef.current?.classList.remove('touch-reveal-active');
      setIsHoldingSingleFinger(false);
    };

    const handleWindowFocus = () => {
      if (!screenshotBlockState.isLocked) {
        document.body.classList.remove('anti-screenshot-blackout');
      }
    };

    // 4. Hardware/Keyboard Screenshot Keys & Print/Copy Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAntiScreenshotEnabled || isSubmittedRef.current) return;
      const keyLower = (e.key || '').toLowerCase();

      // Hold Spacebar on desktop/laptop to reveal question in touch_hold mode
      if (e.code === 'Space' && isTouchHoldMode && !e.repeat) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          questionGuardRef.current?.classList.add('touch-reveal-active');
          setIsHoldingSingleFinger(true);
          return;
        }
      }

      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isSystemCaptureShortcut =
        ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', '3', '4', '5'].includes(keyLower)) ||
        ((e.ctrlKey || e.metaKey) && ['p', 's', 'u', 'c'].includes(keyLower)) ||
        e.key === 'AudioVolumeDown' ||
        e.key === 'VolumeDown';

      if (isPrintScreen || isSystemCaptureShortcut) {
        e.preventDefault();
        e.stopPropagation();
        triggerInstantScreenshotBlackout(
          `Terdeteksi tombol Screenshot / Pintasan Tangkap Layar (${e.key || 'Capture'})`,
          true
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isAntiScreenshotEnabled || isSubmittedRef.current) return;
      if (e.code === 'Space' && isTouchHoldMode) {
        questionGuardRef.current?.classList.remove('touch-reveal-active');
        setIsHoldingSingleFinger(false);
      }
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerInstantScreenshotBlackout('Terdeteksi tombol PrintScreen / Tangkap Layar', true);
      }
    };

    // 5. Block Long-Press Context Menu, Copy, Cut, Drag on Student Phone
    const handleBlockCopyContext = (e: Event) => {
      if (!isAntiScreenshotEnabled) return;
      e.preventDefault();
    };

    window.addEventListener('touchstart', handleGlobalTouchStart, { capture: true, passive: false });
    window.addEventListener('touchmove', handleGlobalTouchMove, { capture: true, passive: false });
    window.addEventListener('touchcancel', handleGlobalTouchCancel, { capture: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', handleBlockCopyContext);
    document.addEventListener('copy', handleBlockCopyContext);
    document.addEventListener('cut', handleBlockCopyContext);

    return () => {
      window.removeEventListener('touchstart', handleGlobalTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleGlobalTouchMove, { capture: true });
      window.removeEventListener('touchcancel', handleGlobalTouchCancel, { capture: true });
      window.removeEventListener('touchend', handleGlobalTouchEnd, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', handleBlockCopyContext);
      document.removeEventListener('copy', handleBlockCopyContext);
      document.removeEventListener('cut', handleBlockCopyContext);
    };
  }, [
    antiCheatEnabled,
    isAntiScreenshotEnabled,
    isTouchHoldMode,
    currentIndex,
    answers,
    flagged,
    seconds,
    onViolationOccurred,
    screenshotBlockState.isLocked,
  ]);

  const handleDismissScreenshotLock = () => {
    if (screenshotBlockState.cooldownSeconds > 0) return;
    playClickSound();
    document.body.classList.remove('anti-screenshot-blackout');
    questionGuardRef.current?.classList.remove('touch-reveal-active');
    setIsHoldingSingleFinger(false);
    setScreenshotBlockState((prev) => ({
      ...prev,
      isLocked: false,
    }));
  };

  // Synchronous 0ms handlers for 1-finger touch-hold on the Question Card
  const handleCardTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isAntiScreenshotEnabled) return;
    if (e.touches.length === 1) {
      questionGuardRef.current?.classList.add('touch-reveal-active');
      setIsHoldingSingleFinger(true);
    } else if (e.touches.length >= 2) {
      questionGuardRef.current?.classList.remove('touch-reveal-active');
      setIsHoldingSingleFinger(false);
    }
  };

  const handleCardTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isAntiScreenshotEnabled) return;
    if (e.touches.length === 0) {
      questionGuardRef.current?.classList.remove('touch-reveal-active');
      setIsHoldingSingleFinger(false);
    }
  };

  const handleCardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAntiScreenshotEnabled || e.button !== 0) return;
    questionGuardRef.current?.classList.add('touch-reveal-active');
    setIsHoldingSingleFinger(true);
  };

  const handleCardMouseUpOrLeave = () => {
    if (!isAntiScreenshotEnabled) return;
    questionGuardRef.current?.classList.remove('touch-reveal-active');
    setIsHoldingSingleFinger(false);
  };

  // Timer & Auto-Submit when timeLimitMinutes is reached
  const maxSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0;
  const remainingSeconds = maxSeconds > 0 ? Math.max(0, maxSeconds - seconds) : 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (maxSeconds > 0 && seconds >= maxSeconds && !isSubmittedRef.current) {
      isSubmittedRef.current = true;
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
      stopSpeech();
      setIsPlayingAudio(false);
      setShowConfirmModal(false);
      onFinishQuiz(answers, seconds, violationsCount);
    }
  }, [seconds, maxSeconds, answers, violationsCount, onFinishQuiz, draftStorageKey]);

  const currentQuestion = (orderedQuestions && orderedQuestions[currentIndex]) || (orderedQuestions && orderedQuestions[0]) || null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = orderedQuestions.length > 0 && answeredCount === orderedQuestions.length;

  // Auto-play audio when arriving at a question with audio enabled
  useEffect(() => {
    stopSpeech();
    setIsPlayingAudio(false);

    if (currentQuestion && currentQuestion.hasAudio && autoPlayAudio && soundOn) {
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
  }, [currentIndex, autoPlayAudio, soundOn, currentQuestion]);

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
    if (currentIndex < orderedQuestions.length - 1) {
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
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
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

  if (!currentQuestion) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Bank Soal Sedang Kosong</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Saat ini belum ada butir soal yang aktif pada bank soal kuis. Silakan hubungi guru pengawas Anda untuk mengunggah atau mereset bank soal.
          </p>
          <button
            type="button"
            onClick={onExitQuiz}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Kembali ke Halaman Depan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`py-4 sm:py-6 max-w-5xl mx-auto px-3 sm:px-6 ${isAntiScreenshotEnabled ? 'anti-screenshot-zone' : ''}`}>
      {/* Full-Screen Emergency Anti-Screenshot Blackout Lock Overlay */}
      <AnimatePresence>
        {isAntiScreenshotEnabled && screenshotBlockState.isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center p-5 text-center select-none"
          >
            <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500/50 text-rose-400 flex items-center justify-center mx-auto animate-pulse">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-700 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Proteksi Anti-Screenshot HP Siswa</span>
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  TANGKAPAN LAYAR (SCREENSHOT) DIBLOKIR!
                </h2>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-xs text-rose-200 leading-relaxed font-medium">
                {screenshotBlockState.reason || 'Terdeteksi aktivitas tangkapan layar / multi-sentuh pada HP siswa.'}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 space-y-1 font-mono">
                <div>PESERTA: {student.name.toUpperCase()}</div>
                <div>KELAS: {student.studentClass} &bull; ABSEN: {student.studentNumber}</div>
                <div className="text-amber-400 font-bold">
                  TERCATAT DI DASHBOARD GURU ({screenshotBlockState.blockedCount}x PERCOBAAN)
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Demi kejujuran ujian, fitur <strong>Screenshot 3 Jari</strong>, <strong>Tombol Power + Volume</strong>, dan <strong>Rekam Layar</strong> dinonaktifkan. Gunakan <strong>1 jari</strong> saat mengerjakan soal.
              </p>

              <button
                type="button"
                disabled={screenshotBlockState.cooldownSeconds > 0}
                onClick={handleDismissScreenshotLock}
                className={`w-full py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  screenshotBlockState.cooldownSeconds > 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer active:scale-98'
                }`}
              >
                {screenshotBlockState.cooldownSeconds > 0 ? (
                  <>
                    <Lock className="w-4 h-4 animate-spin" />
                    <span>Layar Dikunci ({screenshotBlockState.cooldownSeconds} detik)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Saya Mengerti, Kembali ke Soal (Gunakan 1 Jari)</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap">
            {/* Locked Anti-Screenshot & Anti-Cheat Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold shadow-2xs select-none ${
                isAntiScreenshotEnabled
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/60'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Proteksi Anti-Screenshot HP Siswa & Anti-Curang dikontrol oleh Guru"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Anti-Screenshot HP: {isAntiScreenshotEnabled ? 'ON' : 'OFF'}</span>
            </div>

            {/* Exit / Return to Main Screen */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                stopSpeech();
                onExitQuiz();
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Kembali ke Menu Awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Menu</span>
            </button>

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
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border font-mono text-xs sm:text-sm font-bold shadow-2xs ${
                maxSeconds > 0 && remainingSeconds <= 60
                  ? 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title={maxSeconds > 0 ? `Batas Waktu Pengerjaan: ${timeLimitMinutes} Menit` : 'Waktu Pengerjaan'}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 animate-pulse" />
              <span>
                {maxSeconds > 0 ? `Sisa ${formatTime(remainingSeconds)}` : formatTime(seconds)}
              </span>
            </div>

            {/* Progress summary */}
            <div className="text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
              <span className="text-amber-700">{answeredCount}</span>/{orderedQuestions.length} Terjawab
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(answeredCount / orderedQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Progress Numbers Pills (5 cols on mobile for large tap target, 10 cols on tablet/desktop) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 mb-4 sm:mb-6 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Nomor Soal ({currentIndex + 1} dari {orderedQuestions.length}){shuffleQuestions ? ' • Diacak' : ''}:</span>
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Headphones className="w-3 h-3 text-amber-600" />
            <span>Ikon headphone = Soal Audio</span>
          </span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {orderedQuestions.map((q, idx) => {
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

      {/* Mobile Anti-Screenshot Control & Sensor Status Bar */}
      {isAntiScreenshotEnabled && (
        <div
          className={`mb-3.5 sm:mb-4 p-3 sm:p-3.5 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs ${
            isTouchHoldMode
              ? isHoldingSingleFinger
                ? 'bg-emerald-950 text-white border-emerald-600'
                : 'bg-slate-900 text-white border-amber-500/80'
              : 'bg-slate-900 text-white border-emerald-500/80'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isTouchHoldMode && isHoldingSingleFinger
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                  Mode Anti-Screenshot HP Siswa Aktif
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/15 text-amber-300">
                  {isTouchHoldMode
                    ? 'Tirai Sentuh 1 Jari + Blokir 3 Jari & Tombol'
                    : 'Sensor Blokir 3 Jari + Watermark ID'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {isTouchHoldMode
                  ? isHoldingSingleFinger
                    ? 'Sensor 1 Jari Aktif: Teks soal terbuka. Lepas jari = soal otomatis disensor kembali dalam 0 detik.'
                    : 'Tempel & tahan 1 jari pada area soal untuk membaca & menjawab. Sentuhan >1 jari (screenshot) langsung diblokir.'
                  : 'Layar dilindungi sensor anti-screenshot 3 jari, blokir salin teks, dan watermark identitas siswa.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {screenshotBlockState.blockedCount > 0 && (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-600 text-white">
                Diblokir: {screenshotBlockState.blockedCount}x
              </span>
            )}
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                !isTouchHoldMode || isHoldingSingleFinger
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {!isTouchHoldMode || isHoldingSingleFinger ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Soal Terbuka</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Tahan 1 Jari di Soal</span>
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Main Question Box */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.15 }}
        ref={questionGuardRef}
        onTouchStart={handleCardTouchStart}
        onTouchEnd={handleCardTouchEnd}
        onTouchCancel={handleCardTouchEnd}
        onMouseDown={handleCardMouseDown}
        onMouseUp={handleCardMouseUpOrLeave}
        onMouseLeave={handleCardMouseUpOrLeave}
        className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-amber-200 shadow-sm mb-4 sm:mb-6 relative overflow-hidden ${
          isTouchHoldMode ? 'touch-hold-guard' : ''
        }`}
      >
        {/* Dynamic Moving Forensic Student Watermark Overlay (Anti-External Camera & Anti-Screenshot) */}
        {isAntiScreenshotEnabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none opacity-[0.085]"
          >
            <div
              className="w-[150%] -ml-[25%] h-[150%] -mt-[10%] flex flex-col justify-around -rotate-12 transition-transform duration-700"
              style={{
                transform: `rotate(-12deg) translate(${(seconds % 3) * 6 - 6}px, ${(seconds % 2) * 6 - 3}px)`,
              }}
            >
              {Array.from({ length: 8 }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="whitespace-nowrap text-[10px] sm:text-xs font-black tracking-widest text-slate-900 uppercase"
                >
                  {Array.from({ length: 4 }).map((__, colIdx) => (
                    <span key={colIdx} className="mx-4">
                      DILARANG SCREENSHOT &bull; {student.name} ({student.studentClass} / NO.{student.studentNumber}) &bull; SOAL #{currentIndex + 1} &bull; {formatTime(seconds)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
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

        {/* Protected Question & Options Area (Covered by 0ms Touch-Hold Privacy Shield on Student Phone) */}
        <div className="relative">
          {/* Floating Touch-Hold Curtain Banner (pointer-events-none so 1st finger touch passes directly through to options) */}
          {isTouchHoldMode && (
            <div
              aria-hidden="true"
              className="touch-curtain-overlay pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center p-4 text-center rounded-2xl bg-slate-950/75 backdrop-blur-[2px]"
            >
              <div className="max-w-sm w-full bg-slate-900/95 border-2 border-amber-400/90 rounded-2xl p-4 sm:p-5 shadow-xl text-white space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-md">
                  <Fingerprint className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-amber-300">
                  Mode Anti-Screenshot HP Siswa
                </div>
                <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                  Sentuh &amp; Tahan 1 Jari di Sini untuk Membaca Soal &amp; Memilih Jawaban
                </p>
                <p className="text-[10.5px] sm:text-[11px] text-slate-300 leading-relaxed">
                  Saat jari dilepas untuk menekan tombol screenshot HP atau saat terdeteksi &gt;1 jari, soal otomatis tertutup rapat dalam 0 detik.
                </p>
                {currentAnswer && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-extrabold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Jawaban Tersimpan di Soal Ini: Opsi {currentAnswer}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional Context Box (Recipe Text / Worksheet Excerpt) */}
          {currentQuestion.contextText && (
            <div className="mb-4 sm:mb-6 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-800">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">{currentQuestion.contextTitle || 'Teks Bacaan (English for Nusantara)'}</span>
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
              <pre className="protected-exam-text whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/90 p-3 sm:p-4 rounded-xl border border-amber-100 overflow-x-auto">
                {currentQuestion.contextText}
              </pre>
            </div>
          )}

          {/* Question Text with listen button */}
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="protected-exam-text text-sm sm:text-lg font-bold text-slate-900 leading-relaxed">
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
                  <span className="protected-exam-text text-xs sm:text-base leading-relaxed pt-0.5 font-medium flex-1">
                    {option.text}
                  </span>
                  {isSelected && (
                    <span className="shrink-0 text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-500 text-white self-center">
                      Terpilih
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
          {currentIndex < orderedQuestions.length - 1 ? (
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
                  <span className="font-bold text-slate-800">{orderedQuestions.length} Soal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sudah Dijawab:</span>
                  <span className="font-bold text-emerald-700">{answeredCount} Soal</span>
                </div>
                {!isAllAnswered && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Belum Dijawab:</span>
                    <span>{orderedQuestions.length - answeredCount} Soal</span>
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
