import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Package, RefreshCw, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  operator?: string;
  timestamp: string;
}

interface RealtimeToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const RealtimeToast: React.FC<RealtimeToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 text-white border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              toast.type === 'alert' ? 'bg-rose-500/20 text-rose-400' :
              toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-sky-500/20 text-sky-400'
            }`}>
              {toast.type === 'alert' || toast.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-white truncate">
                  {toast.title}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  即時同步
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                {toast.message}
              </p>
              {toast.operator && (
                <div className="text-[10px] text-amber-400 font-medium mt-1">
                  操作人員：{toast.operator}
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
