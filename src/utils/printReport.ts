/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentInfo, QuizSubmission, Question } from '../types';
import {
  QUIZ_QUESTIONS,
  QUIZ_METADATA,
  hasStudentSubmittedQuiz,
  getSubmissionAssessmentStatus,
} from '../data/quizData';

export interface PrintDocumentOptions {
  paperSize?: 'A4' | 'F4' | 'Letter';
  colorMode?: 'color' | 'grayscale';
  isLandscape?: boolean;
  includeQuestionColumns?: boolean;
  activeQuestions?: Question[];
}

/**
 * Generates an official, printable HTML document for an individual student's quiz result,
 * optimized to fit perfectly on standard computer printers (Epson, Canon, HP, Brother, PDF).
 */
export function generateStudentCertificateHtml(
  student: StudentInfo,
  submission: QuizSubmission,
  options: PrintDocumentOptions = {}
): string {
  const { paperSize = 'A4', colorMode = 'color' } = options;
  const isPassed = submission.score >= QUIZ_METADATA.passingScore;
  const isGrayscale = colorMode === 'grayscale';

  const dateFormatted = new Date(submission.submittedAt || Date.now()).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const durationMins = Math.floor((submission.timeSpentSeconds || 0) / 60);
  const durationSecs = (submission.timeSpentSeconds || 0) % 60;

  // Breakdown rows
  const questionRows = QUIZ_QUESTIONS.map((q, idx) => {
    const studentAns = submission.answers[q.id];
    const isCorrect = studentAns === q.correctAnswer;
    
    const ansColor = isGrayscale 
      ? '#0f172a' 
      : (isCorrect ? '#15803d' : '#be123c');
    
    const statusText = isCorrect ? 'BENAR (+10)' : 'SALAH (+0)';
    const statusBadgeStyle = isGrayscale
      ? (isCorrect ? 'font-weight: bold; color: #0f172a;' : 'font-weight: bold; color: #475569; text-decoration: line-through;')
      : `font-weight: bold; color: ${isCorrect ? '#15803d' : '#be123c'};`;

    return `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10.5px; page-break-inside: avoid;">
        <td style="padding: 4px 6px; text-align: center;">${idx + 1}</td>
        <td style="padding: 4px 6px;">${q.topic}</td>
        <td style="padding: 4px 6px; text-align: center; font-weight: bold; color: ${ansColor};">${studentAns || '-'}</td>
        <td style="padding: 4px 6px; text-align: center; font-weight: bold; color: #0f172a;">${q.correctAnswer}</td>
        <td style="padding: 4px 6px; text-align: center; ${statusBadgeStyle}">
          ${statusText}
        </td>
      </tr>
    `;
  }).join('');

  // Page size CSS rule
  let pageSizeRule = 'A4 portrait';
  if (paperSize === 'F4') {
    pageSizeRule = '215mm 330mm portrait';
  } else if (paperSize === 'Letter') {
    pageSizeRule = 'letter portrait';
  }

  // Theme colors
  const passBg = isGrayscale ? '#f8fafc' : (isPassed ? '#f0fdf4' : '#fff1f2');
  const passBorder = isGrayscale ? '#334155' : (isPassed ? '#16a34a' : '#e11d48');
  const passTextColor = isGrayscale ? '#0f172a' : (isPassed ? '#15803d' : '#be123c');
  const statusBadgeBg = isGrayscale ? '#1e293b' : (isPassed ? '#15803d' : '#be123c');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Bukti_Nilai_${student.name.replace(/\s+/g, '_')}_Kelas_${student.studentClass}</title>
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.3;
      padding: 4px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
      border: 1.5px solid #0f172a;
      padding: 16px 20px;
      border-radius: 4px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .kop {
      text-align: center;
      border-bottom: 2.5px double #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .kop h1 {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kop h2 {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 2px;
    }
    .kop p {
      font-size: 10px;
      color: #64748b;
    }
    .title-badge {
      text-align: center;
      margin: 8px 0;
    }
    .title-badge span {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 14px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 10px;
      border-collapse: collapse;
    }
    .info-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .info-table td {
      padding: 2px 4px;
      font-size: 10.5px;
    }
    .info-table td.label {
      font-weight: bold;
      color: #475569;
      width: 105px;
    }
    .score-banner {
      background: ${passBg} !important;
      border: 1.5px solid ${passBorder} !important;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .score-big {
      font-size: 26px;
      font-weight: 900;
      color: ${passTextColor};
      line-height: 1;
    }
    .score-desc {
      font-size: 10.5px;
      color: #334155;
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 800;
      background: ${statusBadgeBg} !important;
      color: #ffffff !important;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    table.data-table th {
      background: #f1f5f9 !important;
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: bold;
      color: #334155;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
    }
    .notes-box {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 10px;
      color: #334155;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .sig-area {
      display: table;
      width: 100%;
      margin-top: 10px;
      page-break-inside: avoid;
    }
    .sig-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      text-align: center;
      font-size: 10.5px;
    }
    .sig-space {
      height: 42px;
    }
    .sig-name {
      font-weight: bold;
      text-decoration: underline;
    }
    .printer-tip-bar {
      margin-top: 8px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
        background: transparent !important;
      }
      .container {
        border: 1px solid #0f172a;
        box-shadow: none;
        padding: 12px 16px;
      }
      .printer-tip-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- KOP SURAT / HEADER RESMI -->
    <div class="kop">
      <h1>Laporan Capaian Penilaian Pembelajaran Siswa</h1>
      <h2>Mata Pelajaran: Bahasa Inggris &bull; Kelas VII SMP</h2>
      <p>Kurikulum Merdeka &bull; Rujukan: Buku Siswa <em>English for Nusantara</em> &bull; Bab: Introducing My self and other (Materi Descriptive text)</p>
    </div>

    <div class="title-badge">
      <span>Bukti Hasil: ${QUIZ_METADATA.title}</span>
    </div>

    <!-- IDENTITAS PESERTA -->
    <div class="info-grid">
      <div class="info-col">
        <table class="info-table">
          <tr>
            <td class="label">Nama Siswa</td>
            <td>: <strong>${student.name}</strong></td>
          </tr>
          <tr>
            <td class="label">Kelas</td>
            <td>: <strong>Kelas ${student.studentClass}</strong></td>
          </tr>
          <tr>
            <td class="label">Nomor Absen</td>
            <td>: <strong>${student.studentNumber}</strong></td>
          </tr>
        </table>
      </div>
      <div class="info-col">
        <table class="info-table">
          <tr>
            <td class="label">Tanggal Kuis</td>
            <td>: ${dateFormatted}</td>
          </tr>
          <tr>
            <td class="label">Durasi Kerja</td>
            <td>: ${durationMins} menit ${durationSecs} detik</td>
          </tr>
          <tr>
            <td class="label">Standar KKM</td>
            <td>: <strong>${QUIZ_METADATA.passingScore} (Tujuh Puluh Lima)</strong></td>
          </tr>
        </table>
      </div>
    </div>

    <!-- SCORE BANNER -->
    <div class="score-banner">
      <div>
        <div class="score-desc">Nilai Akhir Kuis Pilihan Ganda:</div>
        <div class="score-big">${submission.score} <span style="font-size: 14px; font-weight: normal; color: #64748b;">/ 100</span></div>
        <div style="font-size: 10px; margin-top: 2px; color: #475569;">
          Benar: <strong>${submission.correctCount}</strong> soal &bull; Salah: <strong>${submission.wrongCount}</strong> soal (Total 10 Soal)
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 2px; font-weight: bold;">Status Kelulusan:</div>
        <div class="status-badge">
          ${isPassed ? 'TUNTAS (MEMENUHI KKM)' : 'BELUM TUNTAS (REMEDIAL)'}
        </div>
      </div>
    </div>

    <!-- RINCIAN BUTIR SOAL -->
    <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; color: #1e293b;">
      Rincian Jawaban Per Butir Soal (10 Soal Pilihan Ganda):
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">No</th>
          <th>Indikator / Topik Pembahasan Soal</th>
          <th style="width: 80px; text-align: center;">Pilihan Siswa</th>
          <th style="width: 80px; text-align: center;">Kunci Jawaban</th>
          <th style="width: 90px; text-align: center;">Hasil</th>
        </tr>
      </thead>
      <tbody>
        ${questionRows}
      </tbody>
    </table>

    <!-- CATATAN GURU -->
    <div class="notes-box">
      <strong>Catatan Pembelajaran Guru:</strong>
      <p style="margin-top: 2px;">
        ${
          isPassed 
            ? 'Selamat! Peserta didik telah memahami dengan baik struktur Procedure Text (Goal, Ingredients, Tools, Steps) serta Action Verbs dan Sequence Words pada Chapter 2: Culinary and Me.' 
            : 'Perlu bimbingan dan remedial mandiri pada pengenalan kosakata Action Verbs (stir, chop, boil) serta urutan langkah kerja (Sequence Words) dalam Procedure Text.'
        }
      </p>
    </div>

    <!-- TANDA TANGAN & PENGESAHAN -->
    <div class="sig-area">
      <div class="sig-col">
        <p>Mengetahui / Menyetujui,</p>
        <p>Orang Tua / Wali Siswa</p>
        <div class="sig-space"></div>
        <p class="sig-name">( ............................................ )</p>
      </div>

      <div class="sig-col">
        <p>Guru Mata Pelajaran Bahasa Inggris,</p>
        <p>SMP / MTs Pengampu</p>
        <div class="sig-space"></div>
        <p class="sig-name">${QUIZ_METADATA.teacherName}</p>
        <p style="color: #64748b; font-size: 9.5px;">${QUIZ_METADATA.branding}</p>
      </div>
    </div>

    <div class="printer-tip-bar">
      Dicetak melalui Aplikasi English for Nusantara Digital &bull; Format kertas: ${paperSize} (${colorMode === 'color' ? 'Berwarna' : 'Monokrom / Hemat Tinta'})
    </div>
  </div>

  <script>
    // Automatically trigger system print dialog when document is ready
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {
          console.error(e);
        }
      }, 250);
    });
  </script>
