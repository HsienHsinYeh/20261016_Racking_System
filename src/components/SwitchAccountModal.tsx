import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  X,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { AuthUser } from '../types/inventory';
import { realtimeClient } from '../services/api';
import { playSound } from '../utils/sound';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onSwitchSuccess: (newUser: AuthUser, rememberMe: boolean) => void;
}

export const SwitchAccountModal: React.FC<SwitchAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('請輸入要切換的使用者帳號');
      return;
    }
    if (!password) {
      setErrorMessage('請輸入登入密碼');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      // Authenticate new credentials
      const newUser = await realtimeClient.login(username.trim(), password);
      
      playSound.success();
      handleClose();
      onSwitchSuccess(newUser, rememberMe);
    } catch (err: any) {
      playSound.warning();
      setErrorMessage(err.message || '帳號或密碼輸入錯誤，請重新確認');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="關閉"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shrink-0">
            <UserCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">切換登入帳號</h2>
            <p className="text-xs text-slate-400 mt-0.5">輸入新帳號密碼，系統將自動登出原帳號</p>
          </div>
        </div>

        {/* Currently Logged In Banner */}
        {currentUser && (
          <div className="mb-5 p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{currentUser.avatar || '👨‍🔧'}</span>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>目前登入：{currentUser.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                    @{currentUser.username}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentUser.role} • {currentUser.department}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              即將登出
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-950/70 border border-rose-800/80 rounded-2xl text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              新使用者帳號
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="請輸入欲切換的使用者帳號"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 focus:border-amber-500 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              新帳號密碼
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="請輸入新帳號密碼"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-800/90 border border-slate-700/80 focus:border-amber-500 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? '隱藏密碼' : '顯示密碼'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/40"
              />
              <span className="text-xs text-slate-400 hover:text-slate-300">保持新帳號登入狀態</span>
            </label>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>單機獨立授權</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              取消返回
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>驗證並切換帳號</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
