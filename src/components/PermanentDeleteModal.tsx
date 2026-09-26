import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
  KeyRound,
  RotateCcw,
  Search,
  Check,
  Loader2,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { Question } from '../types';
import { playClickSound, playUnlockSuccessSound, playWrongSound } from '../utils/audio';

interface PermanentDeleteModalProps {
  isOpen: boolean;
  questions: Question[];
  currentPin: string;
  onDeleteSelected: (questionIds: number[]) => Promise<void>;
  onClearAll: (resetToDefault: boolean) => Promise<void>;
  onClose: () => void;
}

export const PermanentDeleteModal: React.FC<PermanentDeleteModalProps> = ({
  isOpen,
  questions,
  currentPin,
  onDeleteSelected,
  onClearAll,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'all'>('batch');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Wipe all states
  const [wipeMode, setWipeMode] = useState<'empty' | 'reset'>('empty');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearchQuery('');
      setPinInput('');
      setPinError(null);
      setIsProcessing(false);
      setConfirmStep(false);
    }
  }, [isOpen]);

  // Filter questions by search query
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const qLower = searchQuery.toLowerCase();
    return questions.filter(
      (q) =>
        q.question.toLowerCase().includes(qLower) ||
        q.topic.toLowerCase().includes(qLower) ||
        String(q.id).includes(qLower)
    );
  }, [questions, searchQuery]);

  if (!isOpen) return null;

  const handleToggleSelect = (id: number) => {
    playClickSound();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    playClickSound();
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  const handleExecuteBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsProcessing(true);
    try {
      await onDeleteSelected(selectedIds);
      playUnlockSuccessSound();
      onClose();
    } catch (err) {
      console.error('Error executing batch delete:', err);
      playWrongSound();
    } finally {
      setIsProcessing(false);
      setConfirmStep(false);
    }
  };

  const handleExecuteWipeAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (pinInput.trim() !== currentPin.trim()) {
      playWrongSound();
      setPinError('PIN Keamanan Guru tidak sesuai. Penghapusan dibatalkan.');
      return;
    }

    setIsProcessing(true);
    try {
      await onClearAll(wipeMode === 'reset');
      playUnlockSuccessSound();
      onClose();
    } catch (err) {
      console.error('Error clearing question bank:', err);
      playWrongSound();
      setPinError('Gagal menghapus bank soal. Silakan coba kembali.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>Menu Hapus Permanen Bank Soal</span>
              </h3>
              <p className="text-xs text-rose-100">
                Pilih butir soal yang ingin dihapus permanen atau bersihkan seluruh bank soal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-2 sm:px-6 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('batch');
              setConfirmStep(false);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Pilih Butir Soal (Hapus Terpilih)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800">
              {selectedIds.length} dipilih
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('all');
              setConfirmStep(false);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Hapus Seluruh Bank Soal</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs text-slate-700 space-y-4">
          {activeTab === 'batch' ? (
            /* TAB 1: BATCH DELETE */
            <div className="space-y-4">
              {/* Search and Quick Selection */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari berdasarkan teks soal atau topik materi..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                        <span>Batalkan Semua</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                        <span>Pilih Semua</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Notice Warning */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Penghapusan Bersifat Permanen</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Butir soal yang dihapus akan langsung hilang dari Cloud Firestore dan kuis siswa. Nomor urut butir soal lainnya otomatis disesuaikan secara berurutan.
                  </p>
                </div>
              </div>

              {/* Questions List with Checkboxes */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {filteredQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">
                    Tidak ada butir soal yang sesuai pencarian.
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const isSelected = selectedIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleSelect(q.id)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none ${
                          isSelected ? 'bg-rose-50/70' : 'hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(q.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5 shrink-0 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-md bg-slate-800 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {q.topic}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Kunci: {q.correctAnswer}
                            </span>
                          </div>

                          <p className="text-slate-700 line-clamp-2 text-xs leading-relaxed">
                            {q.question}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: WIPE ALL BANK SOAL */
            <form onSubmit={handleExecuteWipeAll} className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Zona Bahaya: Hapus Permanen Seluruh Bank Soal</span>
                </div>
                <p className="text-xs leading-relaxed text-rose-800">
                  Tindakan ini akan menghapus seluruh butir soal aktif saat ini dari server database. Diperlukan konfirmasi <strong>PIN Keamanan Guru</strong> untuk melanjutkan.
                </p>
              </div>

              {/* Wipe Mode Choice */}
              <div className="space-y-2.5 pt-1">
                <label className="font-bold text-slate-800 block text-xs">
                  Pilih Tindakan Penghapusan:
                </label>

                <div
                  onClick={() => {
                    playClickSound();
                    setWipeMode('empty');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    wipeMode === 'empty'
                      ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="wipeMode"
                    checked={wipeMode === 'empty'}
                    onChange={() => setWipeMode('empty')}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      Kosongkan Seluruh Bank Soal (0 Butir Soal)
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Menghapus total semua soal yang ada agar bank soal menjadi bersih, siap untuk diimpor ulang dari file Word atau input manual baru.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    playClickSound();
                    setWipeMode('reset');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    wipeMode === 'reset'
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="wipeMode"
                    checked={wipeMode === 'reset'}
                    onChange={() => setWipeMode('reset')}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>Hapus &amp; Reset ke Soal Standar (10 Butir Asli)</span>
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Menghapus soal kustom dan mengembalikan bank soal ke 10 soal resmi buku <em>English for Nusantara</em> Chapter 2.
                    </p>
                  </div>
                </div>
              </div>

              {/* PIN Confirmation */}
              <div className="pt-2">
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                  <span>Masukkan PIN Guru untuk Otorisasi Penghapusan:</span>
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Ketikkan PIN guru Anda..."
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold tracking-widest text-slate-900"
                  required
                />
                {pinError && (
                  <p className="text-rose-600 font-semibold text-[11px] mt-1.5">
                    {pinError}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === 'batch' ? (
              <span>
                Dipilih: <strong>{selectedIds.length}</strong> dari {questions.length} butir soal
              </span>
            ) : (
              <span>
                Total soal saat ini: <strong>{questions.length}</strong> butir
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-colors disabled:opacity-50 cursor-pointer text-xs"
            >
              Batal
            </button>

            {activeTab === 'batch' ? (
              confirmStep ? (
                <button
                  type="button"
                  disabled={isProcessing || selectedIds.length === 0}
                  onClick={handleExecuteBatchDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs animate-pulse"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menghapus Permanen...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Konfirmasi Hapus {selectedIds.length} Soal</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing || selectedIds.length === 0}
                  onClick={handleExecuteBatchDelete}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Permanen Terpilih ({selectedIds.length})</span>
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={isProcessing || !pinInput.trim()}
                onClick={handleExecuteWipeAll}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eksekusi Hapus Permanen</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
