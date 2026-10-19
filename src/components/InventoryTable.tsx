import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  QrCode, 
  Edit3, 
  Trash2, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  CheckSquare, 
  Square, 
  Printer, 
  AlertTriangle,
  AlertCircle,
  Clock,
  MapPin,
  ClipboardCheck,
  ChevronRight
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedFilter: string;
  onSelectFilter: (f: string) => void;
  onSelectItem: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onQuickAudit: (item: InventoryItem) => void;
  onQuickAdjust: (item: InventoryItem, delta: number) => void;
  onOpenAddItem: () => void;
  onPrintSelected: (items: InventoryItem[]) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  selectedFilter,
  onSelectFilter,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onQuickAudit,
  onQuickAdjust,
  onOpenAddItem,
  onPrintSelected,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [sortBy, setSortBy] = useState<'sku' | 'name' | 'quantity' | 'shelf' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dynamic zones list
  const availableZones = ['ALL', ...Array.from(new Set(items.map(i => i.zone).filter(Boolean)))];

  // Filter items
  const filteredItems = items.filter((item) => {
    // Search match
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      item.sku.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      item.finishedProductName.toLowerCase().includes(term) ||
      item.shelfLocation.toLowerCase().includes(term) ||
      item.notes.toLowerCase().includes(term);

    // Zone filter
    const matchesZone = selectedZone === 'ALL' || item.zone === selectedZone || item.shelfLocation.startsWith(selectedZone);

    // Status / KPI filter
    let matchesStatus = true;
    if (selectedFilter === 'normal') {
      matchesStatus = item.quantity > item.minSafeQuantity && (!item.lastCountDiscrepancy || item.lastCountDiscrepancy === 0);
    } else if (selectedFilter === 'low_stock') {
      matchesStatus = item.quantity > 0 && item.quantity <= item.minSafeQuantity;
    } else if (selectedFilter === 'out_of_stock') {
      matchesStatus = item.quantity === 0;
    } else if (selectedFilter === 'discrepancy') {
      matchesStatus = item.lastCountDiscrepancy !== null && item.lastCountDiscrepancy !== 0;
    }

    return matchesSearch && matchesZone && matchesStatus;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'sku') cmp = a.sku.localeCompare(b.sku);
    else if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'quantity') cmp = a.quantity - b.quantity;
    else if (sortBy === 'shelf') cmp = a.shelfLocation.localeCompare(b.shelfLocation);
    else if (sortBy === 'updatedAt') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();

    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // Toggle selection
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map(i => i.id)));
    }
  };

  const selectedItemsToPrint = items.filter(i => selectedIds.has(i.id));

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Zone, Sort, View Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋貨號、貨品名稱、成品名稱、貨架位置或備註..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                清除
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Batch Print Button */}
            {selectedIds.size > 0 && (
              <button
                onClick={() => onPrintSelected(selectedItemsToPrint)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>列印已選標籤 ({selectedIds.size})</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-amber-500 font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="觸控卡片檢視 (適合平板)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-amber-500 font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="緊湊清單表格"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Badges & Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Zone Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap max-w-full">
            <span className="text-slate-400 font-medium whitespace-nowrap">庫存區域：</span>
            {availableZones.map((z) => (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedZone === z
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {z === 'ALL' ? '全部貨架' : z}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-400">排序方式：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="updatedAt">最近更新</option>
              <option value="sku">貨號 SKU</option>
              <option value="quantity">數量</option>
              <option value="shelf">貨架位置</option>
              <option value="name">貨品名稱</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              title="切換升冪 / 降冪"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Select All Bar when filtering */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <button
          onClick={selectAll}
          className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          {selectedIds.size === sortedItems.length && sortedItems.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-amber-500" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
          <span>全選本頁 ({sortedItems.length} 項)</span>
        </button>

        <div>
          共篩選出 <strong className="text-slate-800 dark:text-slate-200">{sortedItems.length}</strong> 項貨品
        </div>
      </div>

      {/* Grid Mode (Touch friendly cards for Tablets) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isLow = item.quantity > 0 && item.quantity <= item.minSafeQuantity;
            const isOut = item.quantity === 0;
            const hasDiscrepancy = item.lastCountDiscrepancy !== null && item.lastCountDiscrepancy !== 0;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/50'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header: Checkbox, SKU, Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleSelect(item.id, e)}
                        className="text-slate-400 hover:text-amber-500 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                        {item.sku}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>缺貨中</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>庫存偏低</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          在庫正常
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2.5 sm:gap-3 mb-3">
                    <img
                      src={item.photo}
                      alt={item.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <span className="text-slate-400 font-medium">成品：</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                          {item.finishedProductName}
                        </span>
                      </div>

                      {/* Shelf Location Tag */}
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{item.shelfLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Quantity Bar & Quick +/- Adjust */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-3 flex items-center justify-between border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[11px] text-slate-400">目前在庫總量</div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-black ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.quantity}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          (安全門檻: {item.minSafeQuantity})
                        </span>
                      </div>
                    </div>

                    {/* Big Touch +/- Quick stock adjust buttons (Tablet friendly) */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onQuickAdjust(item, -1)}
                        className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-bold text-base hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-xs"
                        title="出庫 -1"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => onQuickAdjust(item, 1)}
                        className="w-9 h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="入庫 +1"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* Discrepancy or Audit Warning */}
                  {hasDiscrepancy && (
                    <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between text-xs text-purple-900 dark:text-purple-300">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>盤點差異：{item.lastCountDiscrepancy! > 0 ? '+' : ''}{item.lastCountDiscrepancy} {item.unit}</span>
                      </div>
                      <span className="text-[10px] bg-purple-200/70 dark:bg-purple-900 px-1.5 py-0.5 rounded font-semibold">待核實</span>
                    </div>
                  )}

                  {/* Notes snippet if present */}
                  {item.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-3 italic">
                      備註：{item.notes}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div 
                  className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{item.lastCountedAt ? new Date(item.lastCountedAt).toLocaleDateString() : '未盤點'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onQuickAudit(item)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="進行盤點"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>盤點</span>
                    </button>
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="編輯貨品資訊"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode (for Desktop/Quick Scanning) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input 
                      type="checkbox"
                      checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                      onChange={selectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="py-3 px-4">照片</th>
                  <th className="py-3 px-4">貨號 (SKU)</th>
                  <th className="py-3 px-4">貨品名稱</th>
                  <th className="py-3 px-4">成品名稱</th>
                  <th className="py-3 px-4">貨架位置</th>
                  <th className="py-3 px-4 text-right">在庫數量</th>
                  <th className="py-3 px-4 text-center">狀態</th>
                  <th className="py-3 px-4">備註</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedItems.map((item) => (
                  <tr 
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => toggleSelect(item.id, e as any)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <img 
                        src={item.photo}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {item.finishedProductName}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        {item.shelfLocation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.quantity === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">缺貨</span>
                      ) : item.quantity <= item.minSafeQuantity ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">預警</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">正常</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onQuickAdjust(item, 1)}
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-xs"
                          title="快速入庫 +1"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedItems.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">查無符合條件的貨品</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            未搜尋到符合條件的貨號或位置，您可以清除篩選條件，或直接新增一筆新貨品入庫。
          </p>
          <button
            onClick={onOpenAddItem}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>登記新貨品入庫</span>
          </button>
        </div>
      )}
    </div>
  );
};
