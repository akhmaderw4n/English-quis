import { Question } from '../types';

export interface ParsedQuestionItem extends Question {
  isValid: boolean;
  validationErrors: string[];
  rawBlock?: string;
}

export interface ParseResult {
  totalDetected: number;
  validCount: number;
  invalidCount: number;
  questions: ParsedQuestionItem[];
  warnings: string[];
}

/**
 * Intelligent parser for exam questions copied from or extracted from Microsoft Word documents (.docx / .doc).
 * Supports standard Indonesian school exam patterns (Kurikulum Merdeka / Kurtilas):
 * - Numbered questions: 1., 1), [1], Soal 1, No. 1, etc.
 * - Multiple choice options: A., B., C., D. (or lowercase a., b., c., d. or A), (A))
 * - Single-line or multi-line options
 * - Answer keys: Kunci: A, Kunci Jawaban: B, Jawaban: C, Answer: D, Key: A
 * - Pembahasan / Explanation: Pembahasan: ..., Explanation: ...
 * - Topik / Topic: Topik: ..., Topic: ...
 * - Konteks bacaan / Context: [Teks Bacaan], Bacaan:, Context:
 * - Audio listening script: Audio:, Listening:
 */
export function parseWordQuestions(rawInputText: string): ParseResult {
  const warnings: string[] = [];
  if (!rawInputText || !rawInputText.trim()) {
    return {
      totalDetected: 0,
      validCount: 0,
      invalidCount: 0,
      questions: [],
      warnings: ['Teks dokumen masih kosong. Silakan unggah file Word (.docx) atau tempel teks soal.']
    };
  }

  // Normalize line endings and whitespace
  const normalizedText = rawInputText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ') // replace non-breaking spaces
    .trim();

  // Split text into question candidate blocks
  // Common dividers:
  // "1. ", "2. ", "Soal 1", "No. 1", "[1]" at beginning of line
  const lines = normalizedText.split('\n');
  const questionBlocks: string[] = [];
  let currentBlock: string[] = [];

  const questionStartRegex = /^(?:(?:soal|no\.?|pertanyaan)?\s*\[?(\d{1,3})\]?[\.\:\)\-]\s+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line indicates start of a new question
    // E.g., "1. ", "2) ", "No. 3.", "Soal 4:"
    if (questionStartRegex.test(trimmed)) {
      if (currentBlock.length > 0) {
        questionBlocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
      currentBlock.push(line);
    } else {
      if (currentBlock.length > 0) {
        currentBlock.push(line);
      } else if (trimmed.length > 0) {
        // Preamble or context header before question 1
        currentBlock.push(line);
      }
    }
  }

  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock.join('\n'));
  }

  // If question start regex didn't find multiple numbered questions, try double-newline separation
  let blocksToProcess = questionBlocks;
  if (questionBlocks.length <= 1 && normalizedText.includes('\n\n')) {
    const doubleNewlineBlocks = normalizedText
      .split(/\n{2,}/)
      .map(b => b.trim())
      .filter(b => b.length > 20);
    
    // Check if double newline blocks contain options A, B, C, D
    const looksLikeQuestions = doubleNewlineBlocks.some(b => /[A-D][\.\)]\s+/i.test(b));
    if (looksLikeQuestions) {
      blocksToProcess = doubleNewlineBlocks;
    }
  }

  const parsedQuestions: ParsedQuestionItem[] = [];

  blocksToProcess.forEach((block, index) => {
    const blockTrimmed = block.trim();
    if (!blockTrimmed) return;

    const validationErrors: string[] = [];
    const id = index + 1;

    // 1. Extract Answer Key (Kunci)
    let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    let keyFound = false;

    // Matches: Kunci: A, Kunci Jawaban: B, Jawaban: C, Answer: D, Key: A, Ans: B
    const keyMatch = blockTrimmed.match(/(?:kunci\s*(?:jawaban)?|jawaban|answer|key|ans)[\s\:\=]+([A-Da-d])/i);
    if (keyMatch && keyMatch[1]) {
      correctAnswer = keyMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      keyFound = true;
    } else {
      validationErrors.push('Kunci jawaban belum terdeteksi (Contoh: "Kunci: C")');
    }

    // 2. Extract Pembahasan (Explanation)
    let explanation = '';
    const expMatch = blockTrimmed.match(/(?:pembahasan|penjelasan|explanation|alasan)[\s\:\=]+([^\n]+(?:\n(?![A-D][\.\)]|kunci|topik|soal|\d+[\.\)]).*)*)/i);
    if (expMatch && expMatch[1]) {
      explanation = expMatch[1].trim();
    } else {
      explanation = `Jawaban yang benar adalah pilihan ${correctAnswer}.`;
    }

    // 3. Extract Topik (Topic) / Unit
    let topic = 'Procedure Text - English for Nusantara';
    const topicMatch = blockTrimmed.match(/(?:topik|topic|materi|indikator)[\s\:\=]+([^\n]+)/i);
    if (topicMatch && topicMatch[1]) {
      topic = topicMatch[1].trim();
    }

    let unitReference = 'Chapter 2: Culinary and Me';
    const unitMatch = blockTrimmed.match(/(?:unit|bab|chapter|referensi)[\s\:\=]+([^\n]+)/i);
    if (unitMatch && unitMatch[1]) {
      unitReference = unitMatch[1].trim();
    }

    // 4. Extract Audio / Listening script
    let hasAudio = false;
    let audioScript = '';
    let audioTitle = '';
    let listeningInstruction = '';
    const audioMatch = blockTrimmed.match(/(?:audio|listening|script\s*audio)[\s\:\=]+([^\n]+(?:\n(?![A-D][\.\)]|kunci|topik|soal|\d+[\.\)]).*)*)/i);
    if (audioMatch && audioMatch[1]) {
      hasAudio = true;
      audioScript = audioMatch[1].trim();
      audioTitle = `Audio Listening Soal ${id}`;
      listeningInstruction = 'Dengarkan pembacaan audio dengan saksama, lalu jawab pertanyaan berikut.';
    }

    // 5. Extract Context / Reading Passage (Teks Bacaan)
    let contextText: string | undefined = undefined;
    let contextTitle: string | undefined = undefined;
    const contextRegex = /(?:(?:teks\s*bacaan|bacaan|konteks|context)\s*[:=]\s*)([^\n]+(?:\n(?![A-D][.)]|kunci|soal|\d+[.)]).*)*)/i;
    const contextMatch = blockTrimmed.match(contextRegex);
    if (contextMatch && contextMatch[1]) {
      contextText = contextMatch[1].trim();
      contextTitle = `Teks Bacaan Soal ${id}`;
    }

    // 6. Extract Options A, B, C, D
    // We remove meta tags like Kunci:, Pembahasan:, Topik:, Audio: before parsing options
    let textForOptions = blockTrimmed
      .replace(/(?:kunci\s*(?:jawaban)?|jawaban|answer|key|ans)\s*[:=]\s*[A-Da-d][^\n]*/gi, '')
      .replace(/(?:pembahasan|penjelasan|explanation|alasan)\s*[:=]\s*[^\n]+/gi, '')
      .replace(/(?:topik|topic|materi|indikator)\s*[:=]\s*[^\n]+/gi, '')
      .replace(/(?:unit|bab|chapter|referensi)\s*[:=]\s*[^\n]+/gi, '')
      .replace(/(?:audio|listening)\s*[:=]\s*[^\n]+/gi, '');

    const optionsMap: Record<'A' | 'B' | 'C' | 'D', string> = {
      A: '',
      B: '',
      C: '',
      D: ''
    };

    // Try multi-line option matching first
    // E.g.:
    // A. Option text
    // B. Option text
    // Also handles inline: "A. One B. Two C. Three D. Four"
    const optionRegex = /(?:^|\s)(?:[\(\[]?([A-Da-d])[\)\]\.\:])\s+([\s\S]*?)(?=(?:[\s](?:[\(\[]?[A-Da-d][\)\]\.\:]\s+)|$))/g;
    
    let match: RegExpExecArray | null;
    const foundKeys: string[] = [];

    while ((match = optionRegex.exec(textForOptions)) !== null) {
      const optKey = match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const optVal = match[2].trim().replace(/[\r\n]+/g, ' ');
      if (['A', 'B', 'C', 'D'].includes(optKey)) {
        optionsMap[optKey] = optVal;
        foundKeys.push(optKey);
      }
    }

    // Fallback: Check if options were formatted like:
    // A) Text
    // B) Text
    if (!optionsMap.A || !optionsMap.B) {
      const lineOpts = textForOptions.split('\n');
      for (const line of lineOpts) {
        const lineMatch = line.trim().match(/^[\(\[]?([A-Da-d])[\)\]\.\:]\s+(.+)$/);
        if (lineMatch) {
          const k = lineMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          optionsMap[k] = lineMatch[2].trim();
        }
      }
    }

    const options = (['A', 'B', 'C', 'D'] as const).map(key => ({
      key,
      text: optionsMap[key] || ''
    }));

    // Check missing options
    const missingKeys = (['A', 'B', 'C', 'D'] as const).filter(k => !optionsMap[k] || optionsMap[k].trim().length === 0);
    if (missingKeys.length > 0) {
      validationErrors.push(`Pilihan opsi ${missingKeys.join(', ')} belum lengkap atau tidak terdeteksi.`);
    }

    // 7. Extract Question Body
    // Question is usually from the start of the block until the first option A.
    let questionText = '';
    const firstOptionIndex = textForOptions.search(/(?:^|\s)[\(\[]?[A-Aa-a][\)\]\.\:]\s+/);
    if (firstOptionIndex !== -1) {
      questionText = textForOptions.substring(0, firstOptionIndex).trim();
    } else {
      // Fallback: take first non-empty lines
      const nonOptionLines = textForOptions
        .split('\n')
        .filter(l => !/^\s*[\(\[]?[A-Da-d][\)\]\.\:]/i.test(l));
      questionText = nonOptionLines.join(' ').trim();
    }

    // Clean question number prefix (e.g. "1. ", "Soal 1: ")
    questionText = questionText
      .replace(/^(?:soal|no\.?|pertanyaan)?\s*\[?\d{1,3}\]?[\.\:\)\-]\s*/i, '')
      .trim();

    if (!questionText || questionText.length < 5) {
      validationErrors.push('Isi pertanyaan terlalu pendek atau tidak terdeteksi.');
      questionText = questionText || `Pertanyaan nomor ${id}`;
    }

    const isValid = validationErrors.length === 0;

    parsedQuestions.push({
      id,
      question: questionText,
      contextTitle,
      contextText,
      options,
      correctAnswer,
      explanation,
      topic,
      unitReference,
      hasAudio,
      audioTitle: hasAudio ? audioTitle : undefined,
      audioScript: hasAudio ? audioScript : undefined,
      listeningInstruction: hasAudio ? listeningInstruction : undefined,
      isValid,
      validationErrors,
      rawBlock: blockTrimmed
    });
  });

  const validCount = parsedQuestions.filter(q => q.isValid).length;
  const invalidCount = parsedQuestions.length - validCount;

  return {
    totalDetected: parsedQuestions.length,
    validCount,
    invalidCount,
    questions: parsedQuestions,
    warnings
  };
}

