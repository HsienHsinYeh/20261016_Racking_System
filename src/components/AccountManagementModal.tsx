import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserPlus, 
  Edit3, 
  Trash2, 
  KeyRound, 
  Search, 
  Lock, 
  User, 
  Building, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShieldAlert,
  Users
} from 'lucide-react';
import { ManagedAccount, AuthUser } from '../types/inventory';
import { realtimeClient } from '../services/api';
import { playSound } from '../utils/sound';
import { SYSTEM_ROLES, SystemRole, normalizeRole, getUserPermissions, DEPARTMENTS_LIST, Department, normalizeDepartment } from '../utils/permissions';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAccountsUpdated?: () => void;
  onAddToast: (toast: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'alert' }) => void;
}

const ROLES_LIST: SystemRole[] = [...SYSTEM_ROLES];

const AVATAR_PRESETS = ['👨‍🔧', '👩‍🔧', '👨‍💼', '🧑‍🔬', '🛡️', '👷', '👩‍💻', '👨‍💻'];

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAccountsUpdated,
  onAddToast,
}) => {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form modal state for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formRole, setFormRole] = useState<SystemRole>('資料管理層級');
  const [formDepartment, setFormDepartment] = useState<string>('倉管課');
  const [formAvatar, setFormAvatar] = useState<string>(AVATAR_PRESETS[0]);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Load accounts
  const loadAccounts = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await realtimeClient.fetchAccounts();
      setAccounts(data);
    } catch (err: any) {
      setErrorMsg(err.message || '無法讀取帳號資料');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Strict check: only admin can access
  const permissions = getUserPermissions(currentUser?.role, currentUser?.username);
  const isAdmin = permissions.canManageAccounts;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-slate-900 border border-rose-800 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl text-white">
          <ShieldAlert className="w-14 h-14 text-rose-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold">權限不足 (Access Denied)</h3>
          <p className="text-sm text-slate-400 mt-2">
            「帳號與權限管理」僅限系統最高管理員 (<code className="text-amber-400 font-bold">admin</code>) 執行新增、修改與刪除。
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    );
  }

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormUsername('');
    setFormPassword('');
    setFormName('');
    setFormRole('資料管理層級');
    setFormDepartment('倉管課');
    setFormAvatar(AVATAR_PRESETS[0]);
    setShowPassword(false);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (acc: ManagedAccount) => {
    setEditingAccount(acc);
    setFormUsername(acc.username);
    setFormPassword(acc.password || '');
    setFormName(acc.name);
    setFormRole(normalizeRole(acc.role, acc.username));
    setFormDepartment(normalizeDepartment(acc.department));
    setFormAvatar(acc.avatar);
    setShowPassword(false);
    setIsFormOpen(true);
  };

  // Submit Add / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formName.trim()) {
      alert('請填寫完整帳號與姓名');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingAccount) {
        // Update
        await realtimeClient.updateAccount(editingAccount.id, {
          username: formUsername.trim(),
          name: formName.trim(),
          role: formRole.trim(),
          department: formDepartment.trim(),
          avatar: formAvatar,
          password: formPassword.trim() || undefined,
        });

        playSound.success();
        onAddToast({
          title: '✏️ 帳號已更新',
          message: `使用者【${formName} (@${formUsername})】資料已成功儲存`,
          type: 'success'
        });
      } else {
        // Create
        if (!formPassword.trim()) {
          alert('新帳號請務必設定初始登入密碼');
          setFormSubmitting(false);
          return;
        }

        await realtimeClient.createAccount({
          username: formUsername.trim().toLowerCase(),
          password: formPassword.trim(),
          name: formName.trim(),
          role: formRole.trim(),
          department: formDepartment.trim(),
          avatar: formAvatar,
        });

        playSound.success();
        onAddToast({
          title: '🎉 帳號建立成功',
          message: `新使用者【${formName} (@${formUsername})】已可正常登入系統`,
          type: 'success'
        });
      }

      setIsFormOpen(false);
      await loadAccounts();
      onAccountsUpdated?.();
    } catch (err: any) {
      playSound.warning();
      alert(err.message || '操作失敗，請重試');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (acc: ManagedAccount) => {
    if (acc.username.toLowerCase() === 'admin') {
      alert('⚠️ 系統最高管理員 admin 帳號為系統核心帳號，禁止刪除！');
      return;
    }

    if (window.confirm(`確定要永久刪除使用者帳號【${acc.name} (@${acc.username})】嗎？刪除後該人員將無法登入系統。`)) {
      try {
        await realtimeClient.deleteAccount(acc.id);
        playSound.success();
        onAddToast({
          title: '🗑️ 帳號已刪除',
          message: `使用者【${acc.name} (@${acc.username})】已自系統中移除`,
          type: 'info'
        });
        await loadAccounts();
        onAccountsUpdated?.();
      } catch (err: any) {
        alert(err.message || '刪除失敗');
      }
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    const accDept = normalizeDepartment(acc.department);
    const matchDept = selectedDept === 'ALL' || accDept === selectedDept || acc.department === selectedDept;
    const term = searchTerm.trim().toLowerCase();
    const matchSearch = !term ||
      acc.username.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term) ||
      acc.role.toLowerCase().includes(term) ||
      accDept.toLowerCase().includes(term);
    return matchDept && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  系統管理員帳號權限管理中心
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                目前登入：<strong>{currentUser?.name}</strong> • 具備最高權限可新增、修改人員角色、重設密碼與刪除帳號
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

        {/* Top Action & Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋姓名、帳號 (@username) 或角色..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">部門篩選：</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">全部部門 ({accounts.length})</option>
              {DEPARTMENTS_LIST.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Add Account Button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>新增登入帳號</span>
          </button>
        </div>

        {/* Accounts List Container */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3 flex-1 bg-slate-50/50 dark:bg-slate-950/40">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">載入帳號資料中...</div>
          ) : filteredAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAccounts.map((acc) => {
                const isPrimaryAdmin = acc.username.toLowerCase() === 'admin';

                return (
                  <div
                    key={acc.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                      isPrimaryAdmin
                        ? 'border-amber-400/80 dark:border-amber-500/50 ring-1 ring-amber-400/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Avatar, Name, Username, Admin badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {acc.avatar}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                                {acc.name}
                              </h4>
                              {isPrimaryAdmin && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                                  CORE ADMIN
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                              @{acc.username}
                            </span>
                          </div>
                        </div>

                        {/* Password peek tag */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">登入密碼</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {acc.password ? acc.password : '••••••'}
                          </span>
                        </div>
                      </div>

                      {/* Details: Role & Department */}
                      <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">系統角色：</span>
                          {(() => {
                            const normRole = normalizeRole(acc.role, acc.username);
                            if (normRole === '系統管理員') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  系統管理員
                                </span>
                              );
                            }
                            if (normRole === '資料管理層級') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                  <Users className="w-3.5 h-3.5" />
                                  資料管理層級
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <Eye className="w-3.5 h-3.5" />
                                一盤層級
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">所屬部門：</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {normalizeDepartment(acc.department)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">
                        {isPrimaryAdmin ? '核心管理帳號' : '現場操作帳號'}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="編輯帳號資料或重設密碼"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                          <span>修改</span>
                        </button>

                        {!isPrimaryAdmin ? (
                          <button
                            onClick={() => handleDeleteAccount(acc)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                            title="刪除此帳號"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>刪除</span>
                          </button>
                        ) : (
                          <span className="text-[11px] px-2 py-1 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed" title="核心帳號受保護">
                            🔒 保留
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              查無符合條件的帳號
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            共計 <strong className="text-slate-800 dark:text-slate-200">{accounts.length}</strong> 組操作帳號 • 所有變更立即自動同步至即時伺服器
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            完成並關閉
          </button>
        </div>
      </div>

      {/* Sub-modal: Create or Edit Account Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  {editingAccount ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <h4 className="font-bold text-base">
                  {editingAccount ? `編輯帳號 - ${editingAccount.name}` : '建立新系統登入帳號'}
                </h4>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              {/* Avatar Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  選擇帳號頭像貼圖
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setFormAvatar(av)}
                      className={`text-xl p-2 rounded-xl border transition-all cursor-pointer ${
                        formAvatar === av
                          ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  登入帳號 (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={editingAccount?.username === 'admin'}
                  placeholder="例: lin, operator02 (英數底線)"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                />
                {editingAccount?.username === 'admin' && (
                  <span className="text-[10px] text-amber-500 mt-0.5 block">核心最高管理者帳號名稱固定為 admin</span>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {editingAccount ? '重設/修改登入密碼' : '登入密碼 (Password)'} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? '隱藏密碼' : '檢視明文'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingAccount}
                    placeholder={editingAccount ? '若不修改密碼請留空' : '請設定使用者登入密碼 (如: admin)'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  真實姓名 / 人員名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 林偉翔"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  系統角色與權限職銜 (共3類)
                </label>
                <select
                  value={formRole}
                  disabled={editingAccount?.username?.toLowerCase() === 'admin'}
                  onChange={(e) => setFormRole(e.target.value as SystemRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-60"
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {editingAccount?.username?.toLowerCase() === 'admin' ? (
                  <span className="text-[11px] text-amber-500 mt-1 block font-medium">
                    🔒 admin 為系統核心帳號，權限固定為「系統管理員」且不得變更
                  </span>
                ) : (
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    {formRole === '系統管理員' && (
                      <p className="text-amber-600 dark:text-amber-400 font-medium">👑 <strong>系統管理員</strong>：擁有所有修改權限跟刪除任何資料的權限（包含使用者帳號與權限管理）。</p>
                    )}
                    {formRole === '資料管理層級' && (
                      <p className="text-blue-600 dark:text-blue-400 font-medium">💼 <strong>資料管理層級</strong>：不得變更系統角色的任何資料。擁有除此之外的所有貨品、庫存與貨架維護權限。</p>
                    )}
                    {formRole === '一盤層級' && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">🔍 <strong>一盤層級</strong>：只有查閱資料跟掃碼功能，不得修改任何資料。</p>
                    )}
                  </div>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  所屬部門
                </label>
                <select
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {DEPARTMENTS_LIST.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                  <span>💡</span>
                  <span>部門類別僅作為組織識別歸屬，不影響各層級權限。</span>
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? '儲存中...' : editingAccount ? '確認更新' : '建立帳號'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
