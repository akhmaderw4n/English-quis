import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Copy,
  Check,
  Trash2,
  Edit3,
  HelpCircle,
  Sparkles,
  RefreshCw,
  FileCode,
  Layers,
  ArrowRight,
  Headphones,
  CheckSquare
} from 'lucide-react';
import mammoth from 'mammoth';
import { Question } from '../types';
import { 
  parseWordQuestions, 
  ParsedQuestionItem, 
  SAMPLE_WORD_QUESTION_TEXT, 
  downloadWordCompatibleDoc 
} from '../utils/wordQuestionParser';
import { playClickSound, playUnlockSuccessSound, playWrongSound } from '../utils/audio';

interface WordImportModalProps {
  isOpen?: boolean;
  currentQuestions?: Question[];
  currentQuestionCount?: number;
  onApplyQuestions: (newQuestions: Question[], mode: 'replace' | 'append') => Promise<void> | void;
  onClose: () => void;
}

export const WordImportModal: React.FC<WordImportModalProps> = ({
  isOpen = true,
  currentQuestions = [],
  currentQuestionCount,
  onApplyQuestions,
  onClose,
}) => {
  if (!isOpen) return null;

  const actualQuestionCount = currentQuestionCount ?? currentQuestions.length;
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste' | 'template'>('upload');
  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isCopiedTemplate, setIsCopiedTemplate] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<ParsedQuestionItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse whenever inputText changes
  const parseResult = React.useMemo(() => {
    return parseWordQuestions(inputText);
  }, [inputText]);

  // Handle .docx File Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsProcessingFile(true);

    try {
      if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(result.value);
        playClickSound();
      } else if (file.name.endsWith('.txt') || file.type.includes('text/plain')) {
        const text = await file.text();
        setInputText(text);
        playClickSound();
      } else {
        // Fallback for .doc or other formats: attempt reading text
        const text = await file.text();
        setInputText(text);
      }
    } catch (err) {
      console.error('Error reading Word file:', err);
      playWrongSound();
      alert('Gagal membaca file Word. Pastikan file berformat .docx standar atau Anda dapat langsung menyalin teks dari Word ke tab "Tempel Teks".');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const onDropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Load sample template text into editor
  const handleLoadSample = () => {
    playClickSound();
    setInputText(SAMPLE_WORD_QUESTION_TEXT);
    setFileName('contoh_soal_procedure_text.docx');
  };

  // Copy template format
  const handleCopyTemplate = () => {
    playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SAMPLE_WORD_QUESTION_TEXT);
      setIsCopiedTemplate(true);
      setTimeout(() => setIsCopiedTemplate(false), 2500);
    }
  };

  // Download Word doc template
  const handleDownloadTemplate = () => {
    playClickSound();
    downloadWordCompatibleDoc(currentQuestions, 'Template_Bank_Soal_Word');
  };

  // Remove a parsed question from the list
  const handleRemoveQuestion = (idToRemove: number) => {
    playClickSound();
    const updated = parseResult.questions.filter(q => q.id !== idToRemove);
    // Rebuild text from remaining questions
    rebuildInputFromQuestions(updated);
  };

  // Start editing a question in the preview
  const handleStartEdit = (q: ParsedQuestionItem) => {
    playClickSound();
    setEditQuestionId(q.id);
    setEditFormData({ ...q });
  };

  const handleSaveEdit = () => {
    if (!editFormData) return;
    playClickSound();
    const updated = parseResult.questions.map(q => q.id === editFormData.id ? editFormData : q);
    rebuildInputFromQuestions(updated);
    setEditQuestionId(null);
    setEditFormData(null);
  };

  const rebuildInputFromQuestions = (questionsList: ParsedQuestionItem[]) => {
    const newText = questionsList.map((q, idx) => {
      let block = `${idx + 1}. ${q.question}\n`;
      if (q.contextText) {
        block = `[Teks Bacaan: ${q.contextTitle || 'Teks Referensi'}]\n${q.contextText}\n\n` + block;
      }
      if (q.hasAudio && q.audioScript) {
        block += `Audio: ${q.audioScript}\n`;
      }
      q.options.forEach(opt => {
        block += `${opt.key}. ${opt.text}\n`;
      });
      block += `Kunci: ${q.correctAnswer}\n`;
      block += `Pembahasan: ${q.explanation}\n`;
      block += `Topik: ${q.topic}\n`;
      block += `Unit: ${q.unitReference}\n`;
      return block;
    }).join('\n\n');
    setInputText(newText);
  };

  // Apply parsed questions to active quiz bank
  const handleApply = () => {
    if (parseResult.questions.length === 0) return;
    playUnlockSuccessSound();

    // Map into clean Question objects
    const cleanQuestions: Question[] = parseResult.questions.map((pq, idx) => ({
      id: pq.id || idx + 1,
      question: pq.question,
      contextText: pq.contextText,
      contextTitle: pq.contextTitle,
      options: pq.options,
      correctAnswer: pq.correctAnswer,
      explanation: pq.explanation,
      topic: pq.topic,
      unitReference: pq.unitReference,
      hasAudio: pq.hasAudio,
      audioTitle: pq.audioTitle,
      audioScript: pq.audioScript,
      listeningInstruction: pq.listeningInstruction
    }));

    onApplyQuestions(cleanQuestions, importMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <span>Import Bank Soal dari Dokumen Word</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Word (.docx)
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Unggah berkas Microsoft Word (.docx) atau tempel teks soal untuk otomatis diekstrak menjadi kuis interaktif.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveInputTab('upload');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeInputTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Unggah File Word (.docx)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveInputTab('paste');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeInputTab === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Tempel Teks dari Word</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveInputTab('template');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeInputTab === 'template'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Format &amp; Contoh Soal</span>
            </button>
          </div>

          {/* Quick Action: Load Sample Button */}
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Muat Contoh 5 Soal</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: UPLOAD FILE WORD */}
          {activeInputTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDropHandler}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/80 scale-[0.99]'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-7 h-7" />
                </div>

                <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                  {fileName ? `File terpilih: ${fileName}` : 'Klik untuk Memilih File Word (.docx) atau Tarik ke Sini'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Mendukung berkas Microsoft Word (.docx) standar. Sistem secara otomatis mengekstrak nomor soal, opsi A-D, kunci jawaban, dan pembahasan.
                </p>

                {isProcessingFile && (
                  <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-lg bg-amber-200 text-amber-900 text-xs font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengekstrak isi dokumen Word...</span>
                  </div>
                )}
              </div>

              {fileName && parseResult.totalDetected > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Berhasil mengekstrak <strong>{parseResult.totalDetected} soal</strong> dari berkas <strong>{fileName}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      setFileName(null);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
                  >
                    Hapus / Ganti File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeInputTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700">
                  Tempel (Paste) Seluruh Teks Dokumen Word di Sini:
                </label>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    Bersihkan Teks
                  </button>
                )}
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Contoh format:\n\n1. What is the primary social function of procedure text?\nA. To entertain readers\nB. To explain step-by-step how to make something\nC. To describe a place\nD. To persuade buyers\nKunci: B\nPembahasan: Teks prosedur menjelaskan langkah-langkah membuat sesuatu.`}
                rows={10}
                className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden resize-y leading-relaxed bg-white"
              />
              <p className="text-[11px] text-slate-500">
                Tip: Di Microsoft Word, tekan <strong>Ctrl + A</strong> (Pilih Semua) lalu <strong>Ctrl + C</strong> (Salin), kemudian tempel di area teks ini dengan <strong>Ctrl + V</strong>.
              </p>
            </div>
          )}

          {/* TAB 3: TEMPLATE & FORMAT GUIDANCE */}
          {activeInputTab === 'template' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    Standar Penulisan Soal di Microsoft Word
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTemplate}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {isCopiedTemplate ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedTemplate ? 'Tersalin!' : 'Salin Contoh'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh File Word (.doc)</span>
                    </button>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  Dokumen Word Anda cukup ditulis dalam format umum yang biasa digunakan para guru. Parser otomatis membaca tag berikut:
                </p>

                <div className="bg-white p-3 rounded-lg border border-amber-200 font-mono text-[11px] text-slate-800 space-y-1">
                  <div><strong>1. [Pertanyaan]</strong> (Bisa diawali nomor: 1., 1), No. 1, atau Soal 1)</div>
                  <div><strong>A. [Pilihan A]</strong></div>
                  <div><strong>B. [Pilihan B]</strong></div>
                  <div><strong>C. [Pilihan C]</strong></div>
                  <div><strong>D. [Pilihan D]</strong></div>
                  <div><strong>Kunci: C</strong> (Bisa ditulis Kunci: C, Jawaban: C, atau Key: C)</div>
                  <div className="text-slate-500"><strong>Pembahasan: [Ulasan/Alasan]</strong> (Opsional)</div>
                  <div className="text-slate-500"><strong>Topik: [Materi Soal]</strong> (Opsional)</div>
                  <div className="text-slate-500"><strong>Audio: [Teks Percakapan Listening]</strong> (Opsional, dibacakan suara audio kuis)</div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleLoadSample();
                    setActiveInputTab('upload');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
                >
                  <span>Gunakan Contoh Ini &amp; Lihat Hasil Ekstraksi &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* PARSER RESULT PREVIEW SECTION */}
          {inputText.trim() && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              {/* Summary Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm">
                    {parseResult.totalDetected}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      Hasil Ekstraksi Dokumen
                    </span>
                    <span className="text-xs text-slate-500">
                      {parseResult.validCount} Soal Valid &bull; {parseResult.invalidCount} Perlu Ditinjau
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Mode Penerapan:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        importMode === 'replace'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gantikan Soal Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('append')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        importMode === 'append'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gabungkan (+{parseResult.totalDetected})
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions List Preview */}
              <div className="space-y-3">
                {parseResult.questions.map((q, idx) => {
                  const isEditing = editQuestionId === q.id;

                  if (isEditing && editFormData) {
                    return (
                      <div key={q.id} className="p-4 rounded-2xl border-2 border-amber-400 bg-amber-50/40 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-amber-900">
                            Edit Butir Soal #{idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditQuestionId(null);
                                setEditFormData(null);
                              }}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Simpan Perubahan
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Pertanyaan:</label>
                          <textarea
                            value={editFormData.question}
                            onChange={(e) => setEditFormData({ ...editFormData, question: e.target.value })}
                            rows={2}
                            className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {editFormData.options.map((opt, optIdx) => (
                            <div key={opt.key} className="flex items-center gap-1.5">
                              <span className="w-5 font-bold text-xs text-slate-700">{opt.key}.</span>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const newOpts = [...editFormData.options];
                                  newOpts[optIdx] = { ...opt, text: e.target.value };
                                  setEditFormData({ ...editFormData, options: newOpts });
                                }}
                                className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-slate-700">Kunci Jawaban:</span>
                            <select
                              value={editFormData.correctAnswer}
                              onChange={(e) => setEditFormData({ ...editFormData, correctAnswer: e.target.value as any })}
                              className="p-1 border border-slate-300 rounded bg-white text-xs font-bold"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={editFormData.topic}
                              onChange={(e) => setEditFormData({ ...editFormData, topic: e.target.value })}
                              placeholder="Topik Soal..."
                              className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all ${
                        q.isValid
                          ? 'bg-white border-slate-200 shadow-2xs hover:border-amber-300'
                          : 'bg-rose-50/50 border-rose-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-7 h-7 shrink-0 rounded-lg text-xs font-bold flex items-center justify-center ${
                            q.isValid ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                              {q.question}
                            </p>
                            {q.hasAudio && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1">
                                <Headphones className="w-3 h-3" />
                                <span>Audio Listening: {q.audioScript}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(q)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Butir Soal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus dari Daftar Import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-9 my-2 text-xs">
                        {q.options.map((opt) => {
                          const isKey = opt.key === q.correctAnswer;
                          return (
                            <div
                              key={opt.key}
                              className={`p-2 rounded-lg border ${
                                isKey
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-black mr-1.5">{opt.key}.</span>
                              <span>{opt.text || <em className="text-rose-600">Opsi kosong</em>}</span>
                              {isKey && (
                                <span className="ml-1.5 text-[10px] text-emerald-700 uppercase font-black">
                                  (Kunci)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Meta Footer */}
                      <div className="ml-9 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Topik: <strong>{q.topic}</strong></span>
                        <span className="italic">Pembahasan: {q.explanation}</span>
                      </div>

                      {/* Warnings if invalid */}
                      {!q.isValid && q.validationErrors.length > 0 && (
                        <div className="mt-2 ml-9 p-2 rounded bg-rose-100 text-rose-800 text-[11px] space-y-0.5">
                          {q.validationErrors.map((err, errIdx) => (
                            <div key={errIdx} className="flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {parseResult.totalDetected > 0 ? (
              <span>
                Siap mengimpor <strong>{parseResult.totalDetected} butir soal</strong> ke bank soal kuis.
              </span>
            ) : (
              <span>Unggah berkas Word (.docx) atau tempel teks untuk memulai.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={parseResult.totalDetected === 0}
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40"
            >
              <CheckSquare className="w-4 h-4" />
              <span>
                {importMode === 'replace' ? 'Gantikan Bank Soal Aktif' : `Tambahkan ${parseResult.totalDetected} Soal`}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
