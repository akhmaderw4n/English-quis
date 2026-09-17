import React from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle, XCircle, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { Question } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';

interface ReviewModalProps {
  studentAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  studentName: string;
  score: number;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  studentAnswers,
  studentName,
  score,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-amber-50/60 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base sm:text-lg">
                Pembahasan Lengkap Soal Kuis
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Nilai: {score}/100
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Peserta: <strong className="text-slate-800">{studentName}</strong> &bull; {QUIZ_METADATA.chapter}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Questions List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {QUIZ_QUESTIONS.map((q, idx) => {
            const studentAns = studentAnswers[q.id];
            const isCorrect = studentAns === q.correctAnswer;
            const isAnswered = !!studentAns;

            return (
              <div 
                key={q.id}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                  isCorrect 
                    ? 'border-emerald-200 bg-emerald-50/20' 
                    : isAnswered 
                    ? 'border-rose-200 bg-rose-50/20' 
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                      isCorrect ? 'bg-emerald-600' : isAnswered ? 'bg-rose-600' : 'bg-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {q.topic}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                        <CheckCircle className="w-3.5 h-3.5" /> Benar (+10)
                      </span>
                    ) : isAnswered ? (
                      <span className="flex items-center gap-1 text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                        <XCircle className="w-3.5 h-3.5" /> Salah (+0)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5" /> Tidak Dijawab
                      </span>
                    )}
                  </div>
                </div>

                {/* Context Text */}
                {q.contextText && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-slate-700">
                    <p className="font-bold text-amber-900 mb-1">{q.contextTitle || 'Teks Resep:'}</p>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">
                      {q.contextText}
                    </pre>
                  </div>
                )}

                {/* Question */}
                <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
                  {q.question}
                </h4>

                {/* Options List */}
                <div className="space-y-2 mb-4">
                  {q.options.map(opt => {
                    const isStudentPick = studentAns === opt.key;
                    const isRightOption = q.correctAnswer === opt.key;

                    let optBg = 'bg-white border-slate-200 text-slate-700';
                    if (isRightOption) {
                      optBg = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                    } else if (isStudentPick && !isRightOption) {
                      optBg = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                    }

                    return (
                      <div
                        key={opt.key}
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 ${optBg}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                            isRightOption ? 'bg-emerald-600 text-white' : isStudentPick ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {opt.key}
                          </span>
                          <span>{opt.text}</span>
                        </div>

                        {/* Badges */}
                        <div className="shrink-0 flex items-center gap-1 text-xs">
                          {isRightOption && (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                              Kunci Jawaban
                            </span>
                          )}
                          {isStudentPick && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isRightOption ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-200'}`}>
                              Pilihanmu
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs leading-relaxed text-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pembahasan Guru ({QUIZ_METADATA.branding}):</span>
                  </div>
                  <p className="text-slate-700">{q.explanation}</p>
                  <p className="text-[11px] text-blue-700 mt-1 italic">
                    Sumber: {q.unitReference}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {QUIZ_METADATA.branding} &bull; English for Nusantara Kelas 7
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            Tutup Pembahasan
          </button>
        </div>
      </motion.div>
    </div>
  );
};
