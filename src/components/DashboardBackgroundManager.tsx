import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Check,
  Trash2,
  RotateCcw,
  Sliders,
  Link2,
  Eye,
  Monitor,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
} from 'lucide-react';
import { DashboardBackgroundConfig, CustomBackgroundItem } from '../types';
import {
  DASHBOARD_BACKGROUND_PRESETS,
  INITIAL_DASHBOARD_BACKGROUND_CONFIG,
  resolveActiveBackgroundImageUrl,
  compressUploadedBackgroundImage,
} from '../utils/dashboardBackground';
import { playClickSound, playUnlockSuccessSound } from '../utils/audio';

interface DashboardBackgroundManagerProps {
  config: DashboardBackgroundConfig;
  onUpdateConfig: (newConfig: DashboardBackgroundConfig) => void;
}

export const DashboardBackgroundManager: React.FC<DashboardBackgroundManagerProps> = ({
  config,
  onUpdateConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlNameInput, setUrlNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const activeImageUrl = resolveActiveBackgroundImageUrl(config);
  const savedCustomList = config.savedCustomImages || [];

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setIsUploading(true);
    try {
      const compressedDataUrl = await compressUploadedBackgroundImage(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 40) || 'Background Upload';
      const newItem: CustomBackgroundItem = {
        id: `bg-${Date.now()}`,
        name: cleanName,
        imageUrl: compressedDataUrl,
        createdAt: new Date().toISOString(),
      };

      // Keep up to 6 recent custom uploaded images so teacher can switch anytime
      const updatedSaved = [newItem, ...savedCustomList].slice(0, 6);

      const nextConfig: DashboardBackgroundConfig = {
        ...config,
        mode: 'custom',
        customImageUrl: compressedDataUrl,
        savedCustomImages: updatedSaved,
        updatedAt: new Date().toISOString(),
      };

      onUpdateConfig(nextConfig);
      playUnlockSuccessSound();
      showToast(`Background "${cleanName}" berhasil diupload dan diterapkan!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar background.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleApplyExternalUrl = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setErrorMsg(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Masukkan URL gambar terlebih dahulu.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setErrorMsg('URL gambar harus diawali dengan https:// atau http://');
      return;
    }

    const label = urlNameInput.trim() || `Gambar URL #${savedCustomList.length + 1}`;
    const newItem: CustomBackgroundItem = {
      id: `bg-url-${Date.now()}`,
      name: label,
      imageUrl: trimmed,
      createdAt: new Date().toISOString(),
    };

    const updatedSaved = [newItem, ...savedCustomList.filter((i) => i.imageUrl !== trimmed)].slice(0, 6);

    onUpdateConfig({
      ...config,
      mode: 'custom',
      customImageUrl: trimmed,
      savedCustomImages: updatedSaved,
      updatedAt: new Date().toISOString(),
    });
    setUrlInput('');
    setUrlNameInput('');
    playUnlockSuccessSound();
    showToast(`Background "${label}" berhasil diterapkan!`);
  };

  const handleSelectSavedCustom = (item: CustomBackgroundItem) => {
    playClickSound();
    onUpdateConfig({
      ...config,
      mode: 'custom',
      customImageUrl: item.imageUrl,
      updatedAt: new Date().toISOString(),
    });
    showToast(`Background diubah ke "${item.name}".`);
  };

  const handleDeleteSavedCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    const target = savedCustomList.find((item) => item.id === id);
    const remaining = savedCustomList.filter((item) => item.id !== id);
    const isCurrentlyActive = target && config.mode === 'custom' && config.customImageUrl === target.imageUrl;

    onUpdateConfig({
      ...config,
      mode: isCurrentlyActive ? (remaining[0] ? 'custom' : 'default') : config.mode,
      customImageUrl: isCurrentlyActive ? (remaining[0]?.imageUrl || '') : config.customImageUrl,
      savedCustomImages: remaining,
      updatedAt: new Date().toISOString(),
    });
    showToast('Gambar dihapus dari koleksi background.');
  };

  const handleSelectPreset = (presetId: string) => {
    playClickSound();
    const preset = DASHBOARD_BACKGROUND_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const isDefault = presetId === 'default-amber';
    onUpdateConfig({
      ...config,
      mode: isDefault ? 'default' : 'preset',
      presetId: preset.id,
      overlayColor: preset.recommendedOverlayColor,
      overlayOpacity: preset.recommendedOpacity,
      updatedAt: new Date().toISOString(),
    });
    showToast(`Tema background diubah ke "${preset.name}".`);
  };

  const handleResetDefault = () => {
    playClickSound();
    onUpdateConfig({
      ...INITIAL_DASHBOARD_BACKGROUND_CONFIG,
      savedCustomImages: savedCustomList, // preserve uploaded collection so teacher never loses their photos
      updatedAt: new Date().toISOString(),
    });
    showToast('Background dikembalikan ke tampilan standar Nusantara.');
  };

  const getOverlayCssColor = (colorMode: 'light' | 'dark' | 'warm', opacityPct: number) => {
    const alpha = Math.max(0, Math.min(0.95, opacityPct / 100));
    if (colorMode === 'dark') {
      return `rgba(15, 23, 42, ${alpha})`;
    }
    if (colorMode === 'warm') {
      return `rgba(255, 251, 235, ${alpha})`;
    }
    return `rgba(255, 255, 255, ${alpha})`;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Menu Upload &amp; Kustomisasi Background Dashboard
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Bisa Diubah-ubah Kapan Saja
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload foto sekolah, kelas, poster kegiatan, atau pilih tema siap pakai untuk mempercantik latar Dashboard Guru maupun Halaman Kuis Siswa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Gambar Baru</span>
            </button>

            {config.mode !== 'default' && (
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Kembalikan ke background standar bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standar</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Toast / Alert */}
        {toastMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main 2-Column Layout: Upload + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          {/* Left Column: Upload Dropzone & URL Input (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Drag & Drop Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[190px] ${
                isDraggingOver
                  ? 'border-amber-500 bg-amber-50/70 scale-[0.99]'
                  : 'border-amber-300 bg-amber-50/30 hover:bg-amber-50/60 hover:border-amber-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                  <span className="text-sm font-bold text-slate-800">
                    Mengoptimalkan &amp; Menyimpan Gambar Background...
                  </span>
                  <span className="text-xs text-slate-500">
                    Menyesuaikan resolusi agar ringan dan tersinkronisasi lintas perangkat
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mb-3 border border-amber-300/60">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    Klik untuk Pilih File Gambar atau Seret &amp; Lepas (Drag &amp; Drop) ke Sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Mendukung foto format <strong>JPG, PNG, WEBP, GIF, SVG</strong> dari laptop maupun HP. Gambar otomatis disimpan ke galeri koleksi agar mudah diganti-ganti kapan saja.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pilih Gambar dari Perangkat</span>
                  </span>
                </>
              )}
            </div>

            {/* External Image URL Input */}
            <form onSubmit={handleApplyExternalUrl} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Link2 className="w-4 h-4 text-amber-600" />
                <span>Atau Gunakan Link / URL Gambar Background dari Internet</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={urlNameInput}
                  onChange={(e) => setUrlNameInput(e.target.value)}
                  placeholder="Nama Label (Opsional)"
                  className="sm:col-span-4 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:border-amber-500 outline-hidden"
                />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Tempel link gambar https://..."
                  className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:border-amber-500 outline-hidden"
                />
                <button
                  type="submit"
                  className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Pakai URL
                </button>
              </div>
            </form>

            {/* Saved Custom Uploaded Images Gallery ("Koleksi Background Saya") */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Koleksi Background Upload Saya ({savedCustomList.length}/6)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500">
                  Klik gambar untuk mengganti background dengan cepat
                </span>
              </div>

              {savedCustomList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                  Belum ada gambar yang diupload. Setiap gambar yang Anda upload akan tersimpan di sini agar bisa diganti-ganti dengan 1 klik tanpa perlu upload ulang.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedCustomList.map((item) => {
                    const isSelected =
                      config.mode === 'custom' && config.customImageUrl === item.imageUrl;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectSavedCustom(item)}
                        className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-16/10 bg-slate-100 ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-sm'
                            : 'border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-between p-2">
                          <div className="flex items-center justify-between">
                            {isSelected ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-xs">
                                <Check className="w-3 h-3" />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900/70 text-white font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                Pakai Ini
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleDeleteSavedCustom(item.id, e)}
                              className="w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                              title="Hapus gambar ini dari koleksi"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-[11px] font-bold text-white truncate">
                            {item.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Preview & Visual Adjustments (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Eye className="w-4 h-4" />
                  <span>Pratinjau Tampilan Dashboard (Live Preview)</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                  {config.mode === 'default'
                    ? 'Standar'
                    : config.mode === 'custom'
                    ? 'Gambar Upload'
                    : 'Tema Preset'}
                </span>
              </div>

              {/* Miniature Preview Screen */}
              <div className="relative rounded-xl overflow-hidden border border-slate-700 h-52 bg-linear-to-b from-amber-50/40 via-white to-orange-50/20">
                {/* Background Image Layer */}
                {activeImageUrl && (
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      backgroundImage: `url("${activeImageUrl}")`,
                      backgroundSize:
                        config.bgSize === 'repeat'
                          ? '220px auto'
                          : config.bgSize === 'contain'
                          ? 'contain'
                          : 'cover',
                      backgroundRepeat: config.bgSize === 'repeat' ? 'repeat' : 'no-repeat',
                      backgroundPosition: 'center',
                      filter: config.blurPx > 0 ? `blur(${config.blurPx}px)` : 'none',
                      transform: config.blurPx > 0 ? 'scale(1.06)' : 'scale(1)',
                    }}
                  />
                )}

                {/* Overlay Layer */}
                {activeImageUrl && (
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      backgroundColor: getOverlayCssColor(config.overlayColor, config.overlayOpacity),
                    }}
                  />
                )}

                {/* Mock Dashboard Content Inside Preview */}
                <div className="relative z-10 p-3 space-y-2.5 h-full flex flex-col justify-between">
                  {/* Mock Top Banner */}
                  <div
                    className="rounded-xl p-2.5 text-white border border-slate-700/80 shadow-md relative overflow-hidden"
                    style={
                      config.applyToBanner && activeImageUrl
                        ? {
                            backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.86), rgba(15,23,42,0.72)), url("${activeImageUrl}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : { backgroundColor: '#0f172a' }
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-400/30">
                          Dashboard Guru
                        </span>
                        <div className="text-xs font-extrabold mt-0.5">
                          Rekap &amp; Penilaian Siswa
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[9px]">
                        Aktif
                      </span>
                    </div>
                  </div>

                  {/* Mock KPI Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-slate-200/90 shadow-2xs">
                      <div className="text-[9px] text-slate-500 font-bold">TOTAL</div>
                      <div className="text-xs font-black text-slate-900">32 Siswa</div>
                    </div>
                    <div className="bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-slate-200/90 shadow-2xs">
                      <div className="text-[9px] text-slate-500 font-bold">RATA-RATA</div>
                      <div className="text-xs font-black text-amber-600">86.5</div>
                    </div>
                    <div className="bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-slate-200/90 shadow-2xs">
                      <div className="text-[9px] text-slate-500 font-bold">TUNTAS</div>
                      <div className="text-xs font-black text-emerald-600">92%</div>
                    </div>
                  </div>

                  {/* Mock Table Bar */}
                  <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between text-[10px] text-slate-700 font-semibold">
                    <span>Tabel Rekapitulasi Nilai Siswa</span>
                    <span className="text-emerald-700 font-bold">Teks Tetap Jelas Terbaca</span>
                  </div>
                </div>
              </div>

              {/* Adjustments Controls */}
              <div className="space-y-3 pt-1">
                {/* Area Penerapan */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    1. Terapkan Background Pada:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'all', label: 'Semua Halaman', icon: Layers },
                      { id: 'dashboard_only', label: 'Dashboard Guru', icon: Monitor },
                      { id: 'student_only', label: 'Halaman Siswa', icon: GraduationCap },
                    ].map((scope) => {
                      const IconComp = scope.icon;
                      const active = config.applyScope === scope.id;
                      return (
                        <button
                          key={scope.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            onUpdateConfig({
                              ...config,
                              applyScope: scope.id as 'all' | 'dashboard_only' | 'student_only',
                              updatedAt: new Date().toISOString(),
                            });
                          }}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span className="text-center leading-tight">{scope.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle Apply to Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Tampilkan Juga di Kartu Header Atas Dashboard
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Memasang gambar latar pada kotak banner judul Dashboard Guru
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onUpdateConfig({
                        ...config,
                        applyToBanner: !config.applyToBanner,
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      config.applyToBanner
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {config.applyToBanner ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>

                {/* Overlay Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kecerahan Lapisan Pelindung Teks (Overlay)</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {config.overlayOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={config.overlayOpacity}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        overlayOpacity: Number(e.target.value),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Blur Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      Efek Halus / Blur Background
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {config.blurPx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={1}
                    value={config.blurPx}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        blurPx: Number(e.target.value),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Overlay Tone & Background Size */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Warna Lapisan Overlay
                    </label>
                    <select
                      value={config.overlayColor}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          overlayColor: e.target.value as 'light' | 'dark' | 'warm',
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="light">Putih Terang (Jelas)</option>
                      <option value="warm">Krem Hangat Nusantara</option>
                      <option value="dark">Gelap Kontras (Malam)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Mode Ukuran Gambar
                    </label>
                    <select
                      value={config.bgSize}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          bgSize: e.target.value as 'cover' | 'contain' | 'repeat',
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="cover">Penuh Layar (Cover)</option>
                      <option value="contain">Utuh Proporsional (Contain)</option>
                      <option value="repeat">Pola Berulang (Tile)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Themes Gallery Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Galeri Tema &amp; Background Siap Pakai (Klik untuk Mengubah)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih berbagai nuansa latar belakang edukatif yang dapat diganti-ganti kapan saja hanya dengan 1 klik.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {DASHBOARD_BACKGROUND_PRESETS.map((preset) => {
            const isSelected =
              (preset.id === 'default-amber' && config.mode === 'default') ||
              (config.mode === 'preset' && config.presetId === preset.id);

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`group text-left rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/30 shadow-sm'
                    : 'border-slate-200 hover:border-amber-300 bg-white'
                }`}
              >
                {/* Thumbnail Preview */}
                <div
                  className="h-24 w-full relative overflow-hidden border-b border-slate-100"
                  style={{
                    background: preset.previewGradient,
                  }}
                >
                  {preset.imageUrl && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url("${preset.imageUrl}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  )}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/75 text-white font-bold text-[10px] backdrop-blur-xs">
                      {preset.category}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-xs">
                        <Check className="w-3 h-3" />
                        <span>Dipakai</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                      {preset.name}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
