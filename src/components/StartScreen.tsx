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
  ChevronDown
} from 'lucide-react';
import { StudentInfo } from '../types';
import { QUIZ_METADATA } from '../data/quizData';
import { playClickSound } from '../utils/audio';

interface StartScreenProps {
  onStartQuiz: (student: StudentInfo) => void;
  onOpenTeacherAuth?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartQuiz,
  onOpenTeacherAuth,
}) => {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('7A');
  const [studentNumber, setStudentNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    setErrorMsg('');
    playClickSound();
    onStartQuiz({
      name: name.trim(),
      studentClass: studentClass.trim(),
      studentNumber: studentNumber.trim(),
    });
  };

  return (
    <div className="py-4 sm:py-8 max-w-2xl mx-auto px-3.5 sm:px-6">
      {/* Brand Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5 sm:mb-8"
      >
        {/* Prominent Teacher Branding */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs sm:text-base shadow-sm mb-3 sm:mb-4 border border-amber-300">
          <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100 shrink-0" />
          <span className="tracking-wide">{QUIZ_METADATA.branding}</span>
        </div>

        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight px-1">
          Interactive English Quiz: <span className="text-amber-600 underline decoration-amber-300 decoration-wavy">Procedure Text</span>
        </h1>
        
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-slate-600 max-w-2xl mx-auto font-medium px-2">
          Bab <span className="font-semibold text-slate-800">"Culinary and Me"</span> (Unit 3: A Secret Recipe) &bull; Buku <span className="font-semibold text-slate-800">"English for Nusantara"</span> Kelas 7
        </p>

        {/* Badges Overview: 3-column micro cards on mobile, inline on tablet/desktop */}
        <div className="mt-3.5 sm:mt-4 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 text-[11px] sm:text-sm">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1 rounded-xl bg-amber-100/90 text-amber-900 font-bold border border-amber-200 shadow-2xs text-center">
            <ChefHat className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">10 Soal</span>
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
      </motion.div>

      {/* Student Form Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl sm:rounded-3xl p-4.5 sm:p-8 border border-amber-200/90 shadow-sm"
      >
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100 mb-4 sm:mb-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Identitas Peserta Didik</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Lengkapi nama, kelas, dan no. absen sebelum mulai</p>
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
                  className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-base sm:text-sm text-slate-800 transition-all font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3" />
              </div>
            </div>

            {/* Class Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pilih Kelas <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={studentClass}
                  onChange={(e) => {
                    playClickSound();
                    setStudentClass(e.target.value);
                  }}
                  className="w-full pl-10 pr-10 py-3 sm:py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-base sm:text-sm text-slate-800 transition-all font-medium bg-white appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Kelas Anda --</option>
                  <option value="7A">Kelas 7A</option>
                  <option value="7B">Kelas 7B</option>
                  <option value="7C">Kelas 7C</option>
                  <option value="7D">Kelas 7D</option>
                  <option value="7E">Kelas 7E</option>
                  <option value="7F">Kelas 7F</option>
                  <option value="7G">Kelas 7G</option>
                  <option value="7H">Kelas 7H</option>
                </select>
                <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 sm:top-3 pointer-events-none" />
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
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="Contoh: 12"
                  className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-base sm:text-sm text-slate-800 transition-all font-medium"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3" />
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
              className="w-full mt-3 py-3.5 sm:py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Mulai Mengerjakan Kuis</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Quick instructions */}
          <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-100 text-[11px] sm:text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Petunjuk Pengerjaan Soal:</span>
            </div>
            <p>&bull; Kuis terdiri dari 10 butir soal pilihan ganda interaktif.</p>
            <p>&bull; Bacalah teks resep dan perhatikan kata kerja instruksi (action verbs) serta urutan langkahnya.</p>
            <p>&bull; Hasil nilaimu akan otomatis direkap ke dalam Dashboard Guru.</p>
          </div>
        </motion.div>
    </div>
  );
};
