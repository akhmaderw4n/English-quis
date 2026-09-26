/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Printer, 
  Download, 
  Check, 
  Share2, 
  Award, 
  GraduationCap, 
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  Laptop,
  Palette
} from 'lucide-react';
import { StudentInfo, QuizSubmission } from '../types';
import { QUIZ_METADATA, QUIZ_QUESTIONS } from '../data/quizData';
import { 
  executePrintStudentScore, 
  downloadStudentReportHtml, 
  openStudentCertificateInNewTab,
  PrintDocumentOptions
} from '../utils/printReport';
import { playClickSound, playCorrectSound } from '../utils/audio';

interface PrintCertificateModalProps {
  student: StudentInfo;
  submission: QuizSubmission;
  onClose: () => void;
}

export const PrintCertificateModal: React.FC<PrintCertificateModalProps> = ({
  student,
  submission,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Letter'>('A4');
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');

  const isPassed = submission.score >= QUIZ_METADATA.passingScore;
  const isGrayscale = colorMode === 'grayscale';

  const durationMins = Math.floor((submission.timeSpentSeconds || 0) / 60);
  const durationSecs = (submission.timeSpentSeconds || 0) % 60;

  const dateFormatted = new Date(submission.submittedAt || Date.now()).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const printOptions: PrintDocumentOptions = {
    paperSize,
    colorMode,
    isLandscape: false,
  };

  const handlePrintClick = () => {
    playClickSound();
    setIsPrinting(true);
    executePrintStudentScore(student, submission, printOptions);
    setTimeout(() => {
      setIsPrinting(false);
    }, 2500);
  };

  const handleOpenInNewTab = () => {
    playClickSound();
    openStudentCertificateInNewTab(student, submission, printOptions);
  };

  const handleDownloadClick = () => {
    playClickSound();
    downloadStudentReportHtml(student, submission, printOptions);
  };

  const handleCopySummary = () => {
    playClickSound();
    const text = `*BUKTI HASIL KUIS BAHASA INGGRIS - KELAS 7 SMP*
Judul: *${QUIZ_METADATA.title}*
Topik: Procedure Text (Chapter 2: Culinary and Me)
Buku: English for Nusantara
Guru: ${QUIZ_METADATA.branding}

Nama: *${student.name}*
Kelas: *${student.studentClass}*
No. Absen: *${student.studentNumber}*
Nilai Akhir: *${submission.score}/100*
Status: *${isPassed ? 'TUNTAS (KKM >= 75)' : 'BELUM TUNTAS'}*
Jawaban Benar: ${submission.correctCount} / 10 Soal
Durasi: ${durationMins}m ${durationSecs}s
Waktu Tes: ${dateFormatted}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      playCorrectSound();
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // fallback
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-none sm:rounded-3xl max-w-3xl w-full h-full sm:h-auto sm:max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-amber-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Cetak Bukti Nilai Kuis Siswa
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                Dokumen resmi penilaian peserta didik &bull; {QUIZ_METADATA.branding}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white active:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printer Adjustment & Readiness Bar */}
        <div className="bg-slate-900 text-white px-3.5 sm:px-5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-emerald-400">Printer Komputer: Siap (Ready)</span>
            <span className="text-slate-400 hidden lg:inline">&bull; Terhubung ke Seluruh Driver Printer Komputer (Epson, Canon, HP, Brother, PDF)</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <label htmlFor="paper-size-select" className="text-[11px] text-slate-300">Kertas:</label>
              <select
                id="paper-size-select"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="bg-transparent text-white font-bold text-[11px] outline-hidden cursor-pointer"
              >
                <option value="A4" className="bg-slate-900 text-white">A4 (210×297 mm)</option>
                <option value="F4" className="bg-slate-900 text-white">F4 / Folio (215×330 mm)</option>
                <option value="Letter" className="bg-slate-900 text-white">Letter (216×279 mm)</option>
              </select>
            </div>

            {/* Ink Mode Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <label htmlFor="color-mode-select" className="text-[11px] text-slate-300">Warna:</label>
              <select
                id="color-mode-select"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as any)}
                className="bg-transparent text-white font-bold text-[11px] outline-hidden cursor-pointer"
              >
                <option value="color" className="bg-slate-900 text-white">Berwarna Penuh</option>
                <option value="grayscale" className="bg-slate-900 text-white">Hemat Tinta (B&amp;W)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <span className="text-slate-500">Format Lembar:</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
              {paperSize} Portrait &bull; {colorMode === 'color' ? 'Full Color' : 'Hitam-Putih (Hemat Tinta)'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrintClick}
              disabled={isPrinting}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-75 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Kirim lembar nilai langsung ke printer komputer yang ready atau simpan sebagai PDF"
            >
              <Printer className={`w-3.5 h-3.5 ${isPrinting ? 'animate-bounce' : ''}`} />
              <span>{isPrinting ? 'Membuka Printer...' : 'Cetak Sekarang'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Buka dokumen di tab baru peramban untuk cetak langsung"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Tab Baru</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadClick}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Simpan file lembar hasil kuis dalam format HTML mandiri"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh File</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Salin teks ringkasan nilai ke clipboard untuk WhatsApp"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Ringkasan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Certificate Paper Preview (Realistic A4 Look) */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 bg-slate-100/80">
          {/* Quick printer dialog guidance */}
          <div className="max-w-2xl mx-auto mb-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
            <Laptop className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Petunjuk Printer Komputer:</strong> Saat kotak dialog cetak peramban terbuka, pilih printer Anda pada menu <em>Destination / Tujuan</em> yang berstatus <strong>Ready / Siap</strong> (contoh: Epson, Canon, HP, Brother, atau Simpan sebagai PDF). Pastikan opsi <em>Background graphics</em> dicentang agar warna tabel dan tanda kelulusan tercetak rapi.
            </div>
          </div>

          <div className={`bg-white border-2 border-slate-300 rounded-xl p-5 sm:p-8 shadow-sm max-w-2xl mx-auto text-slate-800 text-xs sm:text-sm ${
            isGrayscale ? 'grayscale' : ''
          }`}>
            {/* Header / Kop */}
            <div className="text-center pb-4 mb-4 border-b-2 border-double border-slate-900">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase mb-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                <span>Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI</span>
              </div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900">
                Laporan Hasil Penilaian Kuis Pembelajaran Siswa
              </h2>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                Mata Pelajaran: Bahasa Inggris &bull; Kelas VII SMP (Kurikulum Merdeka)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Buku Siswa: <em>English for Nusantara</em> &bull; Chapter 2: Culinary and Me (Procedure Text)
              </p>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Nama Siswa:</span>
                  <strong className="text-slate-900">{student.name}</strong>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Kelas:</span>
                  <strong className="text-slate-900">Kelas {student.studentClass}</strong>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Nomor Absen:</span>
                  <strong className="text-slate-900">{student.studentNumber}</strong>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Tanggal Ujian:</span>
                  <span className="text-slate-800">{dateFormatted}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Durasi Kerja:</span>
                  <span className="text-slate-800">{durationMins} m {durationSecs} dtk</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Standar KKM:</span>
                  <strong className="text-amber-800">{QUIZ_METADATA.passingScore} (Tujuh Puluh Lima)</strong>
                </div>
              </div>
            </div>

            {/* Score & Status Banner */}
            <div className={`p-4 rounded-xl border-2 flex items-center justify-between gap-4 mb-4 ${
              isPassed 
                ? 'bg-emerald-50/70 border-emerald-300' 
                : 'bg-rose-50/70 border-rose-300'
            }`}>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Nilai Akhir (Skala 0-100)
                </div>
                <div className={`text-3xl sm:text-4xl font-black leading-tight ${
                  isPassed ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {submission.score} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                  <span>Benar: <strong>{submission.correctCount}</strong></span>
                  &bull;
                  <span>Salah: <strong>{submission.wrongCount}</strong></span>
                  &bull;
                  <span>Total: <strong>10 Soal</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                  isPassed 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-rose-600 text-white shadow-xs'
                }`}>
                  {isPassed ? 'TUNTAS (LULUS KKM)' : 'BELUM TUNTAS'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  {isPassed ? 'Memenuhi Standar KKM' : 'Membutuhkan Remedial'}
                </p>
              </div>
            </div>

            {/* Question Breakdown Table */}
            <div className="mb-4">
              <div className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Rincian Butir Soal (10 Soal Pilihan Ganda):</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2 px-2.5 text-center w-8">No</th>
                      <th className="py-2 px-3">Topik Materi</th>
                      <th className="py-2 px-2.5 text-center w-16">Jawaban</th>
                      <th className="py-2 px-2.5 text-center w-16">Kunci</th>
                      <th className="py-2 px-2.5 text-center w-24">Hasil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {QUIZ_QUESTIONS.map((q, idx) => {
                      const ans = submission.answers[q.id];
                      const correct = ans === q.correctAnswer;
                      return (
                        <tr key={q.id} className={correct ? 'hover:bg-emerald-50/20' : 'hover:bg-rose-50/20'}>
                          <td className="py-1.5 px-2.5 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="py-1.5 px-3 text-slate-700">{q.topic}</td>
                          <td className="py-1.5 px-2.5 text-center font-bold">
                            <span className={correct ? 'text-emerald-700' : 'text-rose-600'}>
                              {ans || '-'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700">
                            {q.correctAnswer}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold">
                            {correct ? (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                Benar (+10)
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                                Salah (+0)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teacher Remarks */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-0.5">Catatan Evaluasi Guru:</strong>
              {isPassed ? (
                <span>
                  Siswa telah menunjukkan penguasaan yang sangat baik terhadap materi Procedure Text (resep masakan dan minuman nusantara), memahami struktur teks (*Goal, Ingredients, Tools, Steps*), serta penggunaan *Action Verbs* dan *Sequence Words*.
                </span>
              ) : (
                <span>
                  Siswa disarankan untuk mengulang kembali materi tentang kosakata kata kerja memasak (*action verbs*) dan kata urutan langkah (*sequence words* seperti *first, second, then, next, finally*) pada Buku Siswa *English for Nusantara* Bab 2.
                </span>
              )}
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-4 text-center text-xs pt-2">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-semibold text-slate-800">Orang Tua / Wali Siswa</p>
                <div className="h-12"></div>
                <p className="text-slate-800 font-semibold underline">( ............................................ )</p>
              </div>

              <div>
                <p className="text-slate-600">Guru Pengampu Bahasa Inggris,</p>
                <p className="font-bold text-slate-900">SMP / MTs</p>
                <div className="h-12"></div>
                <p className="font-bold text-slate-900 underline">{QUIZ_METADATA.teacherName}</p>
                <p className="text-[10px] text-slate-500">{QUIZ_METADATA.branding}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-600 hidden sm:flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Dialog cetak komputer akan terbuka &bull; Pilih printer yang statusnya <strong>Ready</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Buka lembar cetak di tab baru browser"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Tab Baru</span>
            </button>

            <button
              type="button"
              onClick={handlePrintClick}
              disabled={isPrinting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-75 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-bounce' : ''}`} />
              <span>{isPrinting ? 'Membuka Dialog Printer Komputer...' : 'Cetak Sekarang (Pilih Printer Ready)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
