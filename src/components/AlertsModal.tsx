import React from 'react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  MapPin, 
  Package,
  Layers,
  Check
} from 'lucide-react';
import { SystemAlert, InventoryItem } from '../types/inventory';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SystemAlert[];
  items: InventoryItem[];
  onSelectItem: (item: InventoryItem) => void;
  onQuickAudit: (item: InventoryItem) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  items,
  onSelectItem,
  onQuickAudit,
}) => {
  if (!isOpen) return null;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                即時庫存與盤點異常告警中心
              </h3>
              <p className="text-xs text-slate-400">
                目前共有 <strong className="text-rose-500">{alerts.length}</strong> 則即時告警項目需要關注
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {alerts.length > 0 ? (
            alerts.map((alert) => {
              const matchedItem = items.find(i => i.id === alert.itemId);
              const isCrit = alert.severity === 'critical';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCrit
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
                      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        isCrit ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300'
                      }`}>
                        {alert.type === 'discrepancy' ? (
                          <Layers className="w-5 h-5" />
                        ) : isCrit ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {alert.itemSku}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-500" />
                            {alert.shelfLocation}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {alert.message}
                        </p>

                        <div className="text-[11px] text-slate-400">
                          觸發時間：{new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {matchedItem && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          onClose();
                          onQuickAudit(matchedItem);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        現場覆盤
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onSelectItem(matchedItem);
                        }}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-xs font-bold text-slate-950 shadow-sm transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>檢視貨品詳情</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-base text-slate-900 dark:text-white">太棒了！目前全倉庫無任何異常告警</h4>
              <p className="text-xs text-slate-400 mt-1">
                所有貨品數量均維持在安全庫存以上，且無帳實盤點差異。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