/**
 * Generates an example Word document text in standard Indonesian school format.
 */
export const SAMPLE_WORD_QUESTION_TEXT = `1. What is the primary social function of a procedure text?
A. To entertain readers with an amusing story
B. To describe a person, animal, or object in detail
C. To explain step-by-step how to make or do something
D. To persuade readers to buy a particular product
Kunci: C
Pembahasan: Fungsi sosial utama (social function) teks prosedur adalah memberikan petunjuk langkah demi langkah tentang cara membuat atau melakukan sesuatu.
Topik: Social Function of Procedure Text
Unit: Chapter 2: Culinary and Me (Unit 3)

2. Which of the following is considered a cooking utensil (tool), not an ingredient?
A. Two ripe bananas
B. Half a cup of sugar
C. A frying pan
D. Vegetable cooking oil
Kunci: C
Pembahasan: Frying pan (wajan penggorengan) adalah alat memasak (tool / utensil), sedangkan bahan lainnya adalah bahan makanan (ingredients).
Topik: Cooking Utensils vs Ingredients
Unit: Chapter 2: Culinary and Me (Unit 3: Section 2)

3. "First, peel the sweet potatoes and wash them thoroughly."
The underlined word "peel" is an example of...
A. Sequence adverb
B. Action verb (imperative)
C. Noun phrase
D. Adjective of quality
Kunci: B
Pembahasan: Kata "peel" (mengupas) adalah kata kerja aksi (action verb) yang digunakan dalam bentuk kalimat perintah (imperative sentence).
Topik: Action Verbs & Imperative Sentences
Unit: Chapter 2: Culinary and Me (Unit 3: Section 3)

4. Arrange the following sequence words correctly in a procedure text:
A. Next - Finally - First - Then
B. First - Then - Next - Finally
C. Finally - Then - First - Next
D. Then - First - Finally - Next
Kunci: B
Pembahasan: Urutan sequence words yang tepat dan logis dalam bahasa Inggris adalah First (pertama), Then (kemudian), Next (selanjutnya), dan Finally (terakhir).
Topik: Sequence Adverbs
Unit: Chapter 2: Culinary and Me (Unit 3: Section 3)

5. Audio: Good morning students. Today we are learning how to prepare Galang's favorite sweet tea. We need one tea bag, warm water, and two tablespoons of sugar. Stir well until the sugar dissolves completely.
What is needed to sweeten the tea?
A. Milk and honey
B. Two tablespoons of sugar
C. Lemon slices
D. Sweet potato syrup
Kunci: B
Pembahasan: Berdasarkan instruksi audio, pemanis yang digunakan adalah dua sendok makan gula (two tablespoons of sugar).
Topik: Listening Comprehension - Recipe Details
Unit: Chapter 2: Culinary and Me (Unit 3: Section 1)`;

