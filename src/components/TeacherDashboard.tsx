import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Plus,
  Sliders,
  Image as ImageIcon,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderDown,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { QuizSubmission, QuizViolationRecord, Question, ProcedureTextConfig, StudentRestrictionConfig, DashboardBackgroundConfig } from '../types';
import {
  ALL_CLASS_LIST,
  QUIZ_QUESTIONS,
  QUIZ_METADATA,
  INITIAL_STUDENT_SUBMISSIONS,
  INITIAL_PROCEDURE_TEXT_CONFIG,
  INITIAL_STUDENT_RESTRICTION_CONFIG,
  INITIAL_REGISTERED_STUDENTS,
  detectCrossClassDuplicateSubmissions,
  hasStudentSubmittedQuiz,
  getSubmissionAssessmentStatus,
  normalizeStudentName,
  normalizeStudentClass,
  normalizeStudentNumber,
  isPlaceholderStudentName,
  isTeacherManualRosterSubmission,
  downloadStudentImportTemplateExcel,
  downloadStudentImportTemplateCsv,
} from '../data/quizData';
import { ReviewModal } from './ReviewModal';
import { TeacherInputStudent } from './TeacherInputStudent';
import { WordImportModal } from './WordImportModal';
import { QuestionEditModal } from './QuestionEditModal';
import { PermanentDeleteModal } from './PermanentDeleteModal';
import { ProcedureTextEditor } from './ProcedureTextEditor';
import { StudentRestrictionPanel } from './StudentRestrictionPanel';
import { DashboardBackgroundManager } from './DashboardBackgroundManager';
import { INITIAL_DASHBOARD_BACKGROUND_CONFIG, resolveActiveBackgroundImageUrl } from '../utils/dashboardBackground';
import { downloadWordCompatibleDoc } from '../utils/wordQuestionParser';
import { playClickSound, playUnlockSuccessSound, playViolationAlertSound } from '../utils/audio';
import {
  executePrintStudentScore,
  executePrintTeacherRecap,
  openTeacherRecapInNewTab,
  downloadTeacherRecapExcelWordStyle,
  downloadTeacherRecapWordDoc,
  downloadTeacherRecapCsv,
  PrintDocumentOptions,
} from '../utils/printReport';

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
  studentRestrictions?: StudentRestrictionConfig;
  onUpdateStudentRestrictions?: (newConfig: StudentRestrictionConfig) => Promise<void> | void;
  onResetStudyModuleViews?: () => void;
  dashboardBackground?: DashboardBackgroundConfig;
  onUpdateDashboardBackground?: (newConfig: DashboardBackgroundConfig) => Promise<void> | void;
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
  studentRestrictions = INITIAL_STUDENT_RESTRICTION_CONFIG,
  onUpdateStudentRestrictions,
  onResetStudyModuleViews,
  dashboardBackground = INITIAL_DASHBOARD_BACKGROUND_CONFIG,
  onUpdateDashboardBackground,
}) => {
  const [activeTab, setActiveTab] = useState<'recap' | 'input' | 'analysis' | 'bank' | 'procedure' | 'restrictions' | 'background' | 'settings' | 'violations'>('recap');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showKpiSummary, setShowKpiSummary] = useState(true);
  const [sidebarTemplateClass, setSidebarTemplateClass] = useState<string>('7G');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'absen' | 'score' | 'name' | 'time'>('absen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [inspectSubmission, setInspectSubmission] = useState<QuizSubmission | null>(null);

  // Word-style Excel & Print Preview states
  const [recapViewMode, setRecapViewMode] = useState<'table' | 'word_print'>('table');
  const [isRecapPrintModalOpen, setIsRecapPrintModalOpen] = useState(false);
  const [recapPaperSize, setRecapPaperSize] = useState<'A4' | 'F4' | 'Letter'>('A4');
  const [recapIsLandscape, setRecapIsLandscape] = useState<boolean>(false);
  const [recapColorMode, setRecapColorMode] = useState<'color' | 'grayscale'>('color');
  const [recapIncludeQuestionCols, setRecapIncludeQuestionCols] = useState<boolean>(false);

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
      if (deleteTarget.id.startsWith('reg-unsub-')) {
        const regId = deleteTarget.id.replace(/^reg-unsub-/, '');
        if (onUpdateStudentRestrictions) {
          const currentReg = studentRestrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
          await onUpdateStudentRestrictions({
            ...studentRestrictions,
            registeredStudents: currentReg.filter(
              r => r.id !== regId && normalizeStudentName(r.name) !== normalizeStudentName(deleteTarget.studentName)
            ),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        await onDeleteSubmission(deleteTarget.id);
      }
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

  // Combine submissions with registered students who haven't taken the quiz yet (scoped by class + roll number / name)
  const allStudentRecords = useMemo(() => {
    const mapByKey = new Map<string, QuizSubmission>();
    const unsubmittedSlotToKey = new Map<string, string>();

    submissions.forEach(sub => {
      if (isPlaceholderStudentName(sub.studentName)) return;
      const norm = normalizeStudentName(sub.studentName);
      if (!norm) return;
      const cls = normalizeStudentClass(sub.studentClass) || '7A';
      const numPad = (normalizeStudentNumber(sub.studentNumber) || '1').padStart(2, '0');
      const slotKey = `${cls}__${numPad}`;
      const key = `${cls}__${norm}`;
      const normalizedSub: QuizSubmission = {
        ...sub,
        studentName: sub.studentName.trim(),
        studentClass: cls,
        studentNumber: numPad,
      };
      const isSub = hasStudentSubmittedQuiz(normalizedSub);

      // If another unsubmitted manual roster record occupies the same (class, absen) slot, prefer deterministic sub-roster-* or newer record
      if (!isSub && unsubmittedSlotToKey.has(slotKey)) {
        const prevKey = unsubmittedSlotToKey.get(slotKey)!;
        const prevItem = mapByKey.get(prevKey);
        if (prevItem && !hasStudentSubmittedQuiz(prevItem)) {
          const preferCurrent =
            normalizedSub.id.startsWith('sub-roster-') ||
            new Date(normalizedSub.submittedAt || 0).getTime() >=
              new Date(prevItem.submittedAt || 0).getTime();
          if (preferCurrent) {
            mapByKey.delete(prevKey);
          } else {
            return;
          }
        }
      }

      const existing = mapByKey.get(key);
      if (!existing) {
        mapByKey.set(key, normalizedSub);
        if (!isSub) unsubmittedSlotToKey.set(slotKey, key);
      } else {
        const existingSub = hasStudentSubmittedQuiz(existing);
        if (isSub && !existingSub) {
          mapByKey.set(key, normalizedSub);
        } else if (isSub && existingSub && normalizedSub.score > existing.score) {
          mapByKey.set(key, normalizedSub);
        }
      }
    });

    const defaultIds = new Set(INITIAL_REGISTERED_STUDENTS.map(r => r.id));
    const registeredList = studentRestrictions.registeredStudents ?? INITIAL_REGISTERED_STUDENTS;
    registeredList.forEach(reg => {
      if (submissions.length === 0 && defaultIds.has(reg.id)) return;
      if (isPlaceholderStudentName(reg.name)) return;
      const norm = normalizeStudentName(reg.name);
      if (!norm) return;
      const cls = normalizeStudentClass(reg.studentClass) || '7A';
      const numPad = (normalizeStudentNumber(reg.studentNumber) || '1').padStart(2, '0');
      const slotKey = `${cls}__${numPad}`;
      const key = `${cls}__${norm}`;
      if (mapByKey.has(key)) return;

      // If an old unsubmitted manual entry is at the same (class, absen) slot, update its name to match the registered student
      if (unsubmittedSlotToKey.has(slotKey)) {
        const prevKey = unsubmittedSlotToKey.get(slotKey)!;
        const prevItem = mapByKey.get(prevKey);
        if (prevItem && !hasStudentSubmittedQuiz(prevItem) && isTeacherManualRosterSubmission(prevItem)) {
          mapByKey.delete(prevKey);
        }
      }

      mapByKey.set(key, {
        id: `reg-unsub-${reg.id}`,
        studentName: reg.name.trim(),
        studentClass: cls,
        studentNumber: numPad,
        score: 0,
        totalQuestions: activeQuestions.length,
        correctCount: 0,
        wrongCount: 0,
        answers: {},
        timeSpentSeconds: 0,
        submittedAt: '',
        hasSubmitted: false,
      });
      unsubmittedSlotToKey.set(slotKey, key);
    });

    return Array.from(mapByKey.values());
  }, [submissions, studentRestrictions.registeredStudents, activeQuestions.length]);

  const classStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allStudentRecords.forEach(s => {
      const cls = normalizeStudentClass(s.studentClass) || '7A';
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return counts;
  }, [allStudentRecords]);

  // Class list extraction (always includes 7A-7H so Class 7G is always accessible)
  const availableClasses = useMemo(() => {
    const set = new Set<string>(ALL_CLASS_LIST);
    allStudentRecords.forEach(s => {
      const cls = normalizeStudentClass(s.studentClass) || s.studentClass;
      if (cls) set.add(cls);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [allStudentRecords]);

  // Detect any user name used in 2 classes where one is not registered in the Student/Teacher Database
  const crossClassConflicts = useMemo(
    () => detectCrossClassDuplicateSubmissions(submissions, studentRestrictions),
    [submissions, studentRestrictions]
  );

  // Filtered and sorted submissions
  const filteredSubmissions = useMemo(() => {
    return allStudentRecords
      .filter(s => {
        const normCls = normalizeStudentClass(s.studentClass) || s.studentClass;
        const matchesClass = selectedClass === 'ALL' || normCls === selectedClass || s.studentClass === selectedClass;
        const matchesSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.studentNumber.includes(searchQuery);
        return matchesClass && matchesSearch;
      })
      .sort((a, b) => {
        if (sortField === 'absen') {
          const classCompare = (normalizeStudentClass(a.studentClass) || a.studentClass).localeCompare(
            normalizeStudentClass(b.studentClass) || b.studentClass
          );
          if (selectedClass === 'ALL' && classCompare !== 0) return classCompare;
          const numA = parseInt(String(a.studentNumber).replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.studentNumber).replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
          }
          if (classCompare !== 0) return classCompare;
          return a.studentName.localeCompare(b.studentName);
        } else if (sortField === 'score') {
          const subA = hasStudentSubmittedQuiz(a);
          const subB = hasStudentSubmittedQuiz(b);
          if (subA !== subB) return subA ? -1 : 1; // Always put submitted before unsubmitted
          if (!subA && !subB) return a.studentName.localeCompare(b.studentName);
          return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
        } else if (sortField === 'name') {
          return sortOrder === 'desc' 
            ? b.studentName.localeCompare(a.studentName) 
            : a.studentName.localeCompare(b.studentName);
        } else {
          const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        }
      });
  }, [allStudentRecords, selectedClass, searchQuery, sortField, sortOrder]);

  // Statistical calculations (only count submitted students for score averages & remedial; unsubmitted are NOT given 0 or remedial)
  const stats = useMemo(() => {
    const total = allStudentRecords.length;
    const submittedList = allStudentRecords.filter(s => hasStudentSubmittedQuiz(s));
    const submittedCount = submittedList.length;
    const unsubmittedCount = total - submittedCount;
    if (submittedCount === 0) {
      return {
        total,
        submittedCount: 0,
        unsubmittedCount,
        remedialCount: 0,
        avgScore: 0,
        highest: 0,
        lowest: 0,
        passedPercent: 0,
        passedCount: 0,
      };
    }
    const scores = submittedList.map(s => s.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round((sum / submittedCount) * 10) / 10;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passedCount = submittedList.filter(s => s.score >= QUIZ_METADATA.passingScore).length;
    const remedialCount = submittedList.filter(s => s.score < QUIZ_METADATA.passingScore).length;
    const passedPercent = Math.round((passedCount / submittedCount) * 100);

    return {
      total,
      submittedCount,
      unsubmittedCount,
      remedialCount,
      avgScore,
      highest,
      lowest,
      passedPercent,
      passedCount,
    };
  }, [allStudentRecords]);

  // Filtered statistical calculations (matches selected class filter for print & Excel/Word export)
  const filteredStats = useMemo(() => {
    const total = filteredSubmissions.length;
    const submittedList = filteredSubmissions.filter(s => hasStudentSubmittedQuiz(s));
    const submittedCount = submittedList.length;
    const unsubmittedCount = total - submittedCount;
    if (submittedCount === 0) {
      return {
        total,
        submittedCount: 0,
        unsubmittedCount,
        remedialCount: 0,
        avgScore: 0,
        highest: 0,
        lowest: 0,
        passedPercent: 0,
        passedCount: 0,
      };
    }
    const scores = submittedList.map(s => s.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round((sum / submittedCount) * 10) / 10;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passedCount = submittedList.filter(s => s.score >= QUIZ_METADATA.passingScore).length;
    const remedialCount = submittedList.filter(s => s.score < QUIZ_METADATA.passingScore).length;
    const passedPercent = Math.round((passedCount / submittedCount) * 100);

    return {
      total,
      submittedCount,
      unsubmittedCount,
      remedialCount,
      avgScore,
      highest,
      lowest,
      passedPercent,
      passedCount,
    };
  }, [filteredSubmissions]);

  const recapPrintOptions: PrintDocumentOptions = useMemo(
    () => ({
      paperSize: recapPaperSize,
      colorMode: recapColorMode,
      isLandscape: recapIsLandscape,
      includeQuestionColumns: recapIncludeQuestionCols,
      activeQuestions,
    }),
    [recapPaperSize, recapColorMode, recapIsLandscape, recapIncludeQuestionCols, activeQuestions]
  );

  // Item Analysis (Analisis Butir Soal per Question) - only from students who actually submitted
  const itemAnalysis = useMemo(() => {
    const submittedSubs = submissions.filter(s => hasStudentSubmittedQuiz(s));
    return activeQuestions.map(q => {
      if (submittedSubs.length === 0) {
        return { ...q, correctPct: 0, correctCount: 0, total: 0 };
      }
      const correctCount = submittedSubs.filter(s => s.answers[q.id] === q.correctAnswer).length;
      const correctPct = Math.round((correctCount / submittedSubs.length) * 100);
      return { ...q, correctPct, correctCount, total: submittedSubs.length };
    });
  }, [submissions, activeQuestions]);

  // Export to Excel (.xls) formatted like Microsoft Word when printed (A4 Fit-to-Page, Kop Surat, Borders, Signature Block)
  const handleExportExcelWordStyle = () => {
    playClickSound();
    if (filteredSubmissions.length === 0) return;

    downloadTeacherRecapExcelWordStyle(
      filteredSubmissions,
      selectedClass,
      filteredStats,
      recapPrintOptions
    );
    setDeleteToast(
      'File Excel (.xls) berhasil diunduh dengan format siap cetak seperti dokumen Word (Kop Surat, Tabel Bergaris, Tanda Tangan & Fit 1 Halaman A4).'
    );
    setTimeout(() => setDeleteToast(null), 5000);
  };

  // Export to Word (.doc) with identical official print layout
  const handleExportWordRecap = () => {
    playClickSound();
    if (filteredSubmissions.length === 0) return;

    downloadTeacherRecapWordDoc(
      filteredSubmissions,
      selectedClass,
      filteredStats,
      recapPrintOptions
    );
    setDeleteToast(
      'File Microsoft Word (.doc) rekap nilai siap cetak berhasil diunduh.'
    );
    setTimeout(() => setDeleteToast(null), 4500);
  };

  // Export raw CSV if needed
  const handleExportCSV = () => {
    playClickSound();
    if (filteredSubmissions.length === 0) return;
    downloadTeacherRecapCsv(filteredSubmissions, selectedClass, activeQuestions);
  };

  const handlePrint = () => {
    playClickSound();
    if (filteredSubmissions.length === 0) {
      alert('Tidak ada data siswa untuk dicetak pada filter kelas yang dipilih.');
      return;
    }
    setIsRecapPrintModalOpen(true);
  };

  const handleExecuteDirectPrintRecap = () => {
    playClickSound();
    if (filteredSubmissions.length === 0) return;
    executePrintTeacherRecap(filteredSubmissions, selectedClass, filteredStats, recapPrintOptions);
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

  // Real-time incoming violation notification alert for Teacher Dashboard
  const prevViolationsCountRef = useRef<number>(violations.length);
  useEffect(() => {
    if (violations.length > prevViolationsCountRef.current) {
      const latest = violations[0];
      if (latest) {
        playViolationAlertSound();
        setViolationToastMsg(
          `Notifikasi Pelanggaran Baru: ${latest.studentName} (Kelas ${latest.studentClass} • Absen ${latest.studentNumber}) terdeteksi keluar tab/aplikasi pada Soal #${latest.questionNumber} (Pelanggaran ke-${latest.violationCount}).`
        );
      }
    }
    prevViolationsCountRef.current = violations.length;
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      const q = violationSearch.toLowerCase();
      const matchesSearch =
        !violationSearch.trim() ||
        v.studentName.toLowerCase().includes(q) ||
        v.studentClass.toLowerCase().includes(q) ||
        (v.reason || '').toLowerCase().includes(q);

      const matchesStatus =
        violationStatusFilter === 'all' || v.status === violationStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [violations, violationSearch, violationStatusFilter]);

  const handleRemoteUnlock = async (violationId: string, studentName: string) => {
    if (!onUnlockViolationRemotely) return;
    playClickSound();
    setUnlockingViolationId(violationId);
    try {
      await onUnlockViolationRemotely(violationId);
      playUnlockSuccessSound();
      setViolationToastMsg(`Notifikasi pelanggaran ${studentName} telah ditandai sudah dicek.`);
      setTimeout(() => setViolationToastMsg(null), 4000);
    } catch (err) {
      console.error('Error updating violation status:', err);
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

  const activeBannerBgUrl = resolveActiveBackgroundImageUrl(dashboardBackground);

  const activeTabTitleMap: Record<typeof activeTab, string> = {
    recap: 'Rekap Nilai & Daftar Siswa (Kelas 7A – 7H)',
    input: 'Add New File / Input & Import Data Siswa',
    analysis: 'Analisis Butir Soal & Statistik Ketuntasan',
    bank: `Bank Soal Kuis (${activeQuestions.length} Butir Soal)`,
    procedure: 'Edit Materi Pembelajaran (Descriptive & Procedure Text)',
    restrictions: 'Package Settings / Batasan Pengerjaan & Database Siswa',
    background: 'Appearance / Pengaturan Background Dashboard',
    settings: 'Settings / Pengaturan PIN & Cloud Sync',
    violations: `Notifikasi Pelanggaran Siswa (${violations.length})`,
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col bg-[#f0f0f1] text-slate-800">
      {/* ================================================================= */}
      {/* TOP DARK ADMIN BAR (WP-ADMIN / WPDM STYLE MATCHING SCREENSHOT)    */}
      {/* ================================================================= */}
      <div className="bg-[#1d2327] text-[#c3c4c7] px-3 sm:px-5 h-11 flex items-center justify-between gap-2 text-xs border-b border-black/40 sticky top-0 z-40 select-none">
        {/* Left Admin Bar Items */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsMobileSidebarOpen((prev) => !prev);
            }}
            className="lg:hidden p-1.5 rounded-xs hover:bg-[#2c3338] text-white cursor-pointer"
            title="Buka Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('recap');
            }}
            className="flex items-center gap-2 font-bold text-white hover:text-[#72aee6] transition-colors cursor-pointer truncate"
          >
            <span className="w-6 h-6 rounded-xs bg-[#2271b1] text-white flex items-center justify-center font-black text-[11px] shrink-0">
              EN
            </span>
            <span className="truncate">WPDM · Dashboard Guru</span>
          </button>

          {/* Quick Counter Pill Icons */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('recap');
            }}
            className="hidden sm:inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            title="Total Siswa Terdaftar & Submit"
          >
            <Users className="w-3.5 h-3.5 text-[#72aee6]" />
            <span>{stats.total}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('violations');
            }}
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            title="Notifikasi Pelanggaran Siswa"
          >
            <Bell
              className={`w-3.5 h-3.5 ${
                lockedViolations.length > 0 ? 'text-rose-400 animate-pulse' : 'text-[#a7aaad]'
              }`}
            />
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                lockedViolations.length > 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#2c3338] text-[#c3c4c7]'
              }`}
            >
              {lockedViolations.length}
            </span>
          </button>

          {/* "+ New" Quick Action Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('input');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs bg-[#2c3338] hover:bg-[#2271b1] text-white font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New / Input Siswa</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 text-[11px]">
            {isDbConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-medium">Server &amp; Cloud Sync Aktif</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">Mode Lokal Aktif</span>
              </>
            )}
          </div>
        </div>

        {/* Right Admin Bar Items ("Howdy, Mr. Admin" + Back to Quiz) */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs text-[#c3c4c7]">
            Halo, <strong className="text-white">{QUIZ_METADATA.teacherName}</strong>
          </span>
          <button
            type="button"
            onClick={onBackToQuiz}
            className="px-2.5 py-1 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Halaman Kuis Siswa</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* BODY: LEFT DARK SIDEBAR MENU + RIGHT MAIN WORKSPACE               */}
      {/* ================================================================= */}
      <div className="flex-1 flex relative">
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          />
        )}

        {/* LEFT VERTICAL DARK SIDEBAR MENU (EXACT MATCH TO SCREENSHOT) */}
        <aside
          className={`${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } fixed lg:static inset-y-0 left-0 z-40 bg-[#1d2327] text-[#f0f0f1] transition-all duration-200 flex flex-col justify-between shrink-0 select-none border-r border-black/30 ${
            isSidebarCollapsed ? 'w-14' : 'w-60'
          }`}
        >
          <div className="py-2 space-y-0.5 overflow-y-auto">
            {/* 1. Dashboard / Ringkasan Rekap */}
            <div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('recap');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer relative ${
                  activeTab === 'recap'
                    ? 'bg-[#2271b1] text-white font-bold'
                    : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Dashboard (Rekap Nilai)</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/25 text-white font-mono">
                    {filteredSubmissions.length}
                  </span>
                )}
              </button>

              {/* Submenu under Dashboard when active */}
              {!isSidebarCollapsed && activeTab === 'recap' && (
                <div className="bg-[#2c3338] py-1.5 text-[11px] space-y-0.5 border-l-2 border-[#72aee6]">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedClass('ALL');
                      setRecapViewMode('table');
                    }}
                    className={`w-full text-left px-8 py-1.5 block cursor-pointer ${
                      selectedClass === 'ALL' && recapViewMode === 'table'
                        ? 'text-white font-bold'
                        : 'text-[#c3c4c7] hover:text-white'
                    }`}
                  >
                    Semua Data Siswa ({allStudentRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setRecapViewMode(recapViewMode === 'table' ? 'word_print' : 'table');
                    }}
                    className={`w-full text-left px-8 py-1.5 block cursor-pointer ${
                      recapViewMode === 'word_print'
                        ? 'text-white font-bold'
                        : 'text-[#c3c4c7] hover:text-white'
                    }`}
                  >
                    Lembar Kertas Cetak (Word)
                  </button>
                  <div className="px-8 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-[#8c8f94] font-bold">
                    Filter Cepat Kelas:
                  </div>
                  <div className="px-7 py-1 grid grid-cols-4 gap-1">
                    {ALL_CLASS_LIST.map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedClass(cls);
                        }}
                        className={`py-1 rounded-xs text-[10px] font-bold text-center cursor-pointer ${
                          selectedClass === cls
                            ? 'bg-[#2271b1] text-white'
                            : 'bg-[#1d2327] text-[#c3c4c7] hover:text-white'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Downloads / Data & Import Siswa (MATCHING "Downloads" ACTIVE SECTION IN SCREENSHOT) */}
            <div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('input');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer relative ${
                  activeTab === 'input'
                    ? 'bg-[#2271b1] text-white font-bold'
                    : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderDown className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Downloads / Input Siswa</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="px-1.5 py-0.2 rounded-xs text-[10px] bg-emerald-600 text-white font-bold">
                    7A–7H
                  </span>
                )}
              </button>

              {/* Always-accessible or active submenu matching All Files, Add New, Templates, Categories, Settings */}
              {!isSidebarCollapsed && (
                <div className="bg-[#2c3338] py-1.5 text-[11px] space-y-0.5 border-l-2 border-[#2271b1]">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('recap');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-8 py-1.5 block cursor-pointer ${
                      activeTab === 'recap'
                        ? 'text-white font-bold'
                        : 'text-[#c3c4c7] hover:text-white'
                    }`}
                  >
                    All Files (Rekap Nilai)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('input');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-8 py-1.5 block cursor-pointer ${
                      activeTab === 'input'
                        ? 'text-white font-bold'
                        : 'text-[#c3c4c7] hover:text-white'
                    }`}
                  >
                    Add New (Upload / Import)
                  </button>
                  <div className="px-8 py-1.5 space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-[#8c8f94] font-bold">
                      Pilih Kelas Template:
                    </label>
                    <select
                      value={sidebarTemplateClass}
                      onChange={(e) => {
                        playClickSound();
                        const val = e.target.value;
                        setSidebarTemplateClass(val);
                        if (val !== 'ALL') {
                          setSelectedClass(val);
                        }
                      }}
                      className="w-full px-2 py-1 rounded-xs bg-[#1d2327] border border-[#4f565d] text-white text-[11px] font-bold outline-hidden cursor-pointer"
                    >
                      {ALL_CLASS_LIST.map((cls) => (
                        <option key={cls} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                      <option value="ALL">Semua Kelas (7A–7H)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      downloadStudentImportTemplateExcel(32, sidebarTemplateClass);
                    }}
                    className="w-full text-left px-8 py-1.5 block text-emerald-300 hover:text-white font-semibold cursor-pointer"
                  >
                    Unduh Excel ({sidebarTemplateClass === 'ALL' ? '7A–7H' : `Kelas ${sidebarTemplateClass}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      downloadStudentImportTemplateCsv(32, sidebarTemplateClass);
                    }}
                    className="w-full text-left px-8 py-1.5 block text-[#72aee6] hover:text-white font-semibold cursor-pointer"
                  >
                    Unduh CSV ({sidebarTemplateClass === 'ALL' ? '7A–7H' : `Kelas ${sidebarTemplateClass}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('restrictions');
                      setIsMobileSidebarOpen(false);
                    }}
                    className="w-full text-left px-8 py-1.5 block text-[#c3c4c7] hover:text-white cursor-pointer"
                  >
                    Categories &amp; Database Siswa
                  </button>
                </div>
              )}
            </div>

            {/* 3. Bank Soal Kuis */}
            <div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('bank');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'bank'
                    ? 'bg-[#2271b1] text-white font-bold'
                    : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Bank Soal Kuis</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/25 text-white font-mono">
                    {activeQuestions.length}
                  </span>
                )}
              </button>

              {!isSidebarCollapsed && activeTab === 'bank' && (
                <div className="bg-[#2c3338] py-1.5 text-[11px] space-y-0.5 border-l-2 border-[#72aee6]">
                  <button
                    type="button"
                    onClick={handleStartCreateQuestion}
                    className="w-full text-left px-8 py-1.5 block text-[#c3c4c7] hover:text-white cursor-pointer"
                  >
                    + Tambah Soal Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWordImportOpen(true)}
                    className="w-full text-left px-8 py-1.5 block text-[#c3c4c7] hover:text-white cursor-pointer"
                  >
                    Import Soal Word (.doc)
                  </button>
                </div>
              )}
            </div>

            {/* 4. Edit Materi Pembelajaran */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('procedure');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'procedure'
                  ? 'bg-[#2271b1] text-white font-bold'
                  : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Materi Pembelajaran</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/25 text-white font-mono">
                  {(procedureTextConfig?.texts || INITIAL_PROCEDURE_TEXT_CONFIG.texts).length}
                </span>
              )}
            </button>

            {/* 5. Analisis Butir Soal */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('analysis');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-[#2271b1] text-white font-bold'
                  : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BarChart3 className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Analisis Butir Soal</span>}
              </div>
            </button>

            <div className="my-2 border-t border-white/10" />

            {/* 6. Batasan Pengerjaan Siswa (Package Settings) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('restrictions');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'restrictions'
                  ? 'bg-[#2271b1] text-white font-bold'
                  : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sliders className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Batasan Pengerjaan</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="px-1.5 py-0.2 rounded-xs text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                  {studentRestrictions.maxAttempts === 0
                    ? 'Bebas'
                    : `${studentRestrictions.maxAttempts}x`}
                </span>
              )}
            </button>

            {/* 7. Notifikasi Pelanggaran (with red badge like Plugins 3 in screenshot) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('violations');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'violations'
                  ? 'bg-[#2271b1] text-white font-bold'
                  : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell
                  className={`w-4 h-4 shrink-0 ${
                    lockedViolations.length > 0 ? 'text-rose-400 animate-pulse' : ''
                  }`}
                />
                {!isSidebarCollapsed && <span className="truncate">Notifikasi Pelanggaran</span>}
              </div>
              {!isSidebarCollapsed && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    lockedViolations.length > 0
                      ? 'bg-[#d63638] text-white animate-pulse'
                      : 'bg-black/25 text-[#c3c4c7]'
                  }`}
                >
                  {lockedViolations.length > 0 ? lockedViolations.length : violations.length}
                </span>
              )}
            </button>

            {/* 8. Appearance / Background Dashboard */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('background');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'background'
                  ? 'bg-[#2271b1] text-white font-bold'
                  : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ImageIcon className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Appearance / Background</span>}
              </div>
            </button>

            {/* 9. Settings / PIN Guru */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('settings');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#2271b1] text-white font-bold'
                  : 'text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Settings className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Settings / PIN Guru</span>}
              </div>
            </button>
          </div>

          {/* Bottom Collapse Menu Button (Matching "Collapse menu" in screenshot) */}
          <div className="border-t border-white/10 p-2">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsSidebarCollapsed((prev) => !prev);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-[#a7aaad] hover:text-white transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Perlebar Menu Samping' : 'Ciutkan Menu Samping'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span>Collapse menu</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* RIGHT MAIN WORKSPACE CONTENT AREA                                 */}
        {/* ================================================================= */}
        <div className="flex-1 min-w-0 p-3.5 sm:p-6 space-y-5">
          {/* Top Screen Options & Context Header Bar */}
          <div
            className="bg-white border border-slate-200 rounded-md px-4 py-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
            style={
              dashboardBackground.applyToBanner && activeBannerBgUrl
                ? {
                    backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.9)), url("${activeBannerBgUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{QUIZ_METADATA.branding}</span>
                <span>·</span>
                <span>Kelas 7A s/d 7H</span>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
                {activeTabTitleMap[activeTab]}
              </h1>
            </div>

            {/* Right Controls: Screen Options + Export Excel/Word/Print */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowKpiSummary((prev) => !prev);
                }}
                className="px-3 py-1.5 rounded-xs bg-[#f6f7f7] hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Screen Options</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showKpiSummary ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleExportExcelWordStyle}
                disabled={filteredSubmissions.length === 0}
                className="px-3 py-1.5 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                title="Download file Excel (.xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportWordRecap}
                disabled={filteredSubmissions.length === 0}
                className="px-3 py-1.5 rounded-xs bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                title="Download file Rekap Nilai dalam format Microsoft Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Word (.doc)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={filteredSubmissions.length === 0}
                className="px-3 py-1.5 rounded-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                title="Pratinjau & Cetak Laporan Penilaian"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </div>

          {/* Summary KPI Cards Grid (Collapsible via Screen Options) */}
          {showKpiSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold">Total Siswa</span>
                  <Users className="w-4 h-4 text-[#2271b1]" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {stats.total}{' '}
                  <span className="text-xs font-sans font-normal text-slate-500">Siswa</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {stats.submittedCount} Submit · {stats.unsubmittedCount} Belum
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold">Rata-rata Nilai</span>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {stats.submittedCount > 0 ? stats.avgScore : '—'}{' '}
                  <span className="text-xs font-sans font-normal text-slate-500">
                    {stats.submittedCount > 0 ? '/ 100' : ''}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Dari {stats.submittedCount} siswa submit
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold">Ketuntasan (&ge;75)</span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                  {stats.submittedCount > 0 ? `${stats.passedPercent}%` : '—'}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {stats.passedCount} Tuntas · {stats.remedialCount} Remedial
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold">Nilai Tertinggi</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  {stats.submittedCount > 0 ? stats.highest : '—'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-semibold">Nilai Terendah</span>
                  <XCircle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-700 font-mono">
                  {stats.submittedCount > 0 ? stats.lowest : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Live Feedback Toast */}
          {violationToastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs"
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

          {/* Cross-Class Duplicate Name Alert Banner in Teacher Dashboard */}
          {crossClassConflicts.length > 0 && activeTab !== 'restrictions' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-rose-50 border border-rose-400 text-rose-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-rose-900 block">
                    Peringatan Database: Ditemukan {crossClassConflicts.length} Nama Siswa Digunakan di 2 Kelas!
                  </span>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                    Nama{' '}
                    <strong>
                      {crossClassConflicts
                        .map((c) => `${c.displayName} (${c.classesUsed.join(' & ')})`)
                        .join(', ')}
                    </strong>{' '}
                    terdeteksi digunakan di 2 kelas berbeda.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    playClickSound();
                    let count = 0;
                    for (const conf of crossClassConflicts) {
                      for (const inv of conf.invalidSubmissions) {
                        await onDeleteSubmission(inv.id);
                        count += 1;
                      }
                    }
                    setDeleteToast(
                      `Berhasil menolak & menghapus ${count} data siswa pada kelas yang tidak terdata.`
                    );
                    setTimeout(() => setDeleteToast(null), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Tolak Kelas Tidak Terdata</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveTab('restrictions');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs cursor-pointer"
                >
                  <span>Kelola Database Siswa &rarr;</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Real-time Notification Banner: Notifikasi Pelanggaran Siswa */}
          {lockedViolations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-rose-50 border border-rose-400 text-rose-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-rose-800 block">
                    {lockedViolations.length} Notifikasi Pelanggaran Baru Belum Dicek
                  </span>
                  {lockedViolations[0] && (
                    <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">
                      <strong>{lockedViolations[0].studentName}</strong> (Kelas{' '}
                      {lockedViolations[0].studentClass} &bull; Absen{' '}
                      {lockedViolations[0].studentNumber}) keluar tab pada{' '}
                      <strong>Soal #{lockedViolations[0].questionNumber}</strong>.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
                {lockedViolations[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoteUnlock(lockedViolations[0].id, lockedViolations[0].studentName)
                    }
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tandai Sudah Dicek</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveTab('violations');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  <span>Lihat Notifikasi ({lockedViolations.length}) &rarr;</span>
                </button>
              </div>
            </motion.div>
          )}

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
                    <option key={c} value={c}>
                      {c === 'ALL'
                        ? `Semua Kelas (${allStudentRecords.length})`
                        : `Kelas ${c}${classStudentCounts[c] ? ` (${classStudentCounts[c]} Siswa)` : ''}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort field */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Urutkan:</span>
                <select
                  value={sortField}
                  onChange={(e) => {
                    const nextField = e.target.value as 'absen' | 'score' | 'name' | 'time';
                    setSortField(nextField);
                    if (nextField === 'absen' || nextField === 'name') {
                      setSortOrder('asc');
                    } else {
                      setSortOrder('desc');
                    }
                  }}
                  className="py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                >
                  <option value="absen">No. Absen</option>
                  <option value="score">Nilai</option>
                  <option value="name">Nama Siswa</option>
                  <option value="time">Waktu Kuis</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  {sortField === 'absen'
                    ? (sortOrder === 'asc' ? '1 → Terbesar' : 'Terbesar → 1')
                    : sortField === 'name'
                    ? (sortOrder === 'asc' ? 'A → Z' : 'Z → A')
                    : (sortOrder === 'desc' ? 'Tertinggi' : 'Terendah')}
                </button>
              </div>
            </div>

            {/* Seed & Clear Data Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle: Tabel Dashboard vs Tampilan Kertas Cetak (Excel/Word) */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setRecapViewMode('table');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    recapViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tabel Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setRecapViewMode('word_print');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    recapViewMode === 'word_print'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Lihat tampilan lembar kerja Excel yang sudah disesuaikan seperti dokumen Word saat diprint"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tampilan Cetak Excel/Word</span>
                </button>
              </div>

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
            ) : recapViewMode === 'word_print' ? (
              /* WORD-STYLE PRINTABLE EXCEL SHEET PREVIEW */
              <div className="bg-slate-200/70 p-4 sm:p-8 overflow-x-auto">
                <div
                  className={`bg-white mx-auto shadow-xl border border-slate-400 p-6 sm:p-10 text-black ${
                    recapIsLandscape ? 'max-w-5xl' : 'max-w-3xl'
                  }`}
                  style={{ fontFamily: '"Times New Roman", "Calibri", Georgia, serif' }}
                >
                  {/* Kop Surat Resmi Seperti Microsoft Word */}
                  <div className="text-center border-b-4 border-double border-black pb-3 mb-4">
                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                      Dokumen Administrasi Penilaian Pembelajaran Kurikulum Merdeka
                    </div>
                    <h2 className="text-base sm:text-lg font-bold uppercase mt-0.5">
                      Daftar Rekapitulasi Nilai Kuis Bahasa Inggris Siswa
                    </h2>
                    <div className="text-xs sm:text-sm font-bold mt-0.5">
                      SMP / MTs Kelas VII &bull; Buku Siswa: English for Nusantara
                    </div>
                    <p className="text-[11px] italic mt-0.5">
                      Topik / Materi: {QUIZ_METADATA.topic} &bull; Standar Ketuntasan Minimal (KKM): {QUIZ_METADATA.passingScore}
                    </p>
                  </div>

                  {/* Identitas Dokumen 2 Kolom Seperti Word */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Mata Pelajaran</span>
                        <span>: Bahasa Inggris (Kelas VII SMP/MTs)</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Judul Evaluasi</span>
                        <span>: {QUIZ_METADATA.title}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Kelas / Rombel</span>
                        <span className="font-bold">
                          : {selectedClass === 'ALL' ? 'Semua Kelas (7A s.d. 7H)' : `Kelas ${selectedClass}`}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Guru Pengampu</span>
                        <span className="font-bold">: {QUIZ_METADATA.teacherName}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Tanggal Cetak</span>
                        <span>
                          :{' '}
                          {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Jumlah Peserta</span>
                        <span className="font-bold">
                          : {filteredStats.total} Siswa ({filteredStats.submittedCount} Submit / {filteredStats.unsubmittedCount} Belum Mengerjakan)
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Rata-Rata Kelas</span>
                        <span className="font-bold">
                          :{' '}
                          {filteredStats.submittedCount > 0
                            ? `${filteredStats.avgScore} (Tertinggi: ${filteredStats.highest} • Terendah: ${filteredStats.lowest})`
                            : '-'}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Status Penilaian</span>
                        <span className="font-bold">
                          : {filteredStats.passedCount} Tuntas &bull; {filteredStats.remedialCount} Remedial (&lt;75) &bull;{' '}
                          {filteredStats.unsubmittedCount} Belum Mengerjakan
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabel Daftar Nilai Bergaris Hitam Tegas Seperti Word */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-xs">
                      <thead>
                        <tr className="bg-slate-200 text-black font-bold uppercase text-[11px]">
                          <th className="border border-black py-2 px-2 text-center w-9">No</th>
                          <th className="border border-black py-2 px-2 text-center w-14">Absen</th>
                          <th className="border border-black py-2 px-3 text-left">Nama Lengkap Siswa</th>
                          <th className="border border-black py-2 px-2 text-center w-14">Kelas</th>
                          <th className="border border-black py-2 px-2 text-center w-12">Benar</th>
                          <th className="border border-black py-2 px-2 text-center w-12">Salah</th>
                          <th className="border border-black py-2 px-2 text-center w-16">Nilai Akhir</th>
                          <th className="border border-black py-2 px-2 text-center w-28">Status</th>
                          <th className="border border-black py-2 px-2 text-center w-16">Durasi</th>
                          <th className="border border-black py-2 px-2 text-center w-24">Tanggal</th>
                          {recapIncludeQuestionCols &&
                            activeQuestions.map((q, i) => (
                              <th key={q.id} className="border border-black py-1.5 px-1 text-center text-[10px]">
                                S{i + 1}
                                <br />({q.correctAnswer})
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map((sub, idx) => {
                          const isSubmitted = hasStudentSubmittedQuiz(sub);
                          const status = getSubmissionAssessmentStatus(sub, QUIZ_METADATA.passingScore);
                          const durMins = Math.floor((sub.timeSpentSeconds || 0) / 60);
                          const durSecs = (sub.timeSpentSeconds || 0) % 60;
                          const dateStr =
                            isSubmitted && sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '';

                          return (
                            <tr key={sub.id}>
                              <td className="border border-black py-1.5 px-2 text-center">{idx + 1}</td>
                              <td className="border border-black py-1.5 px-2 text-center font-bold">
                                {sub.studentNumber}
                              </td>
                              <td className="border border-black py-1.5 px-3 font-bold">
                                {sub.studentName}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {sub.studentClass}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {isSubmitted ? sub.correctCount : ''}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {isSubmitted ? sub.wrongCount : ''}
                              </td>
                              <td
                                className={`border border-black py-1.5 px-2 text-center font-bold ${
                                  !isSubmitted
                                    ? 'bg-white text-slate-500'
                                    : status === 'TUNTAS'
                                    ? 'bg-emerald-50 text-emerald-950'
                                    : 'bg-rose-50 text-rose-950'
                                }`}
                              >
                                {isSubmitted ? sub.score : ''}
                              </td>
                              <td
                                className={`border border-black py-1.5 px-2 text-center font-bold text-[11px] ${
                                  !isSubmitted
                                    ? 'bg-slate-50 text-slate-700'
                                    : status === 'TUNTAS'
                                    ? 'bg-emerald-50 text-emerald-900'
                                    : 'bg-rose-50 text-rose-900'
                                }`}
                              >
                                {status === 'TUNTAS'
                                  ? 'TUNTAS'
                                  : status === 'REMEDIAL'
                                  ? 'REMEDIAL'
                                  : 'BELUM MENGERJAKAN'}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {isSubmitted ? `${durMins}m ${durSecs}s` : ''}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">{dateStr}</td>
                              {recapIncludeQuestionCols &&
                                activeQuestions.map((q) => {
                                  const ans = isSubmitted ? sub.answers?.[q.id] || '' : '';
                                  const isCorrect = ans === q.correctAnswer;
                                  return (
                                    <td
                                      key={q.id}
                                      className={`border border-black py-1 px-1 text-center font-bold text-[11px] ${
                                        !ans ? 'text-slate-400' : isCorrect ? 'text-emerald-800' : 'text-rose-700'
                                      }`}
                                    >
                                      {ans}
                                    </td>
                                  );
                                })}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={6} className="border border-black py-1.5 px-3 text-right">
                            RATA-RATA NILAI (SISWA SUBMIT) :
                          </td>
                          <td className="border border-black py-1.5 px-2 text-center text-sm">
                            {filteredStats.submittedCount > 0 ? filteredStats.avgScore : ''}
                          </td>
                          <td
                            colSpan={3 + (recapIncludeQuestionCols ? activeQuestions.length : 0)}
                            className="border border-black py-1.5 px-3 text-left"
                          >
                            Tuntas (&ge;{QUIZ_METADATA.passingScore}): {filteredStats.passedCount} Siswa &bull; Remedial (&lt;{QUIZ_METADATA.passingScore}): {filteredStats.remedialCount} Siswa &bull; Belum Mengerjakan: {filteredStats.unsubmittedCount} Siswa
                          </td>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={6} className="border border-black py-1.5 px-3 text-right">
                            NILAI TERTINGGI / NILAI TERENDAH :
                          </td>
                          <td className="border border-black py-1.5 px-2 text-center">
                            {filteredStats.submittedCount > 0
                              ? `${filteredStats.highest} / ${filteredStats.lowest}`
                              : ''}
                          </td>
                          <td
                            colSpan={3 + (recapIncludeQuestionCols ? activeQuestions.length : 0)}
                            className="border border-black py-1.5 px-3 text-left"
                          >
                            Sudah Submit: {filteredStats.submittedCount} Siswa &bull; Belum Mengerjakan: {filteredStats.unsubmittedCount} Siswa
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Blok Tanda Tangan 2 Kolom Seperti Word */}
                  <div className="grid grid-cols-2 gap-6 text-center text-xs mt-6 pt-2">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-bold">Kepala Sekolah / Wali Kelas</p>
                      <div className="h-14" />
                      <p className="font-bold underline">( .................................................. )</p>
                      <p className="text-[11px]">NIP. ..................................................</p>
                    </div>
                    <div>
                      <p>
                        {new Date().toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="font-bold">Guru Mata Pelajaran Bahasa Inggris,</p>
                      <div className="h-14" />
                      <p className="font-bold underline">{QUIZ_METADATA.teacherName}</p>
                      <p className="text-[11px]">{QUIZ_METADATA.branding}</p>
                    </div>
                  </div>
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
                      <th
                        onClick={() => {
                          playClickSound();
                          if (sortField === 'absen') {
                            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setSortField('absen');
                            setSortOrder('asc');
                          }
                        }}
                        className="py-3.5 px-3 text-center cursor-pointer hover:bg-amber-100/60 transition-colors select-none"
                        title="Klik untuk mengurutkan berdasarkan Nomor Absen"
                      >
                        <div className="inline-flex items-center justify-center gap-1">
                          <span className={sortField === 'absen' ? 'text-amber-800 font-extrabold underline underline-offset-2' : ''}>
                            No. Absen
                          </span>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'absen' ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                      </th>
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
                      const isSubmitted = hasStudentSubmittedQuiz(sub);
                      const status = getSubmissionAssessmentStatus(sub, QUIZ_METADATA.passingScore);
                      const dateFormatted =
                        isSubmitted && sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: 'numeric',
                              month: 'short'
                            })
                          : 'Belum Mengerjakan';

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
                                <Bell className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{sub.violationsCount}x Notifikasi Pelanggaran (Pindah Tab) &rarr;</span>
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
                            {isSubmitted ? (
                              <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                                status === 'TUNTAS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sub.score}
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 text-slate-400 font-normal text-xs">
                                {/* Nilai akhir dikosongkan jika belum mengerjakan */}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {status === 'TUNTAS' ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                TUNTAS
                              </span>
                            ) : status === 'REMEDIAL' ? (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                REMEDIAL
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">
                                BELUM MENGERJAKAN
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold">
                            {isSubmitted ? (
                              <>
                                <span className="text-emerald-700">{sub.correctCount}</span> / <span className="text-rose-600">{sub.wrongCount}</span>
                              </>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                            {isSubmitted ? (
                              `${Math.floor(sub.timeSpentSeconds / 60)}m ${sub.timeSpentSeconds % 60}s`
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {dateFormatted}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isSubmitted && (
                                <>
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
                                </>
                              )}
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
          defaultClass={selectedClass !== 'ALL' ? selectedClass : '7G'}
          existingSubmissions={allStudentRecords}
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

      {/* Tab: BATASAN PENGERJAAN SISWA */}
      {activeTab === 'restrictions' && (
        <StudentRestrictionPanel
          config={studentRestrictions}
          submissions={submissions}
          onUpdateConfig={(newConfig) => {
            onUpdateStudentRestrictions?.(newConfig);
          }}
          onDeleteSubmission={onDeleteSubmission}
          onResetStudyModuleViews={onResetStudyModuleViews}
        />
      )}

      {/* Tab: MENU UPLOAD & KUSTOMISASI BACKGROUND DASHBOARD */}
      {activeTab === 'background' && (
        <DashboardBackgroundManager
          config={dashboardBackground}
          onUpdateConfig={(newConfig) => {
            onUpdateDashboardBackground?.(newConfig);
          }}
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
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    Notifikasi Pelanggaran Siswa (Khusus Akun Guru)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Memantau pemberitahuan real-time saat siswa membuka tab lain atau keluar dari jendela kuis (tanpa token penguncian di layar siswa).
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
                  <span>Bersihkan Semua Notifikasi</span>
                </button>
              )}
            </div>

            {/* Sub-KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Notifikasi Pelanggaran
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-800">
                  {violations.length} Kejadian
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                  Notifikasi Baru (Belum Dicek)
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-700">
                  {lockedViolations.length} Notifikasi
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Sudah Dicek Guru
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {violations.length - lockedViolations.length} Notifikasi
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
                  placeholder="Cari nama siswa atau kelas..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: `Semua (${violations.length})` },
                  { id: 'locked', label: `Belum Dicek (${lockedViolations.length})` },
                  { id: 'unlocked', label: `Sudah Dicek (${violations.length - lockedViolations.length})` },
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
                  ? 'Belum Ada Notifikasi Pelanggaran' 
                  : 'Tidak Ditemukan Data yang Sesuai Filter'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {violations.length === 0
                  ? 'Semua siswa mengerjakan kuis dengan tertib tanpa terdeteksi keluar tab atau membuka aplikasi lain.'
                  : 'Cobalah ubah kata kunci pencarian atau ubah filter status di atas.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredViolations.map((v) => {
                const isUnread = v.status === 'locked';
                const isUpdating = unlockingViolationId === v.id;
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
                      isUnread
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
                        isUnread
                          ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {isUnread ? (
                          <>
                            <Bell className="w-3.5 h-3.5" />
                            <span>Notifikasi Baru</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sudah Dicek</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Violation Information (No Token) */}
                    <div className="bg-white/80 rounded-xl p-3 border border-slate-200/80 mb-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Posisi Soal Saat Kejadian:</span>
                        <span className="font-bold text-slate-900">
                          Soal Nomor #{v.questionNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Frekuensi Pelanggaran:</span>
                        <span className="font-bold text-rose-700">
                          Pelanggaran ke-{v.violationCount}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 text-slate-600">
                        <span className="text-slate-500 block mb-0.5">Keterangan Aktivitas:</span>
                        <span className="font-semibold text-slate-800">
                          {v.reason || 'Terdeteksi membuka tab lain atau meminimalkan browser'}
                        </span>
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
                          title="Hapus notifikasi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Notifikasi</span>
                        </button>
                      )}

                      {isUnread ? (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleRemoteUnlock(v.id, v.studentName)}
                          className="ml-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tandai Sudah Dicek</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="ml-auto text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Telah Dicek Guru</span>
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

      {/* Modal: Pratinjau Cetak & Export Excel/Word (Tampilan Seperti Word Saat Diprint) */}
      <AnimatePresence>
        {isRecapPrintModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Modal Top Header */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      Pratinjau Cetak &amp; Export Excel / Word (Tampilan Seperti Word Saat Diprint)
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                      File Excel (.xls) &amp; Cetakan diatur otomatis Fit 1 Halaman A4 dengan Kop Surat, Tabel Bergaris, dan Tanda Tangan Resmi
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecapPrintModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  ✕ Tutup
                </button>
              </div>

              {/* Options & Action Toolbar */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={recapIsLandscape ? 'landscape' : 'portrait'}
                    onChange={(e) => setRecapIsLandscape(e.target.value === 'landscape')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="portrait">Orientasi: Portrait (Tegak Seperti Word)</option>
                    <option value="landscape">Orientasi: Landscape (Mendatar)</option>
                  </select>

                  <select
                    value={recapPaperSize}
                    onChange={(e) => setRecapPaperSize(e.target.value as 'A4' | 'F4' | 'Letter')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="A4">Kertas: A4 (210×297 mm)</option>
                    <option value="F4">Kertas: F4 / Folio (215×330 mm)</option>
                    <option value="Letter">Kertas: Letter</option>
                  </select>

                  <select
                    value={recapColorMode}
                    onChange={(e) => setRecapColorMode(e.target.value as 'color' | 'grayscale')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="color">Warna: Berwarna Resmi</option>
                    <option value="grayscale">Warna: Hitam-Putih (Hemat Tinta)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setRecapIncludeQuestionCols((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${
                      recapIncludeQuestionCols
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {recapIncludeQuestionCols ? '✓ Kolom S1-S10 Aktif' : '+ Tampilkan Kolom S1-S10'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcelWordStyle}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel (.xls Siap Print)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWordRecap}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Download Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteDirectPrintRecap}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Sekarang (Printer / PDF)</span>
                  </button>
                </div>
              </div>

              {/* Live Word-Style Sheet Preview Body */}
              <div className="p-4 sm:p-6 bg-slate-200/80 overflow-y-auto flex-1">
                <div
                  className={`bg-white mx-auto shadow-xl border border-slate-400 p-6 sm:p-10 text-black ${
                    recapIsLandscape ? 'max-w-5xl' : 'max-w-3xl'
                  } ${recapColorMode === 'grayscale' ? 'grayscale' : ''}`}
                  style={{ fontFamily: '"Times New Roman", "Calibri", Georgia, serif' }}
                >
                  <div className="text-center border-b-4 border-double border-black pb-3 mb-4">
                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                      Dokumen Administrasi Penilaian Pembelajaran Kurikulum Merdeka
                    </div>
                    <h2 className="text-base sm:text-lg font-bold uppercase mt-0.5">
                      Daftar Rekapitulasi Nilai Kuis Bahasa Inggris Siswa
                    </h2>
                    <div className="text-xs sm:text-sm font-bold mt-0.5">
                      SMP / MTs Kelas VII &bull; Buku Siswa: English for Nusantara
                    </div>
                    <p className="text-[11px] italic mt-0.5">
                      Topik / Materi: {QUIZ_METADATA.topic} &bull; Standar Ketuntasan Minimal (KKM): {QUIZ_METADATA.passingScore}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Mata Pelajaran</span>
                        <span>: Bahasa Inggris (Kelas VII SMP/MTs)</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Judul Evaluasi</span>
                        <span>: {QUIZ_METADATA.title}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Kelas / Rombel</span>
                        <span className="font-bold">
                          : {selectedClass === 'ALL' ? 'Semua Kelas (7A s.d. 7H)' : `Kelas ${selectedClass}`}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Guru Pengampu</span>
                        <span className="font-bold">: {QUIZ_METADATA.teacherName}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Tanggal Cetak</span>
                        <span>
                          :{' '}
                          {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Jumlah Peserta</span>
                        <span className="font-bold">
                          : {filteredStats.total} Siswa ({filteredStats.submittedCount} Submit / {filteredStats.unsubmittedCount} Belum Mengerjakan)
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Rata-Rata Kelas</span>
                        <span className="font-bold">
                          :{' '}
                          {filteredStats.submittedCount > 0
                            ? `${filteredStats.avgScore} (Tertinggi: ${filteredStats.highest} • Terendah: ${filteredStats.lowest})`
                            : '-'}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-bold shrink-0">Status Penilaian</span>
                        <span className="font-bold">
                          : {filteredStats.passedCount} Tuntas &bull; {filteredStats.remedialCount} Remedial (&lt;75) &bull;{' '}
                          {filteredStats.unsubmittedCount} Belum Mengerjakan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-xs">
                      <thead>
                        <tr className="bg-slate-200 text-black font-bold uppercase text-[11px]">
                          <th className="border border-black py-2 px-2 text-center w-9">No</th>
                          <th className="border border-black py-2 px-2 text-center w-14">Absen</th>
                          <th className="border border-black py-2 px-3 text-left">Nama Lengkap Siswa</th>
                          <th className="border border-black py-2 px-2 text-center w-14">Kelas</th>
                          <th className="border border-black py-2 px-2 text-center w-12">Benar</th>
                          <th className="border border-black py-2 px-2 text-center w-12">Salah</th>
                          <th className="border border-black py-2 px-2 text-center w-16">Nilai Akhir</th>
                          <th className="border border-black py-2 px-2 text-center w-28">Status</th>
                          <th className="border border-black py-2 px-2 text-center w-16">Durasi</th>
                          <th className="border border-black py-2 px-2 text-center w-24">Tanggal</th>
                          {recapIncludeQuestionCols &&
                            activeQuestions.map((q, i) => (
                              <th key={q.id} className="border border-black py-1.5 px-1 text-center text-[10px]">
                                S{i + 1}
                                <br />({q.correctAnswer})
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map((sub, idx) => {
                          const isSubmitted = hasStudentSubmittedQuiz(sub);
                          const status = getSubmissionAssessmentStatus(sub, QUIZ_METADATA.passingScore);
                          const durMins = Math.floor((sub.timeSpentSeconds || 0) / 60);
                          const durSecs = (sub.timeSpentSeconds || 0) % 60;
                          const dateStr =
                            isSubmitted && sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '';

                          return (
                            <tr key={sub.id}>
                              <td className="border border-black py-1.5 px-2 text-center">{idx + 1}</td>
                              <td className="border border-black py-1.5 px-2 text-center font-bold">
                                {sub.studentNumber}
                              </td>
                              <td className="border border-black py-1.5 px-3 font-bold">
                                {sub.studentName}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {sub.studentClass}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {isSubmitted ? sub.correctCount : ''}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {isSubmitted ? sub.wrongCount : ''}
                              </td>
                              <td
                                className={`border border-black py-1.5 px-2 text-center font-bold ${
                                  !isSubmitted
                                    ? 'bg-white text-slate-500'
                                    : status === 'TUNTAS'
                                    ? 'bg-emerald-50 text-emerald-950'
                                    : 'bg-rose-50 text-rose-950'
                                }`}
                              >
                                {isSubmitted ? sub.score : ''}
                              </td>
                              <td
                                className={`border border-black py-1.5 px-2 text-center font-bold text-[11px] ${
                                  !isSubmitted
                                    ? 'bg-slate-50 text-slate-700'
                                    : status === 'TUNTAS'
                                    ? 'bg-emerald-50 text-emerald-900'
                                    : 'bg-rose-50 text-rose-900'
                                }`}
                              >
                                {status === 'TUNTAS'
                                  ? 'TUNTAS'
                                  : status === 'REMEDIAL'
                                  ? 'REMEDIAL'
                                  : 'BELUM MENGERJAKAN'}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">
                                {isSubmitted ? `${durMins}m ${durSecs}s` : ''}
                              </td>
                              <td className="border border-black py-1.5 px-2 text-center">{dateStr}</td>
                              {recapIncludeQuestionCols &&
                                activeQuestions.map((q) => {
                                  const ans = isSubmitted ? sub.answers?.[q.id] || '' : '';
                                  const isCorrect = ans === q.correctAnswer;
                                  return (
                                    <td
                                      key={q.id}
                                      className={`border border-black py-1 px-1 text-center font-bold text-[11px] ${
                                        !ans ? 'text-slate-400' : isCorrect ? 'text-emerald-800' : 'text-rose-700'
                                      }`}
                                    >
                                      {ans}
                                    </td>
                                  );
                                })}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={6} className="border border-black py-1.5 px-3 text-right">
                            RATA-RATA NILAI (SISWA SUBMIT) :
                          </td>
                          <td className="border border-black py-1.5 px-2 text-center text-sm">
                            {filteredStats.submittedCount > 0 ? filteredStats.avgScore : ''}
                          </td>
                          <td
                            colSpan={3 + (recapIncludeQuestionCols ? activeQuestions.length : 0)}
                            className="border border-black py-1.5 px-3 text-left"
                          >
                            Tuntas (&ge;{QUIZ_METADATA.passingScore}): {filteredStats.passedCount} Siswa &bull; Remedial (&lt;{QUIZ_METADATA.passingScore}): {filteredStats.remedialCount} Siswa &bull; Belum Mengerjakan: {filteredStats.unsubmittedCount} Siswa
                          </td>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={6} className="border border-black py-1.5 px-3 text-right">
                            NILAI TERTINGGI / NILAI TERENDAH :
                          </td>
                          <td className="border border-black py-1.5 px-2 text-center">
                            {filteredStats.submittedCount > 0
                              ? `${filteredStats.highest} / ${filteredStats.lowest}`
                              : ''}
                          </td>
                          <td
                            colSpan={3 + (recapIncludeQuestionCols ? activeQuestions.length : 0)}
                            className="border border-black py-1.5 px-3 text-left"
                          >
                            Sudah Submit: {filteredStats.submittedCount} Siswa &bull; Belum Mengerjakan: {filteredStats.unsubmittedCount} Siswa
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-center text-xs mt-6 pt-2">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-bold">Kepala Sekolah / Wali Kelas</p>
                      <div className="h-14" />
                      <p className="font-bold underline">( .................................................. )</p>
                      <p className="text-[11px]">NIP. ..................................................</p>
                    </div>
                    <div>
                      <p>
                        {new Date().toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="font-bold">Guru Mata Pelajaran Bahasa Inggris,</p>
                      <div className="h-14" />
                      <p className="font-bold underline">{QUIZ_METADATA.teacherName}</p>
                      <p className="text-[11px]">{QUIZ_METADATA.branding}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
