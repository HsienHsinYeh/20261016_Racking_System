import React, { useState } from 'react';
import { 
  Warehouse, 
  MapPin, 
  Search, 
  Plus, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit3,
  Settings,
  X
} from 'lucide-react';
import { InventoryItem, ShelfZoneConfig, DEFAULT_SHELF_ZONES } from '../types/inventory';

interface VisualShelfMapProps {
  items: InventoryItem[];
  shelves?: ShelfZoneConfig[];
  onSelectItem: (item: InventoryItem) => void;
  onAddItemToShelf: (shelfLocation: string, zone: string, rack: string, tier: string, bin: string) => void;
  onGenerateShelfQr: (shelfLocation: string) => void;
  onOpenShelfManagement: (rackTarget?: { zoneId: string; rackCode: string }) => void;
}

export const VisualShelfMap: React.FC<VisualShelfMapProps> = ({
  items,
  shelves,
  onSelectItem,
  onAddItemToShelf,
  onGenerateShelfQr,
  onOpenShelfManagement,
}) => {
  const zoneList = shelves && shelves.length > 0 ? shelves : DEFAULT_SHELF_ZONES;
  const [selectedZone, setSelectedZone] = useState('A區');
  const [selectedSlot, setSelectedSlot] = useState<string | null>('A區-01架-2層-01位');
  const [shelfSearch, setShelfSearch] = useState('');

  const currentZoneConfig = zoneList.find(z => z.id === selectedZone) || zoneList[0];

  // Helper to get items in a specific location
  const getItemsAt = (zone: string, rack: string, tier: string, bin: string) => {
    return items.filter(item => {
      // Check exact shelf location match or parsed components
      const matchExact = item.shelfLocation === `${zone}-${rack}架-${tier}-${bin}位`;
      const matchParts = item.zone === zone && item.shelfRack === rack && item.shelfTier === tier && item.shelfBin === bin;
      return matchExact || matchParts;
    });
  };

  // Selected slot items
  const selectedSlotItems = selectedSlot ? items.filter(i => i.shelfLocation === selectedSlot) : [];

  // Parse slot components
  const parseSlotLocation = (slotStr: string) => {
    // Expected format: A區-01架-3層-02位
    const parts = slotStr.split('-');
    const zone = parts[0] || 'A區';
    const rack = parts[1]?.replace('架', '') || '01';
    const tier = parts[2] || '1層';
    const bin = parts[3]?.replace('位', '') || '01';
    return { zone, rack, tier, bin };
  };

  return (
    <div className="space-y-6">
      {/* Header & Zone Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                倉庫貨架立體矩陣導覽
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              可視化倉庫四層貨架結構，點選任一儲位立即調閱該位貨品、列印儲位 QR Code 或進行調撥
            </p>
          </div>

          {/* Action buttons and Quick Filter Search */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenShelfManagement({ zoneId: selectedZone, rackCode: '' })}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              title="在當前分區新增貨架"
            >
              <Plus className="w-4 h-4" />
              <span>新增貨架</span>
            </button>
            <button
              onClick={() => onOpenShelfManagement()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="管理所有貨架名稱與層數"
            >
              <Settings className="w-4 h-4" />
              <span>貨架管理</span>
            </button>
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋貨號或貨架 (如 A-01)..."
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Zone Tabs */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 sm:pt-4 pb-1 sm:pb-0 scrollbar-none">
          {zoneList.map((zone) => {
            const isSelected = selectedZone === zone.id;
            const zoneItemsCount = items.filter(i => (i.zone === zone.id || i.shelfLocation.startsWith(zone.id))).length;
            const zoneDiscrepancies = items.filter(i => (i.zone === zone.id || i.shelfLocation.startsWith(zone.id)) && i.lastCountDiscrepancy !== null && i.lastCountDiscrepancy !== 0).length;

            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={`shrink-0 min-w-[150px] sm:min-w-0 p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base">{zone.name || zone.id}</span>
                  <div className="flex items-center gap-1">
                    {zoneDiscrepancies > 0 && (
                      <span className="w-2 h-2 rounded-full bg-purple-500" title="有盤點差異" />
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 font-medium">
                      {zoneItemsCount} 項
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                  {zone.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Shelf Racks on left/center, Selected Slot Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Matrix: Racks */}
        <div className="lg:col-span-8 space-y-6">
          {currentZoneConfig?.racks && currentZoneConfig.racks.length > 0 ? (
            currentZoneConfig.racks.map((rackObj) => {
              const rackCode = typeof rackObj === 'string' ? rackObj : rackObj.code;
              const rackName = typeof rackObj === 'string' ? `${selectedZone} 第 ${rackObj} 號立體多層鋼架` : rackObj.name;
              const tierCount = typeof rackObj === 'string' ? 4 : (rackObj.tierCount || 4);
              const binsPerTier = typeof rackObj === 'string' ? 4 : (rackObj.binsPerTier || 4);
              const rackDesc = typeof rackObj === 'string' ? '' : rackObj.description;

              const tiers = Array.from({ length: tierCount }, (_, i) => `${tierCount - i}層`);
              const bins = Array.from({ length: binsPerTier }, (_, i) => String(i + 1).padStart(2, '0'));

              return (
                <div 
                  key={rackCode}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-mono font-bold text-xs">
                        貨架 {rackCode}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                        {rackName}
                      </h3>
                      <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {tierCount} 層 × {binsPerTier} 位
                      </span>
                      {rackDesc && (
                        <span className="text-xs text-slate-500 italic hidden md:inline">
                          ({rackDesc})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => onOpenShelfManagement({ zoneId: selectedZone, rackCode })}
                        className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="編輯此貨架名稱、層數與規格"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>編輯貨架</span>
                      </button>
                      <button
                        onClick={() => onGenerateShelfQr(`${selectedZone}-${rackCode}架`)}
                        className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>列印本架標籤</span>
                      </button>
                    </div>
                  </div>

                  {/* Tiers Matrix */}
                  <div className="space-y-2.5">
                    {tiers.map((tier) => (
                      <div key={tier} className="flex items-center gap-2 sm:gap-3">
                        {/* Tier Level Label */}
                        <div className="w-12 sm:w-14 shrink-0 text-right">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {tier}
                          </span>
                        </div>

                        {/* Bins on this Tier */}
                        <div className={`grid gap-1.5 sm:gap-2 flex-1 ${binsPerTier > 4 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-4'}`}>
                          {bins.map((bin) => {
                            const locCode = `${selectedZone}-${rackCode}架-${tier}-${bin}位`;
                            const slotItems = getItemsAt(selectedZone, rackCode, tier, bin);
                            const isSlotSelected = selectedSlot === locCode;
                            const hasItems = slotItems.length > 0;
                            const item = slotItems[0]; // primary item

                            // Search highlight
                            const isHighlighted = shelfSearch && (
                              locCode.toLowerCase().includes(shelfSearch.toLowerCase()) ||
                              slotItems.some(i => i.sku.toLowerCase().includes(shelfSearch.toLowerCase()) || i.name.toLowerCase().includes(shelfSearch.toLowerCase()))
                            );

                            // Card status styling
                            let statusBorder = 'border-slate-200 dark:border-slate-800';
                            let statusBg = 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800';
                            let statusText = 'text-slate-400 dark:text-slate-500';

                            if (hasItems && item) {
                              if (item.status === 'out_of_stock') {
                                statusBorder = 'border-rose-400 dark:border-rose-800';
                                statusBg = 'bg-rose-50/70 dark:bg-rose-950/40';
                                statusText = 'text-rose-700 dark:text-rose-300';
                              } else if (item.status === 'low_stock') {
                                statusBorder = 'border-amber-400 dark:border-amber-700';
                                statusBg = 'bg-amber-50/70 dark:bg-amber-950/30';
                                statusText = 'text-amber-800 dark:text-amber-200';
                              } else if (item.status === 'discrepancy') {
                                statusBorder = 'border-purple-400 dark:border-purple-700';
                                statusBg = 'bg-purple-50/70 dark:bg-purple-950/30';
                                statusText = 'text-purple-800 dark:text-purple-200';
                              } else {
                                statusBorder = 'border-emerald-300 dark:border-emerald-800/70';
                                statusBg = 'bg-emerald-50/50 dark:bg-emerald-950/20';
                                statusText = 'text-emerald-800 dark:text-emerald-200';
                              }
                            }

                            return (
                              <div
                                key={bin}
                                onClick={() => setSelectedSlot(locCode)}
                                className={`p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer relative ${statusBorder} ${statusBg} ${
                                  isSlotSelected ? 'ring-2 ring-amber-500 shadow-md' : ''
                                } ${isHighlighted ? 'ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/50' : ''}`}
                              >
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-0.5 sm:mb-1">
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    #{bin}位
                                  </span>
                                  {hasItems ? (
                                    <span className={`text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 rounded ${statusText}`}>
                                      {item.quantity}{item.unit}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] sm:text-[10px] text-slate-400">空位</span>
                                  )}
                                </div>

                                {hasItems && item ? (
                                  <div>
                                    <div className="text-[11px] sm:text-xs font-semibold text-slate-900 dark:text-white truncate">
                                      {item.name}
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">
                                      {item.sku}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-5 sm:h-7 flex items-center justify-center text-[10px] sm:text-[11px] text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg mt-0.5 sm:mt-1">
                                    可放
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center">
              <Warehouse className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">此分區目前尚未設定貨架</h3>
              <p className="text-sm text-slate-400 mt-1 mb-4">點擊下方按鈕立即為 {selectedZone} 新增第一個貨架！</p>
              <button
                onClick={() => onOpenShelfManagement({ zoneId: selectedZone, rackCode: '' })}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>新增貨架</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Drawer / Inspector: Selected Shelf Slot Detail (Desktop only) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            {selectedSlot ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {selectedSlot}
                      </h4>
                      <p className="text-xs text-slate-400">儲位詳細資訊檢視</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onGenerateShelfQr(selectedSlot)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 transition-colors"
                    title="列印此儲位 QR Code 標籤"
                  >
                    <QrCode className="w-4 h-4 text-amber-500" />
                  </button>
                </div>

                {/* Items situated in this slot */}
                {selectedSlotItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      在庫貨品清單 ({selectedSlotItems.length} 項)
                    </div>

                    {selectedSlotItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all cursor-pointer"
                        onClick={() => onSelectItem(item)}
                      >
                        <div className="flex gap-3">
                          <img
                            src={item.photo}
                            alt={item.name}
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate">
                                {item.sku}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.quantity === 0
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                  : item.quantity <= item.minSafeQuantity
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              }`}>
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              成品：{item.finishedProductName}
                            </div>
                          </div>
                        </div>

                        {/* Discrepancy or Alert notice */}
                        {item.lastCountDiscrepancy !== null && item.lastCountDiscrepancy !== 0 && (
                          <div className="mt-2 text-[11px] p-1.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>盤點差異：{item.lastCountDiscrepancy > 0 ? '+' : ''}{item.lastCountDiscrepancy} {item.unit}</span>
                          </div>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <span>點選開啟完整貨品卡片</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Warehouse className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">此貨架儲位目前為空</div>
                    <p className="text-xs text-slate-400 mt-1">可以將新進貨品放置此位置，或由其他貨架調撥過來。</p>
                    <button
                      onClick={() => {
                        const { zone, rack, tier, bin } = parseSlotLocation(selectedSlot);
                        onAddItemToShelf(selectedSlot, zone, rack, tier, bin);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>登記新貨品入庫於此儲位</span>
                    </button>
                  </div>
                )}

                {/* Storage specs */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">承重規範：</span>
                    <span className="font-medium">工業重型鋼架 (500 KG/層)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">安全監控：</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">溫濕度正常 / CCTV覆蓋</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                請在左側點選任一儲位以檢視詳細內容
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Floating Slot Inspector Bottom Sheet */}
      {selectedSlot && (
        <div className="lg:hidden fixed bottom-14 inset-x-2 sm:inset-x-6 z-40 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200 max-h-[55vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedSlot}</span>
                <span className="text-[10px] text-slate-400 ml-2">儲位詳細</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onGenerateShelfQr(selectedSlot)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-amber-500 cursor-pointer"
                title="列印儲位標籤"
              >
                <QrCode className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedSlotItems.length > 0 ? (
            <div className="space-y-2">
              {selectedSlotItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={item.photo} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-slate-200 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.name}</div>
                      <div className="text-[11px] text-amber-500 font-mono">{item.sku}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{item.quantity} {item.unit}</div>
                    <div className="text-[10px] text-amber-500 font-medium">查看詳情 &gt;</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">此儲位目前為空，可直接登記新料件入庫</div>
              <button
                onClick={() => {
                  const { zone, rack, tier, bin } = parseSlotLocation(selectedSlot);
                  onAddItemToShelf(selectedSlot, zone, rack, tier, bin);
                }}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>登記新貨品入庫</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
