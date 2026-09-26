import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pencil,
  Check,
  HelpCircle,
  Headphones,
  FileText,
  Volume2,
  Square,
  AlertCircle,
  Loader2,
  BookOpen,
  Plus
} from 'lucide-react';
import { Question } from '../types';
import { playClickSound, playUnlockSuccessSound, speakEnglish, stopSpeech } from '../utils/audio';

interface QuestionEditModalProps {
  isOpen: boolean;
  question: Question | null; // null means adding a new question
  totalQuestions: number;
  onSave: (question: Question) => Promise<void> | void;
  onClose: () => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  question,
  totalQuestions,
  onSave,
  onClose,
}) => {
  const isEditing = !!question;

  // Form states
  const [topic, setTopic] = useState('');
  const [unitReference, setUnitReference] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [hasContext, setHasContext] = useState(false);
  const [contextTitle, setContextTitle] = useState('');
  const [contextText, setContextText] = useState('');

  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const [explanation, setExplanation] = useState('');
  const [hasAudio, setHasAudio] = useState(false);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioScript, setAudioScript] = useState('');
  const [listeningInstruction, setListeningInstruction] = useState('');

  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens or question prop changes
  useEffect(() => {
    if (question) {
      setTopic(question.topic || 'Chapter 2: Culinary and Me');
      setUnitReference(question.unitReference || 'Chapter 2 - English for Nusantara');
      setQuestionText(question.question || '');
      setHasContext(!!(question.contextText && question.contextText.trim().length > 0));
      setContextTitle(question.contextTitle || '');
      setContextText(question.contextText || '');

      const optA = question.options.find(o => o.key === 'A')?.text || '';
      const optB = question.options.find(o => o.key === 'B')?.text || '';
      const optC = question.options.find(o => o.key === 'C')?.text || '';
      const optD = question.options.find(o => o.key === 'D')?.text || '';
      setOptionA(optA);
      setOptionB(optB);
      setOptionC(optC);
      setOptionD(optD);

      setCorrectAnswer(question.correctAnswer || 'A');
      setExplanation(question.explanation || '');

      setHasAudio(!!question.hasAudio);
      setAudioTitle(question.audioTitle || '');
      setAudioScript(question.audioScript || '');
      setListeningInstruction(question.listeningInstruction || '');
    } else {
      // Default template for a new question
      setTopic('Chapter 2: Culinary and Me');
      setUnitReference('Chapter 2 - English for Nusantara');
      setQuestionText('');
      setHasContext(false);
      setContextTitle('');
      setContextText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectAnswer('A');
      setExplanation('');
      setHasAudio(false);
      setAudioTitle('');
      setAudioScript('');
      setListeningInstruction('');
    }
    setErrorMessage(null);
    setIsTestingAudio(false);
    stopSpeech();
  }, [question, isOpen]);

  if (!isOpen) return null;

  const handleTestAudio = () => {
    if (isTestingAudio) {
      stopSpeech();
      setIsTestingAudio(false);
      return;
    }
    const textToSpeak = audioScript.trim() || questionText.trim();
    if (!textToSpeak) {
      setErrorMessage('Isi teks pertanyaan atau naskah audio terlebih dahulu untuk menguji audio.');
      return;
    }
    setIsTestingAudio(true);
    speakEnglish(textToSpeak, {
      onEnd: () => setIsTestingAudio(false),
      onError: () => setIsTestingAudio(false),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validations
    if (!questionText.trim()) {
      setErrorMessage('Teks pertanyaan wajib diisi.');
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMessage('Pilihan jawaban A, B, C, dan D semuanya wajib diisi.');
      return;
    }
    if (!explanation.trim()) {
      setErrorMessage('Pembahasan jawaban wajib diisi agar siswa mendapatkan umpan balik belajar.');
      return;
    }

    const questionId = question ? question.id : totalQuestions + 1;

    const updatedQuestion: Question = {
      id: questionId,
      topic: topic.trim() || `Soal ${questionId}`,
      unitReference: unitReference.trim() || 'English for Nusantara Chapter 2',
      question: questionText.trim(),
      contextTitle: hasContext && contextTitle.trim() ? contextTitle.trim() : undefined,
      contextText: hasContext && contextText.trim() ? contextText.trim() : undefined,
      options: [
        { key: 'A', text: optionA.trim() },
        { key: 'B', text: optionB.trim() },
        { key: 'C', text: optionC.trim() },
        { key: 'D', text: optionD.trim() },
      ],
      correctAnswer,
      explanation: explanation.trim(),
      hasAudio,
      audioTitle: hasAudio && audioTitle.trim() ? audioTitle.trim() : undefined,
      audioScript: hasAudio && audioScript.trim() ? audioScript.trim() : undefined,
      listeningInstruction: hasAudio && listeningInstruction.trim() ? listeningInstruction.trim() : undefined,
    };

    setIsSaving(true);
    try {
      await onSave(updatedQuestion);
      playUnlockSuccessSound();
      stopSpeech();
      onClose();
    } catch (err) {
      console.error('Error saving question:', err);
      setErrorMessage('Gagal menyimpan perubahan ke database. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white">
              {isEditing ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>{isEditing ? `Edit Soal Nomor ${question?.id}` : 'Tambah Soal Baru Manual'}</span>
              </h3>
              <p className="text-xs text-amber-100">
                {isEditing
                  ? 'Perubahan akan otomatis tersimpan permanen ke Cloud Firestore.'
                  : 'Soal baru akan ditambahkan ke bank soal dan tersimpan permanen.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              stopSpeech();
              onClose();
            }}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Topik & Referensi Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Topik / Indikator Soal:</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: Cooking Utensils / Recipe Structure"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Referensi Bab / Kurikulum:</span>
              </label>
              <input
                type="text"
                value={unitReference}
                onChange={(e) => setUnitReference(e.target.value)}
                placeholder="Contoh: Chapter 2 - English for Nusantara"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Pertanyaan (Question Text) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Teks Pertanyaan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Tuliskan pertanyaan soal dalam bahasa Inggris..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-900 resize-y"
              required
            />
          </div>

          {/* Teks Bacaan / Konteks (Opsional) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasContext}
                  onChange={(e) => setHasContext(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Sertakan Teks Bacaan / Teks Resep (Opsional)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {hasContext ? 'Aktif' : 'Non-aktif'}
              </span>
            </div>

            {hasContext && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Judul Teks Bacaan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={contextTitle}
                    onChange={(e) => setContextTitle(e.target.value)}
                    placeholder="Contoh: Recipe: How to Make Banana Fritters"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Isi Teks Bacaan:
                  </label>
                  <textarea
                    rows={4}
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    placeholder="Tuliskan teks paragraf atau resep lengkap di sini..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pilihan Jawaban A, B, C, D */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span>Pilihan Jawaban &amp; Kunci Jawaban Benar</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Klik tombol <span className="font-bold text-emerald-700">KUNCI</span> pada opsi yang benar
              </span>
            </div>

            <div className="space-y-2.5">
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const isCurrentCorrect = correctAnswer === key;
                const value =
                  key === 'A' ? optionA : key === 'B' ? optionB : key === 'C' ? optionC : optionD;
                const setter =
                  key === 'A' ? setOptionA : key === 'B' ? setOptionB : key === 'C' ? setOptionC : setOptionD;

                return (
                  <div
                    key={key}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                      isCurrentCorrect
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCorrectAnswer(key);
                      }}
                      className={`w-8 h-8 rounded-xl font-black text-xs shrink-0 flex items-center justify-center cursor-pointer transition-all shadow-2xs ${
                        isCurrentCorrect
                          ? 'bg-emerald-600 text-white shadow-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={`Jadikan pilihan ${key} sebagai kunci jawaban benar`}
                    >
                      {key}
                    </button>

                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={`Pilihan ${key}...`}
                      className="flex-1 px-3 py-2 rounded-xl bg-transparent border-0 focus:outline-none focus:ring-0 font-medium text-slate-900"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCorrectAnswer(key);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer flex items-center gap-1.5 transition-all shrink-0 ${
                        isCurrentCorrect
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-800'
                      }`}
                    >
                      {isCurrentCorrect ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Kunci Benar</span>
                        </>
                      ) : (
                        <span>Pilih Kunci</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pembahasan Jawaban */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Pembahasan Jawaban <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Jelaskan mengapa pilihan tersebut benar untuk bahan evaluasi siswa..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 resize-y"
              required
            />
          </div>

          {/* Pengaturan Audio Listening */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-900 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAudio}
                  onChange={(e) => setHasAudio(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-amber-700" />
                  <span>Fitur Audio Listening (Otomatis Dibacakan Suara Bahasa Inggris)</span>
                </span>
              </label>
              <button
                type="button"
                onClick={handleTestAudio}
                className="px-3 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {isTestingAudio ? (
                  <>
                    <Square className="w-3 h-3 text-rose-600 fill-rose-600" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-800" />
                    <span>Uji Suara Audio</span>
                  </>
                )}
              </button>
            </div>

            {hasAudio && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Petunjuk Listening untuk Siswa (Opsional):
                  </label>
                  <input
                    type="text"
                    value={listeningInstruction}
                    onChange={(e) => setListeningInstruction(e.target.value)}
                    placeholder="Contoh: Dengarkan percakapan resep berikut lalu jawab pertanyaan..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Naskah Suara Audio Khusus (Audio Script):
                  </label>
                  <textarea
                    rows={2}
                    value={audioScript}
                    onChange={(e) => setAudioScript(e.target.value)}
                    placeholder="Jika dikosongkan, sistem akan otomatis membacakan teks pertanyaan."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-slate-800"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sistem menggunakan suara sintesis bahasa Inggris (TTS) berkualitas tinggi tanpa perlu kuota file eksternal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Kunci Jawaban Terpilih: <strong>Opsi {correctAnswer}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                playClickSound();
                stopSpeech();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-colors disabled:opacity-50 cursor-pointer text-xs"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Permanen...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Simpan Perubahan Permanen' : 'Simpan Soal Baru'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
