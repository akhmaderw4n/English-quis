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
import { QuizSubmission, StudentInfo } from '../types';
import { QUIZ_METADATA } from '../data/quizData';
import { playCelebrationSound, playClickSound } from '../utils/audio';
import { ReviewModal } from './ReviewModal';

interface ResultScreenProps {
  submission: QuizSubmission;
  student: StudentInfo;
  onRetakeQuiz: () => void;
  onGoHome: () => void;
  onOpenTeacherAuth: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  submission,
  student,
  onRetakeQuiz,
  onGoHome,
  onOpenTeacherAuth,
}) => {
  const [showReview, setShowReview] = useState(false);
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
    window.print();
  };

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Result Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-200 shadow-lg text-center relative overflow-hidden"
      >
        {/* Background decorative glow */}
        <div className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none ${isPassed ? 'bg-emerald-400' : 'bg-amber-400'}`} />

        {/* Branding header */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm border border-amber-300 mb-4">
          <GraduationCap className="w-4 h-4 text-amber-700" />
          <span>{QUIZ_METADATA.branding}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Hasil Kuis: Procedure Text
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {QUIZ_METADATA.textbook} &bull; {QUIZ_METADATA.chapter}
        </p>

        {/* Student Name and Class Pill */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-sm font-semibold">
          <School className="w-4 h-4 text-amber-600" />
          <span>{student.name} ({student.studentClass} &bull; Absen {student.studentNumber})</span>
        </div>

        {/* Big Score Display */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative">
            <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center border-8 shadow-inner ${
              isPassed 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                : 'border-amber-500 bg-amber-50 text-amber-900'
            }`}>
              <span className="text-4xl sm:text-6xl font-black tracking-tighter">
                {submission.score}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                POIN
              </span>
            </div>
            {isPassed && (
              <div className="absolute -bottom-2 bg-emerald-600 text-white p-2 rounded-full shadow-md">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
            )}
          </div>

          {/* Passing Status Badge */}
          <div className="mt-5">
            {isPassed ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm border border-emerald-300">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                TUNTAS KKM (Nilai &ge; {QUIZ_METADATA.passingScore})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 font-bold text-sm border border-amber-300">
                <Clock className="w-4 h-4 text-amber-600" />
                BELUM TUNTAS KKM (Perlu Pengayaan)
              </span>
            )}
            <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto">
              {isPassed 
                ? 'Kerja bagus! Kamu telah memahami struktur resep dan unsur kebahasaan procedure text dengan sangat baik.' 
                : 'Jangan berkecil hati! Pelajari kembali kosakata action verbs dan sequence words melalui pembahasan soal.'}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto mb-8">
          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-xs text-emerald-700 font-semibold block">Jawaban Benar</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
              {submission.correctCount} <span className="text-xs font-normal text-emerald-600">/ 10</span>
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <span className="text-xs text-rose-700 font-semibold block">Jawaban Salah</span>
            <span className="text-xl sm:text-2xl font-black text-rose-800 mt-1 block">
              {submission.wrongCount} <span className="text-xs font-normal text-rose-600">/ 10</span>
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold block">Waktu Selesai</span>
            <span className="text-sm sm:text-base font-bold text-slate-800 mt-2 block font-mono">
              {formatTime(submission.timeSpentSeconds)}
            </span>
          </div>
        </div>

        {/* Actions Button Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Review Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowReview(true);
            }}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Lihat Pembahasan Lengkap</span>
          </button>

          {/* Retake Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onRetakeQuiz();
            }}
            className="px-5 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Ulangi Kuis</span>
          </button>

          {/* Print/Download Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Cetak Bukti Nilai Siswa"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Nilai</span>
          </button>
        </div>

        {/* Quick Teacher Portal Link */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={onGoHome}
            className="hover:text-amber-700 font-medium cursor-pointer"
          >
            &larr; Halaman Awal
          </button>
          <button
            type="button"
            onClick={onOpenTeacherAuth}
            className="flex items-center gap-1 text-slate-700 hover:text-amber-700 font-semibold cursor-pointer"
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
        />
      )}
    </div>
  );
};
