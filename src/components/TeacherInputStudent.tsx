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
  ArrowRight,
  Download,
  Upload,
  Copy,
  FileText,
  FolderOpen,
  Server,
  Cloud,
  Eye,
  Pin,
  Calendar,
  Search,
  ChevronDown,
  Bold,
  Italic,
  List,
  AlignLeft,
  Table as TableIcon,
  Sliders,
  Lock,
  Layers
} from 'lucide-react';
import { QuizSubmission } from '../types';
import {
  ALL_CLASS_LIST,
  QUIZ_QUESTIONS,
  QUIZ_METADATA,
  hasStudentSubmittedQuiz,
  getSubmissionAssessmentStatus,
  parseSmartStudentLines,
  parseUploadedStudentFile,
  ParsedStudentRow,
  isPlaceholderStudentName,
  normalizeStudentClass,
  generateStudentImportTemplateText,
  downloadStudentImportTemplateCsv,
  downloadStudentImportTemplateExcel,
} from '../data/quizData';
import { playClickSound, playCorrectSound } from '../utils/audio';

interface TeacherInputStudentProps {
  onAddSubmission: (submission: QuizSubmission) => void;
  onAddBatchSubmissions: (submissions: QuizSubmission[]) => void;
  onViewRecap: () => void;
  existingClasses: string[];
  defaultClass?: string;
  existingSubmissions?: QuizSubmission[];
}

