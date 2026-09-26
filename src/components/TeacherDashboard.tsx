import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Printer, 
  RefreshCw, 
  Trash2, 
  Search, 
  Filter, 
  Eye, 
  ShieldCheck, 
  KeyRound, 
  BookOpen, 
  BarChart3, 
  Table, 
  Sparkles,
  ArrowUpDown,
  GraduationCap,
  PlusCircle,
  FileSpreadsheet,
  UserPlus,
  Cloud,
  CloudCheck,
  CloudOff,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Copy,
  Check,
  Radio,
  Clock,
  Lock,
  Unlock,
  Bell,
  FileText,
  Upload,
  RotateCcw,
  Headphones,
  Pencil,
  Plus
} from 'lucide-react';
import { QuizSubmission, QuizViolationRecord, Question, ProcedureTextConfig } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA, INITIAL_STUDENT_SUBMISSIONS, INITIAL_PROCEDURE_TEXT_CONFIG } from '../data/quizData';
import { ReviewModal } from './ReviewModal';
import { TeacherInputStudent } from './TeacherInputStudent';
import { WordImportModal } from './WordImportModal';
import { QuestionEditModal } from './QuestionEditModal';
import { PermanentDeleteModal } from './PermanentDeleteModal';
import { ProcedureTextEditor } from './ProcedureTextEditor';
import { downloadWordCompatibleDoc } from '../utils/wordQuestionParser';
import { playClickSound, playUnlockSuccessSound } from '../utils/audio';
import { executePrintStudentScore, executePrintTeacherRecap, openTeacherRecapInNewTab } from '../utils/printReport';

