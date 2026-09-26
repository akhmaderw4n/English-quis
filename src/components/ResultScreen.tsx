import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RotateCcw, 
  BookOpen, 
  Printer, 
  ShieldCheck, 
  GraduationCap, 
  Sparkles,
  ChevronRight,
  School
} from 'lucide-react';
import { QuizSubmission, StudentInfo, Question } from '../types';
import { QUIZ_METADATA } from '../data/quizData';
import { playCelebrationSound, playClickSound } from '../utils/audio';
import { ReviewModal } from './ReviewModal';
import { PrintCertificateModal } from './PrintCertificateModal';

interface ResultScreenProps {
  submission: QuizSubmission;
  student: StudentInfo;
  onRetakeQuiz: () => void;
  onGoHome: () => void;
  onOpenTeacherAuth: () => void;
  questions?: Question[];
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  submission,
  student,
  onRetakeQuiz,
  onGoHome,
  onOpenTeacherAuth,
  questions,
}) => {
  const [showReview, setShowReview] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const isPassed = submission.score >= QUIZ_METADATA.passingScore;

  useEffect(() => {
    if (isPassed) {
      playCelebrationSound();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });
    }
  }, [isPassed]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins} menit ${secs} detik`;
  };

  const handlePrint = () => {
    playClickSound();
    setShowPrintModal(true);
  };

  return (
    <div className="py-4 sm:py-10 max-w-4xl mx-auto px-3.5 sm:px-6">
      {/* Result Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-10 border border-amber-200 shadow-md text-center relative overflow-hidden"
      >
        {/* Background decorative glow */}
        <div className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none ${isPassed ? 'bg-emerald-400' : 'bg-amber-400'}`} />

        {/* Branding header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm border border-amber-300 mb-3 sm:mb-4">
          <GraduationCap className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{QUIZ_METADATA.branding}</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Hasil Kuis: Introducing My self and other
        </h1>
        <p className="text-[11px] sm:text-sm text-slate-500 mt-1">
          {QUIZ_METADATA.textbook} &bull; {QUIZ_METADATA.chapter}
        </p>

        {/* Student Name and Class Pill */}
        <div className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold max-w-full">
          <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          <span className="truncate">{student.name} ({student.studentClass} &bull; Absen {student.studentNumber})</span>
        </div>

        {/* Big Score Display */}
        <div className="my-6 sm:my-8 flex flex-col items-center justify-center">
          <div className="relative">
            <div className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center border-6 sm:border-8 shadow-inner transition-transform hover:scale-105 ${
              isPassed 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                : 'border-amber-500 bg-amber-50 text-amber-900'
            }`}>
              <span className="text-4xl sm:text-6xl font-black tracking-tighter">
                {submission.score}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                POIN
              </span>
            </div>
            {isPassed && (
              <div className="absolute -bottom-2 bg-emerald-600 text-white p-1.5 sm:p-2 rounded-full shadow-md">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              </div>
            )}
          </div>

          {/* Passing Status Badge */}
          <div className="mt-4 sm:mt-5 px-2">
            {isPassed ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs sm:text-sm border border-emerald-300 shadow-2xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>TUNTAS KKM (Nilai &ge; {QUIZ_METADATA.passingScore})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm border border-amber-300 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>BELUM TUNTAS KKM (Perlu Pengayaan)</span>
              </span>
            )}
            <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              {isPassed 
                ? 'Kerja bagus! Kamu telah memahami struktur resep dan unsur kebahasaan procedure text dengan sangat baik.' 
                : 'Tetap semangat! Pelajari kembali action verbs dan sequence words melalui tombol pembahasan soal di bawah ini.'}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto mb-6 sm:mb-8">
          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <span className="text-[10px] sm:text-xs text-emerald-800 font-bold block">Benar</span>
            <span className="text-lg sm:text-2xl font-black text-emerald-900 mt-0.5 block">
              {submission.correctCount} <span className="text-[10px] sm:text-xs font-normal text-emerald-600">/ 10</span>
            </span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50/80 border border-rose-200">
            <span className="text-[10px] sm:text-xs text-rose-800 font-bold block">Salah</span>
            <span className="text-lg sm:text-2xl font-black text-rose-900 mt-0.5 block">
              {submission.wrongCount} <span className="text-[10px] sm:text-xs font-normal text-rose-600">/ 10</span>
            </span>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] sm:text-xs text-slate-600 font-bold block">Durasi</span>
            <span className="text-xs sm:text-base font-bold text-slate-800 mt-1 sm:mt-2 block font-mono">
              {formatTime(submission.timeSpentSeconds)}
            </span>
          </div>
        </div>

        {/* Actions Button Bar: Stacked & Grid layout on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-lg mx-auto">
          {/* Review Button (Full width primary on phone) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowReview(true);
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Lihat Pembahasan Lengkap</span>
          </button>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            {/* Retake Button */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onRetakeQuiz();
              }}
              className="px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Ulangi Kuis</span>
            </button>

            {/* Print/Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Cetak Bukti Nilai Siswa"
            >
              <Printer className="w-4 h-4 text-slate-600 shrink-0" />
              <span>Cetak Nilai</span>
            </button>
          </div>
        </div>

        {/* Quick Teacher Portal Link */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={onGoHome}
            className="hover:text-amber-700 font-semibold cursor-pointer text-center sm:text-left active:scale-95"
          >
            &larr; Halaman Awal
          </button>
          <button
            type="button"
            onClick={onOpenTeacherAuth}
            className="flex items-center gap-1 text-slate-700 hover:text-amber-700 font-bold cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Akses Rekap Nilai (Dashboard Guru)</span>
          </button>
        </div>
      </motion.div>

      {/* Review Modal */}
      {showReview && (
        <ReviewModal
          studentAnswers={submission.answers}
          studentName={student.name}
          score={submission.score}
          onClose={() => setShowReview(false)}
          questions={questions}
        />
      )}

      {/* Official Print & Certificate Modal */}
      {showPrintModal && (
        <PrintCertificateModal
          student={student}
          submission={submission}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
