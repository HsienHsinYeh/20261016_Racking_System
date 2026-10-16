import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Sparkles, 
  MapPin, 
  Package, 
  Layers, 
  FileText, 
  Check, 
  AlertCircle,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface ItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<InventoryItem>, editNote?: string) => Promise<void>;
  item: InventoryItem | null; // null if creating
  defaultShelf?: {
    location?: string;
    zone?: string;
    rack?: string;
    tier?: string;
    bin?: string;
  };
}

const FINISHED_PRODUCT_PRESETS = [
  '賢欣智能高速包裝機 X-500',
  '賢欣重型傳動輸送帶系統 H-80',
  '賢欣全系列自動化設備電控箱',
  '賢欣精密氣動機械手臂爪夾',
  '賢欣多功能自動計數篩選機 S-12',
  '賢欣五軸連動 CNC 雕銑加工中心',
  '賢欣觸控控制終端盤面 T-10',
  '標準通用組裝備品'
];

const SAMPLE_PHOTOS = [
  { label: '步進馬達/電機', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80' },
  { label: '機械齒輪箱', url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80' },
  { label: '電控PCB/PLC', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80' },
  { label: '氣動元件/氣缸', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80' },
  { label: '工業感測器', url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80' },
];

export const ItemEditModal: React.FC<ItemEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item,
  defaultShelf,
}) => {
  const isEditing = !!item;

  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [finishedProductName, setFinishedProductName] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('件');
  const [zone, setZone] = useState('A區');
  const [rack, setRack] = useState('01');
  const [tier, setTier] = useState('1層');
  const [bin, setBin] = useState('01');
  const [photo, setPhoto] = useState('');
  const [notes, setNotes] = useState('');
  const [minSafeQuantity, setMinSafeQuantity] = useState<number>(10);
  const [editNote, setEditNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open/edit
  useEffect(() => {
    if (item) {
      setSku(item.sku);
      setName(item.name);
      setFinishedProductName(item.finishedProductName);
      setQuantity(item.quantity);
      setUnit(item.unit || '件');
      setZone(item.zone || 'A區');
      setRack(item.shelfRack || '01');
      setTier(item.shelfTier || '1層');
      setBin(item.shelfBin || '01');
      setPhoto(item.photo || '');
      setNotes(item.notes || '');
      setMinSafeQuantity(item.minSafeQuantity || 10);
      setEditNote('');
    } else {
      // Default creation
      const initZone = defaultShelf?.zone || 'A區';
      const initRack = defaultShelf?.rack || '01';
      const initTier = defaultShelf?.tier || '1層';
      const initBin = defaultShelf?.bin || '01';

      setSku(`HH-${initZone.charAt(0)}${initRack}-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setFinishedProductName(FINISHED_PRODUCT_PRESETS[0]);
      setQuantity(20);
      setUnit('件');
      setZone(initZone);
      setRack(initRack);
      setTier(initTier);
      setBin(initBin);
      setPhoto(SAMPLE_PHOTOS[0].url);
      setNotes('');
      setMinSafeQuantity(10);
      setEditNote('');
    }
    setError(null);
  }, [item, defaultShelf, isOpen]);

  if (!isOpen) return null;

  // Formatted shelf location
  const formattedShelfLocation = `${zone}-${rack}架-${tier}-${bin}位`;

  // Auto generate SKU
  const generateNewSku = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const prefix = `HH-${zone.charAt(0)}${rack}`;
    setSku(`${prefix}-${randomNum}`);
  };

  // Image Upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('圖片檔案過大，請選擇 5MB 以內的照片');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim()) {
      setError('請輸入或自動生成貨號 (SKU)');
      return;
    }
    if (!name.trim()) {
      setError('請輸入貨品名稱');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: Partial<InventoryItem> = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        finishedProductName: finishedProductName.trim() || '通用組件',
        quantity: Math.max(0, Number(quantity) || 0),
        unit: unit.trim() || '件',
        shelfLocation: formattedShelfLocation,
        zone,
        shelfRack: rack,
        shelfTier: tier,
        shelfBin: bin,
        photo: photo || SAMPLE_PHOTOS[0].url,
        notes: notes.trim(),
        minSafeQuantity: Math.max(0, Number(minSafeQuantity) || 5),
      };

      await onSave(payload, editNote);
      onClose();
    } catch (err: any) {
      setError(err.message || '儲存失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {isEditing ? `編輯貨品資訊 - ${item.name}` : '登記新貨品入庫'}
              </h3>
              <p className="text-xs text-slate-400">
                完整的貨品與貨架資訊將即時同步給所有現場平板與電腦
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. 照片 (Photo upload or preset) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              貨品照片 (支援相機拍照 / 圖片上傳 / 預設圖庫)
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative group shrink-0">
                <img
                  src={photo || SAMPLE_PHOTOS[0].url}
                  alt="預覽"
                  className="w-24 h-24 object-cover rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>相機拍照或本機上傳</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preset quick picks */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-slate-400 shrink-0">快速選樣：</span>
                  {SAMPLE_PHOTOS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhoto(sample.url)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 hover:text-amber-800 transition-colors shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 2. 貨號 (SKU) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  貨號 (SKU) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateNewSku}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>自動生成</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="例: HH-A01-102"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm uppercase font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 3. 名稱 (Name) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                貨品名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 三相高扭矩步進馬達 (NEMA 34)"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 4. 成品名稱 (Finished Product Name) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                對應成品名稱 / 機台機種
              </label>
              <input
                type="text"
                list="finished-product-list"
                value={finishedProductName}
                onChange={(e) => setFinishedProductName(e.target.value)}
                placeholder="例: 賢欣智能高速包裝機 X-500"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <datalist id="finished-product-list">
                {FINISHED_PRODUCT_PRESETS.map((p, idx) => (
                  <option key={idx} value={p} />
                ))}
              </datalist>
            </div>

            {/* 5. 數量與單位 (Quantity & Unit) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                庫存數量與單位 <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-24 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  {['件', '台', '組', '支', '個', '箱', '捲', '套', '包', '條'].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6. 貨架位置 (Shelf Location: Zone / Rack / Tier / Bin) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>貨架位置設定</span>
              </label>
              <div className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-md">
                {formattedShelfLocation}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">區域</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold"
                >
                  <option value="A區">A區</option>
                  <option value="B區">B區</option>
                  <option value="C區">C區</option>
                  <option value="D區">D區</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">架號</label>
                <select
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold"
                >
                  {['01', '02', '03', '04'].map((r) => (
                    <option key={r} value={r}>{r}架</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">層數</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold"
                >
                  {['1層', '2層', '3層', '4層'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">儲位號</label>
                <select
                  value={bin}
                  onChange={(e) => setBin(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold"
                >
                  {['01', '02', '03', '04'].map((b) => (
                    <option key={b} value={b}>{b}位</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 7. 安全庫存量 (Min Safe Quantity) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              安全庫存預警門檻 (低於此數量時將自動發送異常告警)
            </label>
            <input
              type="number"
              min="1"
              value={minSafeQuantity}
              onChange={(e) => setMinSafeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 8. 備註 (Notes) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              備註說明 (保管條件、易碎、防潮或產線注意事項)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例: 精密零件請輕拿輕放、出庫請核對批號"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Modification reason note if editing */}
          {isEditing && (
            <div>
              <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                本次編輯事由 (將記錄於歷程稽核日誌)
              </label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="例: 變更儲位、修正品名規格或更新備註"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? '處理中...' : isEditing ? '儲存更新' : '完成登記並入庫'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