</body>
</html>`;
}

/**
 * Generates an official printable teacher recapitulation report for all submissions,
 * formatted like a formal Microsoft Word document (Kop Surat, 2-column Document Identity,
 * crisp black-bordered table, summary footer rows, and 2-column Signature Block).
 */
export function generateTeacherRecapHtml(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): string {
  const {
    paperSize = 'A4',
    colorMode = 'color',
    isLandscape = false,
    includeQuestionColumns = false,
    activeQuestions = QUIZ_QUESTIONS,
  } = options;
  const isGrayscale = colorMode === 'grayscale';

  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const questionHeadersHtml = includeQuestionColumns
    ? activeQuestions
        .map(
          (q, i) =>
            `<th style="width: 24px; text-align: center; font-size: 8.5pt;">S${i + 1}<br><span style="font-size:7.5pt;font-weight:normal;">(${q.correctAnswer})</span></th>`
        )
        .join('')
    : '';

  const submittedCount = submissions.filter((s) => hasStudentSubmittedQuiz(s)).length;
  const unsubmittedCount = Math.max(0, submissions.length - submittedCount);
  const remedialCount = submissions.filter(
    (s) => hasStudentSubmittedQuiz(s) && s.score < QUIZ_METADATA.passingScore
  ).length;

  const tableRows = submissions
    .map((s, idx) => {
      const isSubmitted = hasStudentSubmittedQuiz(s);
      const status = getSubmissionAssessmentStatus(s, QUIZ_METADATA.passingScore);
      const isPass = status === 'TUNTAS';
      const durMins = Math.floor((s.timeSpentSeconds || 0) / 60);
      const durSecs = (s.timeSpentSeconds || 0) % 60;
      const dateStr =
        isSubmitted && s.submittedAt
          ? new Date(s.submittedAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '';

      const statusColor = isGrayscale
        ? '#000000'
        : !isSubmitted
        ? '#334155'
        : isPass
        ? '#14532d'
        : '#881337';
      const statusBg = isGrayscale
        ? 'transparent'
        : !isSubmitted
        ? '#f8fafc'
        : isPass
        ? '#f0fdf4'
        : '#fff1f2';

      const questionCellsHtml = includeQuestionColumns
        ? activeQuestions
            .map((q) => {
              const ans = isSubmitted ? s.answers?.[q.id] || '' : '';
              const isCorrect = ans === q.correctAnswer;
              const cellColor = isGrayscale
                ? '#000000'
                : !ans
                ? '#94a3b8'
                : isCorrect
                ? '#15803d'
                : '#be123c';
              return `<td style="padding: 4px 3px; text-align: center; font-size: 9pt; font-weight: bold; color: ${cellColor};">${ans}</td>`;
            })
            .join('')
        : '';

      const statusLabel =
        status === 'TUNTAS'
          ? 'TUNTAS'
          : status === 'REMEDIAL'
          ? 'REMEDIAL'
          : 'BELUM MENGERJAKAN';

      return `
      <tr style="page-break-inside: avoid;">
        <td style="padding: 5px 6px; text-align: center;">${idx + 1}</td>
        <td style="padding: 5px 6px; text-align: center; font-weight: bold;">${s.studentNumber}</td>
        <td style="padding: 5px 8px; font-weight: bold; text-align: left;">${s.studentName}</td>
        <td style="padding: 5px 6px; text-align: center;">${s.studentClass}</td>
        <td style="padding: 5px 6px; text-align: center;">${isSubmitted ? (s.correctCount ?? 0) : ''}</td>
        <td style="padding: 5px 6px; text-align: center;">${isSubmitted ? (s.wrongCount ?? 0) : ''}</td>
        <td style="padding: 5px 6px; text-align: center; font-size: 10.5pt; font-weight: bold; color: ${statusColor}; background: ${isSubmitted ? statusBg : 'transparent'};">${isSubmitted ? s.score : ''}</td>
        <td style="padding: 5px 6px; text-align: center; font-weight: bold; color: ${statusColor}; background: ${statusBg};">
          ${statusLabel}
        </td>
        <td style="padding: 5px 6px; text-align: center;">${isSubmitted ? `${durMins}m ${durSecs}s` : ''}</td>
        <td style="padding: 5px 6px; text-align: center;">${dateStr}</td>
        ${questionCellsHtml}
      </tr>
    `;
    })
    .join('');

  const orientation = isLandscape ? 'landscape' : 'portrait';
  let pageSizeRule = `A4 ${orientation}`;
  if (paperSize === 'F4') {
    pageSizeRule = isLandscape ? '330mm 215mm landscape' : '215mm 330mm portrait';
  } else if (paperSize === 'Letter') {
    pageSizeRule = `letter ${orientation}`;
  }

  const extraColCount = includeQuestionColumns ? activeQuestions.length : 0;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekapitulasi_Nilai_Bahasa_Inggris_${selectedClass}</title>
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 14mm 15mm 14mm 15mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: "Times New Roman", "Calibri", "Segoe UI", Georgia, serif;
      color: #000000;
      background: #ffffff;
      font-size: 10.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .word-page {
      max-width: ${isLandscape ? '100%' : '210mm'};
      margin: 0 auto;
      padding: 4px;
      background: #ffffff;
    }
    .kop {
      text-align: center;
      border-bottom: 3px double #000000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .kop .instansi {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kop h1 {
      font-size: 13.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
    .kop h2 {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .kop p {
      font-size: 9.5pt;
      font-style: italic;
      margin-top: 2px;
    }
    .meta-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .meta-grid td {
      border: none !important;
      padding: 2px 4px;
      font-size: 10pt;
      vertical-align: top;
    }
    .meta-grid td.lbl {
      font-weight: bold;
      width: 130px;
    }
    table.recap-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1pt solid #000000;
    }
    table.recap-table thead {
      display: table-header-group;
    }
    table.recap-table tfoot {
      display: table-row-group;
    }
    table.recap-table th {
      background: ${isGrayscale ? '#e2e8f0' : '#f1f5f9'} !important;
      border: 1pt solid #000000;
      padding: 6px 5px;
      font-size: 9.5pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      vertical-align: middle;
      color: #000000;
    }
    table.recap-table td {
      border: 0.75pt solid #000000;
      font-size: 9.5pt;
      vertical-align: middle;
    }
    table.recap-table tr.summary-row td {
      background: #f8fafc !important;
      border-top: 1pt solid #000000;
      border-bottom: 1pt solid #000000;
      font-weight: bold;
      padding: 5px 8px;
      font-size: 9.5pt;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .sig-table td {
      border: none !important;
      width: 50%;
      text-align: center;
      vertical-align: top;
      font-size: 10pt;
      padding: 2px 10px;
    }
    .sig-space {
      height: 52px;
    }
    @media print {
      body { padding: 0; margin: 0; }
      .word-page { max-width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="word-page">
    <!-- KOP SURAT DOKUMEN RESMI SEPERTI MICROSOFT WORD -->
    <div class="kop">
      <div class="instansi">Dokumen Administrasi Penilaian Pembelajaran Kurikulum Merdeka</div>
      <h1>Daftar Rekapitulasi Nilai Kuis Bahasa Inggris Siswa</h1>
      <h2>SMP / MTs Kelas VII &bull; Buku Siswa: English for Nusantara</h2>
      <p>Topik / Materi: ${QUIZ_METADATA.topic} &bull; Standar Ketuntasan Minimal (KKM): ${QUIZ_METADATA.passingScore}</p>
    </div>

    <!-- IDENTITAS DOKUMEN DUA KOLOM SEPERTI WORD -->
    <table class="meta-grid">
      <tr>
        <td style="width: 52%;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="lbl">Mata Pelajaran</td>
              <td>: Bahasa Inggris (Fase D - Kelas VII)</td>
            </tr>
            <tr>
              <td class="lbl">Judul Evaluasi</td>
              <td>: ${QUIZ_METADATA.title}</td>
            </tr>
            <tr>
              <td class="lbl">Kelas / Rombel</td>
              <td>: <strong>${selectedClass === 'ALL' ? 'Semua Kelas (7A s.d. 7H)' : 'Kelas ' + selectedClass}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Guru Pengampu</td>
              <td>: <strong>${QUIZ_METADATA.teacherName}</strong></td>
            </tr>
          </table>
        </td>
        <td style="width: 48%;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="lbl">Tanggal Cetak</td>
              <td>: ${dateFormatted}</td>
            </tr>
            <tr>
              <td class="lbl">Jumlah Peserta</td>
              <td>: <strong>${stats.total} Siswa</strong> (${submittedCount} Submit / ${unsubmittedCount} Belum Mengerjakan)</td>
            </tr>
            <tr>
              <td class="lbl">Rata-Rata Kelas</td>
              <td>: <strong>${submittedCount > 0 ? stats.avgScore : '-'}</strong> ${submittedCount > 0 ? `(Tertinggi: ${stats.highest} &bull; Terendah: ${stats.lowest})` : ''}</td>
            </tr>
            <tr>
              <td class="lbl">Status Penilaian</td>
              <td>: <strong>${stats.passedCount} Tuntas</strong> &bull; <strong>${remedialCount} Remedial</strong> &bull; <strong>${unsubmittedCount} Belum Mengerjakan</strong></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- TABEL DAFTAR NILAI SISWA BERGARIS TEGAS SEPERTI TABEL WORD -->
    <table class="recap-table">
      <thead>
        <tr>
          <th style="width: 32px;">No</th>
          <th style="width: 48px;">Absen</th>
          <th>Nama Lengkap Siswa</th>
          <th style="width: 52px;">Kelas</th>
          <th style="width: 44px;">Benar</th>
          <th style="width: 44px;">Salah</th>
          <th style="width: 62px;">Nilai Akhir</th>
          <th style="width: 112px;">Status</th>
          <th style="width: 64px;">Durasi</th>
          <th style="width: 82px;">Tanggal</th>
          ${questionHeadersHtml}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr class="summary-row">
          <td colspan="6" style="text-align: right;">RATA-RATA NILAI (SISWA SUBMIT) :</td>
          <td style="text-align: center; font-size: 10.5pt;">${submittedCount > 0 ? stats.avgScore : ''}</td>
          <td colspan="${3 + extraColCount}" style="text-align: left;">
            Tuntas (&ge; ${QUIZ_METADATA.passingScore}): ${stats.passedCount} Siswa &bull; Remedial (&lt; ${QUIZ_METADATA.passingScore}): ${remedialCount} Siswa &bull; Belum Mengerjakan: ${unsubmittedCount} Siswa
          </td>
        </tr>
        <tr class="summary-row">
          <td colspan="6" style="text-align: right;">NILAI TERTINGGI / NILAI TERENDAH :</td>
          <td style="text-align: center;">${submittedCount > 0 ? `${stats.highest} / ${stats.lowest}` : ''}</td>
          <td colspan="${3 + extraColCount}" style="text-align: left;">
            Sudah Submit: ${submittedCount} Siswa &bull; Belum Mengerjakan: ${unsubmittedCount} Siswa
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- BLOK PENGESAHAN & TANDA TANGAN DUA KOLOM SEPERTI WORD -->
    <table class="sig-table">
      <tr>
        <td>
          <p>Mengetahui,</p>
          <p><strong>Kepala Sekolah / Wali Kelas</strong></p>
          <div class="sig-space"></div>
          <p style="font-weight: bold; text-decoration: underline;">( .................................................. )</p>
          <p style="font-size: 9pt;">NIP. ..................................................</p>
        </td>
        <td>
          <p>${dateFormatted}</p>
          <p><strong>Guru Mata Pelajaran Bahasa Inggris,</strong></p>
          <div class="sig-space"></div>
          <p style="font-weight: bold; text-decoration: underline;">${QUIZ_METADATA.teacherName}</p>
          <p style="font-size: 9pt;">${QUIZ_METADATA.branding}</p>
        </td>
      </tr>
    </table>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {
          console.error(e);
        }
      }, 250);
    });
  </script>
</body>
</html>`;
}

