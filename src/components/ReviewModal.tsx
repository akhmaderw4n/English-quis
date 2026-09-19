import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle, XCircle, BookOpen, AlertCircle, Sparkles, Volume2, Headphones, Square } from 'lucide-react';
import { Question } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';
import { speakEnglish, stopSpeech, playClickSound } from '../utils/audio';

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
  const [playingId, setPlayingId] = useState<number | null>(null);

  const handlePlayQuestionAudio = (q: Question) => {
    playClickSound();
    if (playingId === q.id) {
      stopSpeech();
      setPlayingId(null);
    } else {
      stopSpeech();
      setPlayingId(q.id);
      const textToSpeak = q.audioScript || q.question;
      speakEnglish(textToSpeak, {
        rate: 0.92,
        onStart: () => setPlayingId(q.id),
        onEnd: () => setPlayingId(null),
        onError: () => setPlayingId(null),
      });
    }
  };

  const handleClose = () => {
    stopSpeech();
    setPlayingId(null);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="bg-white rounded-none sm:rounded-2xl max-w-3xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col border-0 sm:border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-amber-50/70 flex items-center justify-between gap-2.5 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm sm:text-lg">
                Pembahasan Soal Kuis
              </span>
              <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Nilai: {score}/100
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 truncate">
              Peserta: <strong className="text-slate-800">{studentName}</strong> &bull; {QUIZ_METADATA.chapter}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white active:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Questions List */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {QUIZ_QUESTIONS.map((q, idx) => {
            const studentAns = studentAnswers[q.id];
            const isCorrect = studentAns === q.correctAnswer;
            const isAnswered = !!studentAns;

            return (
              <div 
                key={q.id}
                className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all ${
                  isCorrect 
                    ? 'border-emerald-200 bg-emerald-50/25' 
                    : isAnswered 
                    ? 'border-rose-200 bg-rose-50/25' 
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                      isCorrect ? 'bg-emerald-600' : isAnswered ? 'bg-rose-600' : 'bg-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-700">
                      {q.topic}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold">
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle className="w-3.5 h-3.5" /> Benar (+10)
                      </span>
                    ) : isAnswered ? (
                      <span className="flex items-center gap-1 text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        <XCircle className="w-3.5 h-3.5" /> Salah (+0)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5" /> Lewat
                      </span>
                    )}
                  </div>
                </div>

                {/* Audio Listening Bar if Question has Audio */}
                {q.hasAudio && (
                  <div className="mb-3 flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Headphones className="w-4 h-4 text-amber-800 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-amber-950 block truncate">
                          {q.audioTitle || 'Audio Soal Listening'}
                        </span>
                        <span className="text-[10px] text-amber-800 hidden sm:inline">
                          Dengarkan kembali pelafalan suara audio soal ini
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlayQuestionAudio(q)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0 ${
                        playingId === q.id
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {playingId === q.id ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Hentikan Suara</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Putar Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Context Text */}
                {q.contextText && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-700">
                    <p className="font-bold text-amber-900 mb-1">{q.contextTitle || 'Teks Resep:'}</p>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed overflow-x-auto">
                      {q.contextText}
                    </pre>
                  </div>
                )}

                {/* Question */}
                <h4 className="text-xs sm:text-base font-bold text-slate-900 mb-2.5 leading-snug">
                  {q.question}
                </h4>

                {/* Options List */}
                <div className="space-y-2 mb-3.5">
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
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 ${optBg}`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isRightOption ? 'bg-emerald-600 text-white' : isStudentPick ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                        </div>

                        {/* Badges */}
                        <div className="shrink-0 flex items-center gap-1 text-[10px] sm:text-xs pl-7 sm:pl-0">
                          {isRightOption && (
                            <span className="font-bold text-emerald-800 bg-emerald-200/90 px-1.5 py-0.5 rounded">
                              Kunci Jawaban
                            </span>
                          )}
                          {isStudentPick && (
                            <span className={`font-bold px-1.5 py-0.5 rounded ${isRightOption ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-200'}`}>
                              Pilihanmu
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs leading-relaxed text-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pembahasan Guru ({QUIZ_METADATA.branding}):</span>
                  </div>
                  <p className="text-slate-700 text-xs">{q.explanation}</p>
                  <p className="text-[10px] sm:text-[11px] text-blue-700 mt-1 italic">
                    Sumber: {q.unitReference}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-500 truncate">
            {QUIZ_METADATA.branding} &bull; English for Nusantara
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 active:bg-slate-800 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
          >
            Tutup Pembahasan
          </button>
        </div>
      </motion.div>
    </div>
  );
};
