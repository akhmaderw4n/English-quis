import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  BookOpen, 
  Utensils, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  User, 
  School, 
  Hash, 
  ArrowRight, 
  ShieldCheck, 
  GraduationCap, 
  ChefHat, 
  ChevronDown, 
  ChevronUp,
  Flame,
  ListOrdered
} from 'lucide-react';
import { StudentInfo } from '../types';
import { QUIZ_METADATA, PROCEDURE_TEXT_SUMMARY } from '../data/quizData';
import { playClickSound } from '../utils/audio';

interface StartScreenProps {
  onStartQuiz: (student: StudentInfo) => void;
  onOpenTeacherAuth: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartQuiz,
  onOpenTeacherAuth,
}) => {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('7A');
  const [studentNumber, setStudentNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Harap isi Nama Lengkap terlebih dahulu.');
      return;
    }
    if (!studentNumber.trim()) {
      setErrorMsg('Harap masukkan Nomor Absen siswa.');
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

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Brand Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        {/* Prominent Teacher Branding */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-sm sm:text-base shadow-md mb-4 border border-amber-300">
          <GraduationCap className="w-5 h-5 text-amber-100" />
          <span className="tracking-wide">{QUIZ_METADATA.branding}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Interactive English Quiz: <span className="text-amber-600 underline decoration-amber-300 decoration-wavy">Procedure Text</span>
        </h1>
        
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
          Materi Bab <span className="font-semibold text-slate-800">"Culinary and Me"</span> (Unit 3: A Secret Recipe) &bull; Buku Siswa <span className="font-semibold text-slate-800">"English for Nusantara"</span> Kelas 7 SMP
        </p>

        {/* Badges Overview */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-100/80 text-amber-800 font-semibold border border-amber-200">
            <ChefHat className="w-3.5 h-3.5 text-amber-700" /> 10 Soal Pilihan Ganda
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 font-semibold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> KKM: {QUIZ_METADATA.passingScore} Poin
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-100/80 text-blue-800 font-semibold border border-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" /> Kurikulum Merdeka (Fase D)
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Student Form Box (Left/Main Column) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="md:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-amber-200 shadow-sm"
        >
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Identitas Peserta Didik</h2>
              <p className="text-xs text-slate-500">Silakan lengkapi data dirimu sebelum memulai kuis</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Galang Pratama"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-sm text-slate-800 transition-all font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Class & Absen Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kelas <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-sm text-slate-800 transition-all font-medium bg-white appearance-none"
                  >
                    <option value="7A">Kelas 7A</option>
                    <option value="7B">Kelas 7B</option>
                    <option value="7C">Kelas 7C</option>
                    <option value="7D">Kelas 7D</option>
                    <option value="7E">Kelas 7E</option>
                    <option value="7F">Kelas 7F</option>
                    <option value="7G">Kelas 7G</option>
                    <option value="7H">Kelas 7H</option>
                  </select>
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor Absen <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="Contoh: 12"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-sm text-slate-800 transition-all font-medium"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {errorMsg}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-6 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Mulai Mengerjakan Kuis</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Quick instructions */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Petunjuk Pengerjaan:</span>
            </div>
            <p>&bull; Kuis terdiri dari 10 butir soal pilihan ganda interaktif.</p>
            <p>&bull; Bacalah teks resep dan perhatikan kata kerja instruksi (action verbs) serta urutan langkahnya dengan teliti.</p>
            <p>&bull; Hasil nilaimu akan otomatis direkap ke dalam Dashboard Guru.</p>
          </div>
        </motion.div>

        {/* Right Column: Mini Study Review & Teacher Access */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-5 space-y-4"
        >
          {/* Procedure Text Mini Summary Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-2xs">
            <div 
              onClick={() => setShowSummary(!showSummary)}
              className="flex items-center justify-between cursor-pointer group select-none"
            >
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Ringkasan Materi Bab 2
                </h3>
              </div>
              <button 
                type="button"
                className="text-xs font-semibold text-amber-800 bg-amber-200/70 px-2.5 py-1 rounded-md flex items-center gap-1"
              >
                <span>{showSummary ? 'Tutup' : 'Lihat'}</span>
                {showSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Ingin me-review struktur resep makanan &amp; kosakata memasak sebelum mengerjakan kuis?
            </p>

            <AnimatePresence>
              {showSummary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-3 text-xs text-slate-700 space-y-3"
                >
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <p className="font-bold text-amber-900 mb-1">Struktur Teks Prosedur (Recipe):</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      <li><strong className="text-slate-800">Goal/Aim:</strong> Judul resep (e.g. How to Make Banana Fritters)</li>
                      <li><strong className="text-slate-800">Ingredients:</strong> Bahan makanan (flour, bananas, salt)</li>
                      <li><strong className="text-slate-800">Tools/Utensils:</strong> Alat masak (spatula, frying pan, sieve)</li>
                      <li><strong className="text-slate-800">Steps:</strong> Langkah urutan memasak</li>
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <p className="font-bold text-amber-900 mb-1">Language Features (Unsur Bahasa):</p>
                    <p className="text-slate-600 mb-1">&bull; <strong>Action Verbs (Imperative):</strong> <em>Peel</em> (mengupas), <em>Chop</em> (mencincang), <em>Pour</em> (menuang), <em>Stir</em> (mengaduk), <em>Fry</em> (menggoreng), <em>Drain</em> (meniriskan).</p>
                    <p className="text-slate-600">&bull; <strong>Sequence Adverbs:</strong> <em>First, Next, Then, After that, Finally.</em></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Teacher Dashboard Entry Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100">Portal Guru / Pengajar</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Guru dapat melihat rekapitulasi nilai seluruh peserta didik, analisis butir soal per nomor, serta mengunduh rekap dalam format Excel/CSV.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-amber-300/90 font-mono bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                PIN Default: 1234
              </span>
              <button
                type="button"
                onClick={onOpenTeacherAuth}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reference Attribution Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Sumber Rujukan Materi Resmi:</span>
            </div>
            <p>Buku Siswa Bahasa Inggris: <em>English for Nusantara untuk SMP/MTs Kelas VII</em>, Pusat Perbukuan, Kemendikbudristek RI.</p>
            <p className="text-amber-800 font-medium">Chapter 2: Culinary and Me (Unit 1, 2, dan 3: A Secret Recipe)</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
