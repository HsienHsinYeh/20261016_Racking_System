import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Edit3, 
  Printer, 
  MapPin, 
  Layers, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Plus, 
  Minus, 
  History, 
  ExternalLink,
  Download,
  ClipboardCheck
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { generateItemQrCode } from '../utils/qr';

interface ItemDetailDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onQuickAudit: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem, delta: number, reason: string) => Promise<void>;
  onPrintSingle: (item: InventoryItem) => void;
  canModifyData?: boolean;
  canAuditStock?: boolean;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onQuickAudit,
  onAdjustStock,
  onPrintSingle,
  canModifyData = true,
  canAuditStock = true,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [customDelta, setCustomDelta] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [showAdjustPopup, setShowAdjustPopup] = useState<boolean>(false);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      generateItemQrCode(item).then(url => setQrCodeDataUrl(url));
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const isLow = item.quantity > 0 && item.quantity <= item.minSafeQuantity;
  const isOut = item.quantity === 0;
  const hasDiscrepancy = item.lastCountDiscrepancy !== null && item.lastCountDiscrepancy !== 0;

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(customDelta);
    if (isNaN(qty) || qty <= 0) return;

    const delta = adjustType === 'in' ? qty : -qty;
    try {
      setLoading(true);
      await onAdjustStock(item, delta, adjustReason || (adjustType === 'in' ? `進貨入庫 +${qty}` : `現場領料出庫 -${qty}`));
      setShowAdjustPopup(false);
      setCustomDelta('');
      setAdjustReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950">
              {item.sku}
            </span>
            <div className="text-xs text-slate-400">
              儲位：<strong className="text-slate-800 dark:text-slate-200">{item.shelfLocation}</strong>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPrintSingle(item)}
              className="p-2 text-slate-500 hover:text-amber-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="列印 QR Code 標籤"
            >
              <Printer className="w-5 h-5" />
            </button>
            {canModifyData && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="p-2 text-slate-500 hover:text-amber-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="編輯貨品詳細"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Section: Photo + QR Code + Core Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Photo */}
            <div className="sm:col-span-5 relative group">
              <img
                src={item.photo}
                alt={item.name}
                className="w-full h-48 object-cover rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium">
                貨品實拍照片
              </div>
            </div>

            {/* QR Code and Quick Scan details */}
            <div className="sm:col-span-7 flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    貨品名稱 (Item Name)
                  </span>
                  {/* Status Badge */}
                  <div>
                    {isOut ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        缺貨警報
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        庫存偏低
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        正常
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {item.name}
                </h2>

                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-400">成品名稱：</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium ml-1">
                    {item.finishedProductName}
                  </span>
                </div>
              </div>

              {/* QR Code Preview Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code" 
                      className="w-16 h-16 rounded-lg border border-white dark:border-slate-700 bg-white p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">專屬 QR Code</div>
                    <div className="text-[11px] text-slate-400">包含貨號與儲位資料</div>
                    <a
                      href={qrCodeDataUrl}
                      download={`QR-${item.sku}.png`}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline mt-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>下載 QR 圖片</span>
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => onPrintSingle(item)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-500" />
                  <span>列印貼紙</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Specifications Table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">貨架儲位代碼</span>
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{item.shelfLocation}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">安全庫存門檻</span>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {item.minSafeQuantity} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">最後盤點狀態</span>
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {item.lastCountedAt ? (
                  <span>{new Date(item.lastCountedAt).toLocaleString()}</span>
                ) : (
                  <span className="text-amber-500 font-semibold">待初次盤點</span>
                )}
              </div>
            </div>
          </div>

          {/* Big Stock Quantity Console & Quick Adjustment Controls */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  即時在庫數量 (Current Stock)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                    isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {item.quantity}
                  </span>
                  <span className="text-lg font-bold text-slate-300">{item.unit}</span>
                </div>
              </div>

              {/* Action Buttons: Quick Stock In / Out / Audit */}
              <div className="flex flex-wrap items-center gap-2">
                {canModifyData && (
                  <>
                    <button
                      onClick={() => {
                        setAdjustType('out');
                        setShowAdjustPopup(true);
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 font-bold text-sm rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                      <span>出庫 / 領料</span>
                    </button>

                    <button
                      onClick={() => {
                        setAdjustType('in');
                        setShowAdjustPopup(true);
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>進貨 / 入庫</span>
                    </button>
                  </>
                )}

                {canAuditStock && (
                  <button
                    onClick={() => {
                      onClose();
                      onQuickAudit(item);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>現場盤點確認</span>
                  </button>
                )}

                {!canModifyData && !canAuditStock && (
                  <span className="text-xs text-slate-400 italic bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700">
                    🔒 一盤層級：僅供查閱料件資訊與標籤列印，無修改或盤點權限
                  </span>
                )}
              </div>
            </div>

            {/* Custom stock adjustment popup inside card */}
            {showAdjustPopup && (
              <form onSubmit={handleAdjustSubmit} className="mt-4 pt-4 border-t border-slate-700/80 space-y-3">
                <div className="text-xs font-bold text-amber-300">
                  {adjustType === 'in' ? '📦 辦理貨品入庫' : '📤 辦理現場領料出庫'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder={`異動數量 (${item.unit})`}
                      value={customDelta}
                      onChange={(e) => setCustomDelta(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="異動備註事由 (如: 工單#9028)"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3 flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 cursor-pointer"
                    >
                      {loading ? '處理中' : '確認執行'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdjustPopup(false)}
                      className="px-3 py-2 bg-slate-700 text-slate-300 font-medium text-xs rounded-xl hover:bg-slate-600 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Notes Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              貨品備註與保管指引 (Notes)
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {item.notes || '無特殊注意事項'}
            </p>
          </div>

          {/* History Audit Trail */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-400" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                操作與異動歷程 ({item.history?.length || 0} 筆)
              </h4>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {item.history && item.history.length > 0 ? (
                item.history.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {h.operator}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          h.type === 'stock_in' ? 'bg-emerald-100 text-emerald-800' :
                          h.type === 'stock_out' ? 'bg-rose-100 text-rose-800' :
                          h.type === 'audit_count' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-200 text-slate-800'
                        }`}>
                          {h.type === 'stock_in' ? '入庫' :
                           h.type === 'stock_out' ? '出庫' :
                           h.type === 'audit_count' ? '實地盤點' : '編輯'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {h.note}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 shrink-0 ml-2">
                      <div>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px]">{new Date(h.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  尚無異動紀錄
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            關閉檢視
          </button>
        </div>
      </div>
    </div>
  );
};