interface TeacherDashboardProps {
  submissions: QuizSubmission[];
  violations?: QuizViolationRecord[];
  onUnlockViolationRemotely?: (violationId: string) => Promise<void> | void;
  onDeleteViolation?: (violationId: string) => Promise<void> | void;
  onClearAllViolations?: () => Promise<void> | void;
  currentPin: string;
  onChangePin: (newPin: string) => void;
  onClearSubmissions: () => Promise<void> | void;
  onSeedSampleData: () => void;
  onDeleteSubmission: (id: string) => Promise<void> | void;
  onBackToQuiz: () => void;
  onAddSubmission: (submission: QuizSubmission) => void;
  onAddBatchSubmissions: (submissions: QuizSubmission[]) => void;
  isDbConnected?: boolean;
  isSyncing?: boolean;
  questions?: Question[];
  onUpdateQuestions?: (newQuestions: Question[], mode: 'replace' | 'append') => Promise<void> | void;
  onResetQuestions?: () => Promise<void> | void;
  procedureTextConfig?: ProcedureTextConfig;
  onUpdateProcedureText?: (newConfig: ProcedureTextConfig) => Promise<void> | void;
  onResetProcedureText?: () => Promise<void> | void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  submissions,
  violations = [],
  onUnlockViolationRemotely,
  onDeleteViolation,
  onClearAllViolations,
  currentPin,
  onChangePin,
  onClearSubmissions,
  onSeedSampleData,
  onDeleteSubmission,
  onBackToQuiz,
  onAddSubmission,
  onAddBatchSubmissions,
  isDbConnected = true,
  isSyncing = false,
  questions,
  onUpdateQuestions,
  onResetQuestions,
  procedureTextConfig,
  onUpdateProcedureText,
  onResetProcedureText,
}) => {
  const [activeTab, setActiveTab] = useState<'recap' | 'input' | 'analysis' | 'bank' | 'procedure' | 'settings' | 'violations'>('recap');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'score' | 'name' | 'time'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [inspectSubmission, setInspectSubmission] = useState<QuizSubmission | null>(null);

  // Question Bank / Word Import states
  const [isWordImportOpen, setIsWordImportOpen] = useState(false);
  const [isResetQuestionsModalOpen, setIsResetQuestionsModalOpen] = useState(false);
  const [isResettingQuestions, setIsResettingQuestions] = useState(false);
  const [questionBankToastMsg, setQuestionBankToastMsg] = useState<string | null>(null);

  // Manual Question Bank Edit & Delete state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);

  const activeQuestions = useMemo(() => {
    return questions !== undefined ? questions : QUIZ_QUESTIONS;
  }, [questions]);

  // PIN change state
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');

  // Violation monitoring state
  const [violationSearch, setViolationSearch] = useState('');
  const [violationStatusFilter, setViolationStatusFilter] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [unlockingViolationId, setUnlockingViolationId] = useState<string | null>(null);
  const [isClearViolationsModalOpen, setIsClearViolationsModalOpen] = useState(false);
  const [isClearingViolations, setIsClearingViolations] = useState(false);
  const [violationToastMsg, setViolationToastMsg] = useState<string | null>(null);

  // Permanent Delete Modal states
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    studentName: string;
    studentClass: string;
    score: number;
  } | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Handle confirming permanent deletion of single student
  const handleConfirmDeleteSingle = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteSubmission(deleteTarget.id);
      setDeleteToast(`Data ${deleteTarget.studentName} (${deleteTarget.studentClass}) berhasil dihapus permanen dari semua perangkat.`);
      setDeleteTarget(null);
      setTimeout(() => setDeleteToast(null), 4000);
    } catch (err) {
      console.error('Gagal menghapus data permanen:', err);
      alert('Gagal menghapus data dari cloud database. Silakan periksa koneksi dan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle confirming permanent clearing of all students
  const handleConfirmClearAll = async () => {
    setIsDeleting(true);
    try {
      await onClearSubmissions();
      setDeleteToast('Seluruh rekap data siswa berhasil dikosongkan permanen dari semua perangkat.');
      setIsClearAllModalOpen(false);
      setTimeout(() => setDeleteToast(null), 4000);
    } catch (err) {
      console.error('Gagal mengosongkan data permanen:', err);
      alert('Gagal mengosongkan data di cloud database. Silakan periksa koneksi dan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Class list extraction
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => set.add(s.studentClass));
    return ['ALL', ...Array.from(set).sort()];
  }, [submissions]);

  // Filtered and sorted submissions
  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter(s => {
        const matchesClass = selectedClass === 'ALL' || s.studentClass === selectedClass;
        const matchesSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.studentNumber.includes(searchQuery);
        return matchesClass && matchesSearch;
      })
      .sort((a, b) => {
        if (sortField === 'score') {
          return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
        } else if (sortField === 'name') {
          return sortOrder === 'desc' 
            ? b.studentName.localeCompare(a.studentName) 
            : a.studentName.localeCompare(b.studentName);
        } else {
          return sortOrder === 'desc' 
            ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
            : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        }
      });
  }, [submissions, selectedClass, searchQuery, sortField, sortOrder]);

  // Statistical calculations
  const stats = useMemo(() => {
    if (submissions.length === 0) {
      return { total: 0, avgScore: 0, highest: 0, lowest: 0, passedPercent: 0, passedCount: 0 };
    }
    const scores = submissions.map(s => s.score);
    const total = submissions.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round((sum / total) * 10) / 10;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passedCount = submissions.filter(s => s.score >= QUIZ_METADATA.passingScore).length;
    const passedPercent = Math.round((passedCount / total) * 100);

    return { total, avgScore, highest, lowest, passedPercent, passedCount };
  }, [submissions]);

  // Item Analysis (Analisis Butir Soal per Question)
  const itemAnalysis = useMemo(() => {
    return activeQuestions.map(q => {
      if (submissions.length === 0) {
        return { ...q, correctPct: 0, correctCount: 0, total: 0 };
      }
      const correctCount = submissions.filter(s => s.answers[q.id] === q.correctAnswer).length;
      const correctPct = Math.round((correctCount / submissions.length) * 100);
      return { ...q, correctPct, correctCount, total: submissions.length };
    });
  }, [submissions, activeQuestions]);

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    playClickSound();
    if (submissions.length === 0) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += `REKAPITULASI NILAI KUIS BAHASA INGGRIS - KELAS 7 SMP\n`;
    csvContent += `Topik: Procedure Text (Chapter 2: Culinary and Me)\n`;
    csvContent += `Buku: English for Nusantara (Kurikulum Merdeka)\n`;
    csvContent += `Guru Pengampu: ${QUIZ_METADATA.branding}\n`;
    csvContent += `KKM: ${QUIZ_METADATA.passingScore}\n\n`;

    // Headers
    csvContent += `No,Nama Siswa,Kelas,No Absen,Nilai Akhir,Status Kelulusan,Benar,Salah,Durasi (Detik),Tanggal Pengerjaan,` +
      activeQuestions.map(q => `Soal ${q.id} (${q.correctAnswer})`).join(',') + '\n';

    // Data rows
    filteredSubmissions.forEach((s, idx) => {
      const status = s.score >= QUIZ_METADATA.passingScore ? 'TUNTAS' : 'BELUM TUNTAS';
      const dateStr = new Date(s.submittedAt).toLocaleString('id-ID');
      const questionAnswers = activeQuestions.map(q => s.answers[q.id] || '-').join(',');
      csvContent += `${idx + 1},"${s.studentName}","${s.studentClass}","${s.studentNumber}",${s.score},"${status}",${s.correctCount},${s.wrongCount},${s.timeSpentSeconds},"${dateStr}",${questionAnswers}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Nilai_ProcedureText_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    playClickSound();
    if (filteredSubmissions.length === 0) {
      alert('Tidak ada data siswa untuk dicetak pada filter kelas yang dipilih.');
      return;
    }
    executePrintTeacherRecap(filteredSubmissions, selectedClass, stats);
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      setPinChangeMsg('PIN baru minimal harus 4 karakter.');
      return;
    }
    onChangePin(newPinInput.trim());
    setPinChangeMsg(`PIN berhasil diubah menjadi: ${newPinInput.trim()}`);
    setNewPinInput('');
  };

  // Real-time violations derivations
  const lockedViolations = useMemo(() => {
    return violations.filter(v => v.status === 'locked');
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      const q = violationSearch.toLowerCase();
      const matchesSearch =
        !violationSearch.trim() ||
        v.studentName.toLowerCase().includes(q) ||
        v.studentClass.toLowerCase().includes(q) ||
        v.unlockToken.toLowerCase().includes(q);

      const matchesStatus =
        violationStatusFilter === 'all' || v.status === violationStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [violations, violationSearch, violationStatusFilter]);

  const handleCopyViolationToken = (token: string, id: string) => {
    playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(token);
      setCopiedTokenId(id);
      setTimeout(() => setCopiedTokenId(null), 2500);
    }
  };

  const handleRemoteUnlock = async (violationId: string, studentName: string) => {
    if (!onUnlockViolationRemotely) return;
    playClickSound();
    setUnlockingViolationId(violationId);
    try {
      await onUnlockViolationRemotely(violationId);
      playUnlockSuccessSound();
      setViolationToastMsg(`Kunci ujian untuk ${studentName} berhasil dibuka dari dashboard. Siswa dapat melanjutkan di soal terakhirnya.`);
      setTimeout(() => setViolationToastMsg(null), 4500);
    } catch (err) {
      console.error('Error unlocking violation:', err);
    } finally {
      setUnlockingViolationId(null);
    }
  };

  const handleConfirmClearViolations = async () => {
    if (!onClearAllViolations) return;
    setIsClearingViolations(true);
    try {
      await onClearAllViolations();
      setIsClearViolationsModalOpen(false);
      setViolationToastMsg('Seluruh riwayat notifikasi pelanggaran berhasil dibersihkan.');
      setTimeout(() => setViolationToastMsg(null), 4000);
    } catch (err) {
      console.error('Error clearing violations:', err);
    } finally {
      setIsClearingViolations(false);
    }
  };

  const handleConfirmResetQuestions = async () => {
    if (!onResetQuestions) return;
    setIsResettingQuestions(true);
    try {
      await onResetQuestions();
      setIsResetQuestionsModalOpen(false);
      setQuestionBankToastMsg('Bank soal berhasil di-reset ke 10 soal standar buku English for Nusantara.');
      setTimeout(() => setQuestionBankToastMsg(null), 4000);
    } catch (err) {
      console.error('Error resetting questions:', err);
    } finally {
      setIsResettingQuestions(false);
    }
  };

  // Handlers for Question Edit and Delete
  const handleStartEditQuestion = (q: Question) => {
    playClickSound();
    setEditingQuestion(q);
    setIsEditModalOpen(true);
  };

  const handleStartCreateQuestion = () => {
    playClickSound();
    setEditingQuestion(null);
    setIsEditModalOpen(true);
  };

  const handleSaveQuestion = async (savedQuestion: Question) => {
    if (!onUpdateQuestions) return;

    let updatedList: Question[];
    const exists = activeQuestions.some(q => q.id === savedQuestion.id);

    if (exists) {
      updatedList = activeQuestions.map(q => (q.id === savedQuestion.id ? savedQuestion : q));
    } else {
      const newId = activeQuestions.length + 1;
      updatedList = [...activeQuestions, { ...savedQuestion, id: newId }];
    }

    await onUpdateQuestions(updatedList, 'replace');
    const msg = exists
      ? `Soal nomor ${savedQuestion.id} berhasil diperbarui secara permanen!`
      : `Soal baru nomor ${updatedList.length} berhasil ditambahkan secara permanen!`;
    setQuestionBankToastMsg(msg);
    setTimeout(() => setQuestionBankToastMsg(null), 4500);
  };

  const handlePromptDeleteQuestion = (q: Question) => {
    playClickSound();
    setDeletingQuestion(q);
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!deletingQuestion || !onUpdateQuestions) return;

    setIsDeletingQuestion(true);
    try {
      const deletedId = deletingQuestion.id;
      const remaining = activeQuestions
        .filter(q => q.id !== deletedId)
        .map((q, idx) => ({
          ...q,
          id: idx + 1,
        }));

      await onUpdateQuestions(remaining, 'replace');
      playUnlockSuccessSound();
      setDeletingQuestion(null);
      setQuestionBankToastMsg(`Soal nomor ${deletedId} berhasil dihapus secara permanen dari bank soal.`);
      setTimeout(() => setQuestionBankToastMsg(null), 4500);
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Gagal menghapus soal. Silakan coba kembali.');
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  // Menu Hapus Permanen handlers (Batch & Wipe All)
  const handleDeleteSelectedQuestions = async (selectedIds: number[]) => {
    if (!onUpdateQuestions) return;
    const remaining = activeQuestions
      .filter((q) => !selectedIds.includes(q.id))
      .map((q, idx) => ({
        ...q,
        id: idx + 1,
      }));

    await onUpdateQuestions(remaining, 'replace');
    setQuestionBankToastMsg(`${selectedIds.length} butir soal berhasil dihapus secara permanen dari bank soal.`);
    setTimeout(() => setQuestionBankToastMsg(null), 4500);
  };

  const handleClearAllQuestions = async (resetToDefault: boolean) => {
    if (resetToDefault) {
      if (onResetQuestions) {
        await onResetQuestions();
      }
      setQuestionBankToastMsg('Bank soal berhasil di-reset permanen ke 10 butir soal standar.');
    } else {
      if (onUpdateQuestions) {
        await onUpdateQuestions([], 'replace');
      }
      setQuestionBankToastMsg('Seluruh butir bank soal berhasil dikosongkan secara permanen (0 butir).');
    }
    setTimeout(() => setQuestionBankToastMsg(null), 4500);
  };

  return (
    <div className="py-4 sm:py-8 max-w-6xl mx-auto px-3.5 sm:px-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-4.5 sm:p-8 shadow-xl border border-slate-800 mb-6 sm:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
              <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{QUIZ_METADATA.branding}</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border ${
              isDbConnected 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {isDbConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cloud Database: Sinkron Lintas Perangkat</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Menghubungkan Database Cloud...</span>
                </>
              )}
            </div>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
            Dashboard Guru: Rekap &amp; Penilaian
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Kuis: <strong>Interactive English Quiz: Introducing My self and other</strong> &bull; Materi <strong>Procedure Text (Culinary and Me)</strong> &bull; Buku Siswa <em>English for Nusantara</em> Kelas 7 SMP
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={onBackToQuiz}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Kembali ke Halaman Kuis</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Peserta</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.total} <span className="text-xs font-normal text-slate-500">Siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Nilai</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats.avgScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ketuntasan (KKM &ge;75)</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            {stats.passedPercent}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats.passedCount} dari {stats.total} tuntas
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Nilai Tertinggi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {stats.highest}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Nilai Terendah</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-700">
            {stats.lowest}
          </div>
        </div>
      </div>

      {/* Live Feedback Toast */}
      {violationToastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{violationToastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setViolationToastMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Real-time Emergency Warning Alert: Siswa Sedang Terkunci */}
      {lockedViolations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider animate-pulse">
                  Peringatan Pelanggaran CBT
                </span>
                <span className="font-bold text-xs text-rose-800">
                  {lockedViolations.length} Siswa Terkunci Otomatis
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                Siswa terdeteksi membuka tab atau aplikasi lain. Kuis otomatis tertutup dan menunggu token pembuka kunci.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
            {lockedViolations[0] && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-rose-300 text-xs font-mono font-bold text-slate-800">
                <span>{lockedViolations[0].studentName.split(' ')[0]}:</span>
                <span className="text-rose-700 font-extrabold">{lockedViolations[0].unlockToken}</span>
                <button
                  type="button"
                  onClick={() => handleCopyViolationToken(lockedViolations[0].unlockToken, lockedViolations[0].id)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                  title="Salin Token"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('violations');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>Lihat Log &amp; Buka Kunci ({lockedViolations.length}) &rarr;</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Tabs Navigation (Horizontally scrollable on mobile for sleek touch experience) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-slate-200 mb-5 sm:mb-6 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('recap');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'recap'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Rekap Nilai ({filteredSubmissions.length})</span>
          </button>

          {/* Violations Tab Button with Red Live Pulse Indicator */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('violations');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'violations'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${lockedViolations.length > 0 ? (activeTab === 'violations' ? 'text-white' : 'text-rose-600 animate-pulse') : 'text-slate-400'}`} />
            <span>Notifikasi Pelanggaran</span>
            {lockedViolations.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                {lockedViolations.length} Terkunci
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'violations' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {violations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('input');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'input'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Input Siswa</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              activeTab === 'input' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              Baru
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('analysis');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'analysis'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analisis Butir Soal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('bank');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'bank'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bank Soal ({activeQuestions.length})</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              activeTab === 'bank' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              Word
            </span>
          </button>

          {/* Edit Procedure Text Tab Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('procedure');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'procedure'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Edit Procedure Text</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              activeTab === 'procedure' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              {(procedureTextConfig?.texts || INITIAL_PROCEDURE_TEXT_CONFIG.texts).length} Teks
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('settings');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Pengaturan PIN</span>
          </button>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            title="Download file Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Cetak Laporan Penilaian"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Tab 1: REKAP NILAI SISWA */}
      {activeTab === 'recap' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau no absen..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Class selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Kelas:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden text-xs"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}</option>
                  ))}
                </select>
              </div>

              {/* Sort field */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Urutkan:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as 'score' | 'name' | 'time')}
                  className="py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                >
                  <option value="score">Nilai</option>
                  <option value="name">Nama Siswa</option>
                  <option value="time">Waktu Kuis</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-bold"
                >
                  {sortOrder === 'desc' ? 'Tertinggi' : 'Terendah'}
                </button>
              </div>
            </div>

            {/* Seed & Clear Data Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('input');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Input data siswa baru secara manual atau impor"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Input Data Siswa</span>
              </button>

              <button
                type="button"
                onClick={onSeedSampleData}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Muat contoh data peserta dari karakter buku English for Nusantara"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Simulasi</span>
              </button>

              {submissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsClearAllModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs transition-colors cursor-pointer"
                  title="Kosongkan Semua Data Nilai Secara Permanen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-base">Belum Ada Data Siswa</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Siswa yang telah menyelesaikan kuis akan otomatis tercatat di sini, atau Anda dapat menginput nilai siswa secara manual melalui formulir input guru.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('input');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Input Data Siswa Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={onSeedSampleData}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Muat Data Simulasi Karakter Buku</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Nama Lengkap Siswa</th>
                      <th className="py-3.5 px-3">Kelas</th>
                      <th className="py-3.5 px-3 text-center">Absen</th>
                      <th className="py-3.5 px-4 text-center">Nilai Akhir</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Benar / Salah</th>
                      <th className="py-3.5 px-4 text-center">Durasi</th>
                      <th className="py-3.5 px-4">Waktu Selesai</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSubmissions.map((sub, idx) => {
                      const isTuntas = sub.score >= QUIZ_METADATA.passingScore;
                      const dateFormatted = new Date(sub.submittedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                      });

                      return (
                        <tr key={sub.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{sub.studentName}</div>
                            {Boolean(sub.violationsCount && sub.violationsCount > 0) && (
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setViolationSearch(sub.studentName);
                                  setActiveTab('violations');
                                }}
                                className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer transition-colors"
                                title="Lihat rincian riwayat pelanggaran siswa ini di tab Notifikasi Pelanggaran"
                              >
                                <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{sub.violationsCount}x Terkunci (Pindah Tab) &rarr;</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                              {sub.studentClass}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            {sub.studentNumber}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                              isTuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {sub.score}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {isTuntas ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                TUNTAS
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                REMEDIAL
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold">
                            <span className="text-emerald-700">{sub.correctCount}</span> / <span className="text-rose-600">{sub.wrongCount}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                            {Math.floor(sub.timeSpentSeconds / 60)}m {sub.timeSpentSeconds % 60}s
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {dateFormatted}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  executePrintStudentScore(
                                    { name: sub.studentName, studentClass: sub.studentClass, studentNumber: sub.studentNumber },
                                    sub
                                  );
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                                title="Cetak Lembar Bukti Nilai Siswa Ini"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectSubmission(sub)}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                                title="Lihat Lembar Jawaban Siswa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setDeleteTarget({
                                    id: sub.id,
                                    studentName: sub.studentName,
                                    studentClass: sub.studentClass,
                                    score: sub.score,
                                  });
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Permanen Data Siswa Ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: INPUT DATA SISWA */}
      {activeTab === 'input' && (
        <TeacherInputStudent
          onAddSubmission={onAddSubmission}
          onAddBatchSubmissions={onAddBatchSubmissions}
          onViewRecap={() => setActiveTab('recap')}
          existingClasses={availableClasses}
        />
      )}

      {/* Tab 2: ANALISIS BUTIR SOAL */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Analisis Tingkat Penguasaan Materi (10 Butir Soal)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Membantu guru mengidentifikasi materi yang telah dikuasai vs indikator yang memerlukan remedial/pengayaan.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-100 text-amber-800">
                Berdasarkan {submissions.length} Peserta Didik
              </span>
            </div>

            <div className="space-y-4">
              {itemAnalysis.map((item, i) => {
                const isChallenging = item.correctPct < 60;
                const isMastered = item.correctPct >= 80;

                return (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 shrink-0 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {item.topic}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                            {item.question}
                          </p>
                          <span className="text-[11px] text-amber-800 italic mt-0.5 block">
                            Kunci: {item.correctAnswer} &bull; {item.unitReference}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm sm:text-base font-black ${
                          isMastered ? 'text-emerald-700' : isChallenging ? 'text-rose-700' : 'text-amber-700'
                        }`}>
                          {item.correctPct}%
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          ({item.correctCount}/{item.total} Benar)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all ${
                          isMastered ? 'bg-emerald-500' : isChallenging ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.correctPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: KISI-KISI & BANK SOAL (WORD IMPORT) */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Quick Word Import Hero Action Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-100 font-bold text-xs border border-white/30">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Fitur Guru: Import Bank Soal Format Word (.docx)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                  Kelola &amp; Masukkan Soal Langsung dari Dokumen Word
                </h3>
                <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                  Guru dapat mengunggah file <strong>.docx</strong> atau menyalin teks soal ujian. Sistem otomatis mengenali nomor soal, pilihan A-D, kunci jawaban (KUNCI: A/B/C/D), pembahasan, dan audio listening.
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs text-amber-200">
                  <span className="font-bold bg-black/20 px-2.5 py-1 rounded-lg border border-white/20">
                    Total Soal Aktif: {activeQuestions.length} Butir
                  </span>
                  {activeQuestions !== QUIZ_QUESTIONS && (
                    <span className="bg-emerald-500/30 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300/40 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Custom Bank Soal Aktif
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsWordImportOpen(true);
                  }}
                  className="px-5 py-3 rounded-2xl bg-white text-amber-900 hover:bg-amber-50 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>Import Bank Soal (Word)</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartCreateQuestion}
                  className="px-4 py-2.5 rounded-2xl bg-amber-700/90 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-200" />
                  <span>+ Tambah Soal Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsPermanentDeleteModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 border border-rose-400/40 active:scale-95 transition-all cursor-pointer shadow-md hover:shadow-lg"
                >
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <span>Menu Hapus Permanen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    downloadWordCompatibleDoc(activeQuestions, 'Bank_Soal_English_for_Nusantara');
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-amber-800/80 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen Word (.doc)</span>
                </button>

                {activeQuestions !== QUIZ_QUESTIONS && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsResetQuestionsModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-black/30 hover:bg-black/40 text-rose-100 font-bold text-xs flex items-center justify-center gap-2 border border-rose-300/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Soal Standar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Kisi-kisi Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Kisi-kisi &amp; Capaian Pembelajaran (CP Fase D)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Penyusunan instrumen tes mengacu pada Kurikulum Merdeka SMP Kelas 7, Mata Pelajaran Bahasa Inggris, Buku <em>English for Nusantara</em>, Chapter 2 (Culinary and Me).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartCreateQuestion}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Soal Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsWordImportOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import File Word</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsPermanentDeleteModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Menu Hapus Permanen</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <h4 className="font-bold text-amber-900 mb-1.5">Tujuan Pembelajaran (Learning Objectives):</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Mengidentifikasi fungsi sosial teks prosedur (to explain how to make/do something).</li>
                  <li>Menentukan struktur teks resep makanan (Goal, Ingredients, Tools, Steps).</li>
                  <li>Mengenali kosakata peralatan dapur (cooking utensils: pan, spatula, sieve, peeler).</li>
                  <li>Menganalisis kata kerja instruksi (action verbs: peel, slice, pour, stir, fry, drain).</li>
                  <li>Menggunakan kata penghubung urutan waktu (sequence adverbs: first, then, finally).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-1.5">Karakteristik Teks Rujukan Buku:</h4>
                <p className="text-slate-700 leading-relaxed">
                  Teks resep dan latihan diambil langsung dari konteks Unit 1 (My Favorite Food), Unit 2 (My Favorite Snack - Galang's Banana Fritters), dan Unit 3 (A Secret Recipe - Sweet Potato Fritters &amp; Warm Sweet Tea) pada buku siswa resmi.
                </p>
              </div>
            </div>

            {/* List of Active Questions */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-800">
                    Daftar {activeQuestions.length} Soal &amp; Kunci Jawaban Lengkap:
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                    {activeQuestions.length} Butir
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleStartCreateQuestion}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                    <span>+ Tambah Soal Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsPermanentDeleteModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus Permanen Massal</span>
                  </button>
                  <span className="text-xs text-slate-500 hidden md:inline">
                    Kunci jawaban ditandai warna hijau
                  </span>
                </div>
              </div>

              {activeQuestions.length === 0 ? (
                <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <Trash2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-800">Bank Soal Saat Ini Kosong (0 Butir)</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Semua butir soal telah dihapus permanen. Anda dapat mengimpor bank soal dari file Word, menambahkan butir soal manual, atau mengembalikan ke 10 soal standar kurikulum.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWordImportOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import Bank Soal (Word)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCreateQuestion}
                      className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4 text-amber-600" />
                      <span>+ Tambah Soal Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsResetQuestionsModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-600" />
                      <span>Kembalikan ke 10 Soal Standar</span>
                    </button>
                  </div>
                </div>
              ) : (
                activeQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 transition-colors text-xs space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">
                        {q.topic}
                      </span>
                      {q.hasAudio && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center gap-1 text-[10px]">
                          <Headphones className="w-3 h-3 text-amber-700" />
                          <span>Audio Listening</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200">
                        Kunci: {q.correctAnswer}
                      </span>

                      {/* Tombol Tanda Pensil Edit Soal */}
                      <button
                        type="button"
                        onClick={() => handleStartEditQuestion(q)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title={`Edit Soal Nomor ${idx + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                        <span>Edit</span>
                      </button>

                      {/* Tombol Hapus Permanen */}
                      <button
                        type="button"
                        onClick={() => handlePromptDeleteQuestion(q)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title={`Hapus Soal Nomor ${idx + 1} Secara Permanen`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus Permanen</span>
                      </button>
                    </div>
                  </div>

                  {q.contextText && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                      <span className="font-bold text-slate-900 block mb-1">
                        {q.contextTitle || 'Teks Rujukan:'}
                      </span>
                      <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                        {q.contextText}
                      </p>
                    </div>
                  )}

                  <p className="text-slate-800 font-semibold text-xs leading-relaxed">
                    {q.question}
                  </p>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map(opt => {
                      const isCorrect = opt.key === q.correctAnswer;
                      return (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-xs leading-snug">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong className="not-italic text-slate-700 font-semibold">Pembahasan:</strong> {q.explanation}
                  </p>
                </div>
              )))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: EDIT PROCEDURE TEXT */}
      {activeTab === 'procedure' && (
        <ProcedureTextEditor
          config={procedureTextConfig || INITIAL_PROCEDURE_TEXT_CONFIG}
          onSaveConfig={onUpdateProcedureText || (() => {})}
          onResetToDefault={onResetProcedureText || (() => {})}
          onAddQuestionToBank={async (q) => {
            if (onUpdateQuestions) {
              const newQuestions = [...activeQuestions, { ...q, id: activeQuestions.length + 1 }];
              await onUpdateQuestions(newQuestions, 'replace');
            }
          }}
          isDbConnected={isDbConnected}
        />
      )}

      {/* Tab 4: PENGATURAN PIN & DATABASE CLOUD */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          {/* Card 1: Cloud Database Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Sinkronisasi Database Cloud</h3>
                <p className="text-xs text-slate-500">Firebase Firestore Lintas Perangkat</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Status Koneksi:</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  {isDbConnected ? 'Tersambung Real-time' : 'Menghubungkan...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Data Tersimpan:</span>
                <span className="font-bold text-slate-900">{submissions.length} Nilai Siswa</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed pt-1 border-t border-emerald-200/60">
                Data siswa yang menyelesaikan kuis otomatis tersimpan di cloud database sehingga dapat langsung dipantau dari laptop guru, HP pengawas, maupun proyektor sekolah tanpa perlu transfer manual.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onSeedSampleData();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-300 text-amber-900 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Muat data contoh siswa ke database cloud"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>Muat Data Contoh ke Cloud</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsClearAllModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus semua data siswa secara permanen dari database cloud"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Kosongkan Semua Data Permanen</span>
              </button>
            </div>
          </div>

          {/* Card 2: Pengaturan PIN Guru */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ubah PIN Akses Dashboard</h3>
                <p className="text-xs text-slate-500">PIN tersinkronisasi otomatis ke semua perangkat</p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIN Saat Ini:
                </label>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 font-mono text-sm font-bold border border-slate-200">
                  {currentPin}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Masukkan PIN Baru (Minimal 4 Angka/Karakter):
                </label>
                <input
                  type="text"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Contoh: 7788 atau 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-hidden"
                />
              </div>

              {pinChangeMsg && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  {pinChangeMsg}
                </p>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Simpan PIN Baru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 5: NOTIFIKASI & LOG PELANGGARAN ANTI-CURANG */}
      {activeTab === 'violations' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    Notifikasi &amp; Log Pelanggaran Anti-Curang CBT
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Memantau siswa yang keluar jendela/aplikasi secara langsung. Anda dapat menyalin token pembuka atau membuka kunci kuis siswa dari sini.
                  </p>
                </div>
              </div>

              {violations.length > 0 && onClearAllViolations && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsClearViolationsModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Riwayat Log</span>
                </button>
              )}
            </div>

            {/* Sub-KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Kejadian
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-800">
                  {violations.length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                  Sedang Terkunci
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-700">
                  {lockedViolations.length} Siswa
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Telah Dibuka / Diizinkan
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {violations.length - lockedViolations.length} Siswa
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  value={violationSearch}
                  onChange={(e) => setViolationSearch(e.target.value)}
                  placeholder="Cari nama siswa, kelas, atau token..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: `Semua (${violations.length})` },
                  { id: 'locked', label: `Terkunci (${lockedViolations.length})` },
                  { id: 'unlocked', label: `Sudah Dibuka (${violations.length - lockedViolations.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setViolationStatusFilter(f.id as 'all' | 'locked' | 'unlocked');
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      violationStatusFilter === f.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Violations List Cards */}
          {filteredViolations.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 text-center shadow-2xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">
                {violations.length === 0 
                  ? 'Belum Ada Pelanggaran yang Terdeteksi' 
                  : 'Tidak Ditemukan Data yang Sesuai Filter'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {violations.length === 0
                  ? 'Semua siswa mengerjakan ujian dengan tertib dan fokus di layar CBT tanpa membuka tab lain.'
                  : 'Cobalah ubah kata kunci pencarian atau ubah filter status di atas.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredViolations.map((v) => {
                const isLocked = v.status === 'locked';
                const isCopied = copiedTokenId === v.id;
                const isUnlocking = unlockingViolationId === v.id;
                const timeFormatted = new Date(v.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  day: 'numeric',
                  month: 'short'
                });

                return (
                  <div
                    key={v.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isLocked
                        ? 'bg-rose-50/40 border-rose-300 shadow-xs ring-1 ring-rose-300'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Name, Class & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-slate-900">
                            {v.studentName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                            Kelas {v.studentClass} • Absen {v.studentNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{timeFormatted} WIB</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 ${
                        isLocked
                          ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {isLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Terkunci</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sudah Dibuka</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Violation Information */}
                    <div className="bg-white/80 rounded-xl p-3 border border-slate-200/80 mb-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Posisi Ujian:</span>
                        <span className="font-bold text-slate-900">
                          Terkunci di Soal #{v.questionNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Frekuensi:</span>
                        <span className="font-bold text-rose-700">
                          Pelanggaran ke-{v.violationCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Token CBT Siswa:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                            {v.unlockToken}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyViolationToken(v.unlockToken, v.id)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isCopied ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'
                            }`}
                            title="Salin Token"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {onDeleteViolation && (
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            onDeleteViolation(v.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Hapus log ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Log</span>
                        </button>
                      )}

                      {isLocked ? (
                        <button
                          type="button"
                          disabled={isUnlocking}
                          onClick={() => handleRemoteUnlock(v.id, v.studentName)}
                          className="ml-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isUnlocking ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Membuka Kunci...</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Buka Kunci untuk Siswa</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="ml-auto text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Ujian Sedang Dilanjutkan</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inspect Student Answer Sheet Modal */}
      {inspectSubmission && (
        <ReviewModal
          studentAnswers={inspectSubmission.answers}
          studentName={`${inspectSubmission.studentName} (${inspectSubmission.studentClass})`}
          score={inspectSubmission.score}
          onClose={() => setInspectSubmission(null)}
        />
      )}

      {/* Modal 1: Hapus Permanen Data Siswa Tunggal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Hapus Nilai Siswa Secara Permanen?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Data nilai peserta didik <strong className="text-slate-900">{deleteTarget.studentName}</strong> (Kelas {deleteTarget.studentClass} - Nilai {deleteTarget.score}) akan dihapus secara permanen dari server Cloud Firestore.
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl mb-5 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian:</strong> Data ini akan langsung terhapus permanen dan <strong>tidak akan muncul lagi</strong> di laptop guru, HP pengawas, maupun perangkat lain.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    playClickSound();
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    playClickSound();
                    handleConfirmDeleteSingle();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menghapus dari Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Hapus Permanen</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Kosongkan Seluruh Data Nilai Permanen */}
      <AnimatePresence>
        {isClearAllModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Kosongkan Semua Rekap Nilai Siswa?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Seluruh <strong>{submissions.length} data nilai siswa</strong> akan dihapus permanen dari server Cloud Firestore.
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl mb-5 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian:</strong> Semua perangkat yang terhubung ke database online ini akan langsung disinkronkan menjadi kosong dan data yang dihapus tidak dapat dipulihkan kembali.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    playClickSound();
                    setIsClearAllModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    playClickSound();
                    handleConfirmClearAll();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengosongkan Database...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Kosongkan Permanen</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Bersihkan Riwayat Notifikasi Pelanggaran */}
      <AnimatePresence>
        {isClearViolationsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Bersihkan Riwayat Notifikasi Pelanggaran?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Seluruh <strong>{violations.length} catatan log pelanggaran</strong> akan dihapus dari server Cloud Firestore. Data nilai kuis siswa tetap aman tersimpan.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isClearingViolations}
                  onClick={() => {
                    playClickSound();
                    setIsClearViolationsModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isClearingViolations}
                  onClick={handleConfirmClearViolations}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isClearingViolations ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Membersihkan...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Bersihkan Semua Log</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Success Toast */}
      <AnimatePresence>
        {deleteToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold max-w-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word Question Import Modal */}
      <WordImportModal
        isOpen={isWordImportOpen}
        onClose={() => setIsWordImportOpen(false)}
        currentQuestionCount={activeQuestions.length}
        onApplyQuestions={async (newQuestions, mode) => {
          if (onUpdateQuestions) {
            await onUpdateQuestions(newQuestions, mode);
            const msg = mode === 'replace'
              ? `Berhasil memperbarui bank soal dengan ${newQuestions.length} butir soal dari dokumen Word!`
              : `Berhasil menambahkan ${newQuestions.length} butir soal baru ke bank soal!`;
            setQuestionBankToastMsg(msg);
            setTimeout(() => setQuestionBankToastMsg(null), 5000);
          }
        }}
      />

      {/* Modal: Edit / Tambah Soal Manual (Tanda Pensil) */}
      <QuestionEditModal
        isOpen={isEditModalOpen}
        question={editingQuestion}
        totalQuestions={activeQuestions.length}
        onSave={handleSaveQuestion}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingQuestion(null);
        }}
      />

      {/* Modal: Menu Hapus Permanen Bank Soal (Batch & Wipe All) */}
      <PermanentDeleteModal
        isOpen={isPermanentDeleteModalOpen}
        questions={activeQuestions}
        currentPin={currentPin}
        onDeleteSelected={handleDeleteSelectedQuestions}
        onClearAll={handleClearAllQuestions}
        onClose={() => setIsPermanentDeleteModalOpen(false)}
      />

      {/* Modal: Hapus Soal Secara Permanen di Setiap Butir Soal */}
      <AnimatePresence>
        {deletingQuestion && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Hapus Soal Nomor {deletingQuestion.id} Permanen?
              </h3>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 my-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1 line-clamp-2">
                  "{deletingQuestion.question}"
                </p>
                <span className="text-[11px] text-slate-500">
                  Topik: {deletingQuestion.topic} • Kunci: {deletingQuestion.correctAnswer}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Soal ini akan dihapus secara <strong>permanen</strong> dari Cloud Firestore dan cache lokal. Urutan nomor butir soal lainnya akan otomatis disesuaikan secara berurutan.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingQuestion}
                  onClick={() => {
                    playClickSound();
                    setDeletingQuestion(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingQuestion}
                  onClick={handleConfirmDeleteQuestion}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingQuestion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menghapus Permanen...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Hapus Permanen</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Reset Bank Soal ke Standar */}
      <AnimatePresence>
        {isResetQuestionsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Reset Bank Soal ke Standar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Bank soal aktif akan dikembalikan ke <strong>10 butir soal asli Kurikulum Merdeka (English for Nusantara Chapter 2: Culinary and Me)</strong>. Perubahan ini juga akan disinkronisasikan ke seluruh siswa secara otomatis.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isResettingQuestions}
                  onClick={() => {
                    playClickSound();
                    setIsResetQuestionsModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isResettingQuestions}
                  onClick={handleConfirmResetQuestions}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isResettingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mereset Soal...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Ya, Kembalikan ke Standar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Question Bank Floating Toast */}
      <AnimatePresence>
        {questionBankToastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 bg-amber-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-700 flex items-center gap-3 text-xs font-semibold max-w-md"
          >
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="leading-snug">{questionBankToastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
