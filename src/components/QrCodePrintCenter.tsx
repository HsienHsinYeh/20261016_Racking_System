import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  Check, 
  Download, 
  Layers, 
  Eye, 
  MapPin,
  Sparkles
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { generateItemQrCode } from '../utils/qr';

interface QrCodePrintCenterProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  preSelectedItems?: InventoryItem[];
}

export const QrCodePrintCenter: React.FC<QrCodePrintCenterProps> = ({
  isOpen,
  onClose,
  items,
  preSelectedItems = [],
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});
  const [labelSize, setLabelSize] = useState<'standard' | 'large' | 'compact' | 'card'>('standard');
  const [layoutMode, setLayoutMode] = useState<'grid2' | 'single'>('grid2');
  const [generating, setGenerating] = useState(false);

  // Initialize selected
  useEffect(() => {
    if (preSelectedItems && preSelectedItems.length > 0) {
      setSelectedIds(new Set(preSelectedItems.map(i => i.id)));
    } else if (items.length > 0) {
      // default select first 4 items
      setSelectedIds(new Set(items.slice(0, 4).map(i => i.id)));
    }
  }, [preSelectedItems, items, isOpen]);

  // Generate QR code data URLs for selected items
  useEffect(() => {
    if (!isOpen) return;
    const generateCodes = async () => {
      setGenerating(true);
      const newMap: Record<string, string> = {};
      const targetItems = items.filter(i => selectedIds.has(i.id));

      for (const item of targetItems) {
        newMap[item.id] = await generateItemQrCode(item);
      }

      setQrCodeMap(newMap);
      setGenerating(false);
    };

    generateCodes();
  }, [selectedIds, items, isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const printableItems = items.filter(i => selectedIds.has(i.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>貨架與貨品 QR Code 標籤列印中心</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  橫式 3:5 規範
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                所有標籤均採用標準橫式 3:5 比例，可黏貼於貨架儲位槽或貨品外箱
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

        {/* Print Configuration Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              {selectedIds.size === items.length ? '取消全選' : `全選所有貨品 (${items.length})`}
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-600 dark:text-slate-400">
              已勾選 <strong>{selectedIds.size}</strong> 張標籤
            </span>
          </div>

          {/* Label Template & Layout Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">標籤規格 (全橫式 3:5)：</span>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="standard">標準物料標籤 (75mm × 45mm • 橫式 3:5)</option>
                <option value="large">大型外箱標籤 (100mm × 60mm • 橫式 3:5)</option>
                <option value="compact">小型儲位貼紙 (50mm × 30mm • 橫式 3:5)</option>
                <option value="card">標準標籤卡片 (125mm × 75mm • 橫式 3:5)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">列印版面：</span>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="grid2">A4 雙排標籤 (橫向 2 欄)</option>
                <option value="single">條碼捲紙機 (單張連續進紙)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Body: Item Selection on Left, Print Preview on Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left: Item Checkbox List */}
          <div className="md:col-span-4 border-r border-slate-100 dark:border-slate-800 p-4 overflow-y-auto max-h-[60vh] space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              選擇欲列印標籤之品項：
            </div>
            {items.map((item) => {
              const isChecked = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isChecked
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="truncate">
                      <div className="font-mono font-bold">{item.sku}</div>
                      <div className="truncate font-medium">{item.name}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono shrink-0 ml-1">
                    {item.shelfLocation}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Print Preview Canvas */}
          <div className="md:col-span-8 p-6 overflow-y-auto max-h-[60vh] bg-slate-100 dark:bg-slate-950">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>標籤貼紙列印預覽 (Print Preview)</span>
              </span>
              <span className="text-xs text-slate-400">
                點選下方「開始列印」將啟動瀏覽器標準列印對話框
              </span>
            </div>

            {/* Labels Grid */}
            <div 
              id="printable-labels-container" 
              className={layoutMode === 'grid2' ? 'layout-grid2 grid grid-cols-1 sm:grid-cols-2 gap-4' : 'layout-single flex flex-col items-center gap-4'}
            >
              {printableItems.map((item) => {
                const qrUrl = qrCodeMap[item.id];

                return (
                  <div
                    key={item.id}
                    className={`warehouse-label bg-white text-slate-950 border-2 border-slate-900 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between relative overflow-hidden aspect-[5/3] ${
                      layoutMode === 'single' ? 'w-full max-w-[420px]' : 'w-full'
                    }`}
                  >
                    {/* Brand Banner */}
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded bg-slate-900 flex items-center justify-center text-white text-[9px] font-black">
                          賢
                        </span>
                        <span className="text-xs font-black tracking-wider uppercase">
                          賢欣工業 • 貨架物料標籤
                        </span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 rounded border border-slate-300 text-slate-700">
                        橫式 3:5
                      </span>
                    </div>

                    {/* Main Label Body: QR Code + Item Data */}
                    <div className="flex gap-2.5 sm:gap-3 items-center flex-1 min-h-0">
                      {/* QR Code */}
                      <div className="shrink-0 p-1 border border-slate-300 rounded-lg bg-white flex items-center justify-center">
                        {qrUrl ? (
                          <img src={qrUrl} alt="QR Code" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 animate-pulse rounded" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-semibold">貨號 (SKU)</span>
                          <div className="font-mono text-sm sm:text-base font-black tracking-tight leading-tight text-slate-900 truncate">
                            {item.sku}
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-semibold">貨品名稱</span>
                          <div className="font-bold text-xs leading-tight line-clamp-2 text-slate-900">
                            {item.name}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-600 truncate">
                          <span className="text-slate-400">成品：</span>
                          {item.finishedProductName}
                        </div>
                      </div>
                    </div>

                    {/* Shelf Location Highlight Footer */}
                    <div className="mt-1 pt-1 border-t-2 border-slate-900 flex items-center justify-between bg-slate-50 px-2 py-1 sm:py-1.5 rounded-xl border border-slate-200">
                      <div>
                        <div className="text-[8px] font-bold text-slate-500 uppercase">指定貨架儲位</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-slate-950 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{item.shelfLocation}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[8px] font-bold text-slate-500">標準備料</div>
                        <div className="font-bold text-xs">
                          {item.minSafeQuantity} {item.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {printableItems.length === 0 && (
              <div className="text-center py-16 text-slate-400 text-sm">
                請在左側至少勾選一項欲列印之貨品
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            支援標準條碼機、熱感印貼紙機 (如 TSC, Godex, Zebra) 或一般 A4 標籤紙
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handlePrint}
              disabled={printableItems.length === 0 || generating}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>開始列印標籤 ({printableItems.length} 張)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
