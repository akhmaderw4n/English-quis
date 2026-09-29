import { DashboardBackgroundConfig } from '../types';

export interface BackgroundPresetOption {
  id: string;
  name: string;
  category: string;
  description: string;
  previewGradient: string;
  imageUrl: string;
  recommendedOverlayColor: 'light' | 'dark' | 'warm';
  recommendedOpacity: number;
}

const svgToDataUrl = (svgString: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
};

export const DASHBOARD_BACKGROUND_PRESETS: BackgroundPresetOption[] = [
  {
    id: 'default-amber',
    name: 'Standar Nusantara (Default)',
    category: 'Bawaan',
    description: 'Tampilan bersih standar aplikasi dengan gradasi krem-amber hangat.',
    previewGradient: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fff7ed 100%)',
    imageUrl: '',
    recommendedOverlayColor: 'light',
    recommendedOpacity: 65,
  },
  {
    id: 'batik-nusantara',
    name: 'Batik & Budaya Nusantara',
    category: 'Budaya',
    description: 'Motif geometris kawung & parang modern bernuansa emas hangat khas Nusantara.',
    previewGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #78350f 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef3c7"/>
            <stop offset="50%" stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
          <pattern id="kawung" width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#b45309" stroke-width="2" stroke-opacity="0.22"/>
            <ellipse cx="60" cy="30" rx="18" ry="28" fill="none" stroke="#92400e" stroke-width="2" stroke-opacity="0.24"/>
            <ellipse cx="60" cy="90" rx="18" ry="28" fill="none" stroke="#92400e" stroke-width="2" stroke-opacity="0.24"/>
            <ellipse cx="30" cy="60" rx="28" ry="18" fill="none" stroke="#92400e" stroke-width="2" stroke-opacity="0.24"/>
            <ellipse cx="90" cy="60" rx="28" ry="18" fill="none" stroke="#92400e" stroke-width="2" stroke-opacity="0.24"/>
            <circle cx="60" cy="60" r="6" fill="#b45309" fill-opacity="0.25"/>
            <circle cx="0" cy="0" r="8" fill="#d97706" fill-opacity="0.2"/>
            <circle cx="120" cy="0" r="8" fill="#d97706" fill-opacity="0.2"/>
            <circle cx="0" cy="120" r="8" fill="#d97706" fill-opacity="0.2"/>
            <circle cx="120" cy="120" r="8" fill="#d97706" fill-opacity="0.2"/>
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#bg)"/>
        <rect width="1600" height="1000" fill="url(#kawung)"/>
      </svg>
    `),
    recommendedOverlayColor: 'warm',
    recommendedOpacity: 60,
  },
  {
    id: 'edu-sky-blue',
    name: 'Langit Akademik Biru',
    category: 'Edukasi',
    description: 'Nuansa biru langit cerah dengan gelombang lembut yang meningkatkan fokus belajar.',
    previewGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #1e3a8a 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e0f2fe"/>
            <stop offset="45%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#7dd3fc"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="1000" fill="url(#sky)"/>
        <circle cx="1350" cy="180" r="260" fill="#38bdf8" fill-opacity="0.22"/>
        <circle cx="220" cy="820" r="320" fill="#0284c7" fill-opacity="0.16"/>
        <path d="M0,680 C360,580 680,790 1080,660 C1340,575 1480,640 1600,610 L1600,1000 L0,1000 Z" fill="#0284c7" fill-opacity="0.14"/>
        <path d="M0,780 C420,700 820,860 1240,750 C1420,700 1520,730 1600,710 L1600,1000 L0,1000 Z" fill="#0369a1" fill-opacity="0.12"/>
      </svg>
    `),
    recommendedOverlayColor: 'light',
    recommendedOpacity: 50,
  },
  {
    id: 'emerald-campus',
    name: 'Taman Sekolah Hijau Asri',
    category: 'Alam',
    description: 'Gradasi hijau zamrud segar yang nyaman di mata untuk sesi ujian & koreksi nilai.',
    previewGradient: 'linear-gradient(135deg, #34d399 0%, #059669 50%, #064e3b 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="em" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d1fae5"/>
            <stop offset="50%" stop-color="#a7f3d0"/>
            <stop offset="100%" stop-color="#6ee7b7"/>
          </linearGradient>
          <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="2.5" fill="#047857" fill-opacity="0.18"/>
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#em)"/>
        <rect width="1600" height="1000" fill="url(#dots)"/>
        <circle cx="1400" cy="850" r="380" fill="#10b981" fill-opacity="0.2"/>
        <circle cx="180" cy="160" r="280" fill="#059669" fill-opacity="0.15"/>
      </svg>
    `),
    recommendedOverlayColor: 'light',
    recommendedOpacity: 55,
  },
  {
    id: 'sunset-archipelago',
    name: 'Senja Kepulauan Nusantara',
    category: 'Pemandangan',
    description: 'Nuansa senja keemasan dengan siluet bukit dan kepulauan tropis Indonesia.',
    previewGradient: 'linear-gradient(135deg, #fb923c 0%, #e11d48 55%, #4c1d95 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="sunset" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffedd5"/>
            <stop offset="45%" stop-color="#fed7aa"/>
            <stop offset="80%" stop-color="#fdba74"/>
            <stop offset="100%" stop-color="#fb923c"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="1000" fill="url(#sunset)"/>
        <circle cx="800" cy="340" r="170" fill="#f97316" fill-opacity="0.22"/>
        <path d="M0,650 Q260,520 540,630 T1120,600 T1600,640 L1600,1000 L0,1000 Z" fill="#ea580c" fill-opacity="0.16"/>
        <path d="M0,760 Q380,660 760,750 T1600,730 L1600,1000 L0,1000 Z" fill="#9a3412" fill-opacity="0.16"/>
      </svg>
    `),
    recommendedOverlayColor: 'warm',
    recommendedOpacity: 55,
  },
  {
    id: 'royal-library',
    name: 'Akademik Ungu Modern',
    category: 'Edukasi',
    description: 'Nuansa indigo dan ungu pastel modern yang memberikan kesan tegas dan rapi.',
    previewGradient: 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #312e81 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="indigo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e0e7ff"/>
            <stop offset="50%" stop-color="#c7d2fe"/>
            <stop offset="100%" stop-color="#ddd6fe"/>
          </linearGradient>
          <pattern id="hex" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M40 0 L80 20 L80 60 L40 80 L0 60 L0 20 Z" fill="none" stroke="#4f46e5" stroke-width="1.2" stroke-opacity="0.14"/>
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#indigo)"/>
        <rect width="1600" height="1000" fill="url(#hex)"/>
        <circle cx="1300" cy="220" r="300" fill="#6366f1" fill-opacity="0.16"/>
        <circle cx="300" cy="780" r="300" fill="#8b5cf6" fill-opacity="0.16"/>
      </svg>
    `),
    recommendedOverlayColor: 'light',
    recommendedOpacity: 55,
  },
  {
    id: 'minimal-grid',
    name: 'Grid Buku Catatan Sekolah',
    category: 'Minimalis',
    description: 'Tekstur garis kotak buku catatan sekolah yang bersih, terang, dan terstruktur.',
    previewGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" stroke-width="1" stroke-opacity="0.18"/>
          </pattern>
          <pattern id="majorGrid" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="url(#grid)"/>
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#475569" stroke-width="1.5" stroke-opacity="0.24"/>
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="#f8fafc"/>
        <rect width="1600" height="1000" fill="url(#majorGrid)"/>
      </svg>
    `),
    recommendedOverlayColor: 'light',
    recommendedOpacity: 35,
  },
  {
    id: 'dark-executive',
    name: 'Gelap Elegan (Executive Slate)',
    category: 'Modern',
    description: 'Latar belakang gelap berkelas dengan aksen cahaya emas lembut di tepi layar.',
    previewGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
    imageUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="darkbg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="50%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <pattern id="darkdots" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="24" cy="24" r="1.5" fill="#f59e0b" fill-opacity="0.22"/>
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#darkbg)"/>
        <rect width="1600" height="1000" fill="url(#darkdots)"/>
        <circle cx="1350" cy="180" r="340" fill="#f59e0b" fill-opacity="0.12"/>
        <circle cx="240" cy="820" r="360" fill="#38bdf8" fill-opacity="0.1"/>
      </svg>
    `),
    recommendedOverlayColor: 'light',
    recommendedOpacity: 30,
  },
];

export const INITIAL_DASHBOARD_BACKGROUND_CONFIG: DashboardBackgroundConfig = {
  mode: 'default',
  presetId: 'default-amber',
  customImageUrl: '',
  savedCustomImages: [],
  applyScope: 'all',
  applyToBanner: true,
  overlayOpacity: 60,
  overlayColor: 'light',
  blurPx: 0,
  bgSize: 'cover',
};

/**
 * Resolves the active background image URL from the current config.
 */
export function resolveActiveBackgroundImageUrl(config?: DashboardBackgroundConfig): string {
  if (!config || config.mode === 'default') {
    return '';
  }
  if (config.mode === 'custom' && config.customImageUrl?.trim()) {
    return config.customImageUrl.trim();
  }
  if (config.mode === 'preset') {
    const found = DASHBOARD_BACKGROUND_PRESETS.find((p) => p.id === config.presetId);
    return found?.imageUrl || '';
  }
  return '';
}

/**
 * Compresses and resizes an uploaded image file on the client so it renders smoothly
 * and stays well within localStorage and Cloud Firestore document limits (< 250KB).
 */
export function compressUploadedBackgroundImage(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar (pilih JPG, PNG, WEBP, atau GIF).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar dari perangkat.'));
    reader.onload = () => {
      const result = reader.result as string;
      // If SVG or very small image (< 180KB), keep directly
      if (file.type === 'image/svg+xml' || result.length < 180 * 1024) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/jpeg', quality);
        // If still large, step down quality slightly to guarantee smooth cloud sync
        if (compressed.length > 320 * 1024) {
          compressed = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
