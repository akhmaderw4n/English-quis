import React, { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { Question, StudentInfo } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';
import { playClickSound } from '../utils/audio';

interface QuizScreenProps {
  student: StudentInfo;
  onFinishQuiz: (answers: Record<number, 'A' | 'B' | 'C' | 'D'>, timeSpentSeconds: number) => void;
  onExitQuiz: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  student,
  onFinishQuiz,
  onExitQuiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [seconds, setSeconds] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    if (currentIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    playClickSound();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    playClickSound();
    setCurrentIndex(index);
  };

  const handleAttemptFinish = () => {
    playClickSound();
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    onFinishQuiz(answers, seconds);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="py-4 sm:py-6 max-w-5xl mx-auto px-3 sm:px-6">
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Nomor Soal ({currentIndex + 1} dari 10):
          </span>
          <span className="text-[11px] text-slate-400">
            Ketuk nomor untuk loncat
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

        {/* Optional Context Box (Recipe Text / Worksheet Excerpt) */}
        {currentQuestion.contextText && (
          <div className="mb-4 sm:mb-6 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate">{currentQuestion.contextTitle || 'Teks Rujukan Resep (English for Nusantara)'}</span>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/90 p-3 sm:p-4 rounded-xl border border-amber-100 overflow-x-auto">
              {currentQuestion.contextText}
            </pre>
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-relaxed mb-4 sm:mb-6">
          {currentQuestion.question}
        </h2>

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
