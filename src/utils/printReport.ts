/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentInfo, QuizSubmission } from '../types';
import { QUIZ_QUESTIONS, QUIZ_METADATA } from '../data/quizData';

export interface PrintDocumentOptions {
  paperSize?: 'A4' | 'F4' | 'Letter';
  colorMode?: 'color' | 'grayscale';
  isLandscape?: boolean;
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
      <p>Kurikulum Merdeka &bull; Rujukan: Buku Siswa <em>English for Nusantara</em> &bull; Chapter 2: Culinary and Me</p>
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
 * Generates an official printable teacher recapitulation report for all submissions.
 */
export function generateTeacherRecapHtml(
  submissions: QuizSubmission[],
  selectedClass: string,
  stats: { total: number; avgScore: number; highest: number; lowest: number; passedPercent: number; passedCount: number },
  options: PrintDocumentOptions = {}
): string {
  const { paperSize = 'A4', colorMode = 'color' } = options;
  const isGrayscale = colorMode === 'grayscale';

  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableRows = submissions.map((s, idx) => {
    const isPass = s.score >= QUIZ_METADATA.passingScore;
    const durMins = Math.floor((s.timeSpentSeconds || 0) / 60);
    const durSecs = (s.timeSpentSeconds || 0) % 60;
    const dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

    const statusColor = isGrayscale ? '#0f172a' : (isPass ? '#15803d' : '#be123c');

    return `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10.5px; page-break-inside: avoid;">
        <td style="padding: 4px 6px; text-align: center;">${idx + 1}</td>
        <td style="padding: 4px 6px; font-weight: bold;">${s.studentName}</td>
        <td style="padding: 4px 6px; text-align: center;">${s.studentClass}</td>
        <td style="padding: 4px 6px; text-align: center;">${s.studentNumber}</td>
        <td style="padding: 4px 6px; text-align: center; font-size: 11px; font-weight: bold; color: ${statusColor};">${s.score}</td>
        <td style="padding: 4px 6px; text-align: center; font-weight: bold; color: ${statusColor};">
          ${isPass ? 'TUNTAS' : 'REMEDIAL'}
        </td>
        <td style="padding: 4px 6px; text-align: center;">${s.correctCount || 0} / ${s.wrongCount || 0}</td>
        <td style="padding: 4px 6px; text-align: center;">${durMins}m ${durSecs}s</td>
        <td style="padding: 4px 6px;">${dateStr}</td>
      </tr>
    `;
  }).join('');

  let pageSizeRule = 'A4 landscape';
  if (paperSize === 'F4') {
    pageSizeRule = '330mm 215mm landscape';
  } else if (paperSize === 'Letter') {
    pageSizeRule = 'letter landscape';
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekapitulasi_Nilai_Bahasa_Inggris_${selectedClass}</title>
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 8mm 10mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
      color: #0f172a;
      padding: 10px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .kop { text-align: center; border-bottom: 2.5px double #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
    .kop h1 { font-size: 14px; font-weight: 800; text-transform: uppercase; }
    .kop h2 { font-size: 11px; font-weight: 700; color: #334155; margin-top: 1px; }
    .kop p { font-size: 10px; color: #64748b; margin-top: 1px; }
    .stats-bar { display: flex; gap: 8px; margin-bottom: 10px; }
    .stat-item { flex: 1; background: #f8fafc !important; border: 1px solid #cbd5e1; padding: 5px 8px; border-radius: 4px; text-align: center; }
    .stat-val { font-size: 15px; font-weight: 800; color: #0f172a; }
    .stat-lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f1f5f9 !important; border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 9.5px; text-transform: uppercase; }
    td { border: 1px solid #cbd5e1; }
    .sig-area { display: flex; justify-content: flex-end; margin-top: 14px; page-break-inside: avoid; }
    .sig-box { text-align: center; width: 240px; font-size: 10.5px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="kop">
    <h1>Daftar Rekapitulasi Penilaian Hasil Kuis</h1>
    <h2>Mata Pelajaran: Bahasa Inggris &bull; Kelas VII SMP</h2>
    <p>Materi: Procedure Text (Culinary and Me) &bull; Rujukan: English for Nusantara &bull; KKM: ${QUIZ_METADATA.passingScore}</p>
    <p style="font-weight: bold; margin-top: 2px;">Filter Kelas: ${selectedClass === 'ALL' ? 'Semua Kelas' : 'Kelas ' + selectedClass} &bull; Tanggal Cetak: ${dateFormatted}</p>
  </div>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-val">${stats.total}</div>
      <div class="stat-lbl">Total Siswa</div>
    </div>
    <div class="stat-item">
      <div class="stat-val">${stats.avgScore}</div>
      <div class="stat-lbl">Rata-Rata Nilai</div>
    </div>
    <div class="stat-item">
      <div class="stat-val" style="color: ${isGrayscale ? '#0f172a' : '#15803d'};">${stats.passedPercent}%</div>
      <div class="stat-lbl">Ketuntasan (KKM ≥75)</div>
    </div>
    <div class="stat-item">
      <div class="stat-val" style="color: ${isGrayscale ? '#0f172a' : '#15803d'};">${stats.highest}</div>
      <div class="stat-lbl">Nilai Tertinggi</div>
    </div>
    <div class="stat-item">
      <div class="stat-val" style="color: ${isGrayscale ? '#0f172a' : '#be123c'};">${stats.lowest}</div>
      <div class="stat-lbl">Nilai Terendah</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">No</th>
        <th>Nama Siswa</th>
        <th style="width: 50px;">Kelas</th>
        <th style="width: 45px;">Absen</th>
        <th style="width: 65px;">Nilai Akhir</th>
        <th style="width: 75px;">Status</th>
        <th style="width: 75px;">Benar / Salah</th>
        <th style="width: 85px;">Durasi</th>
        <th style="width: 100px;">Waktu Tes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="sig-area">
    <div class="sig-box">
      <p>Guru Pengampu Bahasa Inggris,</p>
      <div style="height: 44px;"></div>
      <p style="font-weight: bold; text-decoration: underline;">${QUIZ_METADATA.teacherName}</p>
      <p style="color: #64748b; font-size: 9.5px;">${QUIZ_METADATA.branding}</p>
    </div>
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
  executePrintWithComputerDialog(html, `Rekap_Nilai_Bahasa_Inggris_Kelas_${selectedClass}`, true);
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

