/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  ListPlus, 
  FileSpreadsheet, 
  Sparkles, 
  Trash2, 
  Plus, 
  Save, 
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { QuizSubmission } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';
import { playClickSound, playCorrectSound } from '../utils/audio';

interface TeacherInputStudentProps {
  onAddSubmission: (submission: QuizSubmission) => void;
  onAddBatchSubmissions: (submissions: QuizSubmission[]) => void;
  onViewRecap: () => void;
  existingClasses: string[];
}

export const TeacherInputStudent: React.FC<TeacherInputStudentProps> = ({
  onAddSubmission,
  onAddBatchSubmissions,
  onViewRecap,
  existingClasses,
}) => {
  const [entryMode, setEntryMode] = useState<'single' | 'batch' | 'paste'>('single');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Default class options
  const defaultClasses = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'];
  const allClasses = Array.from(new Set([...defaultClasses, ...existingClasses.filter(c => c !== 'ALL')])).sort();

  // ----------------------------------------------------
  // MODE 1: SINGLE ENTRY STATE
  // ----------------------------------------------------
  const [singleName, setSingleName] = useState('');
  const [singleClass, setSingleClass] = useState('7A');
  const [customClass, setCustomClass] = useState('');
  const [singleNumber, setSingleNumber] = useState('');
  const [gradingMethod, setGradingMethod] = useState<'answers' | 'directScore'>('answers');
  
  // Answers per question (1-10)
  const [studentAnswers, setStudentAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>(() => {
    const initial: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    QUIZ_QUESTIONS.forEach(q => {
      initial[q.id] = q.correctAnswer; // default to correct for ease
    });
    return initial;
  });

  // Direct score input
  const [directScoreInput, setDirectScoreInput] = useState<number>(80);
  const [singleDurationMinutes, setSingleDurationMinutes] = useState<number>(8);

  // Single Entry Calculated Score
  const calculatedStats = React.useMemo(() => {
    if (gradingMethod === 'directScore') {
      const score = Math.max(0, Math.min(100, Number(directScoreInput) || 0));
      const correctCount = Math.round(score / QUIZ_METADATA.pointsPerQuestion);
      const wrongCount = QUIZ_QUESTIONS.length - correctCount;
      return { score, correctCount, wrongCount };
    } else {
      let correct = 0;
      QUIZ_QUESTIONS.forEach(q => {
        if (studentAnswers[q.id] === q.correctAnswer) {
          correct += 1;
        }
      });
      const score = correct * QUIZ_METADATA.pointsPerQuestion;
      const wrong = QUIZ_QUESTIONS.length - correct;
      return { score, correctCount: correct, wrongCount: wrong };
    }
  }, [gradingMethod, directScoreInput, studentAnswers]);

  // Set single answer
  const handleSelectAnswer = (questionId: number, key: 'A' | 'B' | 'C' | 'D') => {
    playClickSound();
    setStudentAnswers(prev => ({ ...prev, [questionId]: key }));
  };

  // Helper buttons for answers
  const handleSetAllCorrect = () => {
    playClickSound();
    const allCorrect: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    QUIZ_QUESTIONS.forEach(q => {
      allCorrect[q.id] = q.correctAnswer;
    });
    setStudentAnswers(allCorrect);
  };

  const handleResetAnswers = () => {
    playClickSound();
    const resetAns: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    QUIZ_QUESTIONS.forEach(q => {
      // Pick first alternative
      resetAns[q.id] = 'A';
    });
    setStudentAnswers(resetAns);
  };

  // Submit Single Student
  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      alert('Mohon masukkan Nama Lengkap Siswa.');
      return;
    }

    const finalClass = singleClass === 'CUSTOM' ? (customClass.trim() || '7A') : singleClass;
    const finalNumber = singleNumber.trim() || '1';

    // Construct final answers
    let finalAnswersMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    if (gradingMethod === 'answers') {
      finalAnswersMap = { ...studentAnswers };
    } else {
      // Synthesize realistic answers matching the score
      const correctTarget = Math.round(calculatedStats.score / QUIZ_METADATA.pointsPerQuestion);
      QUIZ_QUESTIONS.forEach((q, idx) => {
        if (idx < correctTarget) {
          finalAnswersMap[q.id] = q.correctAnswer;
        } else {
          // Alternative wrong answer
          const wrongOption = q.options.find(o => o.key !== q.correctAnswer);
          finalAnswersMap[q.id] = wrongOption ? wrongOption.key : 'A';
        }
      });
    }

    const newSubmission: QuizSubmission = {
      id: `sub-manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentName: singleName.trim(),
      studentClass: finalClass,
      studentNumber: finalNumber.padStart(2, '0'),
      score: calculatedStats.score,
      totalQuestions: QUIZ_QUESTIONS.length,
      correctCount: calculatedStats.correctCount,
      wrongCount: calculatedStats.wrongCount,
      answers: finalAnswersMap,
      timeSpentSeconds: Math.max(60, (singleDurationMinutes || 5) * 60),
      submittedAt: new Date().toISOString(),
    };

    onAddSubmission(newSubmission);
    playCorrectSound();
    setSuccessMessage(`Data siswa "${singleName.trim()}" (Kelas ${finalClass} - No. ${finalNumber}) dengan nilai ${calculatedStats.score} berhasil disimpan!`);

    // Reset some fields for next student
    setSingleName('');
    setSingleNumber(String(Number(finalNumber) + 1)); // auto-increment roll number
  };

  // ----------------------------------------------------
  // MODE 2: BATCH / QUICK TABLE INPUT
  // ----------------------------------------------------
  interface BatchRow {
    id: string;
    studentNumber: string;
    studentName: string;
    score: number;
  }

  const [batchClass, setBatchClass] = useState('7B');
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { id: '1', studentNumber: '01', studentName: '', score: 80 },
    { id: '2', studentNumber: '02', studentName: '', score: 85 },
    { id: '3', studentNumber: '03', studentName: '', score: 90 },
    { id: '4', studentNumber: '04', studentName: '', score: 75 },
    { id: '5', studentNumber: '05', studentName: '', score: 70 },
  ]);

  const handleUpdateBatchRow = (id: string, field: keyof BatchRow, value: any) => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAddBatchRow = () => {
    playClickSound();
    setBatchRows(prev => {
      const nextNum = String(prev.length + 1).padStart(2, '0');
      return [...prev, { id: String(Date.now()), studentNumber: nextNum, studentName: '', score: 80 }];
    });
  };

  const handleRemoveBatchRow = (id: string) => {
    playClickSound();
    setBatchRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSubmitBatch = () => {
    const validRows = batchRows.filter(r => r.studentName.trim().length > 0);
    if (validRows.length === 0) {
      alert('Mohon isi setidaknya 1 nama siswa pada baris tabel.');
      return;
    }

    const newSubmissions: QuizSubmission[] = validRows.map((r, idx) => {
      const score = Math.max(0, Math.min(100, Number(r.score) || 0));
      const correctCount = Math.round(score / QUIZ_METADATA.pointsPerQuestion);
      const wrongCount = QUIZ_QUESTIONS.length - correctCount;

      const answersMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
      QUIZ_QUESTIONS.forEach((q, qIdx) => {
        if (qIdx < correctCount) {
          answersMap[q.id] = q.correctAnswer;
        } else {
          const wrongOption = q.options.find(o => o.key !== q.correctAnswer);
          answersMap[q.id] = wrongOption ? wrongOption.key : 'A';
        }
      });

      return {
        id: `sub-batch-${Date.now()}-${idx}`,
        studentName: r.studentName.trim(),
        studentClass: batchClass,
        studentNumber: r.studentNumber.trim().padStart(2, '0'),
        score,
        totalQuestions: QUIZ_QUESTIONS.length,
        correctCount,
        wrongCount,
        answers: answersMap,
        timeSpentSeconds: 300 + idx * 25,
        submittedAt: new Date().toISOString(),
      };
    });

    onAddBatchSubmissions(newSubmissions);
    playCorrectSound();
    setSuccessMessage(`Berhasil menyimpan ${newSubmissions.length} data siswa Kelas ${batchClass} ke dalam rekapitulasi nilai!`);

    // Reset batch rows
    setBatchRows([
      { id: '1', studentNumber: '01', studentName: '', score: 80 },
      { id: '2', studentNumber: '02', studentName: '', score: 85 },
      { id: '3', studentNumber: '03', studentName: '', score: 90 },
    ]);
  };

  // ----------------------------------------------------
  // MODE 3: PASTE EXCEL / TEXT DATA
  // ----------------------------------------------------
  const [pasteClass, setPasteClass] = useState('7C');
  const [pasteText, setPasteText] = useState(
`01, Raditya Pratama, 90
02, Tiara Andini, 80
03, Kevin Sanjaya, 70
04, Alisha Zahra, 100
05, Dimas Anggara, 85`
  );
  const [parsedPreview, setParsedPreview] = useState<QuizSubmission[]>([]);

  const handleParsePasteText = () => {
    playClickSound();
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: QuizSubmission[] = [];

    lines.forEach((line, idx) => {
      // Split by tab, comma, or semicolon
      const parts = line.split(/[,\t;]+/).map(p => p.trim());
      if (parts.length >= 2) {
        let noAbsen = '';
        let nama = '';
        let nilaiStr = '80';

        if (parts.length >= 3) {
          noAbsen = parts[0];
          nama = parts[1];
          nilaiStr = parts[2];
        } else {
          // Only 2 parts: check if part 1 is name and part 2 is score, or part 1 is number
          if (!isNaN(Number(parts[0])) && isNaN(Number(parts[1]))) {
            noAbsen = parts[0];
            nama = parts[1];
          } else if (isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
            noAbsen = String(idx + 1);
            nama = parts[0];
            nilaiStr = parts[1];
          } else {
            noAbsen = String(idx + 1);
            nama = parts[0];
          }
        }

        const score = Math.max(0, Math.min(100, parseInt(nilaiStr, 10) || 80));
        const correctCount = Math.round(score / QUIZ_METADATA.pointsPerQuestion);
        const wrongCount = QUIZ_QUESTIONS.length - correctCount;

        const answersMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
        QUIZ_QUESTIONS.forEach((q, qIdx) => {
          if (qIdx < correctCount) {
            answersMap[q.id] = q.correctAnswer;
          } else {
            const wrongOption = q.options.find(o => o.key !== q.correctAnswer);
            answersMap[q.id] = wrongOption ? wrongOption.key : 'A';
          }
        });

        parsed.push({
          id: `sub-paste-${Date.now()}-${idx}`,
          studentName: nama || `Siswa ${idx + 1}`,
          studentClass: pasteClass,
          studentNumber: (noAbsen || String(idx + 1)).padStart(2, '0'),
          score,
          totalQuestions: QUIZ_QUESTIONS.length,
          correctCount,
          wrongCount,
          answers: answersMap,
          timeSpentSeconds: 320 + idx * 30,
          submittedAt: new Date().toISOString(),
        });
      }
    });

    setParsedPreview(parsed);
  };

  const handleSaveParsedData = () => {
    if (parsedPreview.length === 0) {
      alert('Tidak ada data pratinjau yang valid untuk disimpan.');
      return;
    }
    onAddBatchSubmissions(parsedPreview);
    playCorrectSound();
    setSuccessMessage(`Berhasil mengimpor ${parsedPreview.length} data siswa Kelas ${pasteClass} ke rekap nilai!`);
    setParsedPreview([]);
    setPasteText('');
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-8 space-y-5 sm:space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs mb-2">
            <UserPlus className="w-3.5 h-3.5 text-amber-700" />
            <span>Fitur Khusus Guru &bull; {QUIZ_METADATA.teacherName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Menu Input &amp; Tambah Data Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Gunakan formulir ini untuk menambahkan nilai kuis siswa secara manual (misal: kuis tatap muka kertas, ujian susulan, atau remedial).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onViewRecap();
          }}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-center"
        >
          <span>Lihat Rekap Nilai</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Penyimpanan Berhasil!</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onViewRecap();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
            >
              Cek di Tabel Rekap
            </button>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setEntryMode('single');
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            entryMode === 'single'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <UserPlus className="w-4 h-4 text-amber-600" />
          <span>1. Input Siswa Satuan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setEntryMode('batch');
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            entryMode === 'batch'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ListPlus className="w-4 h-4 text-blue-600" />
          <span>2. Input Tabel Cepat (Multi)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setEntryMode('paste');
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            entryMode === 'paste'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>3. Salin/Tempel Excel/Teks</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: SINGLE ENTRY FORM */}
      {/* ======================================================== */}
      {entryMode === 'single' && (
        <form onSubmit={handleSubmitSingle} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Student Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Contoh: Muhammad Farhan Al-Fatih"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-hidden font-medium"
              />
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Kelas Siswa <span className="text-rose-500">*</span>
              </label>
              <select
                value={singleClass}
                onChange={(e) => setSingleClass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-hidden font-medium bg-white"
              >
                {allClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
                <option value="CUSTOM">+ Kelas Lainnya...</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {singleClass === 'CUSTOM' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ketik Nama Kelas:
                </label>
                <input
                  type="text"
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  placeholder="Contoh: 7-Unggulan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-amber-500 outline-hidden font-medium"
                />
              </div>
            )}

            {/* Roll Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nomor Absen
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={singleNumber}
                onChange={(e) => setSingleNumber(e.target.value)}
                placeholder="Contoh: 14"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-amber-500 outline-hidden font-medium"
              />
            </div>

            {/* Time duration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Durasi Pengerjaan (Menit)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={singleDurationMinutes}
                onChange={(e) => setSingleDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-amber-500 outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Grading Method Selector */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <div>
                <h4 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                  <span>Metode Pengisian Nilai Kuis</span>
                </h4>
                <p className="text-xs text-amber-800">
                  Pilih apakah ingin mengisi rincian pilihan jawaban A-D per butir soal atau langsung memasukkan nilai akhir.
                </p>
              </div>

              <div className="inline-flex p-1 bg-amber-200/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGradingMethod('answers');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    gradingMethod === 'answers'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-amber-900 hover:bg-amber-200/60'
                  }`}
                >
                  Pilihan Jawaban (Soal 1–10)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGradingMethod('directScore');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    gradingMethod === 'directScore'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-amber-900 hover:bg-amber-200/60'
                  }`}
                >
                  Input Nilai Langsung (0–100)
                </button>
              </div>
            </div>

            {/* Option A: Jawaban 1 - 10 */}
            {gradingMethod === 'answers' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Klik pilihan jawaban siswa untuk setiap nomor:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSetAllCorrect}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Set Semua Benar (100)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAnswers}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Jawaban</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {QUIZ_QUESTIONS.map(q => {
                    const chosen = studentAnswers[q.id];
                    const isCorrect = chosen === q.correctAnswer;

                    return (
                      <div
                        key={q.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isCorrect 
                            ? 'bg-white border-emerald-300 ring-1 ring-emerald-200' 
                            : 'bg-white border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-800">
                            No. {q.id}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            Kunci: {q.correctAnswer}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1">
                          {(['A', 'B', 'C', 'D'] as const).map(key => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, key)}
                              className={`py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                chosen === key
                                  ? key === q.correctAnswer
                                    ? 'bg-emerald-600 text-white font-black'
                                    : 'bg-rose-600 text-white font-black'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Option B: Direct Score Input */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white p-4 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Kuis (0 - 100):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="10"
                      value={directScoreInput}
                      onChange={(e) => setDirectScoreInput(Number(e.target.value))}
                      className="w-32 px-4 py-2.5 rounded-xl border border-slate-300 font-black text-xl text-slate-900 focus:border-amber-500 outline-hidden"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[100, 90, 80, 75, 70, 60].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setDirectScoreInput(val);
                          }}
                          className={`px-2 py-1 rounded-md text-xs font-bold ${
                            directScoreInput === val
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 border-l border-slate-100 pl-4">
                  <p>
                    Setara dengan: <strong>{calculatedStats.correctCount} Soal Benar</strong> dari {QUIZ_QUESTIONS.length} Soal.
                  </p>
                  <p className="mt-1">
                    Status: <strong className={calculatedStats.score >= QUIZ_METADATA.passingScore ? 'text-emerald-600' : 'text-rose-600'}>
                      {calculatedStats.score >= QUIZ_METADATA.passingScore ? 'TUNTAS (Memenuhi KKM 75)' : 'REMEDIAL (Di bawah KKM 75)'}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            {/* Score Live Preview Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nilai Akhir:</span>
                  <span className="text-lg font-black text-slate-900">{calculatedStats.score} / 100</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Benar / Salah:</span>
                  <span className="font-bold text-slate-800">{calculatedStats.correctCount} Benar, {calculatedStats.wrongCount} Salah</span>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-full font-bold ${
                calculatedStats.score >= QUIZ_METADATA.passingScore
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {calculatedStats.score >= QUIZ_METADATA.passingScore ? 'Lulus KKM (&ge;75)' : 'Perlu Remedial (<75)'}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data Siswa ke Rekapitulasi</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* MODE 2: BATCH TABLE INPUT */}
      {/* ======================================================== */}
      {entryMode === 'batch' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Kelas:
              </label>
              <select
                value={batchClass}
                onChange={(e) => setBatchClass(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:border-blue-500"
              >
                {allClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddBatchRow}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baris Siswa</span>
            </button>
          </div>

          {/* Batch Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-20 text-center">No. Absen</th>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3 w-32 text-center">Nilai (0–100)</th>
                  <th className="p-3 w-32 text-center">Status</th>
                  <th className="p-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchRows.map((row, idx) => {
                  const isPassed = row.score >= QUIZ_METADATA.passingScore;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={row.studentNumber}
                          onChange={(e) => handleUpdateBatchRow(row.id, 'studentNumber', e.target.value)}
                          className="w-12 text-center py-1 rounded-lg border border-slate-300 font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.studentName}
                          onChange={(e) => handleUpdateBatchRow(row.id, 'studentName', e.target.value)}
                          placeholder={`Nama Siswa ${idx + 1}...`}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={row.score}
                          onChange={(e) => handleUpdateBatchRow(row.id, 'score', Number(e.target.value))}
                          className="w-20 text-center py-1 rounded-lg border border-slate-300 font-bold focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPassed ? 'Tuntas' : 'Remedial'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchRow(row.id)}
                          disabled={batchRows.length <= 1}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Total: {batchRows.filter(r => r.studentName.trim()).length} siswa siap disimpan ke Kelas {batchClass}.
            </span>

            <button
              type="button"
              onClick={handleSubmitBatch}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Siswa di Tabel</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 3: PASTE / BULK TEXT IMPORT */}
      {/* ======================================================== */}
      {entryMode === 'paste' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <h4 className="font-bold text-xs text-emerald-950 mb-1">
              Panduan Format Salin-Tempel (Copy-Paste dari Excel / Catatan):
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Ketik atau salin data dengan format tiap baris: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono">NoAbsen, Nama Siswa, Nilai</code>.
              Pemisah dapat berupa koma (,), titik koma (;), atau tab dari Microsoft Excel / Google Sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Kelas:
              </label>
              <select
                value={pasteClass}
                onChange={(e) => setPasteClass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white"
              >
                {allClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Data Teks (Tempelkan di sini):
              </label>
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="01, Siti Aisyah, 90&#10;02, Budi Utomo, 80"
                className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleParsePasteText}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>1. Pratinjau Data ({pasteText.split('\n').filter(Boolean).length} Baris)</span>
            </button>

            {parsedPreview.length > 0 && (
              <button
                type="button"
                onClick={handleSaveParsedData}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>2. Simpan {parsedPreview.length} Siswa ke Rekap</span>
              </button>
            )}
          </div>

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="mt-4 border border-emerald-200 rounded-2xl overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 font-bold text-xs text-emerald-900 flex items-center justify-between">
                <span>Hasil Pratinjau Impor Data ({parsedPreview.length} Siswa)</span>
                <span>Target: Kelas {pasteClass}</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-2.5 text-center w-16">No Absen</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5 text-center w-24">Kelas</th>
                      <th className="p-2.5 text-center w-24">Nilai</th>
                      <th className="p-2.5 text-center w-28">Status KKM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-bold text-slate-700">{item.studentNumber}</td>
                        <td className="p-2 font-semibold text-slate-900">{item.studentName}</td>
                        <td className="p-2 text-center text-slate-600">{item.studentClass}</td>
                        <td className="p-2 text-center font-black text-slate-900">{item.score}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.score >= QUIZ_METADATA.passingScore 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.score >= QUIZ_METADATA.passingScore ? 'Tuntas' : 'Remedial'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
