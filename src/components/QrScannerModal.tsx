import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  SwitchCamera, 
  Search, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ZapOff,
  HelpCircle,
  Barcode
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { parseScannedCode } from '../utils/qr';
import { playSound } from '../utils/sound';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onFoundItem: (item: InventoryItem) => void;
  onFoundShelf: (shelfLocation: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  items,
  onFoundItem,
  onFoundShelf,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'upload'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-qr-reader';

  // Start Scanner
  const startScanner = async () => {
    try {
      setScanError(null);
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore common frame errors
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera failed to start:', err);
      setScanError('無法啟用相機鏡頭。可能無相機硬體或未授予相機使用權限。您可使用下方「手動輸入貨號」或「圖片解碼」功能。');
      setIsScanning(false);
    }
  };

  // Stop Scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  // Process decoded text
  const handleScanSuccess = (decodedText: string) => {
    playSound.scanBeep();
    stopScanner();

    const parsed = parseScannedCode(decodedText);

    if (parsed.type === 'item') {
      const searchKey = (parsed.skuOrId || '').toLowerCase().trim();
      const match = items.find(
        i => i.sku.toLowerCase() === searchKey || 
             i.id.toLowerCase() === searchKey || 
             i.name.toLowerCase().includes(searchKey)
      );

      if (match) {
        onFoundItem(match);
        onClose();
      } else {
        setScanError(`查無貨號【${parsed.skuOrId}】之對應貨品`);
      }
    } else if (parsed.type === 'shelf') {
      onFoundShelf(parsed.shelfLocation || decodedText);
      onClose();
    } else {
      // Try to find in items anyway
      const match = items.find(
        i => i.sku.toLowerCase() === decodedText.toLowerCase().trim() ||
             i.shelfLocation.includes(decodedText.trim())
      );
      if (match) {
        onFoundItem(match);
        onClose();
      } else {
        setScanError(`掃描內容【${decodedText}】未能在庫存中找到對應貨品`);
      }
    }
  };

  // Toggle Camera
  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
  };

  // Handle File Upload Decode
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanError(null);
      const html5QrCode = new Html5Qrcode('qr-upload-temp', false);
      const decoded = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleScanSuccess(decoded);
    } catch (err: any) {
      setScanError('未能自圖片中辨識出清晰的 QR Code，請確認圖片清晰度。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                貨架與貨品 QR Code 掃描檢視
              </h3>
              <p className="text-xs text-slate-400">
                將相機對準條碼或貼紙即可秒級調閱貨品卡片
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-b-2 border-amber-500 text-amber-400 bg-amber-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>相機掃描</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-b-2 border-amber-500 text-amber-400 bg-amber-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>手動查碼</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-b-2 border-amber-500 text-amber-400 bg-amber-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>圖片解碼</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {scanError && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">掃描提示</span>
                <span className="text-slate-300">{scanError}</span>
              </div>
            </div>
          )}

          {/* Tab 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto border-2 border-slate-700 shadow-inner">
                {/* HTML5 QR Container */}
                <div id={containerId} className="w-full h-full" />

                {/* Overlaid Scanner Frame Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-amber-500/80 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400" />
                    {/* Animated laser line */}
                    <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-bounce" />
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <SwitchCamera className="w-4 h-4 text-amber-400" />
                  <span>切換鏡頭 ({facingMode === 'environment' ? '後置環境鏡頭' : '前置鏡頭'})</span>
                </button>
              </div>

              <div className="text-center text-xs text-slate-400">
                將平板或手機相機對準條碼或貼紙，聽到「嗶」聲即完成調閱
              </div>
            </div>
          )}

          {/* Tab 2: Manual Code Input / Fast Simulator */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  手動鍵入貨號 (SKU) 或儲位名稱
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="例如: HH-M01-102 或 A區-01架"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono uppercase font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    調閱
                  </button>
                </div>
              </form>

              {/* Quick Sample Picks for Easy Demo */}
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  快速示範點選 (免相機直接測試調閱)：
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.slice(0, 4).map((i) => (
                    <button
                      key={i.id}
                      onClick={() => handleScanSuccess(i.sku)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <div className="font-mono font-bold text-amber-400">{i.sku}</div>
                        <div className="text-slate-300 truncate">{i.name}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded shrink-0">
                        {i.shelfLocation}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Upload Image */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center py-4">
              <div id="qr-upload-temp" className="hidden" />
              <label className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block bg-slate-800/40">
                <Upload className="w-10 h-10 text-amber-400 mb-2" />
                <span className="text-sm font-bold text-white">點選或拖曳 QR Code 圖片至此</span>
                <span className="text-xs text-slate-400 mt-1">支援 PNG, JPG, WEBP 圖檔解碼</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
