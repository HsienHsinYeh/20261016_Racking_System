import React, { useState } from 'react';
import { 
  Boxes, 
  QrCode, 
  ScanLine, 
  ClipboardCheck, 
  Plus, 
  Bell, 
  Users, 
  RotateCcw,
  Printer,
  ChevronDown,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { Operator, ConnectedUser, SystemAlert, AuthUser } from '../types/inventory';

interface NavbarProps {
  currentOperator: Operator;
  currentUser: AuthUser | null;
  operators: Operator[];
  onSelectOperator: (op: Operator) => void;
  onlineCount: number;
  onlineUsers: ConnectedUser[];
  isConnected: boolean;
  alerts: SystemAlert[];
  onOpenScanner: () => void;
  onOpenAddItem: () => void;
  onOpenPrintCenter: () => void;
  onOpenAuditMode: () => void;
  onOpenAlerts: () => void;
  onOpenAccountManagement: () => void;
  onOpenShelfManagement?: () => void;
  onResetSeed: () => void;
  onOpenChatbot: () => void;
  activeView: 'list' | 'shelf_map' | 'audit';
  onChangeView: (view: 'list' | 'shelf_map' | 'audit') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentOperator,
  currentUser,
  operators,
  onSelectOperator,
  onlineCount,
  onlineUsers,
  isConnected,
  alerts,
  onOpenScanner,
  onOpenAddItem,
  onOpenPrintCenter,
  onOpenAuditMode,
  onOpenAlerts,
  onOpenAccountManagement,
  onOpenShelfManagement,
  onResetSeed,
  onOpenChatbot,
  activeView,
  onChangeView,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);

  const unreadAlerts = alerts.filter(a => !a.acknowledged);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const isAdmin = currentUser?.username?.toLowerCase() === 'admin' || currentUser?.role?.includes('最高主管');

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950">
              <Boxes className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  賢欣貨架管理系統
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                  WMS Pro
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>倉庫即時庫存盤點與貨架標籤</span>
                <span className="hidden md:inline text-slate-600">•</span>
                <div 
                  onClick={() => setShowUsersModal(true)}
                  className="hidden md:flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-emerald-400 font-medium">
                    {isConnected ? `即時同步中 (${onlineCount}人上線)` : '離線重試中'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tab Bar for Large Screen & Tablet */}
          <div className="hidden lg:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => onChangeView('list')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'list'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>貨品總表</span>
            </button>
            <button
              onClick={() => onChangeView('shelf_map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'shelf_map'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Warehouse className="w-4 h-4" />
              <span>立體貨架矩陣</span>
            </button>
            <button
              onClick={() => onChangeView('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'audit'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>庫存盤點工作台</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Quick QR Scanner Button */}
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              title="開啟相機掃描貨品或貨架 QR Code"
            >
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span className="font-bold">掃碼</span>
            </button>

            {/* Print Center */}
            <button
              onClick={onOpenPrintCenter}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="QR Code 標籤列印中心"
            >
              <Printer className="w-4 h-4 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden md:inline">標籤列印</span>
            </button>

            {/* Add Item */}
            <button
              onClick={onOpenAddItem}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="新增貨品入庫"
            >
              <Plus className="w-4 h-4 sm:w-4 sm:h-4 text-emerald-400" />
              <span className="hidden md:inline">新增貨品</span>
            </button>

            {/* Shelf Management */}
            {onOpenShelfManagement && (
              <button
                onClick={onOpenShelfManagement}
                className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="貨架結構與層數設定"
              >
                <Warehouse className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">貨架管理</span>
              </button>
            )}

            {/* Admin Only: Accounts Management */}
            {isAdmin && (
              <button
                onClick={onOpenAccountManagement}
                className="p-2 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="管理系統使用者登入帳號 (新增/修改/刪除)"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">帳號管理</span>
              </button>
            )}

            {/* AI Assistant Button */}
            <button
              onClick={onOpenChatbot}
              className="p-2 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="開啟賢欣 AI 庫存智能助理"
            >
              <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden md:inline">AI 助理</span>
            </button>

            {/* Alerts Bell */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="查看異常告警通知"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-bounce">
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Operator Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs sm:text-sm text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">
                  {currentOperator.avatar || '👨‍🔧'}
                </div>
                <div className="hidden sm:block">
                  <div className="font-semibold text-white leading-tight">{currentOperator.name}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[90px]">{currentOperator.role.split(' ')[0]}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200">
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">切換當前登入身分</p>
                    <p className="text-xs text-slate-400 mt-0.5">所有庫存操作與盤點將署名此人員</p>
                  </div>
                  <div className="py-1">
                    {operators.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => {
                          onSelectOperator(op);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-700/80 transition-colors cursor-pointer ${
                          currentOperator.id === op.id ? 'bg-amber-500/10 text-amber-300 font-medium' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{op.avatar}</span>
                          <div>
                            <div className="font-medium text-white">{op.name}</div>
                            <div className="text-xs text-slate-400">{op.role}</div>
                          </div>
                        </div>
                        {currentOperator.id === op.id && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="px-2 pt-2 border-t border-slate-700 space-y-1">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAccountManagement();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer font-bold border border-amber-500/30 bg-amber-500/10 mb-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>帳號權限管理 (新增/修改/刪除)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onResetSeed();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>重設預設示範貨品資料</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>登出系統帳號</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Tab Switcher Bar */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-800/80">
          <button
            onClick={() => onChangeView('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg ${
              activeView === 'list'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>貨品總表</span>
          </button>
          <button
            onClick={() => onChangeView('shelf_map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg ${
              activeView === 'shelf_map'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>立體貨架</span>
          </button>
          <button
            onClick={() => onChangeView('audit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg ${
              activeView === 'audit'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>盤點工作台</span>
          </button>
        </div>
      </div>

      {/* Online Users Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg">多人即時連線同步狀態</h3>
              </div>
              <button 
                onClick={() => setShowUsersModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <div className="text-xs text-emerald-300">
                  <span className="font-semibold text-emerald-200">WebSocket 全雙工即時廣播服務運作中</span>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">任何平板或電腦修改庫存、盤點、調撥，全網各端秒級同步！</p>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">當前連線裝置 ({onlineUsers.length || 1} 台)：</div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(onlineUsers.length > 0 ? onlineUsers : [{
                    operatorId: currentOperator.id,
                    operatorName: currentOperator.name,
                    deviceType: '此裝置 (您)',
                    connectedAt: new Date().toISOString()
                  }]).map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-white">{user.operatorName}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-600">
                        {user.deviceType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowUsersModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
