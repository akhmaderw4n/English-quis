import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  User, 
  School, 
  Hash, 
  ArrowRight, 
  GraduationCap, 
  ChefHat, 
  ChevronDown,
  Lock,
  EyeOff,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import { StudentInfo, StudentRestrictionConfig, QuizSubmission } from '../types';
import {
  QUIZ_METADATA,
  INITIAL_STUDENT_RESTRICTION_CONFIG,
  getStudentAttemptStatus,
  normalizeStudentName,
  normalizeStudentClass,
  normalizeStudentNumber,
  isPlaceholderStudentName,
} from '../data/quizData';
import { playClickSound } from '../utils/audio';

interface StartScreenProps {
  onStartQuiz: (student: StudentInfo) => void;
  onOpenTeacherAuth?: () => void;
  onOpenProcedureStudy?: () => void;
  isStudyLocked?: boolean;
  onStudentDraftChange?: (student: StudentInfo) => void;
  totalQuestions?: number;
  restrictions?: StudentRestrictionConfig;
  submissions?: QuizSubmission[];
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartQuiz,
  onOpenProcedureStudy,
  isStudyLocked = false,
  onStudentDraftChange,
  totalQuestions = 10,
  restrictions = INITIAL_STUDENT_RESTRICTION_CONFIG,
  submissions = [],
}) => {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('7G');
  const [studentNumber, setStudentNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasUserChangedClass, setHasUserChangedClass] = useState(false);

  // Combine registeredStudents and teacher-input submissions so students from 7A-7H match uploaded Nama Lengkap Siswa
  const allKnownRoster = React.useMemo(() => {
    const mapBySlot = new Map<string, { id: string; name: string; studentClass: string; studentNumber: string }>();
    const seenClassName = new Set<string>();

    (restrictions.registeredStudents || []).forEach((r) => {
      if (isPlaceholderStudentName(r.name)) return;
      const n = normalizeStudentName(r.name);
      const cls = normalizeStudentClass(r.studentClass) || '7A';
      const num = normalizeStudentNumber(r.studentNumber) || '1';
      const slotKey = `${cls}__${num}`;
      const nameKey = `${cls}__${n}`;
      if (n) {
        mapBySlot.set(slotKey, {
          id: r.id,
          name: r.name.replace(/^\d{1,3}[\.\,\;\-\)\s\t]+/, '').trim(),
          studentClass: cls,
          studentNumber: num,
        });
        seenClassName.add(nameKey);
      }
    });
    submissions.forEach((s) => {
      if (isPlaceholderStudentName(s.studentName)) return;
      const n = normalizeStudentName(s.studentName);
      const cls = normalizeStudentClass(s.studentClass) || '7A';
      const num = normalizeStudentNumber(s.studentNumber) || '1';
      const slotKey = `${cls}__${num}`;
      const nameKey = `${cls}__${n}`;
      if (n && (!mapBySlot.has(slotKey) || s.id.startsWith('sub-roster-'))) {
        if (!seenClassName.has(nameKey) || s.id.startsWith('sub-roster-')) {
          mapBySlot.set(slotKey, {
            id: s.id,
            name: s.studentName.replace(/^\d{1,3}[\.\,\;\-\)\s\t]+/, '').trim(),
            studentClass: cls,
            studentNumber: num,
          });
          seenClassName.add(nameKey);
        }
      }
    });
    const list = Array.from(mapBySlot.values());
    list.sort((a, b) => {
      const clsCmp = a.studentClass.localeCompare(b.studentClass);
      if (clsCmp !== 0) return clsCmp;
      const numA = parseInt(a.studentNumber, 10) || 999;
      const numB = parseInt(b.studentNumber, 10) || 999;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [restrictions.registeredStudents, submissions]);

  const classCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allKnownRoster.forEach((r) => {
      const c = normalizeStudentClass(r.studentClass) || '7A';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [allKnownRoster]);

  // Auto-select 7G (or the first custom-inputted class) when roster data loads if user hasn't manually changed class
  React.useEffect(() => {
    if (hasUserChangedClass || name.trim()) return;
    if ((classCounts['7G'] || 0) > 0) {
      setStudentClass('7G');
      return;
    }
    const nonDefaultRoster = allKnownRoster.filter((r) => !/^reg-[1-5]$/.test(r.id) && !/^sub-[1-5]$/.test(r.id));
    if (nonDefaultRoster.length > 0) {
      setStudentClass(nonDefaultRoster[0].studentClass);
    }
  }, [allKnownRoster, classCounts, hasUserChangedClass, name]);

  // Registered students strictly in the currently selected class
  const studentsInSelectedClass = React.useMemo(() => {
    const cleanSelectedClass = normalizeStudentClass(studentClass);
    return allKnownRoster.filter(
      (r) => normalizeStudentClass(r.studentClass) === cleanSelectedClass
    );
  }, [allKnownRoster, studentClass]);

  // Registered students in the currently selected class (or all classes) for quick autocomplete
  const classRegisteredStudents = React.useMemo(() => {
    return studentsInSelectedClass.length > 0 ? studentsInSelectedClass : allKnownRoster;
  }, [studentsInSelectedClass, allKnownRoster]);

  const handleNameChange = (val: string) => {
    setName(val);
    setErrorMsg('');

    const normVal = normalizeStudentName(val);
    const cleanSelectedClass = normalizeStudentClass(studentClass);
    // Prefer matching in currently selected class first
    const matched = normVal
      ? allKnownRoster.find(
          (r) =>
            normalizeStudentName(r.name) === normVal &&
            normalizeStudentClass(r.studentClass) === cleanSelectedClass
        ) || allKnownRoster.find((r) => normalizeStudentName(r.name) === normVal)
      : undefined;

    const nextClass = matched?.studentClass || studentClass;
    const nextNum = matched?.studentNumber || studentNumber;

    if (matched?.studentClass && matched.studentClass !== studentClass) {
      setStudentClass(matched.studentClass);
    }
    if (matched?.studentNumber) {
      setStudentNumber(matched.studentNumber);
    }

    onStudentDraftChange?.({ name: val, studentClass: nextClass, studentNumber: nextNum });
  };

  const handleClassChange = (val: string) => {
    setHasUserChangedClass(true);
    setStudentClass(val);
    setErrorMsg('');
    onStudentDraftChange?.({ name, studentClass: val, studentNumber });
  };

  const handleNumberChange = (val: string) => {
    setStudentNumber(val);
    setErrorMsg('');
    onStudentDraftChange?.({ name, studentClass, studentNumber: val });
  };

  const attemptStatus = getStudentAttemptStatus(
    { name, studentClass, studentNumber },
    submissions,
    restrictions
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Harap isi Nama Lengkap terlebih dahulu.');
      return;
    }
    if (!studentClass.trim()) {
      setErrorMsg('Harap pilih Kelas terlebih dahulu.');
      return;
    }
    if (!studentNumber.trim()) {
      setErrorMsg('Harap masukkan Nomor Absen siswa.');
      return;
    }
    if (!restrictions.isQuizOpen) {
      setErrorMsg('Sesi pengerjaan kuis saat ini sedang ditutup sementara oleh Guru.');
      return;
    }
    if (!attemptStatus.isClassAllowed) {
      setErrorMsg(`Akses pengerjaan untuk Kelas ${studentClass} saat ini belum dibuka oleh Guru.`);
      return;
    }
    if (attemptStatus.isDatabaseRejected) {
      setErrorMsg(
        attemptStatus.conflictMessage ||
          `DITOLAK: Nama "${name.trim()}" tidak sesuai dengan Database Siswa/Guru untuk Kelas ${studentClass}.`
      );
      return;
    }
    if (attemptStatus.isQuotaExhausted) {
      setErrorMsg(
        `Batas pengerjaan kuis untuk ${name.trim()} (Kelas ${studentClass} • Absen ${studentNumber}) telah habis (${attemptStatus.attemptsUsed}/${attemptStatus.effectiveMaxAttempts} kali).`
      );
      return;
    }

    setErrorMsg('');
    playClickSound();
    onStartQuiz({
      name: name.trim(),
      studentClass: studentClass.trim(),
      studentNumber: studentNumber.trim(),
    });
  };

  const studyLockLabel =
    restrictions.studyModuleAccessMode === 'locked'
      ? 'Modul Ajar Dikunci Selama Sesi Ujian'
      : 'Modul Ajar Terkunci (Sudah Dilihat 1 Kali)';

  return (
    <div className="py-4 sm:py-8 max-w-2xl mx-auto px-3.5 sm:px-6">
      {/* Brand Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5 sm:mb-7"
      >
        {/* Prominent Teacher Branding */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs sm:text-base shadow-sm mb-3 sm:mb-4 border border-amber-300">
          <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100 shrink-0" />
          <span className="tracking-wide">{QUIZ_METADATA.branding}</span>
        </div>

        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight px-1">
          Interactive English Quiz: <span className="text-amber-600 underline decoration-amber-300 decoration-wavy">Introducing My self and other</span>
        </h1>
        
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-slate-600 max-w-2xl mx-auto font-medium px-2">
          Bab <span className="font-semibold text-slate-800">"Introducing My self and other"</span> (Materi Descriptive text) &bull; Buku <span className="font-semibold text-slate-800">"English for Nusantara"</span> Kelas 7
        </p>

        {/* Badges Overview: 3-column micro cards on mobile, inline on tablet/desktop */}
        <div className="mt-3.5 sm:mt-4 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 text-[11px] sm:text-sm">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1 rounded-xl bg-amber-100/90 text-amber-900 font-bold border border-amber-200 shadow-2xs text-center">
            <ChefHat className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">{totalQuestions} Soal</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1 rounded-xl bg-emerald-100/90 text-emerald-900 font-bold border border-emerald-200 shadow-2xs text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">KKM {QUIZ_METADATA.passingScore}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1 rounded-xl bg-blue-100/90 text-blue-900 font-bold border border-blue-200 shadow-2xs text-center">
            <BookOpen className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span className="truncate">K. Merdeka</span>
          </div>
        </div>

        {/* Study Module Button (1 User 1 Kali Lihat) */}
        <div className="mt-3.5 flex flex-col items-center gap-1.5">
          {onOpenProcedureStudy && (
            isStudyLocked ? (
              <div className="inline-flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 text-xs sm:text-sm font-bold shadow-2xs select-none max-w-md">
                <div className="flex items-center gap-2 text-rose-700">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{studyLockLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    Batas akses: <strong className="text-slate-900">1 User 1 Kali Lihat</strong>
                    {name.trim() ? ` (${name.trim()})` : ''}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenProcedureStudy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-98 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Pelajari Modul: Introducing My Self and Other</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </button>
            )
          )}

          {!isStudyLocked && (
            <span className="text-[11px] text-slate-500 font-medium">
              *Batas akses modul ajar: <strong>1 User 1 Kali Lihat</strong>
            </span>
          )}
        </div>

        {/* Active Student Restriction Summary Bar */}
        <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[11px] sm:text-xs text-slate-700 font-medium">
          <span className="inline-flex items-center gap-1 font-bold text-slate-900">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Aturan Pengerjaan:</span>
          </span>
          <span>
            Kuota Kuis:{' '}
            <strong className="text-slate-900">
              {restrictions.maxAttempts === 0
                ? 'Tanpa Batas'
                : `Maks. ${restrictions.maxAttempts}x / Siswa`}
            </strong>
          </span>
          <span aria-hidden="true">&bull;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
            <span>
              Waktu:{' '}
              <strong className="text-slate-900">
                {restrictions.timeLimitMinutes === 0
                  ? 'Tanpa Batas'
                  : `${restrictions.timeLimitMinutes} Menit`}
              </strong>
            </span>
          </span>
          <span aria-hidden="true">&bull;</span>
          <span>
            Status:{' '}
            <strong className={restrictions.isQuizOpen ? 'text-emerald-700' : 'text-rose-700'}>
              {restrictions.isQuizOpen ? 'Dibuka' : 'Ditutup'}
            </strong>
          </span>
          {(restrictions.antiScreenshotMode ?? 'touch_hold') !== 'off' && (
            <>
              <span aria-hidden="true">&bull;</span>
              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Mode Anti-Screenshot HP: Aktif</span>
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Student Form Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl sm:rounded-3xl p-4.5 sm:p-8 border border-amber-200/90 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100 mb-4 sm:mb-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Identitas Peserta Didik</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Lengkapi nama, kelas, dan no. absen sebelum mulai</p>
            </div>
          </div>

          <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            {restrictions.maxAttempts === 0
              ? 'Mode Latihan (Tanpa Batas)'
              : `Batas: ${restrictions.maxAttempts}x Pengerjaan / Siswa`}
          </span>
        </div>

        {/* Closed Session Warning Banner */}
        {!restrictions.isQuizOpen && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Sesi Pengerjaan Kuis Sedang Ditutup</span>
              <span className="text-rose-800">
                Guru pengawas sedang menutup sementara akses pengerjaan kuis. Silakan tunggu hingga sesi dibuka kembali.
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class Selection Dropdown */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pilih Kelas <span className="text-rose-500">*</span>
              </label>
              {studentsInSelectedClass.length > 0 && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {studentsInSelectedClass.length} Siswa Terdata di Kelas {studentClass}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                required
                value={studentClass}
                onChange={(e) => {
                  playClickSound();
                  handleClassChange(e.target.value);
                }}
                className={`w-full pl-10 pr-10 py-3 sm:py-2.5 rounded-xl border outline-hidden text-base sm:text-sm text-slate-800 transition-all font-medium bg-white appearance-none cursor-pointer ${
                  attemptStatus.isCrossClassConflict
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                }`}
              >
                <option value="" disabled>-- Pilih Kelas Anda --</option>
                {['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'].map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                    {classCounts[cls] ? ` (${classCounts[cls]} Siswa Terdata)` : ''}
                  </option>
                ))}
              </select>
              <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 sm:top-3 pointer-events-none" />
            </div>
          </div>

          {/* Visible Student Roster Quick-Select Dropdown for Selected Class */}
          {studentsInSelectedClass.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-1.5">
              <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                Pilih Nama dari Daftar Siswa Kelas {studentClass} ({studentsInSelectedClass.length} Siswa):
              </label>
              <div className="relative">
                <select
                  value={
                    studentsInSelectedClass.find(
                      (s) => normalizeStudentName(s.name) === normalizeStudentName(name)
                    )?.name || ''
                  }
                  onChange={(e) => {
                    playClickSound();
                    const chosenName = e.target.value;
                    if (!chosenName) return;
                    const matched = studentsInSelectedClass.find((s) => s.name === chosenName);
                    setName(chosenName);
                    setErrorMsg('');
                    const nextNum = matched?.studentNumber || studentNumber;
                    if (matched?.studentNumber) {
                      setStudentNumber(matched.studentNumber);
                    }
                    onStudentDraftChange?.({
                      name: chosenName,
                      studentClass,
                      studentNumber: nextNum,
                    });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-amber-300 bg-white text-xs sm:text-sm font-bold text-slate-800 outline-hidden focus:border-amber-500 appearance-none cursor-pointer"
                >
                  <option value="">-- Klik untuk Pilih Nama Siswa Kelas {studentClass} --</option>
                  {studentsInSelectedClass.map((st) => (
                    <option key={st.id} value={st.name}>
                      No. {st.studentNumber.padStart(2, '0')} - {st.name} (Kelas {st.studentClass})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-amber-700 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Student Name */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              {attemptStatus.isVerifiedInDatabase && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Terdata di Database Kelas {attemptStatus.authoritativeClass}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                list="registered-class-students"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  handleNameChange(val);
                  // Auto-fill studentNumber if matches a registered student in the selected class
                  const matched = classRegisteredStudents.find(
                    (r) => r.name.trim().toLowerCase() === val.trim().toLowerCase()
                  );
                  if (matched && matched.studentNumber) {
                    handleNumberChange(matched.studentNumber);
                  }
                }}
                placeholder="Ketik atau pilih nama lengkap siswa..."
                className={`w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-xl border outline-hidden text-base sm:text-sm text-slate-800 transition-all font-medium ${
                  attemptStatus.isDatabaseRejected
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                }`}
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3" />
              <datalist id="registered-class-students">
                {classRegisteredStudents.map((st) => (
                  <option key={st.id} value={st.name}>
                    Kelas {st.studentClass} • No. Absen {st.studentNumber}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Absen Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nomor Absen Siswa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max="60"
                required
                value={studentNumber}
                onChange={(e) => handleNumberChange(e.target.value)}
                placeholder="Contoh: 12"
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-base sm:text-sm text-slate-800 transition-all font-medium"
              />
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3" />
            </div>
          </div>

          {/* Real-time Cross-Class / Database Validation Rejection Alert */}
          {name.trim() && studentClass.trim() && attemptStatus.isDatabaseRejected && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-extrabold block text-rose-800">
                  {attemptStatus.isCrossClassConflict
                    ? 'Akses Ditolak: Nama User Digunakan di 2 Kelas!'
                    : 'Akses Ditolak: Data Tidak Sesuai Database Siswa/Guru'}
                </span>
                <p className="text-rose-900 leading-relaxed">{attemptStatus.conflictMessage}</p>
                {attemptStatus.authoritativeClass && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      handleClassChange(attemptStatus.authoritativeClass);
                      if (attemptStatus.authoritativeNumber) {
                        handleNumberChange(attemptStatus.authoritativeNumber);
                      }
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Gunakan Data Resmi Database: Kelas {attemptStatus.authoritativeClass}
                      {attemptStatus.authoritativeNumber
                        ? ` (No. Absen ${attemptStatus.authoritativeNumber})`
                        : ''}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live Attempt Quota Check for Current Student Identity */}
          {attemptStatus.isIdentityComplete && !attemptStatus.isDatabaseRejected && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                !attemptStatus.isClassAllowed
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : attemptStatus.isQuotaExhausted
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}
            >
              {!attemptStatus.isClassAllowed ? (
                <>
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Kelas {studentClass} Sedang Dibatasi</span>
                    <span>Saat ini pengerjaan kuis belum dibuka untuk Kelas {studentClass}.</span>
                  </div>
                </>
              ) : attemptStatus.isQuotaExhausted ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">
                      Batas Pengerjaan Siswa Telah Habis ({attemptStatus.attemptsUsed}/
                      {attemptStatus.effectiveMaxAttempts} Kali)
                    </span>
                    <span>
                      <strong>{name.trim()}</strong> (Kelas {studentClass} &bull; Absen {studentNumber}) sudah mengerjakan kuis ini dengan nilai terbaik{' '}
                      <strong>{attemptStatus.bestScore} Poin</strong>. Hubungi guru jika memerlukan izin pengerjaan ulang.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Kuota Pengerjaan Tersedia:{' '}
                      {attemptStatus.effectiveMaxAttempts === 0
                        ? 'Tanpa Batas'
                        : `Percobaan ke-${attemptStatus.attemptsUsed + 1} dari ${attemptStatus.effectiveMaxAttempts}`}
                    </span>
                    {attemptStatus.attemptsUsed > 0 && (
                      <span className="text-[11px] text-emerald-800">
                        Riwayat nilai sebelumnya: {attemptStatus.bestScore} Poin
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {errorMsg}
            </p>
          )}

          {/* Submit Button */}
          {(name.trim() && studentClass.trim() && attemptStatus.isDatabaseRejected) ||
          (attemptStatus.isIdentityComplete && !attemptStatus.canStartQuiz) ? (
            <div className="w-full mt-3 py-3.5 sm:py-4 px-6 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm sm:text-base flex items-center justify-center gap-2 select-none cursor-not-allowed border border-slate-300 text-center">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {!restrictions.isQuizOpen
                  ? 'Sesi Kuis Sedang Ditutup Guru'
                  : attemptStatus.isCrossClassConflict
                  ? `Ditolak: Nama Terdaftar di Kelas ${attemptStatus.authoritativeClass} (Bukan Kelas ${studentClass})`
                  : attemptStatus.isDatabaseRejected
                  ? 'Ditolak: Data Tidak Sesuai Database Siswa/Guru'
                  : !attemptStatus.isClassAllowed
                  ? `Akses Kelas ${studentClass} Sedang Dibatasi`
                  : `Sudah Mencapai Batas Pengerjaan (${attemptStatus.attemptsUsed}/${attemptStatus.effectiveMaxAttempts}x)`}
              </span>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full mt-3 py-3.5 sm:py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Mulai Mengerjakan Kuis</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </form>

        {/* Quick instructions */}
        <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-100 text-[11px] sm:text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Petunjuk &amp; Batasan Pengerjaan Soal:</span>
          </div>
          <p>&bull; Kuis terdiri dari {totalQuestions} butir soal pilihan ganda interaktif.</p>
          <p>
            &bull; Batas pengerjaan siswa:{' '}
            <strong>
              {restrictions.maxAttempts === 0
                ? 'Bebas diulang (Mode Latihan)'
                : `Maksimal ${restrictions.maxAttempts} kali pengerjaan untuk setiap siswa`}
            </strong>
            {restrictions.timeLimitMinutes > 0
              ? ` dengan waktu pengerjaan ${restrictions.timeLimitMinutes} menit.`
              : '.'}
          </p>
          <p>&bull; Hasil nilaimu akan otomatis direkap ke dalam Dashboard Guru.</p>
        </div>
      </motion.div>
    </div>
  );
};
