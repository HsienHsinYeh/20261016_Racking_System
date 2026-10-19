import React from 'react';
import { Package, AlertTriangle, AlertCircle, CheckCircle, Boxes, Layers } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface StatSummaryProps {
  items: InventoryItem[];
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const StatSummary: React.FC<StatSummaryProps> = ({
  items,
  selectedFilter,
  onSelectFilter,
}) => {
  const totalItems = items.length;
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity <= i.minSafeQuantity);
  const outOfStockItems = items.filter(i => i.quantity === 0);
  const discrepancyItems = items.filter(i => i.lastCountDiscrepancy !== null && i.lastCountDiscrepancy !== 0);
  const normalItems = items.filter(i => i.quantity > i.minSafeQuantity && (i.lastCountDiscrepancy === null || i.lastCountDiscrepancy === 0));

  // Count unique shelf locations used
  const uniqueShelves = new Set(items.map(i => i.shelfLocation)).size;

  const cards = [
    {
      id: 'all',
      title: '在庫品項總數',
      value: totalItems,
      subtext: `共計 ${totalQty.toLocaleString()} 件庫存品`,
      icon: Package,
      color: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      id: 'normal',
      title: '庫存狀態正常',
      value: normalItems.length,
      subtext: '高於安全庫存標準',
      icon: CheckCircle,
      color: 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'low_stock',
      title: '安全庫存預警',
      value: lowStockItems.length,
      subtext: '低於最低備料門檻',
      icon: AlertTriangle,
      color: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
      badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'out_of_stock',
      title: '完全缺貨停工警報',
      value: outOfStockItems.length,
      subtext: '零庫存需即刻進貨',
      icon: AlertCircle,
      color: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200',
      badgeColor: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
    },
    {
      id: 'discrepancy',
      title: '盤點帳實異常',
      value: discrepancyItems.length,
      subtext: '實盤與系統數量不符',
      icon: Layers,
      color: 'border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200',
      badgeColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5 mb-4 sm:mb-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectFilter(isSelected ? 'all' : card.id)}
            className={`p-2.5 sm:p-4 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer active:scale-98 ${card.color} ${
              isSelected ? 'ring-2 ring-amber-500 shadow-md translate-y-[-2px]' : 'hover:shadow-sm'
            } ${idx === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.badgeColor}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {card.value}
              </span>
              <span className="text-[11px] text-slate-400">品項</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {card.subtext}
            </div>
            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            )}
          </button>
        );
      })}
    </div>
  );
};
