import React, { useState, useEffect } from 'react';
import { 
  Warehouse, 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Info, 
  RotateCcw,
  Sparkles,
  QrCode,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { ShelfZoneConfig, ShelfRackConfig, InventoryItem, DEFAULT_SHELF_ZONES } from '../types/inventory';

interface ShelfManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shelves: ShelfZoneConfig[];
  items: InventoryItem[];
  onSaveShelves: (updatedShelves: ShelfZoneConfig[], itemLocationMigrations?: { fromLocationPrefix: string; toLocationPrefix: string; oldZone: string; newZone: string; oldRack: string; newRack: string }) => Promise<void>;
  initialEditRack?: { zoneId: string; rackCode: string } | null;
  onGenerateShelfQr?: (shelfLocation: string) => void;
}

export const ShelfManagementModal: React.FC<ShelfManagementModalProps> = ({
  isOpen,
  onClose,
  shelves,
  items,
  onSaveShelves,
  initialEditRack,
  onGenerateShelfQr,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'edit'>('list');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('A區');
  
  // Edit Form States
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [originalZoneId, setOriginalZoneId] = useState('');
  const [originalRackCode, setOriginalRackCode] = useState('');
  
  const [formZoneId, setFormZoneId] = useState('A區');
  const [formZoneName, setFormZoneName] = useState('');
  const [formRackCode, setFormRackCode] = useState('');
  const [formRackName, setFormRackName] = useState('');
  const [formTierCount, setFormTierCount] = useState<number>(4);
  const [formBinsPerTier, setFormBinsPerTier] = useState<number>(4);
  const [formDescription, setFormDescription] = useState('');
  const [autoMigrateItems, setAutoMigrateItems] = useState(true);

  // Zone Management States in List View
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneInput, setNewZoneInput] = useState('');
  const [isEditingZone, setIsEditingZone] = useState(false);
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneDesc, setEditZoneDesc] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // When initialEditRack is provided, open directly in edit mode
  useEffect(() => {
    if (initialEditRack && isOpen) {
      const zone = shelves.find(z => z.id === initialEditRack.zoneId);
      const rack = zone?.racks.find(r => r.code === initialEditRack.rackCode);
      if (zone && rack) {
        startEditRack(zone.id, rack);
      }
    } else if (isOpen && activeTab === 'list') {
      setError(null);
      setSuccessMsg(null);
    }
  }, [initialEditRack, isOpen]);

  if (!isOpen) return null;

  // Selected Zone
  const currentZone = shelves.find(z => z.id === selectedZoneId) || shelves[0] || DEFAULT_SHELF_ZONES[0];

  // Helper: Get items placed on a specific rack
  const getItemsOnRack = (zoneId: string, rackCode: string) => {
    return items.filter(item => {
      const matchPrefix = item.shelfLocation.startsWith(`${zoneId}-${rackCode}架`);
      const matchFields = item.zone === zoneId && item.shelfRack === rackCode;
      return matchPrefix || matchFields;
    });
  };

  // Start adding a new rack
  const startAddRack = (zoneId: string) => {
    const targetZone = shelves.find(z => z.id === zoneId) || shelves[0];
    const existingCodes = (targetZone?.racks || []).map(r => r.code);
    
    // Suggest next numeric code
    let nextNum = 1;
    while (existingCodes.includes(String(nextNum).padStart(2, '0'))) {
      nextNum++;
    }
    const suggestedCode = String(nextNum).padStart(2, '0');

    setIsEditingExisting(false);
    setOriginalZoneId(zoneId);
    setOriginalRackCode('');
    setFormZoneId(zoneId);
    setFormZoneName(targetZone?.name || zoneId);
    setFormRackCode(suggestedCode);
    setFormRackName(`${suggestedCode}號 多層儲存鋼架`);
    setFormTierCount(4);
    setFormBinsPerTier(4);
    setFormDescription('');
    setAutoMigrateItems(true);
    setError(null);
    setSuccessMsg(null);
    setActiveTab('edit');
  };

  // Start editing an existing rack
  const startEditRack = (zoneId: string, rack: ShelfRackConfig) => {
    const targetZone = shelves.find(z => z.id === zoneId);
    setIsEditingExisting(true);
    setOriginalZoneId(zoneId);
    setOriginalRackCode(rack.code);
    setFormZoneId(zoneId);
    setFormZoneName(targetZone?.name || zoneId);
    setFormRackCode(rack.code);
    setFormRackName(rack.name);
    setFormTierCount(rack.tierCount || 4);
    setFormBinsPerTier(rack.binsPerTier || 4);
    setFormDescription(rack.description || '');
    setAutoMigrateItems(true);
    setError(null);
    setSuccessMsg(null);
    setActiveTab('edit');
  };

  // Add new zone directly from list view
  const handleCreateNewZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newZoneInput.trim();
    if (!clean) return;
    if (shelves.some(z => z.id.toLowerCase() === clean.toLowerCase())) {
      setError(`分區【${clean}】已經存在！`);
      return;
    }

    const newZone: ShelfZoneConfig = {
      id: clean,
      name: clean.includes('區') || clean.length > 3 ? clean : `${clean}區`,
      desc: `自訂 ${clean} 倉庫立體多層鋼架分區`,
      racks: []
    };

    const updated = [...shelves, newZone];
    await onSaveShelves(updated);
    setSelectedZoneId(clean);
    setIsAddingZone(false);
    setNewZoneInput('');
    setSuccessMsg(`已成功新增分區【${clean}】！您可立即為該分區新增貨架。`);
  };

  // Edit current zone title / desc
  const handleSaveCurrentZoneMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = editZoneName.trim();
    if (!newName) return;

    const oldZoneId = currentZone.id;
    // Determine whether to update zone.id as well:
    // If the old ID was the same as the old name, or if user customized the zone name, we update the ID
    const shouldUpdateId = oldZoneId === currentZone.name || !shelves.some(z => z.id === newName);
    const newZoneId = shouldUpdateId ? newName : oldZoneId;

    if (newZoneId !== oldZoneId && shelves.some(z => z.id === newZoneId)) {
      setError(`分區代碼【${newZoneId}】已存在，請使用不同名稱！`);
      return;
    }

    const updated = shelves.map(z => {
      if (z.id === oldZoneId) {
        return {
          ...z,
          id: newZoneId,
          name: newName,
          desc: editZoneDesc.trim(),
          racks: (z.racks || []).map(r => ({
            ...r,
            zoneId: newZoneId
          }))
        };
      }
      return z;
    });

    const migrationConfig = newZoneId !== oldZoneId ? {
      fromLocationPrefix: `${oldZoneId}-`,
      toLocationPrefix: `${newZoneId}-`,
      oldZone: oldZoneId,
      newZone: newZoneId,
      oldRack: '',
      newRack: ''
    } : undefined;

    await onSaveShelves(updated, migrationConfig);
    setSelectedZoneId(newZoneId);
    setIsEditingZone(false);
    setSuccessMsg(`分區【${newName}】名稱與說明已同步更新！`);
  };

  // Delete empty zone
  const handleDeleteZone = async (zoneId: string) => {
    const target = shelves.find(z => z.id === zoneId);
    if (!target) return;
    if (target.racks.length > 0) {
      setError(`無法刪除分區【${zoneId}】，該分區下尚有 ${target.racks.length} 座貨架，請先將貨架刪除或調撥至其他分區。`);
      return;
    }
    const zoneItems = items.filter(i => i.zone === zoneId || i.shelfLocation.startsWith(zoneId));
    if (zoneItems.length > 0) {
      setError(`無法刪除分區【${zoneId}】，系統中尚有 ${zoneItems.length} 項貨品指向此分區。`);
      return;
    }

    if (window.confirm(`確定要刪除空分區【${target.name || zoneId}】嗎？`)) {
      const updatedShelves = shelves.filter(z => z.id !== zoneId);
      await onSaveShelves(updatedShelves);
      setSelectedZoneId(updatedShelves[0]?.id || 'A區');
      setSuccessMsg(`分區【${zoneId}】已成功刪除`);
    }
  };

  // Handle Save Rack
  const handleSaveRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanZone = formZoneId.trim();
    const cleanCode = formRackCode.trim();
    const cleanName = formRackName.trim();

    if (!cleanZone) {
      setError('請輸入或選擇所屬分區名稱 (例如: A區、E區、包裝區)');
      return;
    }
    if (!cleanCode) {
      setError('請填寫貨架編號 (如: 01, 02, 04)');
      return;
    }
    if (!cleanName) {
      setError('請填寫貨架名稱');
      return;
    }
    if (formTierCount < 1 || formTierCount > 8) {
      setError('貨架層數必須介於 1 到 8 層之間');
      return;
    }
    if (formBinsPerTier < 1 || formBinsPerTier > 8) {
      setError('每層儲位數必須介於 1 到 8 位之間');
      return;
    }

    // Check duplicate rack code in the same zone if zone exists
    const existingZone = shelves.find(z => z.id.toLowerCase() === cleanZone.toLowerCase());
    if (existingZone) {
      const duplicateRack = existingZone.racks.find(
        r => r.code.toLowerCase() === cleanCode.toLowerCase() && 
        !(isEditingExisting && originalZoneId.toLowerCase() === cleanZone.toLowerCase() && originalRackCode.toLowerCase() === cleanCode.toLowerCase())
      );

      if (duplicateRack) {
        setError(`分區【${cleanZone}】已存在編號為【${cleanCode}】的貨架 (${duplicateRack.name})，請使用其他編號。`);
        return;
      }
    }

    // Check if reducing tiers would orphan items on the upper tiers
    if (isEditingExisting) {
      const rackItems = getItemsOnRack(originalZoneId, originalRackCode);
      const affectedItems = rackItems.filter(item => {
        const tierMatch = item.shelfTier?.match(/(\d+)層/);
        if (tierMatch) {
          const tierNum = parseInt(tierMatch[1], 10);
          return tierNum > formTierCount;
        }
        return false;
      });

      if (affectedItems.length > 0) {
        setError(`無法縮減至 ${formTierCount} 層！目前第 ${formTierCount + 1} 層以上尚存放有 ${affectedItems.length} 項貨品 (${affectedItems.map(i => i.name).join('、')})，請先調撥貨品後再調整層數。`);
        return;
      }
    }

    setSaving(true);

    try {
      // Clone shelves
      const updatedShelves = JSON.parse(JSON.stringify(shelves)) as ShelfZoneConfig[];
      let migrationConfig: any = undefined;

      // Find or create target zone in updatedShelves
      let destZone = updatedShelves.find(z => z.id.toLowerCase() === cleanZone.toLowerCase());
      if (!destZone) {
        destZone = {
          id: cleanZone,
          name: formZoneName.trim() || cleanZone,
          desc: `自訂 ${cleanZone} 倉庫立體多層鋼架分區`,
          racks: []
        };
        updatedShelves.push(destZone);
      } else if (formZoneName && formZoneName.trim() !== destZone.name && formZoneName.trim() !== cleanZone) {
        destZone.name = formZoneName.trim();
      }

      if (isEditingExisting) {
        // Find and update existing
        const oldZone = updatedShelves.find(z => z.id === originalZoneId);
        if (oldZone) {
          const rackIndex = oldZone.racks.findIndex(r => r.code === originalRackCode);
          if (rackIndex !== -1) {
            const updatedRack: ShelfRackConfig = {
              ...oldZone.racks[rackIndex],
              code: cleanCode,
              name: cleanName,
              tierCount: formTierCount,
              binsPerTier: formBinsPerTier,
              description: formDescription.trim(),
              zoneId: cleanZone,
            };

            if (originalZoneId === cleanZone) {
              oldZone.racks[rackIndex] = updatedRack;
            } else {
              // Moved to another zone
              oldZone.racks.splice(rackIndex, 1);
              destZone.racks.push(updatedRack);
              destZone.racks.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
            }

            // Check if code or zone changed to prepare item migrations
            if (autoMigrateItems && (originalZoneId !== cleanZone || originalRackCode !== cleanCode)) {
              migrationConfig = {
                fromLocationPrefix: `${originalZoneId}-${originalRackCode}架`,
                toLocationPrefix: `${cleanZone}-${cleanCode}架`,
                oldZone: originalZoneId,
                newZone: cleanZone,
                oldRack: originalRackCode,
                newRack: cleanCode,
              };
            }
          }
        }
      } else {
        // Add new rack
        const newRack: ShelfRackConfig = {
          id: `rack-${cleanZone.replace('區', '')}-${cleanCode}-${Date.now().toString(36)}`,
          zoneId: cleanZone,
          code: cleanCode,
          name: cleanName,
          tierCount: formTierCount,
          binsPerTier: formBinsPerTier,
          description: formDescription.trim(),
        };

        destZone.racks.push(newRack);
        destZone.racks.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      }

      await onSaveShelves(updatedShelves, migrationConfig);
      setSuccessMsg(isEditingExisting ? `貨架【${cleanName}】更新成功！` : `新貨架【${cleanName}】新增成功！`);
      setTimeout(() => {
        setActiveTab('list');
        setSelectedZoneId(cleanZone);
        setSuccessMsg(null);
      }, 800);
    } catch (err: any) {
      setError(err.message || '儲存貨架失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Rack
  const handleDeleteRack = async (zoneId: string, rackCode: string, rackName: string) => {
    const rackItems = getItemsOnRack(zoneId, rackCode);
    if (rackItems.length > 0) {
      alert(`⚠️ 無法刪除貨架【${rackName}】！\n\n目前此貨架上尚存放有 ${rackItems.length} 項貨品：\n${rackItems.map(i => `• ${i.name} (${i.shelfLocation})`).join('\n')}\n\n為維護庫存安全，請先將貨品調撥至其他貨架後再行刪除。`);
      return;
    }

    if (!confirm(`確定要刪除貨架【${rackName}】(${zoneId}-${rackCode}架) 嗎？\n此操作無法復原。`)) {
      return;
    }

    try {
      setSaving(true);
      const updatedShelves = JSON.parse(JSON.stringify(shelves)) as ShelfZoneConfig[];
      const zone = updatedShelves.find(z => z.id === zoneId);
      if (zone) {
        zone.racks = zone.racks.filter(r => r.code !== rackCode);
        await onSaveShelves(updatedShelves);
      }
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default shelves
  const handleResetDefaultShelves = async () => {
    if (!confirm('確定要將所有貨架結構重置為系統預設值嗎？\n（現有貨品不會被刪除，但非預設貨架位置將還原）')) {
      return;
    }
    try {
      setSaving(true);
      await onSaveShelves(DEFAULT_SHELF_ZONES);
      alert('已成功恢復預設貨架佈局設定！');
    } catch (err: any) {
      alert(err.message || '重置失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>倉庫立體貨架管理</span>
                <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[10px] sm:text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-md">
                  即時設定
                </span>
              </h2>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                可新增、修改各區貨架名稱、編號與自訂層數 (1~8層)，即時同步立體貨架矩陣與入庫選單
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaultShelves}
              title="恢復預設貨架設定"
              disabled={saving}
              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('list');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🏢 貨架列表與分區總覽
            </button>
            <button
              onClick={() => {
                startAddRack(selectedZoneId);
              }}
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isEditingExisting ? '編輯貨架與層數' : '新增自訂貨架'}</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              onClick={() => startAddRack(selectedZoneId)}
              className="px-3 py-1.5 mb-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增此區貨架</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-5">
              {/* Zone Filter Chips & Add Zone */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap sm:flex-wrap">
                {shelves.map((zone) => {
                  const isSelected = selectedZoneId === zone.id;
                  const rackCount = zone.racks?.length || 0;
                  const zoneItemsCount = items.filter(i => i.zone === zone.id || i.shelfLocation.startsWith(zone.id)).length;

                  return (
                    <button
                      key={zone.id}
                      onClick={() => {
                        setSelectedZoneId(zone.id);
                        setIsEditingZone(false);
                      }}
                      className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm ring-1 ring-amber-500'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span>{zone.name || zone.id}</span>
                      <span className="text-[10px] sm:text-xs px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 font-mono">
                        {rackCount}架 / {zoneItemsCount}品
                      </span>
                    </button>
                  );
                })}

                {/* Add New Zone Button / Input Form */}
                {!isAddingZone ? (
                  <button
                    onClick={() => {
                      setIsAddingZone(true);
                      setNewZoneInput('');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1 transition-all cursor-pointer"
                    title="新增自訂分區"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增分區</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateNewZone} className="flex items-center gap-1.5 animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="輸入分區名稱 (例: E區)"
                      value={newZoneInput}
                      onChange={(e) => setNewZoneInput(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-amber-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 cursor-pointer"
                    >
                      確定
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingZone(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>

              {/* Zone Details & Racks Card Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                  {!isEditingZone ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {currentZone.name || currentZone.id}
                        </h3>
                        <button
                          onClick={() => {
                            setEditZoneName(currentZone.name || currentZone.id);
                            setEditZoneDesc(currentZone.desc || '');
                            setIsEditingZone(true);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-500 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="修改分區名稱與描述"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {currentZone.racks.length === 0 && (
                          <button
                            onClick={() => handleDeleteZone(currentZone.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="刪除此無貨架分區"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {currentZone.desc || '暫無描述說明'}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveCurrentZoneMeta} className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={editZoneName}
                          onChange={(e) => setEditZoneName(e.target.value)}
                          placeholder="分區完整名稱 (如: A區 - 機電傳動配件)"
                          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-500 rounded-xl font-bold text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 cursor-pointer"
                        >
                          儲存
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingZone(false)}
                          className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editZoneDesc}
                        onChange={(e) => setEditZoneDesc(e.target.value)}
                        placeholder="分區備註說明 (如: 步進馬達、斜齒輪箱、傳動皮帶)"
                        className="w-full px-3 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </form>
                  )}

                  <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg font-medium self-start sm:self-auto shrink-0">
                    共 {currentZone.racks.length} 座立體貨架
                  </span>
                </div>

                {/* Racks Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentZone.racks.map((rack) => {
                    const rackItems = getItemsOnRack(currentZone.id, rack.code);
                    const totalRackSlots = (rack.tierCount || 4) * (rack.binsPerTier || 4);
                    const usageRate = Math.min(100, Math.round((rackItems.length / (totalRackSlots || 1)) * 100));

                    return (
                      <div
                        key={rack.code}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-amber-500/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Rack Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-slate-800 dark:bg-slate-800 text-amber-400 font-mono font-bold text-xs rounded-lg border border-slate-700">
                                {rack.code}架
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                  {rack.name}
                                </h4>
                                <div className="text-[11px] font-mono text-slate-400">
                                  儲位代碼：{currentZone.id}-{rack.code}架
                                </div>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-md">
                              {rack.tierCount} 層鋼架
                            </span>
                          </div>

                          {rack.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                              {rack.description}
                            </p>
                          )}

                          {/* Rack Stats */}
                          <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-center text-xs mb-3">
                            <div>
                              <div className="text-slate-400 text-[10px]">垂直層數</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{rack.tierCount} 層</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px]">每層儲位</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{rack.binsPerTier || 4} 個</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-[10px]">存放料件</div>
                              <div className="font-bold text-amber-500">{rackItems.length} 項</div>
                            </div>
                          </div>

                          {/* Visual Tier Stack Mini Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>儲位佔用率</span>
                              <span>{usageRate}% ({rackItems.length}/{totalRackSlots} 位)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  usageRate > 80 ? 'bg-rose-500' : usageRate > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${Math.max(5, usageRate)}%` }} 
                              />
                            </div>
                          </div>

                          {/* Items Preview */}
                          {rackItems.length > 0 ? (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 mb-3">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">現存在料件：</div>
                              <div className="flex flex-wrap gap-1">
                                {rackItems.slice(0, 3).map(i => (
                                  <span key={i.id} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                    {i.name}
                                  </span>
                                ))}
                                {rackItems.length > 3 && (
                                  <span className="text-[10px] text-slate-400 self-center">
                                    +{rackItems.length - 3}項
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic mb-3">
                              目前尚無存放料件，可自由編輯或設定
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                          <button
                            onClick={() => onGenerateShelfQr?.(`${currentZone.id}-${rack.code}架`)}
                            className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>印標籤</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => startEditRack(currentZone.id, rack)}
                              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>編輯名稱與層數</span>
                            </button>

                            <button
                              onClick={() => handleDeleteRack(currentZone.id, rack.code, rack.name)}
                              title="刪除此貨架"
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADD / EDIT FORM */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveRack} className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isEditingExisting ? `正在修改：【${originalZoneId}-${originalRackCode}架】` : '新增倉庫立體多層鋼架'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    支援調整貨架展示名稱、編號代碼與層數（1~8層），儲存後將同步套用至全廠庫存管理系統
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Zone Direct Input with Datalist & Quick Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      所屬分區 (Zone) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      可直接自行輸入分區名稱
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      list="shelf-zones-datalist"
                      placeholder="直接輸入分區名稱 (例: A區, E區, 包裝專區)"
                      value={formZoneId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormZoneId(val);
                        const matched = shelves.find(z => z.id.toLowerCase() === val.trim().toLowerCase());
                        if (matched) {
                          setFormZoneName(matched.name);
                        } else {
                          setFormZoneName(val);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <datalist id="shelf-zones-datalist">
                      {shelves.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* Quick Pick Chips of Existing Zones */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400">快速帶入既有分區：</span>
                    {shelves.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setFormZoneId(z.id);
                          setFormZoneName(z.name);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          formZoneId.trim() === z.id
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {z.id}
                      </button>
                    ))}
                  </div>

                  {/* Prompt when a new zone is typed */}
                  {formZoneId && !shelves.some(z => z.id.toLowerCase() === formZoneId.trim().toLowerCase()) && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>新自訂分區：【{formZoneId}】</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        系統將自動為您新增此分區並建立貨架矩陣。
                      </p>
                    </div>
                  )}
                </div>

                {/* Rack Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    貨架代碼/編號 (如: 01, 02, 04) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如: 04"
                    value={formRackCode}
                    onChange={(e) => setFormRackCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    儲位代碼將呈現為：{formZoneId}-{formRackCode || '??'}架
                  </span>
                </div>
              </div>

              {/* Rack Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  貨架名稱 (Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 04號 智能模組延伸立體架"
                  value={formRackName}
                  onChange={(e) => setFormRackName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Tiers & Bins Setting with Interactive Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Tiers Stepper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    貨架垂直層數 (Tiers) <span className="text-rose-500">*</span>
                  </label>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    設定此鋼架具有幾層高度（1 ~ 8 層）
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormTierCount(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <div className="px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-amber-500 text-lg min-w-[70px] text-center font-mono">
                      {formTierCount} 層
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormTierCount(prev => Math.min(8, prev + 1))}
                      className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bins Stepper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    每層儲位數量 (Bins per Tier) <span className="text-rose-500">*</span>
                  </label>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    設定每層橫向劃分幾個儲格（1 ~ 8 格）
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormBinsPerTier(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <div className="px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-800 dark:text-slate-100 text-lg min-w-[70px] text-center font-mono">
                      {formBinsPerTier} 位
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormBinsPerTier(prev => Math.min(8, prev + 1))}
                      className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview of Shelf Structure */}
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>即時結構視覺預覽 (共 {formTierCount * formBinsPerTier} 個儲位)：</span>
                  </span>
                  <span className="font-mono text-amber-400">
                    {formZoneId}-{formRackCode || '??'}架
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {Array.from({ length: formTierCount }, (_, idx) => {
                    const tierName = `${formTierCount - idx}層`;
                    return (
                      <div key={tierName} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-right font-mono text-[11px] text-slate-400 shrink-0">
                          {tierName}
                        </span>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1 flex-1">
                          {Array.from({ length: formBinsPerTier }, (_, bIdx) => (
                            <div
                              key={bIdx}
                              className="px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-center text-[10px] font-mono text-slate-300 truncate"
                            >
                              #{String(bIdx + 1).padStart(2, '0')}位
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  貨架存放說明或備註 (選填)
                </label>
                <textarea
                  rows={2}
                  placeholder="例如: 重量承重件置於第 1 層、防潮料件置於第 3 層..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Automatic Location Migration Option */}
              {isEditingExisting && (originalZoneId !== formZoneId || originalRackCode !== formRackCode) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="autoMigrate"
                    checked={autoMigrateItems}
                    onChange={(e) => setAutoMigrateItems(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <label htmlFor="autoMigrate" className="text-xs text-blue-900 dark:text-blue-200 cursor-pointer leading-relaxed">
                    <span className="font-bold">自動轉移庫存料件位置：</span>
                    將原貨架【{originalZoneId}-{originalRackCode}架】上的所有現有貨品儲位，自動同步更新至新貨架【{formZoneId}-{formRackCode}架】。
                  </label>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm rounded-xl cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? '正在儲存貨架...' : isEditingExisting ? '儲存貨架設定' : '確認新增貨架'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
