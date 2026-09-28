import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Users,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Award,
  PlusCircle,
  Sliders,
  X,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { StudentRestrictionConfig, QuizSubmission } from '../types';
import { ALL_CLASS_LIST, QUIZ_METADATA, buildNormalizedStudentKey } from '../data/quizData';
import { playClickSound } from '../utils/audio';

interface StudentRestrictionPanelProps {
  config: StudentRestrictionConfig;
  submissions: QuizSubmission[];
  onUpdateConfig: (newConfig: StudentRestrictionConfig) => void;
  onResetStudyModuleViews?: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const StudentRestrictionPanel: React.FC<StudentRestrictionPanelProps> = ({
  config,
  submissions,
  onUpdateConfig,
  onResetStudyModuleViews,
  isModal = false,
  onCloseModal,
}) => {
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>('ALL');

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3200);
  };

  const handleSelectMaxAttempts = (maxAttempts: number) => {
    playClickSound();
    const updated: StudentRestrictionConfig = {
      ...config,
      maxAttempts,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(
      maxAttempts === 0
        ? 'Batas pengerjaan diatur ke: Tanpa Batas (Latihan)'
        : `Batas pengerjaan siswa diatur ke: Maksimal ${maxAttempts}x Pengerjaan`
    );
  };

  const handleSelectTimeLimit = (timeLimitMinutes: number) => {
    playClickSound();
    const updated: StudentRestrictionConfig = {
      ...config,
      timeLimitMinutes,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(
      timeLimitMinutes === 0
        ? 'Durasi waktu diatur ke: Tanpa Batas Waktu'
        : `Batas waktu pengerjaan diatur ke: ${timeLimitMinutes} Menit`
    );
  };

  const handleToggleQuizOpen = () => {
    playClickSound();
    const nextOpen = !config.isQuizOpen;
    const updated: StudentRestrictionConfig = {
      ...config,
      isQuizOpen: nextOpen,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(
      nextOpen
        ? 'Akses pengerjaan kuis siswa: DIBUKA'
        : 'Akses pengerjaan kuis siswa: DITUTUP SEMENTARA'
    );
  };

  const handleToggleRemedial = () => {
    playClickSound();
    const nextVal = !config.allowRemedialIfBelowKKM;
    const updated: StudentRestrictionConfig = {
      ...config,
      allowRemedialIfBelowKKM: nextVal,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(
      nextVal
        ? 'Remedial otomatis (+1x jika nilai < KKM 75) diaktifkan'
        : 'Remedial otomatis dinonaktifkan'
    );
  };

  const handleToggleReviewAfterQuiz = () => {
    playClickSound();
    const nextVal = !config.allowReviewAfterQuiz;
    const updated: StudentRestrictionConfig = {
      ...config,
      allowReviewAfterQuiz: nextVal,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(
      nextVal
        ? 'Pembahasan soal setelah selesai kuis: Diizinkan'
        : 'Pembahasan soal setelah selesai kuis: Disembunyikan'
    );
  };

  const handleSelectStudyModuleMode = (mode: 'once_per_user' | 'unlimited' | 'locked') => {
    playClickSound();
    const updated: StudentRestrictionConfig = {
      ...config,
      studyModuleAccessMode: mode,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    const label =
      mode === 'once_per_user'
        ? '1 User 1 Kali Lihat'
        : mode === 'locked'
        ? 'Terkunci Penuh Selama Ujian'
        : 'Bebas Lihat (Tanpa Batas)';
    showToast(`Batas Modul Ajar diatur ke: ${label}`);
  };

  const handleToggleAllowedClass = (cls: string) => {
    playClickSound();
    const exists = config.allowedClasses.includes(cls);
    const nextClasses = exists
      ? config.allowedClasses.filter((c) => c !== cls)
      : [...config.allowedClasses, cls].sort();
    const updated: StudentRestrictionConfig = {
      ...config,
      allowedClasses: nextClasses,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
  };

  const handleSelectAllClasses = () => {
    playClickSound();
    const updated: StudentRestrictionConfig = {
      ...config,
      allowedClasses: [...ALL_CLASS_LIST],
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast('Semua kelas (7A - 7H) diizinkan mengerjakan kuis');
  };

  // Group submissions by student to display attempt usage per student
  const studentUsageList = React.useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        studentName: string;
        studentClass: string;
        studentNumber: string;
        attempts: number;
        bestScore: number;
        lastSubmittedAt: string;
      }
    >();

    submissions.forEach((sub) => {
      const key = buildNormalizedStudentKey({
        name: sub.studentName,
        studentClass: sub.studentClass,
        studentNumber: sub.studentNumber,
      });
      if (!key) return;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          studentName: sub.studentName,
          studentClass: sub.studentClass,
          studentNumber: sub.studentNumber,
          attempts: 1,
          bestScore: sub.score,
          lastSubmittedAt: sub.submittedAt,
        });
      } else {
        existing.attempts += 1;
        existing.bestScore = Math.max(existing.bestScore, sub.score);
      }
    });

    const arr = Array.from(map.values());
    // Sort by class then attendance number (Nomor Absen)
    arr.sort((a, b) => {
      const classCmp = a.studentClass.localeCompare(b.studentClass, 'id');
      if (classCmp !== 0 && classFilter === 'ALL') return classCmp;
      const numA = parseInt(a.studentNumber, 10) || 9999;
      const numB = parseInt(b.studentNumber, 10) || 9999;
      if (numA !== numB) return numA - numB;
      return a.studentName.localeCompare(b.studentName, 'id');
    });

    return classFilter === 'ALL'
      ? arr
      : arr.filter((item) => item.studentClass === classFilter);
  }, [submissions, classFilter]);

  const handleGrantExtraAttempt = (studentKey: string, studentName: string) => {
    playClickSound();
    const currentGrants = config.extraAttemptGrants || {};
    const nextCount = (currentGrants[studentKey] || 0) + 1;
    const updated: StudentRestrictionConfig = {
      ...config,
      extraAttemptGrants: {
        ...currentGrants,
        [studentKey]: nextCount,
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(`Berhasil memberi +1 kesempatan pengerjaan ulang untuk ${studentName}`);
  };

  const handleResetStudentExtraGrant = (studentKey: string, studentName: string) => {
    playClickSound();
    const nextGrants = { ...(config.extraAttemptGrants || {}) };
    delete nextGrants[studentKey];
    const updated: StudentRestrictionConfig = {
      ...config,
      extraAttemptGrants: nextGrants,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
    showToast(`Kuota tambahan untuk ${studentName} dikembalikan ke batas standar`);
  };

  const content = (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Menu Batasan Pengerjaan Siswa
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  config.isQuizOpen
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {config.isQuizOpen ? 'Sesi Kuis: Dibuka' : 'Sesi Kuis: Ditutup'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur batas berapa kali siswa dapat mengerjakan kuis, batas durasi waktu, kelas yang diizinkan, serta akses modul ajar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleToggleQuizOpen}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              config.isQuizOpen
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {config.isQuizOpen ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Tutup Pengerjaan Kuis</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Buka Pengerjaan Kuis</span>
              </>
            )}
          </button>

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onCloseModal();
              }}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {savedToast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Batas Jumlah Pengerjaan Kuis per Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                1. Batas Jumlah Pengerjaan per Siswa
              </h4>
              <p className="text-[11px] text-slate-500">
                Batasi berapa kali setiap siswa (Nama, Kelas &amp; No. Absen) boleh mengerjakan kuis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { value: 1, title: '1 Kali Pengerjaan', desc: '1 Siswa 1x Kerjakan (Ketat)' },
              { value: 2, title: '2 Kali Pengerjaan', desc: 'Maksimal 2x Percobaan' },
              { value: 3, title: '3 Kali Pengerjaan', desc: 'Maksimal 3x Percobaan' },
              { value: 0, title: 'Tanpa Batas', desc: 'Bebas Ulangi (Latihan)' },
            ].map((opt) => {
              const isSelected = config.maxAttempts === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectMaxAttempts(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/50 text-amber-950'
                      : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-extrabold text-xs sm:text-sm">{opt.title}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{opt.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Remedial Option */}
          {config.maxAttempts > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Remedial Otomatis (+1x) Jika Nilai &lt; KKM ({QUIZ_METADATA.passingScore})
                </span>
                <span className="text-[11px] text-slate-500">
                  Siswa yang belum mencapai KKM mendapat 1 kesempatan perbaikan otomatis
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleRemedial}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  config.allowRemedialIfBelowKKM
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {config.allowRemedialIfBelowKKM ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Batas Waktu Pengerjaan (Durasi Timer) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                2. Batas Waktu Pengerjaan (Durasi Ujian)
              </h4>
              <p className="text-[11px] text-slate-500">
                Jika waktu habis, jawaban siswa akan otomatis dikumpulkan ke sistem
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { mins: 0, label: 'Tanpa Batas' },
              { mins: 15, label: '15 Menit' },
              { mins: 20, label: '20 Menit' },
              { mins: 30, label: '30 Menit' },
              { mins: 45, label: '45 Menit' },
              { mins: 60, label: '60 Menit' },
            ].map((item) => {
              const isSelected = config.timeLimitMinutes === item.mins;
              return (
                <button
                  key={item.mins}
                  type="button"
                  onClick={() => handleSelectTimeLimit(item.mins)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
            <strong>Status Timer Saat Ini:</strong>{' '}
            {config.timeLimitMinutes === 0
              ? 'Tanpa Batas Waktu (Siswa mengerjakan dengan penghitung waktu maju).'
              : `Hitung Mundur ${config.timeLimitMinutes} Menit (Jawaban otomatis tersimpan saat waktu 00:00).`}
          </div>
        </div>

        {/* Card 3: Batasan Kelas yang Diizinkan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  3. Batasan Kelas yang Diizinkan Mengerjakan
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pilih kelas mana saja yang sedang dibuka akses ujiannya
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectAllClasses}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer shrink-0"
            >
              Pilih Semua
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {ALL_CLASS_LIST.map((cls) => {
              const isAllowed = config.allowedClasses.includes(cls);
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => handleToggleAllowedClass(cls)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isAllowed
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  {isAllowed ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                  <span>Kelas {cls}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500">
            Kelas aktif ({config.allowedClasses.length}/8):{' '}
            <strong className="text-slate-800">
              {config.allowedClasses.length > 0 ? config.allowedClasses.join(', ') : 'Tidak ada kelas dipilih'}
            </strong>
          </p>
        </div>

        {/* Card 4: Batasan Akses Modul Ajar & Pembahasan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                4. Batasan Modul Ajar &amp; Pembahasan Soal
              </h4>
              <p className="text-[11px] text-slate-500">
                Atur akses siswa ke modul materi dan kunci pembahasan setelah ujian
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'once_per_user', label: '1 User 1x Lihat', desc: 'Terkunci setelah 1x lihat' },
              { id: 'locked', label: 'Kunci Modul', desc: 'Tutup selama ujian' },
              { id: 'unlimited', label: 'Bebas Lihat', desc: 'Buka tanpa batas' },
            ].map((m) => {
              const isSelected = config.studyModuleAccessMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    handleSelectStudyModuleMode(m.id as 'once_per_user' | 'unlimited' | 'locked')
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-400 text-purple-950'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{m.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{m.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {config.allowReviewAfterQuiz ? (
                <Eye className="w-4 h-4 text-emerald-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-rose-500" />
              )}
              <span className="text-xs font-bold text-slate-700">
                Pembahasan Soal Setelah Selesai Kuis:
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleReviewAfterQuiz}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                config.allowReviewAfterQuiz
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {config.allowReviewAfterQuiz ? 'Diizinkan' : 'Disembunyikan'}
            </button>
          </div>

          {onResetStudyModuleViews && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Reset status 1x lihat modul ajar pada perangkat ini:
              </span>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onResetStudyModuleViews();
                  showToast('Kuota lihat modul ajar berhasil direset untuk semua user di perangkat ini');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Kuota Modul</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Tabel Pantauan Kuota Pengerjaan Siswa & Beri Kesempatan Ulang */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Pantauan Kuota Pengerjaan Siswa &amp; Izin Ulang</span>
            </h4>
            <p className="text-xs text-slate-500">
              Daftar siswa yang telah mengerjakan beserta sisa kuota pengerjaan mereka (Klik <strong>+1 Kesempatan</strong> untuk mengizinkan siswa mengulang)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filter Kelas:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
            >
              <option value="ALL">Semua Kelas ({submissions.length})</option>
              {ALL_CLASS_LIST.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {studentUsageList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            Belum ada siswa yang tercatat mengerjakan kuis pada filter kelas ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">No. Absen</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Nilai Terbaik</th>
                  <th className="py-2.5 px-3">Jumlah Pengerjaan</th>
                  <th className="py-2.5 px-3">Status Kuota</th>
                  <th className="py-2.5 px-3 text-right">Aksi Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentUsageList.map((st) => {
                  const extra = config.extraAttemptGrants?.[st.key] || 0;
                  const remedial =
                    config.maxAttempts > 0 &&
                    config.allowRemedialIfBelowKKM &&
                    st.bestScore < QUIZ_METADATA.passingScore
                      ? 1
                      : 0;
                  const maxAllowed =
                    config.maxAttempts > 0 ? config.maxAttempts + extra + remedial : 0;
                  const isLocked = maxAllowed > 0 && st.attempts >= maxAllowed;

                  return (
                    <tr key={st.key} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {st.studentNumber}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{st.studentName}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        Kelas {st.studentClass}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-extrabold ${
                            st.bestScore >= QUIZ_METADATA.passingScore
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {st.bestScore} Poin
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {st.attempts} / {maxAllowed === 0 ? '∞' : maxAllowed} Kali
                        {extra > 0 && (
                          <span className="ml-1.5 text-[10px] text-amber-700 font-sans">
                            (+{extra} Izin Guru)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span>Kuota Habis (Terkunci)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bisa Mengerjakan</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleGrantExtraAttempt(st.key, st.studentName)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Berikan +1 kesempatan pengerjaan ulang untuk siswa ini"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+1 Kesempatan</span>
                          </button>
                          {extra > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetStudentExtraGrant(st.key, st.studentName)}
                              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] cursor-pointer"
                              title="Reset kuota tambahan siswa ini"
                            >
                              Reset
                            </button>
                          )}
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
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-slate-50 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
};
