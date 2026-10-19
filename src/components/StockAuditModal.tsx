import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  MapPin, 
  ArrowRight,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { InventoryItem, Operator } from '../types/inventory';
import { playSound } from '../utils/sound';

interface StockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  currentOperator: Operator;
  onRecordAudit: (
    itemId: string, 
    countedQty: number, 
    adjustSystemQty: boolean, 
    note?: string
  ) => Promise<void>;
  targetItem?: InventoryItem | null;
  canAuditStock?: boolean;
}

export const StockAuditModal: React.FC<StockAuditModalProps> = ({
  isOpen,
  onClose,
  items,
  currentOperator,
  onRecordAudit,
  targetItem,
  canAuditStock = true,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(targetItem?.id || items[0]?.id || '');
  const [countedQty, setCountedQty] = useState<string>(targetItem ? String(targetItem.quantity) : '');
  const [auditNote, setAuditNote] = useState<string>('');
  const [adjustSystemQty, setAdjustSystemQty] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync targetItem if provided
  React.useEffect(() => {
    if (targetItem) {
      setSelectedItemId(targetItem.id);
      setCountedQty(String(targetItem.quantity));
    }
  }, [targetItem]);

  const currentItem = items.find(i => i.id === selectedItemId);

  if (!isOpen) return null;

  // Filtered list
  const filteredList = items.filter(item => {
    const matchZone = zoneFilter === 'ALL' || item.zone === zoneFilter || item.shelfLocation.startsWith(zoneFilter);
    const matchSearch = !searchFilter.trim() ||
      item.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.shelfLocation.toLowerCase().includes(searchFilter.toLowerCase());
    return matchZone && matchSearch;
  });

  const numCounted = parseInt(countedQty);
  const systemQty = currentItem?.quantity ?? 0;
  const hasValidCount = !isNaN(numCounted) && numCounted >= 0;
  const discrepancy = hasValidCount ? numCounted - systemQty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || !hasValidCount) return;
    if (!canAuditStock) {
      alert('⚠️ 權限不足：您目前的職銜為「一盤層級」，僅具備查閱與掃碼功能，不得修改或提交盤點資料。');
      return;
    }

    try {
      setSubmitting(true);
      await onRecordAudit(currentItem.id, numCounted, adjustSystemQty, auditNote);
      
      if (discrepancy === 0) {
        playSound.success();
        setSuccessToast(`✅ 貨品【${currentItem.name}】盤點完成：帳實相符！`);
      } else {
        playSound.warning();
        setSuccessToast(`⚠️ 貨品【${currentItem.name}】盤點差異：${discrepancy > 0 ? '+' : ''}${discrepancy} ${currentItem.unit}，已通報系統告警中心！`);
      }

      setAuditNote('');
      setTimeout(() => setSuccessToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick matched confirm
  const handleConfirmMatch = () => {
    if (currentItem) {
      setCountedQty(String(currentItem.quantity));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                即時庫存盤點工作台 (Cycle Count)
              </h3>
              <p className="text-xs text-slate-400">
                盤點人員：<strong className="text-slate-700 dark:text-slate-200">{currentOperator.name}</strong> • 現場盤點結果將即時同步至全體同仁
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

        {/* Success Toast */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
            <span>{successToast}</span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left: Quick Items Shelf Navigator */}
          <div className="md:col-span-5 border-r border-slate-100 dark:border-slate-800 p-4 overflow-y-auto max-h-[65vh] space-y-3">
            {/* Search and Zone */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜尋貨號或貨架..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Zone Filter pills */}
              <div className="flex gap-1 overflow-x-auto text-[11px] pb-1">
                {['ALL', 'A區', 'B區', 'C區', 'D區'].map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoneFilter(z)}
                    className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                      zoneFilter === z
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5">
              {filteredList.map((item) => {
                const isSelected = item.id === selectedItemId;
                const isAuditedToday = item.lastCountedAt && new Date(item.lastCountedAt).toDateString() === new Date().toDateString();
                const itemDisc = item.lastCountDiscrepancy;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setCountedQty(String(item.quantity));
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{item.sku}</span>
                          {isAuditedToday && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">已盤</span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.shelfLocation}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </div>
                      {itemDisc !== null && itemDisc !== 0 && (
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          差 {itemDisc > 0 ? '+' : ''}{itemDisc}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Item Count Form (Tablet Touch Ready) */}
          <div className="md:col-span-7 p-6 overflow-y-auto max-h-[65vh]">
            {currentItem ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Item Summary Banner */}
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <img
                    src={currentItem.photo}
                    alt={currentItem.name}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                        {currentItem.sku}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {currentItem.shelfLocation}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1 leading-snug">
                      {currentItem.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      成品：{currentItem.finishedProductName}
                    </p>
                  </div>
                </div>

                {/* Stock Comparison Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* System Quantity */}
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      系統現有帳面量
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mt-1">
                      {currentItem.quantity}
                      <span className="text-sm font-semibold text-slate-400 ml-1">{currentItem.unit}</span>
                    </div>
                  </div>

                  {/* Discrepancy Variance */}
                  <div className={`p-4 rounded-2xl text-center border-2 ${
                    !hasValidCount
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30'
                      : discrepancy === 0
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                      : 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                  }`}>
                    <span className="text-xs font-semibold uppercase block">
                      盤點盈虧差異
                    </span>
                    <div className="text-3xl sm:text-4xl font-black mt-1">
                      {!hasValidCount ? '-' : discrepancy === 0 ? '相符 (0)' : `${discrepancy > 0 ? '+' : ''}${discrepancy}`}
                      {hasValidCount && <span className="text-sm font-semibold ml-1">{currentItem.unit}</span>}
                    </div>
                  </div>
                </div>

                {/* Count Input Box (Big touch input for tablets) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      現場實際點檢數量 (Physical Count)
                    </label>
                    <button
                      type="button"
                      onClick={handleConfirmMatch}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>帳實相符 (直接帶入 {currentItem.quantity})</span>
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder={`輸入實盤件數 (${currentItem.unit})`}
                      value={countedQty}
                      onChange={(e) => setCountedQty(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 focus:border-emerald-500 rounded-2xl text-2xl font-black text-slate-900 dark:text-white focus:outline-none"
                    />

                    {/* Quick increment touch buttons */}
                    <div className="flex gap-1.5">
                      {[-5, -1, +1, +5].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => {
                            const cur = parseInt(countedQty) || 0;
                            setCountedQty(String(Math.max(0, cur + delta)));
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* System Adjustment Checkbox */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="sync-qty-checkbox"
                    checked={adjustSystemQty}
                    onChange={(e) => setAdjustSystemQty(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="sync-qty-checkbox" className="text-xs cursor-pointer">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      若有盤點差異，同步自動校正系統庫存至實點數量
                    </span>
                    <span className="text-slate-400">
                      勾選後系統庫存將更新為實盤數值；取消勾選則保留原帳面數量並標記「待查核異常」。
                    </span>
                  </label>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    盤點備註說明 (如: 發現外包裝破損、實體移位等)
                  </label>
                  <input
                    type="text"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="例如: 實地巡檢確認完畢，料件狀況完好"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Submit Button or Permission Notice */}
                <div className="pt-2 flex justify-end gap-3">
                  {canAuditStock ? (
                    <button
                      type="submit"
                      disabled={submitting || !hasValidCount}
                      className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{submitting ? '記錄中...' : '提交本項盤點結果'}</span>
                    </button>
                  ) : (
                    <div className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                      🔒 您目前的權限職銜為<strong>「一盤層級」</strong>：僅具備查閱與掃碼功能，無法提交盤點調整
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <div className="text-center py-20 text-slate-400 text-sm">
                請在左側選擇欲盤點之貨品
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            完成盤點作業
          </button>
        </div>
      </div>
    </div>
  );
};
