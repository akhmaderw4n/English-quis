import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lock, KeyRound, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { QUIZ_METADATA } from '../data/quizData';
import { playClickSound } from '../utils/audio';

interface TeacherPinModalProps {
  currentPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const TeacherPinModal: React.FC<TeacherPinModalProps> = ({
  currentPin,
  onSuccess,
  onClose,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (pinInput === currentPin) {
      setErrorMsg('');
      onSuccess();
    } else {
      setErrorMsg('PIN yang Anda masukkan salah. Silakan coba lagi.');
    }
  };

  const handleUseDefault = () => {
    setPinInput(currentPin);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Autentikasi Guru</h3>
              <p className="text-[11px] text-slate-500">{QUIZ_METADATA.branding}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Masukkan PIN Akses Dashboard
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                autoFocus
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Masukkan PIN..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-hidden text-sm font-mono tracking-wider text-slate-900 transition-all text-center font-bold"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Default PIN Helper */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <span className="text-amber-900">
              PIN Default Sistem: <strong className="font-mono font-bold">{currentPin}</strong>
            </span>
            <button
              type="button"
              onClick={handleUseDefault}
              className="text-[11px] font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
            >
              Gunakan
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Masuk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