export const TeacherInputStudent: React.FC<TeacherInputStudentProps> = ({
  onAddSubmission,
  onAddBatchSubmissions,
  onViewRecap,
  existingClasses,
  defaultClass = '7G',
  existingSubmissions = [],
}) => {
  const initialCls = normalizeStudentClass(defaultClass) || '7G';
  const [entryMode, setEntryMode] = useState<'paste' | 'batch' | 'single'>('paste');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Default class options
  const defaultClasses = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'];
  const allClasses = Array.from(
    new Set([...defaultClasses, ...existingClasses.filter((c) => c !== 'ALL')])
  ).sort();

  // ----------------------------------------------------
  // MODE 1: SINGLE ENTRY STATE
  // ----------------------------------------------------
  const [singleName, setSingleName] = useState('');
  const [singleClass, setSingleClass] = useState(initialCls);
  const [customClass, setCustomClass] = useState('');
  const [singleNumber, setSingleNumber] = useState('');
  const [gradingMethod, setGradingMethod] = useState<'unsubmitted' | 'answers' | 'directScore'>(
    'unsubmitted'
  );

  const [studentAnswers, setStudentAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>(() => {
    const initial: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    QUIZ_QUESTIONS.forEach((q) => {
      initial[q.id] = q.correctAnswer;
    });
    return initial;
  });

  const [directScoreInput, setDirectScoreInput] = useState<string>('');
  const [singleDurationMinutes, setSingleDurationMinutes] = useState<number>(8);

  const calculatedStats = React.useMemo(() => {
    if (gradingMethod === 'unsubmitted') {
      return { hasSubmitted: false, score: 0, correctCount: 0, wrongCount: 0 };
    }
    if (gradingMethod === 'directScore') {
      const trimmed = String(directScoreInput ?? '').trim();
      if (trimmed === '') {
        return { hasSubmitted: false, score: 0, correctCount: 0, wrongCount: 0 };
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        return { hasSubmitted: false, score: 0, correctCount: 0, wrongCount: 0 };
      }
      const score = Math.max(0, Math.min(100, parsed));
      const correctCount = Math.round(score / QUIZ_METADATA.pointsPerQuestion);
      const wrongCount = QUIZ_QUESTIONS.length - correctCount;
      return { hasSubmitted: true, score, correctCount, wrongCount };
    } else {
      let correct = 0;
      QUIZ_QUESTIONS.forEach((q) => {
        if (studentAnswers[q.id] === q.correctAnswer) {
          correct += 1;
        }
      });
      const score = correct * QUIZ_METADATA.pointsPerQuestion;
      const wrong = QUIZ_QUESTIONS.length - correct;
      return { hasSubmitted: true, score, correctCount: correct, wrongCount: wrong };
    }
  }, [gradingMethod, directScoreInput, studentAnswers]);

  const handleSelectAnswer = (questionId: number, key: 'A' | 'B' | 'C' | 'D') => {
    playClickSound();
    setStudentAnswers((prev) => ({ ...prev, [questionId]: key }));
  };

  const handleSetAllCorrect = () => {
    playClickSound();
    const allCorrect: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    QUIZ_QUESTIONS.forEach((q) => {
      allCorrect[q.id] = q.correctAnswer;
    });
    setStudentAnswers(allCorrect);
  };

  const handleResetAnswers = () => {
    playClickSound();
    const resetAns: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    QUIZ_QUESTIONS.forEach((q) => {
      resetAns[q.id] = 'A';
    });
    setStudentAnswers(resetAns);
  };

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      alert('Mohon masukkan Nama Lengkap Siswa.');
      return;
    }

    const finalClass = singleClass === 'CUSTOM' ? customClass.trim() || '7A' : singleClass;
    const finalNumber = singleNumber.trim() || '1';

    let finalAnswersMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    if (!calculatedStats.hasSubmitted) {
      finalAnswersMap = {};
    } else if (gradingMethod === 'answers') {
      finalAnswersMap = { ...studentAnswers };
    } else {
      const correctTarget = Math.round(calculatedStats.score / QUIZ_METADATA.pointsPerQuestion);
      QUIZ_QUESTIONS.forEach((q, idx) => {
        if (idx < correctTarget) {
          finalAnswersMap[q.id] = q.correctAnswer;
        } else {
          const wrongOption = q.options.find((o) => o.key !== q.correctAnswer);
          finalAnswersMap[q.id] = wrongOption ? wrongOption.key : 'A';
        }
      });
    }

    const newSubmission: QuizSubmission = {
      id: `sub-manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentName: singleName.trim(),
      studentClass: finalClass,
      studentNumber: finalNumber.padStart(2, '0'),
      score: calculatedStats.hasSubmitted ? calculatedStats.score : 0,
      totalQuestions: QUIZ_QUESTIONS.length,
      correctCount: calculatedStats.hasSubmitted ? calculatedStats.correctCount : 0,
      wrongCount: calculatedStats.hasSubmitted ? calculatedStats.wrongCount : 0,
      answers: finalAnswersMap,
      timeSpentSeconds: calculatedStats.hasSubmitted
        ? Math.max(60, (singleDurationMinutes || 5) * 60)
        : 0,
      submittedAt: new Date().toISOString(),
      hasSubmitted: calculatedStats.hasSubmitted,
    };

    onAddSubmission(newSubmission);
    playCorrectSound();
    setSuccessMessage(
      calculatedStats.hasSubmitted
        ? `Data siswa "${singleName.trim()}" (Kelas ${finalClass} - No. ${finalNumber}) dengan nilai ${calculatedStats.score} berhasil disimpan!`
        : `Data siswa "${singleName.trim()}" (Kelas ${finalClass} - No. ${finalNumber}) berhasil disimpan dengan status Belum Mengerjakan!`
    );

    setSingleName('');
    setSingleNumber(String(Number(finalNumber) + 1));
  };

  // ----------------------------------------------------
  // MODE 2: BATCH / QUICK TABLE INPUT
  // ----------------------------------------------------
  interface BatchRow {
    id: string;
    studentNumber: string;
    studentName: string;
    score: string;
  }

  const [batchClass, setBatchClass] = useState(initialCls);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { id: '1', studentNumber: '01', studentName: '', score: '' },
    { id: '2', studentNumber: '02', studentName: '', score: '' },
    { id: '3', studentNumber: '03', studentName: '', score: '' },
    { id: '4', studentNumber: '04', studentName: '', score: '' },
    { id: '5', studentNumber: '05', studentName: '', score: '' },
  ]);

  const handleUpdateBatchRow = (id: string, field: keyof BatchRow, value: string) => {
    setBatchRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleAddBatchRow = () => {
    playClickSound();
    setBatchRows((prev) => {
      const nextNum = String(prev.length + 1).padStart(2, '0');
      return [
        ...prev,
        { id: String(Date.now()), studentNumber: nextNum, studentName: '', score: '' },
      ];
    });
  };

  const handleGenerate32BatchRows = () => {
    playClickSound();
    setBatchRows((prev) => {
      const existingByNum = new Map<string, BatchRow>();
      prev.forEach((r) => existingByNum.set(r.studentNumber.trim().padStart(2, '0'), r));
      const rows: BatchRow[] = [];
      for (let i = 1; i <= 32; i++) {
        const no = String(i).padStart(2, '0');
        const existing = existingByNum.get(no);
        rows.push({
          id: existing?.id || `row-${Date.now()}-${i}`,
          studentNumber: no,
          studentName: existing?.studentName || '',
          score: existing?.score || '',
        });
      }
      return rows;
    });
  };

  const handleRemoveBatchRow = (id: string) => {
    playClickSound();
    setBatchRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmitBatch = () => {
    const validRows = batchRows.filter((r) => r.studentName.trim().length > 0);
    if (validRows.length === 0) {
      alert('Mohon isi setidaknya 1 nama siswa pada baris tabel.');
      return;
    }

    const newSubmissions: QuizSubmission[] = validRows.map((r, idx) => {
      const rawScoreStr = String(r.score ?? '').trim();
      const hasScore = rawScoreStr !== '' && !Number.isNaN(Number(rawScoreStr));
      const score = hasScore ? Math.max(0, Math.min(100, Number(rawScoreStr))) : 0;
      const correctCount = hasScore ? Math.round(score / QUIZ_METADATA.pointsPerQuestion) : 0;
      const wrongCount = hasScore ? QUIZ_QUESTIONS.length - correctCount : 0;

      const answersMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
      if (hasScore) {
        QUIZ_QUESTIONS.forEach((q, qIdx) => {
          if (qIdx < correctCount) {
            answersMap[q.id] = q.correctAnswer;
          } else {
            const wrongOption = q.options.find((o) => o.key !== q.correctAnswer);
            answersMap[q.id] = wrongOption ? wrongOption.key : 'A';
          }
        });
      }

      return {
        id: `sub-batch-${Date.now()}-${idx}`,
        studentName: r.studentName.trim(),
        studentClass: normalizeStudentClass(batchClass) || '7G',
        studentNumber: (r.studentNumber.trim() || String(idx + 1)).padStart(2, '0'),
        score,
        totalQuestions: QUIZ_QUESTIONS.length,
        correctCount,
        wrongCount,
        answers: answersMap,
        timeSpentSeconds: hasScore ? 300 + idx * 25 : 0,
        submittedAt: new Date().toISOString(),
        hasSubmitted: hasScore,
      };
    });

    onAddBatchSubmissions(newSubmissions);
    playCorrectSound();
    setSuccessMessage(
      `Berhasil menyimpan ${newSubmissions.length} data siswa Kelas ${batchClass} ke dalam Dashboard Siswa & Rekap Nilai Guru!`
    );

    setBatchRows([
      { id: '1', studentNumber: '01', studentName: '', score: '' },
      { id: '2', studentNumber: '02', studentName: '', score: '' },
      { id: '3', studentNumber: '03', studentName: '', score: '' },
    ]);
  };

  // ----------------------------------------------------
  // MODE 3: ADD NEW FILE / IMPORT STUDIO (WPDM CMS LAYOUT)
  // ----------------------------------------------------
  const [pasteClass, setPasteClass] = useState(initialCls);
  const [templateDownloadClass, setTemplateDownloadClass] = useState<string>(initialCls);
  const [importTitle, setImportTitle] = useState(
    `Data Daftar Siswa Kelas ${initialCls} — Semester Ganjil`
  );
  const [editorSubTab, setEditorSubTab] = useState<'text' | 'visual'>('text');
  const [packageSettingTab, setPackageSettingTab] = useState<
    'package' | 'lock' | 'format' | 'templates'
  >('package');
  const [categoryTab, setCategoryTab] = useState<'all' | 'most'>('all');
  const [pasteText, setPasteText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<QuizSubmission[]>([]);
  const [copiedTemplateToast, setCopiedTemplateToast] = useState<string | null>(null);
  const [attachedFileInfo, setAttachedFileInfo] = useState<{
    name: string;
    sizeKb: string;
    rowCount?: number;
  } | null>({
    name: `template-siswa-${initialCls.toLowerCase()}.xlsx`,
    sizeKb: '4.20 KB',
  });
  const [quickTemplateQuery, setQuickTemplateQuery] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [autoImportOnUpload, setAutoImportOnUpload] = useState(true);
  const [templateRowsCount, setTemplateRowsCount] = useState<number>(32);
  const [defaultScoreFallback, setDefaultScoreFallback] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync default class when prop changes
  React.useEffect(() => {
    const clean = normalizeStudentClass(defaultClass);
    if (clean && clean !== 'ALL') {
      setSingleClass(clean);
      setBatchClass(clean);
      setPasteClass(clean);
      setTemplateDownloadClass(clean);
      setImportTitle(`Data Daftar Siswa Kelas ${clean} — Semester Ganjil`);
    }
  }, [defaultClass]);

  const buildSubmissionsFromParsedRows = (
    rows: ParsedStudentRow[],
    targetClass: string
  ): QuizSubmission[] => {
    const fallbackNum =
      defaultScoreFallback.trim() !== '' && !Number.isNaN(Number(defaultScoreFallback))
        ? Math.max(0, Math.min(100, Number(defaultScoreFallback)))
        : null;

    return rows.map((row, idx) => {
      const effectiveScore = row.score !== null ? row.score : fallbackNum;
      const hasScore = effectiveScore !== null && !Number.isNaN(effectiveScore);
      const score = hasScore ? Math.max(0, Math.min(100, effectiveScore as number)) : 0;
      const correctCount = hasScore ? Math.round(score / QUIZ_METADATA.pointsPerQuestion) : 0;
      const wrongCount = hasScore ? QUIZ_QUESTIONS.length - correctCount : 0;

      const answersMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
      if (hasScore) {
        QUIZ_QUESTIONS.forEach((q, qIdx) => {
          if (qIdx < correctCount) {
            answersMap[q.id] = q.correctAnswer;
          } else {
            const wrongOption = q.options.find((o) => o.key !== q.correctAnswer);
            answersMap[q.id] = wrongOption ? wrongOption.key : 'A';
          }
        });
      }

      const cleanCls = normalizeStudentClass(row.studentClass || targetClass) || '7G';
      const cleanNum = (row.studentNumber || String(idx + 1)).padStart(2, '0');

      return {
        id: `sub-roster-${cleanCls}-${cleanNum}`,
        studentName: row.studentName.trim(),
        studentClass: cleanCls,
        studentNumber: cleanNum,
        score,
        totalQuestions: QUIZ_QUESTIONS.length,
        correctCount,
        wrongCount,
        answers: answersMap,
        timeSpentSeconds: hasScore ? 320 + idx * 30 : 0,
        submittedAt: new Date().toISOString(),
        hasSubmitted: hasScore,
      };
    });
  };

  const buildSubmissionsFromPasteText = (
    rawText: string,
    targetClass: string,
    allowPlaceholders: boolean = false
  ): QuizSubmission[] => {
    const rows = parseSmartStudentLines(rawText, targetClass, allowPlaceholders);
    return buildSubmissionsFromParsedRows(rows, targetClass);
  };

  const handleLoadTemplateText = (target: 'ALL' | string, rowsCount: number = 10) => {
    playClickSound();
    const text = generateStudentImportTemplateText(target, rowsCount);
    setPasteText(text);
    if (target !== 'ALL') {
      const clean = normalizeStudentClass(target) || '7G';
      setPasteClass(clean);
      setImportTitle(`Data Daftar Siswa Kelas ${clean} (Absen 01–${String(rowsCount).padStart(2, '0')})`);
      setAttachedFileInfo({
        name: `template-kelas-${clean.toLowerCase()}.csv`,
        sizeKb: `${((text.length || 512) / 1024).toFixed(2)} KB`,
      });
    } else {
      setImportTitle('Data Daftar Siswa Lengkap Kelas 7A sampai Kelas 7H');
      setAttachedFileInfo({
        name: 'template-semua-kelas-7A-7H.csv',
        sizeKb: `${((text.length || 1200) / 1024).toFixed(2)} KB`,
      });
    }
    const classesToBuild = target === 'ALL' ? ALL_CLASS_LIST : [normalizeStudentClass(target) || '7G'];
    const blankRows: QuizSubmission[] = [];
    classesToBuild.forEach((cls) => {
      for (let i = 1; i <= rowsCount; i++) {
        const no = String(i).padStart(2, '0');
        blankRows.push({
          id: `sub-roster-${cls}-${no}`,
          studentName: '',
          studentClass: cls,
          studentNumber: no,
          score: 0,
          totalQuestions: QUIZ_QUESTIONS.length,
          correctCount: 0,
          wrongCount: 0,
          answers: {},
          timeSpentSeconds: 0,
          submittedAt: new Date().toISOString(),
          hasSubmitted: false,
        });
      }
    });
    setParsedPreview(blankRows);
  };

  const handleLoadFromServerRoster = () => {
    playClickSound();
    const sourceList =
      existingSubmissions.length > 0
        ? existingSubmissions.filter((s) =>
            pasteClass === 'ALL' ? true : normalizeStudentClass(s.studentClass) === pasteClass
          )
        : [];

    if (sourceList.length === 0) {
      handleLoadTemplateText(pasteClass, 15);
      setCopiedTemplateToast(
        `Belum ada data tersimpan di Kelas ${pasteClass}. Template standar Kelas ${pasteClass} telah dimuat.`
      );
      setTimeout(() => setCopiedTemplateToast(null), 3500);
      return;
    }

    const sorted = [...sourceList].sort((a, b) => {
      const cCmp = a.studentClass.localeCompare(b.studentClass);
      if (cCmp !== 0) return cCmp;
      return (parseInt(a.studentNumber, 10) || 99) - (parseInt(b.studentNumber, 10) || 99);
    });

    const lines = sorted.map((s) => {
      const scorePart = hasStudentSubmittedQuiz(s) ? `, ${s.score}` : '';
      return `${String(s.studentNumber).padStart(2, '0')}, ${s.studentName}, ${s.studentClass}${scorePart}`;
    });
    const text = lines.join('\n');
    setPasteText(text);
    setParsedPreview(buildSubmissionsFromPasteText(text, pasteClass));
    setAttachedFileInfo({
      name: `server-data-kelas-${pasteClass.toLowerCase()}.csv`,
      sizeKb: `${Math.max(0.45, text.length / 1024).toFixed(2)} KB`,
    });
    setCopiedTemplateToast(
      `Berhasil memuat ${sorted.length} data siswa Kelas ${pasteClass} dari Server Database!`
    );
    setTimeout(() => setCopiedTemplateToast(null), 3500);
  };

  const handleCopyTemplateToClipboard = async (target: 'ALL' | string = 'ALL') => {
    playClickSound();
    const text = generateStudentImportTemplateText(target, 10);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplateToast(
        target === 'ALL'
          ? 'Template Kelas 7A s/d 7H berhasil disalin ke Clipboard!'
          : `Template Kelas ${target} berhasil disalin ke Clipboard!`
      );
      setTimeout(() => setCopiedTemplateToast(null), 3500);
    } catch {
      setPasteText(text);
    }
  };

  const processUploadedFileObject = async (file: File) => {
    playClickSound();
    setIsParsingFile(true);
    const sizeKb = `${Math.max(0.1, file.size / 1024).toFixed(2)} KB`;

    try {
      const result = await parseUploadedStudentFile(file, pasteClass);
      const effectiveCls =
        result.detectedClassFromFilename ||
        result.emptyTemplateClass ||
        normalizeStudentClass(pasteClass) ||
        '7G';

      if (result.detectedClassFromFilename) {
        setPasteClass(result.detectedClassFromFilename);
        setTemplateDownloadClass(result.detectedClassFromFilename);
        setSingleClass(result.detectedClassFromFilename);
        setBatchClass(result.detectedClassFromFilename);
      }

      setImportTitle(`Import File: ${file.name} (Kelas ${effectiveCls})`);

      if (result.rows.length > 0) {
        // Build directly from result.rows so Nama Lengkap Siswa matches the uploaded file 100%
        const parsed = buildSubmissionsFromParsedRows(result.rows, effectiveCls);
        setPasteText(result.extractedText);
        setParsedPreview(parsed);
        setEditorSubTab('visual');
        setAttachedFileInfo({
          name: file.name,
          sizeKb,
          rowCount: parsed.length,
        });

        const classesFound = Array.from(new Set(parsed.map((s) => s.studentClass))).join(', ');

        if (autoImportOnUpload) {
          onAddBatchSubmissions(parsed);
          playCorrectSound();
          setSuccessMessage(
            `File "${file.name}" berhasil diupload & diimport! Sebanyak ${parsed.length} Nama Lengkap Siswa (Kelas ${classesFound}) telah disesuaikan dan disimpan ke Dashboard Siswa & Rekap Nilai Guru.`
          );
          setCopiedTemplateToast(
            `Berhasil mengimport ${parsed.length} Nama Lengkap Siswa sesuai file "${file.name}" (Kelas ${classesFound})!`
          );
        } else {
          setCopiedTemplateToast(
            `File "${file.name}" berhasil dibaca (${parsed.length} siswa Kelas ${classesFound}). Klik tombol "Import & Simpan Data Siswa" untuk menyimpan.`
          );
        }
        setTimeout(() => setCopiedTemplateToast(null), 5000);
      } else if (result.isBlankTemplate) {
        const targetCls = result.emptyTemplateClass || effectiveCls;
        const count = Math.min(60, Math.max(1, result.emptyTemplateRowCount || 32));
        setPasteClass(targetCls);
        setTemplateDownloadClass(targetCls);
        const blankRows: QuizSubmission[] = [];
        for (let i = 1; i <= count; i++) {
          const no = String(i).padStart(2, '0');
          blankRows.push({
            id: `sub-roster-${targetCls}-${no}`,
            studentName: '',
            studentClass: targetCls,
            studentNumber: no,
            score: 0,
            totalQuestions: QUIZ_QUESTIONS.length,
            correctCount: 0,
            wrongCount: 0,
            answers: {},
            timeSpentSeconds: 0,
            submittedAt: new Date().toISOString(),
            hasSubmitted: false,
          });
        }
        setParsedPreview(blankRows);
        setEditorSubTab('visual');
        setAttachedFileInfo({
          name: file.name,
          sizeKb,
          rowCount: 0,
        });
        setCopiedTemplateToast(
          `File template "${file.name}" (Kelas ${targetCls}) belum memiliki Nama Lengkap Siswa. Silakan ketik nama siswa pada kolom tabel di bawah atau isi di Excel lalu upload kembali.`
        );
        setTimeout(() => setCopiedTemplateToast(null), 6000);
      } else {
        setAttachedFileInfo({ name: file.name, sizeKb, rowCount: 0 });
        setCopiedTemplateToast(
          `File "${file.name}" tidak berisi daftar nama siswa yang valid. Pastikan kolom Nama Lengkap Siswa sudah diisi.`
        );
        setTimeout(() => setCopiedTemplateToast(null), 5000);
      }
    } catch {
      setCopiedTemplateToast(
        `Gagal membaca file "${file.name}". Gunakan format Excel (.xlsx / .xls), CSV (.csv), Word (.docx), atau Teks (.txt).`
      );
      setTimeout(() => setCopiedTemplateToast(null), 5000);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleUploadTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processUploadedFileObject(file);
    e.target.value = '';
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processUploadedFileObject(file);
    }
  };

  const handleUpdatePreviewRow = (
    index: number,
    field: 'studentNumber' | 'studentName' | 'studentClass' | 'score',
    value: string
  ) => {
    setParsedPreview((prev) => {
      const updated = prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'studentNumber') {
          return { ...item, studentNumber: value };
        }
        if (field === 'studentName') {
          return { ...item, studentName: value };
        }
        if (field === 'studentClass') {
          return { ...item, studentClass: normalizeStudentClass(value) || item.studentClass };
        }
        if (field === 'score') {
          const trimmed = value.trim();
          if (trimmed === '') {
            return {
              ...item,
              score: 0,
              correctCount: 0,
              wrongCount: 0,
              answers: {},
              hasSubmitted: false,
            };
          }
          const num = Math.max(0, Math.min(100, Number(trimmed) || 0));
          const correctCount = Math.round(num / QUIZ_METADATA.pointsPerQuestion);
          const wrongCount = QUIZ_QUESTIONS.length - correctCount;
          return {
            ...item,
            score: num,
            correctCount,
            wrongCount,
            hasSubmitted: true,
          };
        }
        return item;
      });
      return updated;
    });
  };

  const handleRemovePreviewRow = (index: number) => {
    playClickSound();
    setParsedPreview((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddPreviewRow = () => {
    playClickSound();
    setParsedPreview((prev) => {
      const nextNo = String(prev.length + 1).padStart(2, '0');
      const newSub: QuizSubmission = {
        id: `sub-preview-${Date.now()}-${prev.length + 1}`,
        studentName: `Siswa Baru ${pasteClass}-${nextNo}`,
        studentClass: pasteClass,
        studentNumber: nextNo,
        score: 0,
        totalQuestions: QUIZ_QUESTIONS.length,
        correctCount: 0,
        wrongCount: 0,
        answers: {},
        timeSpentSeconds: 0,
        submittedAt: new Date().toISOString(),
        hasSubmitted: false,
      };
      return [...prev, newSub];
    });
    setEditorSubTab('visual');
  };

  const handleParsePasteText = () => {
    playClickSound();
    const parsed = buildSubmissionsFromPasteText(pasteText, pasteClass);
    setParsedPreview(parsed);
    setEditorSubTab('visual');
  };

  const handleSaveParsedData = () => {
    const rawList =
      parsedPreview.length > 0
        ? parsedPreview
        : buildSubmissionsFromPasteText(pasteText, pasteClass);

    const listToSave = rawList.filter(
      (item) =>
        item.studentName.trim().length > 0 && !isPlaceholderStudentName(item.studentName)
    );

    if (listToSave.length === 0) {
      alert(
        'Mohon isi kolom Nama Lengkap Siswa terlebih dahulu atau upload file Excel/CSV yang sudah berisi nama siswa.'
      );
      return;
    }
    onAddBatchSubmissions(listToSave);
    playCorrectSound();
    const classesSaved = Array.from(new Set(listToSave.map((s) => s.studentClass))).join(', ');
    setSuccessMessage(
      `Berhasil mengimport & menyimpan ${listToSave.length} Nama Lengkap Siswa (Kelas ${classesSaved}) sesuai data yang diupload ke Dashboard Siswa & Rekap Nilai Guru!`
    );
  };

  const detectedLineCount = React.useMemo(() => {
    if (parsedPreview.length > 0) {
      return parsedPreview.filter(
        (r) => r.studentName.trim().length > 0 && !isPlaceholderStudentName(r.studentName)
      ).length;
    }
    return parseSmartStudentLines(pasteText, pasteClass, false).length;
  }, [parsedPreview, pasteText, pasteClass]);

  const classStudentCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_CLASS_LIST.forEach((c) => {
      counts[c] = 0;
    });
    existingSubmissions.forEach((s) => {
      const c = normalizeStudentClass(s.studentClass);
      if (c && counts[c] !== undefined) {
        counts[c] += 1;
      }
    });
    return counts;
  }, [existingSubmissions]);

  return (
    <div className="space-y-5">
      {/* Top Sub-Navigation Bar (Add New File / Mode Switcher) */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            Add New File / Input &amp; Import Data Siswa
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">·</span>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Kelas 7A s/d Kelas 7H
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setEntryMode('paste');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                entryMode === 'paste'
                  ? 'bg-[#2271b1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Upload &amp; Import File (7A–7H)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setEntryMode('batch');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                entryMode === 'batch'
                  ? 'bg-[#2271b1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Tabel Cepat (01–32)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setEntryMode('single');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                entryMode === 'single'
                  ? 'bg-[#2271b1] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Input Satuan</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onViewRecap();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Lihat Rekap Nilai</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Data Berhasil Dipublikasikan!</p>
              <p className="text-xs text-emerald-800 mt-0.5">{successMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onViewRecap();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Buka Tabel Rekap
            </button>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-xs text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {copiedTemplateToast && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{copiedTemplateToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setCopiedTemplateToast(null)}
            className="text-blue-700 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODE: UPLOAD & IMPORT STUDIO (MATCHING SCREENSHOT 2-COLUMN LAYOUT)    */}
      {/* ===================================================================== */}
      {entryMode === 'paste' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT MAIN WORKSPACE COLUMN (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1. Title Input ("Add title") + Quick Class Template Downloader Bar */}
            <div className="bg-white border border-slate-300 rounded-md shadow-2xs">
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="Add title (Judul Data Siswa / Rombel Kelas 7A – 7H)"
                className="w-full px-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-800 placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-[#2271b1]"
              />
            </div>

            {/* Dedicated Class Dropdown Bar for Downloading Templates */}
            <div className="bg-white border border-slate-300 rounded-sm p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Download className="w-4 h-4 text-[#2271b1] shrink-0" />
                  <span>Pilih Kelas Download Template:</span>
                </div>

                <select
                  value={templateDownloadClass}
                  onChange={(e) => {
                    playClickSound();
                    const val = e.target.value;
                    setTemplateDownloadClass(val);
                    if (val !== 'ALL') {
                      const clean = normalizeStudentClass(val) || '7G';
                      setPasteClass(clean);
                      setSingleClass(clean);
                      setBatchClass(clean);
                      setImportTitle(`Data Daftar Siswa Kelas ${clean} — Semester Ganjil`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xs border border-[#2271b1] bg-blue-50/40 text-xs font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-[#2271b1] cursor-pointer"
                >
                  {allClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls} (No. Absen 01–{String(templateRowsCount).padStart(2, '0')})
                    </option>
                  ))}
                  <option value="ALL">Semua Kelas Sekaligus (Kelas 7A s/d 7H)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    downloadStudentImportTemplateExcel(templateRowsCount, templateDownloadClass);
                    setCopiedTemplateToast(
                      templateDownloadClass === 'ALL'
                        ? 'File Template Excel (.xls) untuk Semua Kelas (7A–7H) berhasil diunduh!'
                        : `File Template Excel (.xls) khusus Kelas ${templateDownloadClass} berhasil diunduh!`
                    );
                    setTimeout(() => setCopiedTemplateToast(null), 3500);
                  }}
                  className="px-3 py-1.5 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    Download Excel (.xls){' '}
                    {templateDownloadClass === 'ALL' ? '7A–7H' : `Kelas ${templateDownloadClass}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    downloadStudentImportTemplateCsv(templateRowsCount, templateDownloadClass);
                    setCopiedTemplateToast(
                      templateDownloadClass === 'ALL'
                        ? 'File Template CSV (.csv) untuk Semua Kelas (7A–7H) berhasil diunduh!'
                        : `File Template CSV (.csv) khusus Kelas ${templateDownloadClass} berhasil diunduh!`
                    );
                    setTimeout(() => setCopiedTemplateToast(null), 3500);
                  }}
                  className="px-3 py-1.5 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    Download CSV (.csv){' '}
                    {templateDownloadClass === 'ALL' ? '7A–7H' : `Kelas ${templateDownloadClass}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleLoadTemplateText(
                      templateDownloadClass,
                      templateDownloadClass === 'ALL' ? 5 : templateRowsCount
                    )
                  }
                  className="px-3 py-1.5 rounded-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5 text-slate-600" />
                  <span>
                    Tampilkan di Editor ({templateDownloadClass === 'ALL' ? '7A–7H' : `Kelas ${templateDownloadClass}`})
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Classic Editor Box ("Add Media / Template", Visual | Text tabs, Toolbar, Content, Word/Row count) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadTemplateText('ALL', 5)}
                    className="px-3 py-1.5 rounded-sm bg-[#f6f7f7] hover:bg-slate-200 text-[#2271b1] border border-[#2271b1] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Add Template (7A–7H)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadTemplateText(pasteClass, templateRowsCount)}
                    className="px-3 py-1.5 rounded-sm bg-[#f6f7f7] hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-slate-600" />
                    <span>Isi Absen 01–{String(templateRowsCount).padStart(2, '0')} (Kelas {pasteClass})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyTemplateToClipboard('ALL')}
                    className="px-2.5 py-1.5 rounded-sm bg-[#f6f7f7] hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Format</span>
                  </button>
                </div>

                {/* Visual | Text Tabs */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      const parsed = buildSubmissionsFromPasteText(pasteText, pasteClass);
                      setParsedPreview(parsed);
                      setEditorSubTab('visual');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold border border-b-0 rounded-tl-sm cursor-pointer ${
                      editorSubTab === 'visual'
                        ? 'bg-white text-slate-900 border-slate-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    Visual ({detectedLineCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setEditorSubTab('text');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold border border-b-0 rounded-tr-sm cursor-pointer ${
                      editorSubTab === 'text'
                        ? 'bg-white text-slate-900 border-slate-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    Text / CSV
                  </button>
                </div>
              </div>

              {/* Editor Container */}
              <div className="bg-white border border-slate-300 rounded-b-sm shadow-2xs overflow-hidden">
                {/* Editor Formatting & Class Quick-Insert Toolbar */}
                <div className="bg-[#f6f7f7] border-b border-slate-300 px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                  <select
                    value={pasteClass}
                    onChange={(e) => {
                      const nextCls = normalizeStudentClass(e.target.value) || '7G';
                      setPasteClass(nextCls);
                      setSingleClass(nextCls);
                      setBatchClass(nextCls);
                      setImportTitle(`Data Daftar Siswa Kelas ${nextCls} — Semester Ganjil`);
                      if (parsedPreview.length > 0) {
                        setParsedPreview((prev) =>
                          prev.map((item) => ({ ...item, studentClass: nextCls }))
                        );
                      }
                    }}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-xs text-xs font-semibold text-slate-800"
                  >
                    {allClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Paragraph / Kelas {cls}
                      </option>
                    ))}
                  </select>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => handleLoadTemplateText(pasteClass, 32)}
                    className="p-1.5 hover:bg-slate-200 rounded-xs text-slate-700 cursor-pointer"
                    title="Muat Template 32 Siswa"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadTemplateText('ALL', 5)}
                    className="p-1.5 hover:bg-slate-200 rounded-xs text-slate-700 cursor-pointer"
                    title="Muat Semua Kelas 7A-7H"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleParsePasteText}
                    className="p-1.5 hover:bg-slate-200 rounded-xs text-slate-700 cursor-pointer"
                    title="Pratinjau Tabel Visual"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorSubTab(editorSubTab === 'text' ? 'visual' : 'text')}
                    className="p-1.5 hover:bg-slate-200 rounded-xs text-slate-700 cursor-pointer"
                    title="Ganti Mode Tabel / Teks"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setPasteText('');
                      setParsedPreview([]);
                    }}
                    className="p-1.5 hover:bg-rose-100 hover:text-rose-700 rounded-xs text-slate-600 cursor-pointer"
                    title="Kosongkan Editor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

                  {/* Quick class pills in toolbar */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {ALL_CLASS_LIST.map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => handleLoadTemplateText(cls, 32)}
                        className={`px-1.5 py-0.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                          pasteClass === cls
                            ? 'bg-[#2271b1] text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={`Muat Template Nomor Absen 01-32 untuk Kelas ${cls}`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor Body: Textarea OR Visual Table */}
                {editorSubTab === 'text' ? (
                  <textarea
                    rows={10}
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      if (parsedPreview.length > 0) {
                        setParsedPreview([]);
                      }
                    }}
                    placeholder={`Ketik, tempelkan (Copy-Paste dari Excel/Word), atau klik tombol "SELECT FILE" di sebelah kanan.\n\nContoh format (No_Absen, Nama_Siswa, Kelas):\n=== KELAS ${pasteClass} ===\n01, Ahmad Fauzan, ${pasteClass}\n02, Siti Aisyah, ${pasteClass}\n03, Budi Utomo, ${pasteClass}`}
                    className="w-full p-3.5 text-xs font-mono text-slate-800 bg-white outline-hidden resize-y leading-relaxed"
                  />
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {parsedPreview.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                        <p>Belum ada baris siswa untuk ditampilkan pada mode Visual.</p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xs bg-[#46b450] hover:bg-[#3aa044] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload File Excel / CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadTemplateText(pasteClass, 10)}
                            className="px-3.5 py-1.5 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold text-xs cursor-pointer"
                          >
                            Muat Contoh Template Kelas {pasteClass}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-emerald-50/70 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-900">
                            Pratinjau Data Siswa ({parsedPreview.length} Baris) — Dapat diedit langsung sebelum disimpan
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAddPreviewRow}
                              className="px-2.5 py-1 rounded-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Baris</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveParsedData}
                              className="px-3 py-1 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>Import &amp; Simpan ({parsedPreview.length} Siswa)</span>
                            </button>
                          </div>
                        </div>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              <th className="py-2 px-2.5 w-20 text-center">No Absen</th>
                              <th className="py-2 px-2.5">Nama Lengkap Siswa</th>
                              <th className="py-2 px-2.5 w-24 text-center">Kelas</th>
                              <th className="py-2 px-2.5 w-24 text-center">Nilai</th>
                              <th className="py-2 px-2.5 w-32 text-center">Status</th>
                              <th className="py-2 px-2 w-10 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parsedPreview.map((item, idx) => {
                              const status = getSubmissionAssessmentStatus(
                                item,
                                QUIZ_METADATA.passingScore
                              );
                              const isSubmitted = hasStudentSubmittedQuiz(item);
                              return (
                                <tr key={item.id || idx} className="hover:bg-slate-50">
                                  <td className="py-1.5 px-2 text-center">
                                    <input
                                      type="text"
                                      value={item.studentNumber}
                                      onChange={(e) =>
                                        handleUpdatePreviewRow(idx, 'studentNumber', e.target.value)
                                      }
                                      className="w-14 px-1.5 py-1 text-center font-mono font-bold text-slate-800 border border-slate-200 rounded-xs bg-white focus:border-[#2271b1] outline-hidden"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <input
                                      type="text"
                                      value={item.studentName}
                                      onChange={(e) =>
                                        handleUpdatePreviewRow(idx, 'studentName', e.target.value)
                                      }
                                      placeholder="Ketik nama siswa..."
                                      className="w-full px-2 py-1 font-semibold text-slate-900 border border-slate-200 rounded-xs bg-white focus:border-[#2271b1] outline-hidden"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    <select
                                      value={item.studentClass}
                                      onChange={(e) =>
                                        handleUpdatePreviewRow(idx, 'studentClass', e.target.value)
                                      }
                                      className="px-1.5 py-1 font-bold text-[#2271b1] border border-slate-200 rounded-xs bg-white focus:border-[#2271b1] outline-hidden"
                                    >
                                      {allClasses.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={isSubmitted ? item.score : ''}
                                      placeholder="—"
                                      onChange={(e) =>
                                        handleUpdatePreviewRow(idx, 'score', e.target.value)
                                      }
                                      className="w-16 px-1.5 py-1 text-center font-mono font-bold text-slate-900 border border-slate-200 rounded-xs bg-white focus:border-[#2271b1] outline-hidden"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-[11px] font-semibold">
                                    {status === 'TUNTAS' ? (
                                      <span className="text-emerald-700">Tuntas</span>
                                    ) : status === 'REMEDIAL' ? (
                                      <span className="text-rose-700">Remedial</span>
                                    ) : (
                                      <span className="text-slate-500">Belum Mengerjakan</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePreviewRow(idx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                      title="Hapus baris"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Editor Footer Status Bar ("p" / "Word count: 0") */}
                <div className="bg-[#f6f7f7] border-t border-slate-300 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-600">
                  <span>p · Target aktif: Kelas {pasteClass}</span>
                  <span>
                    Jumlah Siswa Terdeteksi: <strong>{detectedLineCount}</strong> Siswa
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Package Settings Box (Matching "Package Settings" card in screenshot) */}
            <div className="bg-white border border-slate-300 rounded-sm shadow-2xs overflow-hidden">
              <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Package Settings / Pengaturan Import &amp; Parameter Kelas
                </h3>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>

              <div className="p-4 space-y-4">
                {/* Sub-tabs inside Package Settings */}
                <div className="flex flex-wrap items-center border-b border-slate-200 gap-1">
                  {[
                    { id: 'package', label: 'Package Settings (Kelas & Absen)' },
                    { id: 'lock', label: 'Lock Options (Aturan KKM)' },
                    { id: 'format', label: 'Format Kolom Import' },
                    { id: 'templates', label: 'Template Kelas 7A–7H' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setPackageSettingTab(
                          t.id as 'package' | 'lock' | 'format' | 'templates'
                        );
                      }}
                      className={`px-3.5 py-2 text-xs font-semibold border border-b-0 rounded-t-sm transition-colors cursor-pointer ${
                        packageSettingTab === t.id
                          ? 'bg-white text-slate-900 border-slate-300 -mb-px'
                          : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Package Settings Form Rows */}
                {packageSettingTab === 'package' && (
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                      <label className="sm:col-span-4 text-slate-600 font-medium">
                        Target Kelas Default:
                      </label>
                      <div className="sm:col-span-8 flex items-center gap-2">
                        <select
                          value={pasteClass}
                          onChange={(e) => {
                            const nextCls = normalizeStudentClass(e.target.value) || '7G';
                            setPasteClass(nextCls);
                            setSingleClass(nextCls);
                            setBatchClass(nextCls);
                          }}
                          className="w-48 px-2.5 py-1.5 border border-slate-300 rounded-xs bg-white font-semibold text-slate-800"
                        >
                          {allClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              Kelas {cls}
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-400">
                          (Otomatis menyesuaikan jika baris memiliki label 7A–7H)
                        </span>
                      </div>
                    </div>

                    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                      <label className="sm:col-span-4 text-slate-600 font-medium">
                        Label Dokumen Rekap:
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={importTitle}
                          onChange={(e) => setImportTitle(e.target.value)}
                          className="w-full max-w-md px-2.5 py-1.5 border border-slate-300 rounded-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                      <label className="sm:col-span-4 text-slate-600 font-medium">
                         Ukuran / Jumlah Baris Template:
                      </label>
                      <div className="sm:col-span-8 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={templateRowsCount}
                          onChange={(e) =>
                            setTemplateRowsCount(Math.max(1, Math.min(60, Number(e.target.value) || 32)))
                          }
                          className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-xs font-mono text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleLoadTemplateText(pasteClass, templateRowsCount)}
                          className="px-3 py-1.5 rounded-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                        >
                          Buat {templateRowsCount} Baris Kelas {pasteClass}
                        </button>
                      </div>
                    </div>

                    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                      <label className="sm:col-span-4 text-slate-600 font-medium">
                        Nilai Awal Default (Opsional):
                      </label>
                      <div className="sm:col-span-8 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Kosong = Belum Mengerjakan"
                          value={defaultScoreFallback}
                          onChange={(e) => setDefaultScoreFallback(e.target.value)}
                          className="w-56 px-2.5 py-1.5 border border-slate-300 rounded-xs text-slate-800"
                        />
                        <span className="text-[11px] text-slate-400">
                          Biarkan kosong jika siswa belum mengerjakan
                        </span>
                      </div>
                    </div>

                    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                      <label className="sm:col-span-4 text-slate-600 font-medium">
                        Allow Access / Akses Kelas:
                      </label>
                      <div className="sm:col-span-8">
                        <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 border border-slate-300 rounded-xs bg-slate-50">
                          <span className="px-2 py-0.5 bg-white border border-slate-300 rounded-xs text-[11px] font-semibold text-slate-700">
                            Semua Siswa Terdaftar (Kelas 7A – 7H)
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-xs text-[11px] font-semibold text-emerald-800">
                            Sinkron Dashboard Siswa &amp; Guru
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                      <label className="sm:col-span-4 text-slate-600 font-medium">
                        Page Template / Format Tabel:
                      </label>
                      <div className="sm:col-span-8">
                        <select
                          value={editorSubTab}
                          onChange={(e) => setEditorSubTab(e.target.value as 'text' | 'visual')}
                          className="w-full max-w-md px-2.5 py-1.5 border border-slate-300 rounded-xs bg-white text-slate-800"
                        >
                          <option value="text">
                            Format Standar: No_Absen, Nama_Lengkap_Siswa, Kelas (7A–7H)
                          </option>
                          <option value="visual">
                            Pratinjau Tabel Interaktif (Visual)
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {packageSettingTab === 'lock' && (
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Aturan Penilaian &amp; Sinkronisasi Daftar Siswa:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                      <li>
                        Siswa yang diimpor <strong>tanpa nilai</strong> otomatis tercatat berstatus{' '}
                        <strong>Belum Mengerjakan</strong> (tidak diberi nilai 0 dan tidak masuk Remedial).
                      </li>
                      <li>
                        Nama siswa yang diimpor otomatis muncul pada <strong>pilihan daftar nama di halaman login siswa</strong> sesuai kelasnya (7A s/d 7H).
                      </li>
                      <li>
                        Standar Ketuntasan Minimal (KKM): <strong>{QUIZ_METADATA.passingScore}</strong>.
                      </li>
                    </ul>
                  </div>
                )}

                {packageSettingTab === 'format' && (
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Contoh Format Baris yang Didukung Otomatis:
                    </p>
                    <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xs font-mono text-[11px] overflow-x-auto">
{`=== KELAS 7G ===
01, Ahmad Fauzan, 7G
02, Siti Aisyah, 7G
03, Budi Utomo, 7G, 90`}
                    </pre>
                  </div>
                )}

                {packageSettingTab === 'templates' && (
                  <div className="space-y-3.5 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-800">Pilih Kelas Template:</span>
                        <select
                          value={templateDownloadClass}
                          onChange={(e) => {
                            playClickSound();
                            const val = e.target.value;
                            setTemplateDownloadClass(val);
                            if (val !== 'ALL') {
                              setPasteClass(normalizeStudentClass(val) || '7G');
                            }
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-xs bg-white font-bold text-slate-800 cursor-pointer"
                        >
                          {allClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              Kelas {cls}
                            </option>
                          ))}
                          <option value="ALL">Semua Kelas (7A s/d 7H)</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            downloadStudentImportTemplateExcel(
                              templateRowsCount,
                              templateDownloadClass
                            );
                          }}
                          className="px-3 py-1.5 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            Unduh Excel (.xls){' '}
                            {templateDownloadClass === 'ALL'
                              ? 'Semua 7A–7H'
                              : `Kelas ${templateDownloadClass}`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            downloadStudentImportTemplateCsv(
                              templateRowsCount,
                              templateDownloadClass
                            );
                          }}
                          className="px-3 py-1.5 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            Unduh CSV (.csv){' '}
                            {templateDownloadClass === 'ALL'
                              ? 'Semua 7A–7H'
                              : `Kelas ${templateDownloadClass}`}
                          </span>
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-600">
                      Atau klik langsung kelas di bawah untuk mengunduh / memuat template nomor absen <strong>01 s/d {String(templateRowsCount).padStart(2, '0')}</strong>:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ALL_CLASS_LIST.map((cls) => (
                        <div
                          key={cls}
                          className="p-2.5 rounded-xs border border-slate-300 bg-slate-50 flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Kelas {cls}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              01–{String(templateRowsCount).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                setTemplateDownloadClass(cls);
                                downloadStudentImportTemplateExcel(templateRowsCount, cls);
                              }}
                              className="flex-1 py-1 px-1.5 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] text-center cursor-pointer"
                              title={`Download Template Excel Kelas ${cls}`}
                            >
                              .XLS
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                setTemplateDownloadClass(cls);
                                downloadStudentImportTemplateCsv(templateRowsCount, cls);
                              }}
                              className="flex-1 py-1 px-1.5 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-[10px] text-center cursor-pointer"
                              title={`Download Template CSV Kelas ${cls}`}
                            >
                              .CSV
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTemplateDownloadClass(cls);
                                handleLoadTemplateText(cls, templateRowsCount);
                              }}
                              className="flex-1 py-1 px-1.5 rounded-xs bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-[10px] text-center cursor-pointer"
                              title={`Muat Template Kelas ${cls} ke Editor`}
                            >
                              Isi
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR META BOXES COLUMN (4 Cols — Exact Match to Screenshot) */}
          <div className="lg:col-span-4 space-y-5">
            {/* META BOX 1: Attach File */}
            <div className="bg-white border border-slate-300 rounded-sm shadow-2xs overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Attach File / Import Data Siswa</h3>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-3.5 space-y-3">
                {/* Attached file item with red trash button (like sample-1.csv 1.15 KB in screenshot) */}
                {attachedFileInfo && (
                  <div className="p-2.5 border border-slate-200 rounded-xs bg-slate-50/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {attachedFileInfo.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {attachedFileInfo.sizeKb}
                        {attachedFileInfo.rowCount !== undefined
                          ? ` • ${attachedFileInfo.rowCount} siswa terdeteksi`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setAttachedFileInfo(null);
                        setPasteText('');
                        setParsedPreview([]);
                      }}
                      className="w-7 h-7 rounded-xs bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                      title="Hapus file terlampir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Dashed Dropzone Box */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt,.ods,.docx"
                  onChange={handleUploadTemplateFile}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDropFile}
                  className={`border-2 border-dashed rounded-xs p-5 text-center transition-colors ${
                    isDraggingFile
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-emerald-300/90 bg-[#f9fdf9]'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-600">
                    {isParsingFile ? 'Membaca & Memproses File...' : 'Drop file Excel / CSV / Word di sini'}
                  </p>
                  <p className="text-[11px] text-slate-400 my-1.5">— atau —</p>
                  <button
                    type="button"
                    disabled={isParsingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 rounded-xs bg-[#46b450] hover:bg-[#3aa044] disabled:opacity-60 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isParsingFile ? 'MEMPROSES...' : 'SELECT FILE / UPLOAD'}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2">
                    [Mendukung: .xlsx / .xls / .csv / .docx / .txt]
                  </p>
                </div>

                {/* Auto-import toggle & Direct Import Action Button */}
                <div className="p-2.5 rounded-xs bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-emerald-950 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoImportOnUpload}
                      onChange={(e) => setAutoImportOnUpload(e.target.checked)}
                      className="rounded-xs border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Otomatis Import &amp; Simpan saat file dipilih</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (detectedLineCount > 0) {
                        handleSaveParsedData();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {detectedLineCount > 0
                        ? `IMPORT & SIMPAN DATA SISWA (${detectedLineCount} SISWA)`
                        : 'UPLOAD & IMPORT FILE DATA SISWA'}
                    </span>
                  </button>
                </div>

                {/* Quick class / URL input + blue button */}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={quickTemplateQuery}
                    onChange={(e) => setQuickTemplateQuery(e.target.value)}
                    placeholder="Ketik kelas (misal: 7G atau ALL)..."
                    className="flex-1 px-2.5 py-1.5 border border-r-0 border-slate-300 rounded-l-xs text-xs text-slate-800 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const q = quickTemplateQuery.trim().toUpperCase();
                      if (!q || q === 'ALL' || q === 'SEMUA') {
                        handleLoadTemplateText('ALL', 5);
                      } else {
                        handleLoadTemplateText(normalizeStudentClass(q) || '7G', 32);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#0073aa] hover:bg-[#005f8d] text-white border border-[#0073aa] rounded-r-xs cursor-pointer flex items-center justify-center"
                    title="Muat Template Kelas"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown Pilih Kelas untuk Download Template (di dalam Attach File) */}
                <div className="p-2.5 rounded-xs bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Pilih Kelas untuk Download / Muat Template:
                  </label>
                  <select
                    value={templateDownloadClass}
                    onChange={(e) => {
                      playClickSound();
                      const val = e.target.value;
                      setTemplateDownloadClass(val);
                      if (val !== 'ALL') {
                        const clean = normalizeStudentClass(val) || '7G';
                        setPasteClass(clean);
                        setSingleClass(clean);
                        setBatchClass(clean);
                        setImportTitle(`Data Daftar Siswa Kelas ${clean} — Semester Ganjil`);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xs bg-white text-xs font-bold text-slate-800 outline-hidden focus:border-[#2271b1] cursor-pointer"
                  >
                    {allClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls} (Absen 01–{String(templateRowsCount).padStart(2, '0')})
                      </option>
                    ))}
                    <option value="ALL">Semua Kelas Sekaligus (7A s/d 7H)</option>
                  </select>
                </div>

                {/* 3 Stacked Full-Width Action Buttons (Blue, Amber, Sky Blue — matching screenshot) */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleLoadTemplateText(
                        templateDownloadClass,
                        templateDownloadClass === 'ALL' ? 5 : templateRowsCount
                      )
                    }
                    className="w-full py-2 px-3 rounded-xs bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-colors shadow-2xs"
                  >
                    SELECT FROM TEMPLATE (
                    {templateDownloadClass === 'ALL'
                      ? 'SEMUA 7A–7H'
                      : `KELAS ${templateDownloadClass}`}
                    )
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadFromServerRoster}
                    className="w-full py-2 px-3 rounded-xs bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-colors shadow-2xs"
                  >
                    SELECT FROM SERVER (KELAS {pasteClass})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      downloadStudentImportTemplateExcel(
                        templateRowsCount,
                        templateDownloadClass
                      );
                    }}
                    className="w-full py-2 px-3 rounded-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-colors shadow-2xs"
                  >
                    DOWNLOAD TEMPLATE EXCEL (
                    {templateDownloadClass === 'ALL'
                      ? 'SEMUA 7A–7H'
                      : `KELAS ${templateDownloadClass}`}
                    )
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      downloadStudentImportTemplateCsv(
                        templateRowsCount,
                        templateDownloadClass
                      );
                    }}
                    className="w-full py-1.5 px-3 rounded-xs bg-white hover:bg-slate-50 text-[#2271b1] border border-[#2271b1] font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-colors"
                  >
                    DOWNLOAD TEMPLATE CSV (
                    {templateDownloadClass === 'ALL'
                      ? 'SEMUA 7A–7H'
                      : `KELAS ${templateDownloadClass}`}
                    )
                  </button>
                </div>
              </div>
            </div>

            {/* META BOX 2: Publish / Simpan Data */}
            <div className="bg-white border border-slate-300 rounded-sm shadow-2xs overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Publish / Simpan Data Siswa</h3>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      downloadStudentImportTemplateCsv(
                        templateRowsCount,
                        templateDownloadClass
                      );
                    }}
                    className="px-3 py-1.5 rounded-xs bg-[#f6f7f7] hover:bg-slate-200 text-[#2271b1] border border-[#2271b1] font-semibold text-xs cursor-pointer"
                  >
                    Unduh CSV (
                    {templateDownloadClass === 'ALL'
                      ? '7A–7H'
                      : `Kelas ${templateDownloadClass}`}
                    )
                  </button>
                  <button
                    type="button"
                    onClick={handleParsePasteText}
                    className="px-3 py-1.5 rounded-xs bg-[#f6f7f7] hover:bg-slate-200 text-[#2271b1] border border-[#2271b1] font-semibold text-xs cursor-pointer"
                  >
                    Preview ({detectedLineCount})
                  </button>
                </div>

                <div className="space-y-2 pt-1 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Pin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Status: <strong className="text-slate-900">Siap Simpan ({detectedLineCount} Siswa)</strong>{' '}
                      <button
                        type="button"
                        onClick={handleParsePasteText}
                        className="text-[#2271b1] underline ml-1 cursor-pointer"
                      >
                        Edit
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Visibility: <strong className="text-slate-900">Public (Siswa &amp; Guru)</strong>{' '}
                      <button
                        type="button"
                        onClick={onViewRecap}
                        className="text-[#2271b1] underline ml-1 cursor-pointer"
                      >
                        Lihat
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Publish: <strong className="text-slate-900">Immediately (Langsung)</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 bg-[#f6f7f7] border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setPasteText('');
                    setParsedPreview([]);
                  }}
                  className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={handleSaveParsedData}
                  className="px-4 py-1.5 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                >
                  Publish / Simpan ({detectedLineCount})
                </button>
              </div>
            </div>

            {/* META BOX 3: Categories / Pilih Kelas (7A - 7H) */}
            <div className="bg-white border border-slate-300 rounded-sm shadow-2xs overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Categories / Kelas (7A – 7H)</h3>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-3.5 space-y-2">
                <div className="flex items-center border-b border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCategoryTab('all')}
                    className={`px-2.5 py-1 font-semibold border border-b-0 rounded-t-xs cursor-pointer ${
                      categoryTab === 'all'
                        ? 'bg-white text-slate-900 border-slate-300 -mb-px'
                        : 'text-[#2271b1] border-transparent'
                    }`}
                  >
                    All Classes (7A–7H)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryTab('most')}
                    className={`px-2.5 py-1 font-semibold border border-b-0 rounded-t-xs cursor-pointer ${
                      categoryTab === 'most'
                        ? 'bg-white text-slate-900 border-slate-300 -mb-px'
                        : 'text-[#2271b1] border-transparent'
                    }`}
                  >
                    Most Used
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 p-2.5 space-y-1.5 bg-slate-50/40">
                  {ALL_CLASS_LIST.filter((cls) =>
                    categoryTab === 'all' ? true : (classStudentCounts[cls] || 0) > 0 || cls === pasteClass
                  ).map((cls) => {
                    const isChecked = pasteClass === cls;
                    const count = classStudentCounts[cls] || 0;
                    return (
                      <label
                        key={cls}
                        className="flex items-center justify-between gap-2 text-xs text-slate-700 hover:bg-white px-1.5 py-1 rounded-xs cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              playClickSound();
                              setPasteClass(cls);
                              setSingleClass(cls);
                              setBatchClass(cls);
                              setImportTitle(`Data Daftar Siswa Kelas ${cls} — Semester Ganjil`);
                              if (parsedPreview.length > 0) {
                                setParsedPreview((prev) =>
                                  prev.map((item) => ({ ...item, studentClass: cls }))
                                );
                              }
                            }}
                            className="rounded-xs border-slate-300 text-[#2271b1] focus:ring-[#2271b1]"
                          />
                          <span className={isChecked ? 'font-bold text-slate-900' : ''}>
                            Kelas {cls}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {count} siswa
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleLoadTemplateText(cls, 32);
                            }}
                            className="text-[10px] text-[#2271b1] hover:underline font-semibold cursor-pointer"
                          >
                            +Template
                          </button>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: BATCH / QUICK TABLE INPUT */}
      {/* ======================================================== */}
      {entryMode === 'batch' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pilih Kelas untuk Semua Baris:
              </label>
              <select
                value={batchClass}
                onChange={(e) => setBatchClass(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm font-bold bg-white"
              >
                {allClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate32BatchRows}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-200 cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                <span>Siapkan No. Absen 01 - 32</span>
              </button>
              <button
                type="button"
                onClick={handleAddBatchRow}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Baris Siswa</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-20 text-center">No. Absen</th>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3 w-36 text-center">Nilai Akhir</th>
                  <th className="p-3 w-40 text-center">Status Penilaian</th>
                  <th className="p-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchRows.map((row, idx) => {
                  const rawScore = String(row.score ?? '').trim();
                  const hasScore = rawScore !== '' && !Number.isNaN(Number(rawScore));
                  const numScore = hasScore ? Number(rawScore) : null;
                  const isPassed =
                    hasScore && numScore !== null && numScore >= QUIZ_METADATA.passingScore;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={row.studentNumber}
                          onChange={(e) =>
                            handleUpdateBatchRow(row.id, 'studentNumber', e.target.value)
                          }
                          className="w-12 text-center py-1 rounded-md border border-slate-300 font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.studentName}
                          onChange={(e) =>
                            handleUpdateBatchRow(row.id, 'studentName', e.target.value)
                          }
                          placeholder={`Nama Siswa ${idx + 1}...`}
                          className="w-full px-3 py-1.5 rounded-md border border-slate-300 font-medium focus:border-blue-500 outline-hidden"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Kosong"
                          value={row.score}
                          onChange={(e) => handleUpdateBatchRow(row.id, 'score', e.target.value)}
                          className="w-24 text-center py-1 px-2 rounded-md border border-slate-300 font-mono font-bold focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
                        />
                      </td>
                      <td className="p-2 text-center text-[11px] font-semibold">
                        {!hasScore ? (
                          <span className="text-slate-500">Belum Mengerjakan</span>
                        ) : isPassed ? (
                          <span className="text-emerald-700">Tuntas</span>
                        ) : (
                          <span className="text-rose-700">Remedial</span>
                        )}
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
              Total: {batchRows.filter((r) => r.studentName.trim()).length} siswa siap disimpan ke
              Kelas {batchClass}.
            </span>

            <button
              type="button"
              onClick={handleSubmitBatch}
              className="px-5 py-2 rounded-lg bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Siswa di Tabel</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: SINGLE ENTRY FORM */}
      {/* ======================================================== */}
      {entryMode === 'single' && (
        <form
          onSubmit={handleSubmitSingle}
          className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-6 shadow-2xs"
        >
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2271b1] text-white text-xs flex items-center justify-center font-black">
                1
              </span>
              <span>Identitas Peserta Didik</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="Contoh: Galang Pratama"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:border-blue-500 outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                <select
                  value={singleClass}
                  onChange={(e) => setSingleClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-semibold bg-white"
                >
                  {allClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Kelas Lainnya...</option>
                </select>
                {singleClass === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    placeholder="Misal: 7I"
                    className="mt-2 w-full px-3 py-1.5 rounded-lg border border-blue-400 text-xs bg-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Absen</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={singleNumber}
                  onChange={(e) => setSingleNumber(e.target.value)}
                  placeholder="Contoh: 12"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Grading Method */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2271b1] text-white text-xs flex items-center justify-center font-black">
                  2
                </span>
                <span>Metode Pengisian Nilai</span>
              </h3>

              <div className="inline-flex flex-wrap rounded-lg bg-slate-200/80 p-1 gap-1 self-start">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGradingMethod('unsubmitted');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    gradingMethod === 'unsubmitted'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Belum Mengerjakan (Tanpa Nilai)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGradingMethod('directScore');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    gradingMethod === 'directScore'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Input Nilai Langsung (0–100)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGradingMethod('answers');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    gradingMethod === 'answers'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pilih Jawaban per Nomor (1–10)
                </button>
              </div>
            </div>

            {gradingMethod === 'unsubmitted' ? (
              <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-600">
                Siswa akan didaftarkan ke <strong>Kelas {singleClass}</strong> dengan status{' '}
                <strong>Belum Mengerjakan</strong> (kolom nilai dikosongkan sampai siswa mengerjakan kuis).
              </div>
            ) : gradingMethod === 'directScore' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Masukkan Nilai Akhir (0 - 100):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="10"
                    placeholder="Kosongkan jika belum mengerjakan"
                    value={directScoreInput}
                    onChange={(e) => setDirectScoreInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-lg font-black text-slate-900"
                  />
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Durasi Pengerjaan (Menit):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={singleDurationMinutes}
                    onChange={(e) => setSingleDurationMinutes(Number(e.target.value))}
                    className="w-28 px-3 py-2 rounded-lg border border-slate-300 text-base font-bold text-slate-800"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">
                    Klik pilihan jawaban siswa untuk masing-masing soal:
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSetAllCorrect}
                      className="px-2.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Set Semua Benar (100)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAnswers}
                      className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Semua ke A</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {QUIZ_QUESTIONS.map((q) => {
                    const chosen = studentAnswers[q.id];
                    const isCorrect = chosen === q.correctAnswer;
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-lg border bg-white flex items-center justify-between gap-2 ${
                          isCorrect ? 'border-emerald-200' : 'border-rose-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            #{q.id}. {q.topic} (Kunci: {q.correctAnswer})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                            <button
                              key={optKey}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, optKey)}
                              className={`w-7 h-7 rounded-md font-bold text-xs cursor-pointer ${
                                chosen === optKey
                                  ? optKey === q.correctAnswer
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {optKey}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#2271b1] hover:bg-[#135e96] text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data Siswa</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
