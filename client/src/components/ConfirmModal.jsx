import React from 'react';
import { AlertCircle, CheckCircle, X, Loader2, Info } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title,
  message,
  note = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'brand', // 'brand' | 'danger'
  loading = false,
  details = null,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border border-[#D5C3EE]/90 p-6 sm:p-7 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
            confirmVariant === 'danger' ? 'bg-rose-500/10' : 'bg-[#B19BD6]/20'
          }`}
        />

        {/* Close Icon */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#FAF7FD] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-[#F3ECFB] border-[#D5C3EE] text-[#6A4C97]'
            }`}
          >
            {confirmVariant === 'danger' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Details Box if any */}
        {details && (
          <div className="my-4 p-4 rounded-xl bg-[#FAF7FD] border border-[#D5C3EE]/80 space-y-2 text-xs">
            {details.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Note / Disclaimer if any */}
        {note && (
          <div className="my-3.5 p-3 rounded-xl bg-purple-50/90 border border-purple-200/90 text-xs text-purple-900 flex items-start space-x-2">
            <Info className="w-4 h-4 text-[#8164AD] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{note}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-[#E6DAF6]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-[#FAF7FD] border border-[#D5C3EE] transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            id="modal-confirm-btn"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all flex items-center space-x-2 ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-[#8164AD] hover:bg-[#6A4C97] shadow-[#8164AD]/25'
            } disabled:opacity-50`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
