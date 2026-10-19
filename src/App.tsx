/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  realtimeClient 
} from './services/api';
import { Navbar } from './components/Navbar';
import { StatSummary } from './components/StatSummary';
import { InventoryTable } from './components/InventoryTable';
import { VisualShelfMap } from './components/VisualShelfMap';
import { ItemEditModal } from './components/ItemEditModal';
import { ItemDetailDrawer } from './components/ItemDetailDrawer';
import { QrScannerModal } from './components/QrScannerModal';
import { QrCodePrintCenter } from './components/QrCodePrintCenter';
import { StockAuditModal } from './components/StockAuditModal';
import { AlertsModal } from './components/AlertsModal';
import { RealtimeToast, ToastMessage } from './components/RealtimeToast';
import { LoginView } from './components/LoginView';
import { AccountManagementModal } from './components/AccountManagementModal';
import { InventoryChatbot } from './components/InventoryChatbot';
import { ShelfManagementModal } from './components/ShelfManagementModal';
import { playSound } from './utils/sound';
import { 
  InventoryItem, 
  SystemAlert, 
  Operator, 
  ConnectedUser,
  AuthUser,
  ShelfZoneConfig,
  DEFAULT_SHELF_ZONES
} from './types/inventory';

const DEFAULT_OPERATOR: Operator = {
  id: 'op-1',
  name: '陳建良',
  role: 'A/B區資深倉管員',
  avatar: '👨‍🔧',
  department: '倉儲物流部'
};

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('hh_wms_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [operators, setOperators] = useState<Operator[]>([DEFAULT_OPERATOR]);
  const [currentOperator, setCurrentOperator] = useState<Operator>(DEFAULT_OPERATOR);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<ConnectedUser[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Active view and filter
  const [activeView, setActiveView] = useState<'list' | 'shelf_map' | 'audit'>('list');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Modals & Drawers
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemDrawer, setSelectedItemDrawer] = useState<InventoryItem | null>(null);
  const [isPrintCenterOpen, setIsPrintCenterOpen] = useState<boolean>(false);
  const [printItemsList, setPrintItemsList] = useState<InventoryItem[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditTargetItem, setAuditTargetItem] = useState<InventoryItem | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [defaultShelfForAdd, setDefaultShelfForAdd] = useState<any>(null);

  // Shelves State
  const [shelves, setShelves] = useState<ShelfZoneConfig[]>(() => {
    try {
      const cached = localStorage.getItem('hh_wms_shelves');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_SHELF_ZONES;
  });
  const [isShelfModalOpen, setIsShelfModalOpen] = useState<boolean>(false);
  const [shelfModalTarget, setShelfModalTarget] = useState<{ zoneId: string; rackCode: string } | undefined>(undefined);

  // Real-time toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const newToast: ToastMessage = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString()
    };
    setToasts(prev => [newToast, ...prev].slice(0, 5));

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 5000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Setup WebSocket & Initial Data Fetching
  useEffect(() => {
    // Register real-time handlers
    realtimeClient.registerHandlers({
      onInit: (data) => {
        setItems(data.items);
        setAlerts(data.alerts);
        setOnlineCount(data.onlineCount);
        setLoading(false);
      },
      onItemCreated: ({ item, operator }) => {
        setItems(prev => {
          if (prev.some(i => i.id === item.id)) return prev;
          return [item, ...prev];
        });
        playSound.success();
        addToast({
          title: '📦 新增入庫通知',
          message: `【${item.name} (${item.sku})】已入庫至 ${item.shelfLocation}，數量: ${item.quantity} ${item.unit}`,
          type: 'success',
          operator
        });
      },
      onItemUpdated: ({ item, operator, action, delta }) => {
        setItems(prev => prev.map(i => i.id === item.id ? item : i));
        // Also update open drawer if it matches
        setSelectedItemDrawer(prev => prev?.id === item.id ? item : prev);

        if (delta && delta < 0) {
          playSound.warning();
          addToast({
            title: '📤 領料出庫通知',
            message: `【${item.name}】出庫 ${Math.abs(delta)} ${item.unit}，目前剩餘 ${item.quantity} ${item.unit}`,
            type: 'warning',
            operator
          });
        } else if (delta && delta > 0) {
          playSound.success();
          addToast({
            title: '📥 補貨入庫通知',
            message: `【${item.name}】入庫 +${delta} ${item.unit}，目前庫存 ${item.quantity} ${item.unit}`,
            type: 'success',
            operator
          });
        } else {
          addToast({
            title: '✏️ 資料變更通知',
            message: `【${item.name}】貨品資訊已更新`,
            type: 'info',
            operator
          });
        }
      },
      onItemCounted: ({ item, operator, discrepancy, physicalQty }) => {
        setItems(prev => prev.map(i => i.id === item.id ? item : i));
        setSelectedItemDrawer(prev => prev?.id === item.id ? item : prev);

        if (discrepancy !== 0) {
          playSound.warning();
          addToast({
            title: '⚠️ 盤點差異警報',
            message: `【${item.name}】實盤 ${physicalQty} ${item.unit}，差異 ${discrepancy > 0 ? '+' : ''}${discrepancy} ${item.unit}`,
            type: 'alert',
            operator
          });
        } else {
          playSound.success();
          addToast({
            title: '✅ 盤點確認完畢',
            message: `【${item.name}】實盤 ${physicalQty} ${item.unit}，帳實相符！`,
            type: 'success',
            operator
          });
        }
      },
      onItemDeleted: ({ id, name, sku }) => {
        setItems(prev => prev.filter(i => i.id !== id));
        setSelectedItemDrawer(prev => prev?.id === id ? null : prev);
        addToast({
          title: '🗑️ 貨品刪除',
          message: `貨品【${name} (${sku})】已自系統中移除`,
          type: 'info'
        });
      },
      onAlertsSync: ({ alerts: updatedAlerts }) => {
        setAlerts(updatedAlerts);
      },
      onPresenceSync: ({ users, totalCount }) => {
        setOnlineUsers(users);
        setOnlineCount(totalCount);
      },
      onOperatorsSync: ({ operators: newOps }) => {
        if (newOps && Array.isArray(newOps)) {
          setOperators(newOps);
        }
      },
      onStatusChange: (status) => {
        setIsConnected(status);
      }
    });

    // Start WebSocket
    realtimeClient.connect();

    // Fetch operators and initial data as fallback
    realtimeClient.fetchOperators()
      .then(ops => {
        if (ops.length > 0) {
          setOperators(ops);
          setCurrentOperator(ops[0]);
          realtimeClient.setOperator(ops[0]);
        }
      })
      .catch(console.warn);

    // Fetch dynamic shelves configuration
    realtimeClient.fetchShelves()
      .then(fetchedShelves => {
        if (fetchedShelves && fetchedShelves.length > 0) {
          setShelves(fetchedShelves);
          localStorage.setItem('hh_wms_shelves', JSON.stringify(fetchedShelves));
        }
      })
      .catch(console.warn);

    // Check authenticated session
    const checkSession = async () => {
      try {
        const saved = localStorage.getItem('hh_wms_auth_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.token && parsed?.id) {
            const verified = await realtimeClient.verifyAuth(parsed.token, parsed.id);
            setCurrentUser(verified);
            const op: Operator = {
              id: verified.id,
              name: verified.name,
              role: verified.role,
              avatar: verified.avatar,
              department: verified.department
            };
            setCurrentOperator(op);
            realtimeClient.setOperator(op);
          }
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        localStorage.removeItem('hh_wms_auth_user');
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkSession();

    realtimeClient.fetchInventory()
      .then(initialItems => {
        setItems(initialItems);
        setLoading(false);
      })
      .catch(console.warn);

    realtimeClient.fetchAlerts()
      .then(initialAlerts => {
        setAlerts(initialAlerts);
      })
      .catch(console.warn);
  }, [addToast]);

  // Handle Login Success
  const handleLoginSuccess = (user: AuthUser, rememberMe: boolean) => {
    if (rememberMe) {
      localStorage.setItem('hh_wms_auth_user', JSON.stringify(user));
    }
    setCurrentUser(user);
    const op: Operator = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      department: user.department
    };
    setCurrentOperator(op);
    realtimeClient.setOperator(op);
    addToast({
      title: '🔐 登入成功',
      message: `歡迎使用賢欣貨架系統，${user.name} (${user.role})`,
      type: 'success'
    });
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('hh_wms_auth_user');
    setCurrentUser(null);
    addToast({
      title: '🔒 已安全登出',
      message: '已安全登出賢欣貨架管理系統',
      type: 'info'
    });
  };

  // Operator select handler
  const handleSelectOperator = (op: Operator) => {
    setCurrentOperator(op);
    realtimeClient.setOperator(op);
    addToast({
      title: '👤 身分已切換',
      message: `目前以 ${op.name} (${op.role}) 身分進行各項庫存操作`,
      type: 'info'
    });
  };

  // Save Item (Create or Edit)
  const handleSaveItem = async (itemData: Partial<InventoryItem>, editNote?: string) => {
    if (editingItem) {
      await realtimeClient.updateItem(editingItem.id, itemData, currentOperator.name, editNote);
    } else {
      await realtimeClient.createItem(itemData, currentOperator.name);
    }
  };

  // Quick stock adjust
  const handleQuickAdjust = async (item: InventoryItem, delta: number) => {
    const reason = delta > 0 ? `快捷入庫 +${delta} ${item.unit}` : `快捷出庫 ${delta} ${item.unit}`;
    await realtimeClient.adjustStock(item.id, delta, currentOperator.name, reason);
  };

  // Stock drawer adjustment
  const handleDrawerAdjust = async (item: InventoryItem, delta: number, reason: string) => {
    await realtimeClient.adjustStock(item.id, delta, currentOperator.name, reason);
  };

  // Record audit count
  const handleRecordAudit = async (
    itemId: string, 
    countedQty: number, 
    adjustSystemQty: boolean, 
    note?: string
  ) => {
    await realtimeClient.auditCount(itemId, countedQty, currentOperator.name, adjustSystemQty, note);
  };

  // Delete item
  const handleDeleteItem = async (item: InventoryItem) => {
    if (window.confirm(`確定要自貨架系統中移除【${item.name} (${item.sku})】嗎？此動作將同步通知所有連線人員。`)) {
      await realtimeClient.deleteItem(item.id);
    }
  };

  // Reset demo seed
  const handleResetSeed = async () => {
    if (window.confirm('確定要將貨架庫存重置為預設示範資料嗎？')) {
      await realtimeClient.resetSeedData();
      addToast({
        title: '🔄 資料已重置',
        message: '已恢復為賢欣工業工廠標準貨架庫存示範資料',
        type: 'info'
      });
    }
  };

  // Save dynamic shelves configuration
  const handleSaveShelves = async (
    updatedShelves: ShelfZoneConfig[],
    migratedItems?: { originalLocationPrefix: string; newLocationPrefix: string }[]
  ) => {
    try {
      setShelves(updatedShelves);
      localStorage.setItem('hh_wms_shelves', JSON.stringify(updatedShelves));
      await realtimeClient.saveShelves(updatedShelves);

      // If any items were migrated due to shelf code change, update items
      if (migratedItems && migratedItems.length > 0) {
        for (const migration of migratedItems) {
          const itemsToUpdate = items.filter(i => i.shelfLocation.startsWith(migration.originalLocationPrefix));
          for (const item of itemsToUpdate) {
            const newShelfLocation = item.shelfLocation.replace(
              migration.originalLocationPrefix,
              migration.newLocationPrefix
            );
            const parts = newShelfLocation.split('-');
            const newZone = parts[0] || item.zone;
            await realtimeClient.updateItem(
              item.id,
              {
                shelfLocation: newShelfLocation,
                zone: newZone,
                shelfRack: newRack,
              },
              currentOperator.name,
              '調撥變更貨架編號'
            );
          }
        }
      }

      addToast({
        title: '✅ 貨架配置已更新',
        message: '倉庫立體貨架矩陣與層數設定已儲存並同步',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to save shelves:', err);
      addToast({
        title: '❌ 儲存貨架失敗',
        message: err.message || '無法儲存貨架變更',
        type: 'alert'
      });
      throw err;
    }
  };

  // QR Scanner found actions
  const handleFoundItemFromScan = (item: InventoryItem) => {
    setSelectedItemDrawer(item);
    addToast({
      title: '📷 掃碼成功調閱',
      message: `已定位貨品：${item.name} (${item.sku})，儲位：${item.shelfLocation}`,
      type: 'success'
    });
  };

  const handleFoundShelfFromScan = (shelfLocation: string) => {
    setActiveView('shelf_map');
    setSelectedFilter('all');
    addToast({
      title: '📍 貨架儲位掃碼定位',
      message: `已切換至立體貨架矩陣：${shelfLocation}`,
      type: 'info'
    });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">正在驗證賢欣系統授權權限...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <RealtimeToast toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Navigation Top Bar */}
      <Navbar
        currentOperator={currentOperator}
        currentUser={currentUser}
        operators={operators}
        onSelectOperator={handleSelectOperator}
        onlineCount={onlineCount}
        onlineUsers={onlineUsers}
        isConnected={isConnected}
        alerts={alerts}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAddItem={() => {
          setEditingItem(null);
          setDefaultShelfForAdd(null);
          setIsEditModalOpen(true);
        }}
        onOpenPrintCenter={() => {
          setPrintItemsList(items);
          setIsPrintCenterOpen(true);
        }}
        onOpenAuditMode={() => {
          setAuditTargetItem(null);
          setIsAuditModalOpen(true);
        }}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
        onOpenAccountManagement={() => setIsAccountModalOpen(true)}
        onOpenShelfManagement={() => {
          setShelfModalTarget(undefined);
          setIsShelfModalOpen(true);
        }}
        onResetSeed={handleResetSeed}
        onOpenChatbot={() => setIsChatbotOpen(prev => !prev)}
        activeView={activeView}
        onChangeView={setActiveView}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {/* KPI Summary Cards */}
        <StatSummary
          items={items}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />

        {/* View Routing */}
        {activeView === 'list' && (
          <InventoryTable
            items={items}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            onSelectItem={(item) => setSelectedItemDrawer(item)}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsEditModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onQuickAudit={(item) => {
              setAuditTargetItem(item);
              setIsAuditModalOpen(true);
            }}
            onQuickAdjust={handleQuickAdjust}
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsEditModalOpen(true);
            }}
            onPrintSelected={(selectedList) => {
              setPrintItemsList(selectedList);
              setIsPrintCenterOpen(true);
            }}
          />
        )}

        {activeView === 'shelf_map' && (
          <VisualShelfMap
            items={items}
            shelves={shelves}
            onOpenShelfManagement={(rackTarget) => {
              setShelfModalTarget(rackTarget);
              setIsShelfModalOpen(true);
            }}
            onSelectItem={(item) => setSelectedItemDrawer(item)}
            onAddItemToShelf={(shelfLocation, zone, rack, tier, bin) => {
              setEditingItem(null);
              setDefaultShelfForAdd({ location: shelfLocation, zone, rack, tier, bin });
              setIsEditModalOpen(true);
            }}
            onGenerateShelfQr={(shelfLocation) => {
              const itemsAtShelf = items.filter(i => i.shelfLocation.startsWith(shelfLocation));
              setPrintItemsList(itemsAtShelf.length > 0 ? itemsAtShelf : items.slice(0, 2));
              setIsPrintCenterOpen(true);
            }}
          />
        )}

        {activeView === 'audit' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="text-center py-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">庫存盤點工作台</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                適合手持平板電腦巡檢貨架。點擊下方按鈕啟動即時盤點對話框，即時比對實點數量並記錄短溢。
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setIsAuditModalOpen(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  啟動現場實物盤點
                </button>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  相機掃碼直接盤點
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-xs text-slate-500 dark:text-slate-400 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            賢欣貨架管理系統 (Hsien-Hsin Warehouse & Shelf Management System) • 支援平板觸控與多人即時連線同步
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>{isConnected ? '伺服器即時同步連線' : '連線重試中'}</span>
            </span>
            <span>•</span>
            <span>當前操作員：{currentOperator.name}</span>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <ItemEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
        defaultShelf={defaultShelfForAdd}
        shelves={shelves}
      />

      <ShelfManagementModal
        isOpen={isShelfModalOpen}
        onClose={() => {
          setIsShelfModalOpen(false);
          setShelfModalTarget(undefined);
        }}
        shelves={shelves}
        items={items}
        onSaveShelves={handleSaveShelves}
        initialTarget={shelfModalTarget}
      />

      <ItemDetailDrawer
        item={selectedItemDrawer}
        isOpen={!!selectedItemDrawer}
        onClose={() => setSelectedItemDrawer(null)}
        onEdit={(item) => {
          setEditingItem(item);
          setIsEditModalOpen(true);
        }}
        onQuickAudit={(item) => {
          setAuditTargetItem(item);
          setIsAuditModalOpen(true);
        }}
        onAdjustStock={handleDrawerAdjust}
        onPrintSingle={(item) => {
          setPrintItemsList([item]);
          setIsPrintCenterOpen(true);
        }}
      />

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={items}
        onFoundItem={handleFoundItemFromScan}
        onFoundShelf={handleFoundShelfFromScan}
      />

      <QrCodePrintCenter
        isOpen={isPrintCenterOpen}
        onClose={() => setIsPrintCenterOpen(false)}
        items={items}
        preSelectedItems={printItemsList}
      />

      <StockAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        items={items}
        currentOperator={currentOperator}
        onRecordAudit={handleRecordAudit}
        targetItem={auditTargetItem}
      />

      <AlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={alerts}
        items={items}
        onSelectItem={(item) => setSelectedItemDrawer(item)}
        onQuickAudit={(item) => {
          setAuditTargetItem(item);
          setIsAuditModalOpen(true);
        }}
      />

      <AccountManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onAccountsUpdated={() => {
          realtimeClient.fetchOperators().then(ops => setOperators(ops)).catch(console.warn);
        }}
        onAddToast={addToast}
      />

      {/* Floating Inventory Chatbot */}
      <InventoryChatbot
        isOpen={isChatbotOpen}
        onToggle={() => setIsChatbotOpen(prev => !prev)}
        items={items}
        alerts={alerts}
        currentOperator={currentOperator}
        onSelectItem={(item) => setSelectedItemDrawer(item)}
        onNavigateToShelfMap={(zone) => {
          setActiveView('shelf_map');
          if (zone) setSelectedFilter(zone);
        }}
      />

      {/* Floating Multi-User Real-time Sync Toasts */}
      <RealtimeToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