/**
 * Exports current questions bank into clean formatted text matching Microsoft Word documents.
 */
export function exportQuestionsToWordText(questions: Question[]): string {
  return questions.map((q, idx) => {
    const num = idx + 1;
    let block = `${num}. ${q.question}\n`;

    if (q.contextText) {
      block = `[Teks Bacaan: ${q.contextTitle || 'Teks Referensi'}]\n${q.contextText}\n\n` + block;
    }

    if (q.hasAudio && q.audioScript) {
      block += `Audio: ${q.audioScript}\n`;
    }

    q.options.forEach(opt => {
      block += `${opt.key}. ${opt.text}\n`;
    });

    block += `Kunci: ${q.correctAnswer}\n`;
    block += `Pembahasan: ${q.explanation}\n`;
    block += `Topik: ${q.topic}\n`;
    block += `Unit: ${q.unitReference}\n`;

    return block;
  }).join('\n\n');
}

/**
 * Generates an HTML document that Microsoft Word and Google Docs can open directly as a native Word Document (.doc).
 */
export function downloadWordCompatibleDoc(questions: Question[], title = 'Bank Soal - English for Nusantara') {
  const contentHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" 
        xmlns:w="urn:schemas-microsoft-com:office:word" 
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #1e293b;
        margin: 1.5cm;
      }
      h1 {
        font-size: 16pt;
        color: #0f172a;
        border-bottom: 2pt solid #d97706;
        padding-bottom: 6pt;
        margin-bottom: 12pt;
      }
      .meta-box {
        background-color: #fef3c7;
        border: 1pt solid #f59e0b;
        padding: 8pt 12pt;
        margin-bottom: 16pt;
        font-size: 10pt;
      }
      .question-card {
        margin-bottom: 14pt;
        padding-bottom: 10pt;
        border-bottom: 0.5pt solid #cbd5e1;
        page-break-inside: avoid;
      }
      .question-title {
        font-weight: bold;
        font-size: 11pt;
        color: #0f172a;
        margin-bottom: 6pt;
      }
      .options-list {
        margin-left: 14pt;
        margin-bottom: 6pt;
      }
      .option-item {
        margin-bottom: 3pt;
      }
      .key-box {
        font-size: 9.5pt;
        color: #047857;
        font-weight: bold;
        background-color: #ecfdf5;
        padding: 3pt 6pt;
        display: inline-block;
        margin-top: 4pt;
      }
      .exp-box {
        font-size: 9pt;
        color: #475569;
        font-style: italic;
        margin-top: 3pt;
      }
      .audio-box {
        background-color: #eff6ff;
        border-left: 3pt solid #3b82f6;
        padding: 4pt 8pt;
        margin-bottom: 6pt;
        font-size: 9.5pt;
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="meta-box">
      <strong>Mata Pelajaran:</strong> Bahasa Inggris (English for Nusantara - SMP Kelas VII)<br>
      <strong>Bab / Unit:</strong> Chapter 2: Culinary and Me (Procedure Text)<br>
      <strong>Guru Pengampu:</strong> Eli Ermawati, S.Pd.<br>
      <strong>Total Soal:</strong> ${questions.length} Butir Soal Pilihan Ganda (A, B, C, D)
    </div>

    ${questions.map((q, idx) => `
      <div class="question-card">
        ${q.contextText ? `
          <div style="background-color: #f8fafc; border: 1pt solid #e2e8f0; padding: 6pt 10pt; margin-bottom: 6pt; font-size: 9.5pt;">
            <strong>${q.contextTitle || 'Teks Bacaan'}:</strong><br>
            ${q.contextText.replace(/\n/g, '<br>')}
          </div>
        ` : ''}

        ${q.hasAudio && q.audioScript ? `
          <div class="audio-box">
            <strong>[Audio Listening]:</strong> ${q.audioScript}
          </div>
        ` : ''}

        <div class="question-title">${idx + 1}. ${q.question}</div>
        
        <div class="options-list">
          ${q.options.map(opt => `
            <div class="option-item">
              <strong>${opt.key}.</strong> ${opt.text}
            </div>
          `).join('')}
        </div>

        <div class="key-box">Kunci: ${q.correctAnswer}</div>
        <div class="exp-box">Pembahasan: ${q.explanation}</div>
        <div style="font-size: 8.5pt; color: #64748b; margin-top: 3pt;">
          Topik: ${q.topic} &bull; ${q.unitReference}
        </div>
      </div>
    `).join('')}
  </body>
  </html>
  `;

  const blob = new Blob(['\ufeff', contentHtml], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bank_Soal_${title.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