/**
 * Generates a Microsoft Excel (.xls) spreadsheet document that is pre-configured with
 * MSO Print XML & Page Setup (A4, Fit to 1 Page Wide, Hidden Raw Gridlines, Kop Surat,
 * Word-style bordered table, summary rows, and Signature Block) so that when opened in
 * Microsoft Excel and printed (Ctrl+P), its appearance matches a formal Microsoft Word document.
 */
export function generateTeacherRecapExcelWordStyleHtml(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): string {
  const {
    paperSize = 'A4',
    colorMode = 'color',
    isLandscape = false,
    includeQuestionColumns = false,
    activeQuestions = QUIZ_QUESTIONS,
  } = options;
  const isGrayscale = colorMode === 'grayscale';

  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const baseCols = 10;
  const extraCols = includeQuestionColumns ? activeQuestions.length : 0;
  const totalCols = baseCols + extraCols;
  const leftMetaSpan = 5;
  const rightMetaSpan = totalCols - leftMetaSpan;

  const colGroupHtml = `
    <col width="36" />
    <col width="54" />
    <col width="215" />
    <col width="58" />
    <col width="50" />
    <col width="50" />
    <col width="68" />
    <col width="110" />
    <col width="68" />
    <col width="92" />
    ${includeQuestionColumns ? activeQuestions.map(() => `<col width="34" />`).join('') : ''}
  `;

  const questionHeadersHtml = includeQuestionColumns
    ? activeQuestions
        .map(
          (q, i) =>
            `<th class="tbl-th">S${i + 1}<br style="mso-data-placement:same-cell;" />(${q.correctAnswer})</th>`
        )
        .join('')
    : '';

  const submittedCount = submissions.filter((s) => hasStudentSubmittedQuiz(s)).length;
  const unsubmittedCount = Math.max(0, submissions.length - submittedCount);
  const remedialCount = submissions.filter(
    (s) => hasStudentSubmittedQuiz(s) && s.score < QUIZ_METADATA.passingScore
  ).length;

  const rowsHtml = submissions
    .map((s, idx) => {
      const isSubmitted = hasStudentSubmittedQuiz(s);
      const status = getSubmissionAssessmentStatus(s, QUIZ_METADATA.passingScore);
      const isPass = status === 'TUNTAS';
      const durMins = Math.floor((s.timeSpentSeconds || 0) / 60);
      const durSecs = (s.timeSpentSeconds || 0) % 60;
      const dateStr =
        isSubmitted && s.submittedAt
          ? new Date(s.submittedAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '';

      const scoreColor = isGrayscale
        ? '#000000'
        : !isSubmitted
        ? '#334155'
        : isPass
        ? '#14532d'
        : '#881337';
      const scoreBg = isGrayscale
        ? '#ffffff'
        : !isSubmitted
        ? '#f8fafc'
        : isPass
        ? '#f0fdf4'
        : '#fff1f2';

      const questionCellsHtml = includeQuestionColumns
        ? activeQuestions
            .map((q) => {
              const ans = isSubmitted ? s.answers?.[q.id] || '' : '';
              const isCorrect = ans === q.correctAnswer;
              const cColor = isGrayscale
                ? '#000000'
                : !ans
                ? '#94a3b8'
                : isCorrect
                ? '#15803d'
                : '#be123c';
              return `<td class="tbl-td center bold" style="color:${cColor};mso-number-format:'\\@';">${ans}</td>`;
            })
            .join('')
        : '';

      const statusLabel =
        status === 'TUNTAS'
          ? 'TUNTAS'
          : status === 'REMEDIAL'
          ? 'REMEDIAL'
          : 'BELUM MENGERJAKAN';

      return `
        <tr style="height: 20pt;">
          <td class="tbl-td center">${idx + 1}</td>
          <td class="tbl-td center bold" style="mso-number-format:'\\@';">${s.studentNumber}</td>
          <td class="tbl-td left bold">${s.studentName}</td>
          <td class="tbl-td center" style="mso-number-format:'\\@';">${s.studentClass}</td>
          <td class="tbl-td center">${isSubmitted ? (s.correctCount ?? 0) : ''}</td>
          <td class="tbl-td center">${isSubmitted ? (s.wrongCount ?? 0) : ''}</td>
          <td class="tbl-td center bold" style="color:${scoreColor};background-color:${isSubmitted ? scoreBg : '#ffffff'};font-size:11pt;">${isSubmitted ? s.score : ''}</td>
          <td class="tbl-td center bold" style="color:${scoreColor};background-color:${scoreBg};">${statusLabel}</td>
          <td class="tbl-td center" style="mso-number-format:'\\@';">${isSubmitted ? `${durMins}m ${durSecs}s` : ''}</td>
          <td class="tbl-td center" style="mso-number-format:'\\@';">${dateStr}</td>
          ${questionCellsHtml}
        </tr>
      `;
    })
    .join('');

  // Excel PaperSizeIndex: 9 = A4, 1 = Letter, 5 = Legal/F4 approximation
  const excelPaperSizeIndex = paperSize === 'Letter' ? 1 : paperSize === 'F4' ? 5 : 9;
  const pageOrientation = isLandscape ? 'landscape' : 'portrait';

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Rekap Nilai Bahasa Inggris - ${selectedClass}</title>
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Rekap Nilai ${selectedClass === 'ALL' ? 'Semua Kelas' : 'Kelas ' + selectedClass}</x:Name>
          <x:WorksheetOptions>
            <x:FitToPage/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:PaperSizeIndex>${excelPaperSizeIndex}</x:PaperSizeIndex>
              <x:FitWidth>1</x:FitWidth>
              <x:FitHeight>0</x:FitHeight>
              <x:HorizontalResolution>600</x:HorizontalResolution>
              <x:VerticalResolution>600</x:VerticalResolution>
            </x:Print>
            <x:Selected/>
            <x:DoNotDisplayGridlines/>
            <x:ProtectObjects>False</x:ProtectObjects>
            <x:ProtectScenarios>False</x:ProtectScenarios>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 ${pageOrientation};
      margin: 0.5in 0.45in 0.5in 0.45in;
      mso-header-margin: 0.25in;
      mso-footer-margin: 0.25in;
      mso-page-orientation: ${pageOrientation};
      mso-horizontal-page-align: center;
    }
    body {
      font-family: "Times New Roman", "Calibri", serif;
      font-size: 10pt;
      color: #000000;
      background-color: #ffffff;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .kop-instansi {
      font-family: "Times New Roman", serif;
      font-size: 10.5pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      border: none;
    }
    .kop-title {
      font-family: "Times New Roman", serif;
      font-size: 13.5pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      border: none;
    }
    .kop-sub {
      font-family: "Times New Roman", serif;
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      border: none;
    }
    .kop-desc {
      font-family: "Times New Roman", serif;
      font-size: 9.5pt;
      font-style: italic;
      text-align: center;
      border-top: none;
      border-left: none;
      border-right: none;
      border-bottom: 2.5pt double #000000;
      padding-bottom: 6pt;
    }
    .meta-cell {
      font-family: "Times New Roman", serif;
      font-size: 10pt;
      border: none;
      padding: 2pt 4pt;
      vertical-align: middle;
    }
    .tbl-th {
      font-family: "Times New Roman", serif;
      font-size: 9.5pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      vertical-align: middle;
      background-color: #e2e8f0;
      border: 1.0pt solid #000000;
      padding: 5pt 4pt;
      white-space: normal;
    }
    .tbl-td {
      font-family: "Times New Roman", serif;
      font-size: 10pt;
      vertical-align: middle;
      border: 0.5pt solid #000000;
      padding: 4pt 5pt;
      white-space: normal;
      word-wrap: break-word;
    }
    .tbl-summary {
      font-family: "Times New Roman", serif;
      font-size: 10pt;
      font-weight: bold;
      vertical-align: middle;
      background-color: #f8fafc;
      border: 1.0pt solid #000000;
      padding: 5pt 6pt;
    }
    .sig-cell {
      font-family: "Times New Roman", serif;
      font-size: 10pt;
      text-align: center;
      vertical-align: middle;
      border: none;
    }
    .center { text-align: center; }
    .left { text-align: left; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <table>
    ${colGroupHtml}

    <!-- KOP SURAT RESMI SEPERTI MICROSOFT WORD -->
    <tr style="height: 18pt;">
      <td colspan="${totalCols}" class="kop-instansi">
        DOKUMEN ADMINISTRASI PENILAIAN PEMBELAJARAN KURIKULUM MERDEKA
      </td>
    </tr>
    <tr style="height: 22pt;">
      <td colspan="${totalCols}" class="kop-title">
        DAFTAR REKAPITULASI NILAI KUIS BAHASA INGGRIS SISWA
      </td>
    </tr>
    <tr style="height: 18pt;">
      <td colspan="${totalCols}" class="kop-sub">
        SMP / MTs KELAS VII &bull; BUKU SISWA: ENGLISH FOR NUSANTARA
      </td>
    </tr>
    <tr style="height: 20pt;">
      <td colspan="${totalCols}" class="kop-desc">
        Topik / Materi: ${QUIZ_METADATA.topic} &bull; Standar Ketuntasan Minimal (KKM): ${QUIZ_METADATA.passingScore}
      </td>
    </tr>

    <!-- SPACER ROW -->
    <tr style="height: 10pt;">
      <td colspan="${totalCols}" style="border: none;"></td>
    </tr>

    <!-- IDENTITAS DOKUMEN DUA KOLOM SEPERTI WORD -->
    <tr style="height: 17pt;">
      <td colspan="${leftMetaSpan}" class="meta-cell">
        <strong>Mata Pelajaran:</strong> Bahasa Inggris (Kelas VII SMP/MTs)
      </td>
      <td colspan="${rightMetaSpan}" class="meta-cell">
        <strong>Tanggal Cetak:</strong> ${dateFormatted}
      </td>
    </tr>
    <tr style="height: 17pt;">
      <td colspan="${leftMetaSpan}" class="meta-cell">
        <strong>Judul Evaluasi:</strong> ${QUIZ_METADATA.title}
      </td>
      <td colspan="${rightMetaSpan}" class="meta-cell">
        <strong>Jumlah Peserta:</strong> ${stats.total} Siswa (${submittedCount} Submit / ${unsubmittedCount} Belum Mengerjakan)
      </td>
    </tr>
    <tr style="height: 17pt;">
      <td colspan="${leftMetaSpan}" class="meta-cell">
        <strong>Kelas / Rombel:</strong> ${selectedClass === 'ALL' ? 'Semua Kelas (7A s.d. 7H)' : 'Kelas ' + selectedClass}
      </td>
      <td colspan="${rightMetaSpan}" class="meta-cell">
        <strong>Rata-Rata Nilai Kelas:</strong> ${submittedCount > 0 ? `${stats.avgScore} (Tertinggi: ${stats.highest} &bull; Terendah: ${stats.lowest})` : '-'}
      </td>
    </tr>
    <tr style="height: 17pt;">
      <td colspan="${leftMetaSpan}" class="meta-cell">
        <strong>Guru Pengampu:</strong> ${QUIZ_METADATA.teacherName}
      </td>
      <td colspan="${rightMetaSpan}" class="meta-cell">
        <strong>Status Penilaian:</strong> ${stats.passedCount} Tuntas &bull; ${remedialCount} Remedial (&lt;${QUIZ_METADATA.passingScore}) &bull; ${unsubmittedCount} Belum Mengerjakan
      </td>
    </tr>

    <!-- SPACER ROW -->
    <tr style="height: 10pt;">
      <td colspan="${totalCols}" style="border: none;"></td>
    </tr>

    <!-- HEADER TABEL DAFTAR NILAI SISWA -->
    <tr style="height: 28pt;">
      <th class="tbl-th">No</th>
      <th class="tbl-th">No. Absen</th>
      <th class="tbl-th">Nama Lengkap Siswa</th>
      <th class="tbl-th">Kelas</th>
      <th class="tbl-th">Benar</th>
      <th class="tbl-th">Salah</th>
      <th class="tbl-th">Nilai Akhir</th>
      <th class="tbl-th">Status</th>
      <th class="tbl-th">Durasi</th>
      <th class="tbl-th">Tanggal</th>
      ${questionHeadersHtml}
    </tr>

    <!-- BARIS DATA SISWA -->
    ${rowsHtml}

    <!-- BARIS RINGKASAN / RATA-RATA DI BAWAH TABEL -->
    <tr style="height: 21pt;">
      <td colspan="6" class="tbl-summary right">RATA-RATA NILAI (SISWA SUBMIT) :</td>
      <td class="tbl-summary center" style="font-size: 11pt;">${submittedCount > 0 ? stats.avgScore : ''}</td>
      <td colspan="${3 + extraCols}" class="tbl-summary left">
        Tuntas (&ge; ${QUIZ_METADATA.passingScore}): ${stats.passedCount} Siswa &bull; Remedial (&lt; ${QUIZ_METADATA.passingScore}): ${remedialCount} Siswa &bull; Belum Mengerjakan: ${unsubmittedCount} Siswa
      </td>
    </tr>
    <tr style="height: 21pt;">
      <td colspan="6" class="tbl-summary right">NILAI TERTINGGI / NILAI TERENDAH :</td>
      <td class="tbl-summary center" style="mso-number-format:'\\@';">${submittedCount > 0 ? `${stats.highest} / ${stats.lowest}` : ''}</td>
      <td colspan="${3 + extraCols}" class="tbl-summary left">
        Sudah Submit: ${submittedCount} Siswa &bull; Belum Mengerjakan: ${unsubmittedCount} Siswa
      </td>
    </tr>

    <!-- SPACER ROW -->
    <tr style="height: 16pt;">
      <td colspan="${totalCols}" style="border: none;"></td>
    </tr>

    <!-- BLOK PENGESAHAN / TANDA TANGAN DUA KOLOM SEPERTI WORD -->
    <tr style="height: 16pt;">
      <td colspan="${leftMetaSpan}" class="sig-cell">Mengetahui,</td>
      <td colspan="${rightMetaSpan}" class="sig-cell">${dateFormatted}</td>
    </tr>
    <tr style="height: 16pt;">
      <td colspan="${leftMetaSpan}" class="sig-cell"><strong>Kepala Sekolah / Wali Kelas</strong></td>
      <td colspan="${rightMetaSpan}" class="sig-cell"><strong>Guru Mata Pelajaran Bahasa Inggris,</strong></td>
    </tr>
    <tr style="height: 18pt;"><td colspan="${totalCols}" style="border: none;"></td></tr>
    <tr style="height: 18pt;"><td colspan="${totalCols}" style="border: none;"></td></tr>
    <tr style="height: 18pt;"><td colspan="${totalCols}" style="border: none;"></td></tr>
    <tr style="height: 17pt;">
      <td colspan="${leftMetaSpan}" class="sig-cell"><strong><u>( .................................................. )</u></strong></td>
      <td colspan="${rightMetaSpan}" class="sig-cell"><strong><u>${QUIZ_METADATA.teacherName}</u></strong></td>
    </tr>
    <tr style="height: 16pt;">
      <td colspan="${leftMetaSpan}" class="sig-cell">NIP. ..................................................</td>
      <td colspan="${rightMetaSpan}" class="sig-cell">${QUIZ_METADATA.branding}</td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Downloads the teacher recapitulation as a Microsoft Excel (.xls) file
 * pre-formatted with Word-like print layout (A4 Fit to 1 Page Wide, Kop Surat, Borders, Signature Block).
 */
export function downloadTeacherRecapExcelWordStyle(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): void {
  const html = generateTeacherRecapExcelWordStyleHtml(submissions, selectedClass, stats, options);
  const blob = new Blob(['\uFEFF', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateSlice = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `Rekap_Nilai_SiapPrint_${selectedClass}_${dateSlice}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the teacher recapitulation as a native Microsoft Word (.doc) document.
 */
export function downloadTeacherRecapWordDoc(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): void {
  const html = generateTeacherRecapExcelWordStyleHtml(submissions, selectedClass, stats, options);
  const blob = new Blob(['\uFEFF', html], {
    type: 'application/msword;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateSlice = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `Rekap_Nilai_Word_${selectedClass}_${dateSlice}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the teacher recapitulation as a standard CSV (.csv) file.
 */
export function downloadTeacherRecapCsv(
  submissions: QuizSubmission[],
  selectedClass: string,
  activeQuestions: Question[] = QUIZ_QUESTIONS
): void {
  if (submissions.length === 0) return;

  let csvContent = '\uFEFF';
  csvContent += `REKAPITULASI NILAI KUIS BAHASA INGGRIS - KELAS 7 SMP\n`;
  csvContent += `Topik: ${QUIZ_METADATA.topic}\n`;
  csvContent += `Buku: ${QUIZ_METADATA.textbook}\n`;
  csvContent += `Guru Pengampu: ${QUIZ_METADATA.branding}\n`;
  csvContent += `KKM: ${QUIZ_METADATA.passingScore}\n\n`;

  csvContent +=
    `No,No Absen,Nama Siswa,Kelas,Benar,Salah,Nilai Akhir,Status Kelulusan,Durasi (Detik),Tanggal Pengerjaan,` +
    activeQuestions.map((q, idx) => `Soal ${idx + 1} (${q.correctAnswer})`).join(',') +
    '\n';

  submissions.forEach((s, idx) => {
    const isSubmitted = hasStudentSubmittedQuiz(s);
    const assessmentStatus = getSubmissionAssessmentStatus(s, QUIZ_METADATA.passingScore);
    const status =
      assessmentStatus === 'TUNTAS'
        ? 'TUNTAS'
        : assessmentStatus === 'REMEDIAL'
        ? 'REMEDIAL'
        : 'BELUM MENGERJAKAN';
    const dateStr = isSubmitted && s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '';
    const questionAnswers = activeQuestions
      .map((q) => (isSubmitted ? s.answers?.[q.id] || '' : ''))
      .join(',');
    csvContent += `${idx + 1},"${s.studentNumber}","${s.studentName}","${s.studentClass}",${isSubmitted ? s.correctCount : ''},${isSubmitted ? s.wrongCount : ''},${isSubmitted ? s.score : ''},"${status}",${isSubmitted ? s.timeSpentSeconds : ''},"${dateStr}",${questionAnswers}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Rekap_Nilai_CSV_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Executes direct printing designed to trigger the computer's native printer selection dialog.
 * Handles both top-level execution and sandboxed iframe environments (such as AI Studio preview).
 */
export function executePrintWithComputerDialog(
  htmlContent: string,
  documentTitle: string,
  isLandscape: boolean = false
): void {
  const isInIframe = window.self !== window.top;

  // If in an iframe, browser security restricts window.print() inside frames.
  // Opening a clean window/tab with the self-printing document invokes the computer's OS print dialog
  // with all available and ready printers (Epson, Canon, HP, Brother, PDF printer, etc.).
  if (isInIframe) {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        return;
      }
    } catch (e) {
      console.warn('Iframe popup mechanism had issue, falling back to local print:', e);
    }
  }

  // Local DOM print driver
  let printRoot = document.getElementById('print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    document.body.appendChild(printRoot);
  }

  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  printRoot.innerHTML = htmlContent;
  document.body.classList.add('printing');

  const cleanup = () => {
    document.body.classList.remove('printing');
    if (printRoot) {
      printRoot.innerHTML = '';
    }
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Native window.print failed, opening in new tab:', err);
      openDocumentInNewTab(htmlContent);
    }
    setTimeout(cleanup, 2500);
  }, 100);
}

/**
 * Triggers native browser print dialog for the student's result sheet.
 */
export function executePrintStudentScore(
  student: StudentInfo, 
  submission: QuizSubmission,
  options: PrintDocumentOptions = {}
): void {
  const html = generateStudentCertificateHtml(student, submission, options);
  executePrintWithComputerDialog(html, `Bukti_Nilai_${student.name}_Kelas_${student.studentClass}`, false);
}

/**
 * Triggers native browser print dialog for the teacher class recap report.
 */
export function executePrintTeacherRecap(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): void {
  const html = generateTeacherRecapHtml(submissions, selectedClass, stats, options);
  executePrintWithComputerDialog(html, `Rekap_Nilai_Bahasa_Inggris_Kelas_${selectedClass}`, Boolean(options.isLandscape));
}

/**
 * Opens document in a standalone new browser window or tab.
 */
export function openDocumentInNewTab(htmlContent: string): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const newWin = window.open(url, '_blank');
    if (newWin) {
      newWin.focus();
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Dokumen_Cetak_Nilai.html';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (e) {
    console.error('Error opening new tab for print:', e);
  }
}

/**
 * Opens the student's result sheet in a new tab with automatic printer prompt.
 */
export function openStudentCertificateInNewTab(
  student: StudentInfo, 
  submission: QuizSubmission,
  options: PrintDocumentOptions = {}
): void {
  const html = generateStudentCertificateHtml(student, submission, options);
  openDocumentInNewTab(html);
}

/**
 * Opens teacher recapitulation in a new tab with automatic printer prompt.
 */
export function openTeacherRecapInNewTab(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): void {
  const html = generateTeacherRecapHtml(submissions, selectedClass, stats, options);
  openDocumentInNewTab(html);
}

/**
 * Downloads the student's result sheet as a standalone offline HTML document.
 */
export function downloadStudentReportHtml(
  student: StudentInfo, 
  submission: QuizSubmission,
  options: PrintDocumentOptions = {}
): void {
  const html = generateStudentCertificateHtml(student, submission, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `Lembar_Nilai_${student.name.replace(/\s+/g, '_')}_Kelas_${student.studentClass}.html`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


