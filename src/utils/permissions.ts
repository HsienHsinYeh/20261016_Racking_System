export type SystemRole = '系統管理員' | '資料管理層級' | '一盤層級';

export const SYSTEM_ROLES: SystemRole[] = [
  '系統管理員',
  '資料管理層級',
  '一盤層級'
];

export const ROLE_DEFINITIONS: Record<SystemRole, {
  label: SystemRole;
  desc: string;
  badgeColor: string;
  badgeTextColor: string;
  iconName: string;
}> = {
  '系統管理員': {
    label: '系統管理員',
    desc: '擁有所有修改權限與刪除任何資料的權限（包含系統帳號與權限角色管理）',
    badgeColor: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    badgeTextColor: 'text-rose-400',
    iconName: 'ShieldAlert'
  },
  '資料管理層級': {
    label: '資料管理層級',
    desc: '擁有料件、庫存調撥與貨架設定的所有管理權限，不得變更系統角色的任何資料',
    badgeColor: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    badgeTextColor: 'text-blue-400',
    iconName: 'ShieldCheck'
  },
  '一盤層級': {
    label: '一盤層級',
    desc: '僅具備查閱庫存資料與相機掃碼功能，不得新增、修改或刪除任何資料',
    badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    badgeTextColor: 'text-emerald-400',
    iconName: 'ScanLine'
  }
};

export interface UserPermissions {
  role: SystemRole;
  isSysAdmin: boolean;
  isDataAdmin: boolean;
  isAuditOnly: boolean;
  canManageAccounts: boolean; // 管理系統使用者帳號與角色
  canModifyData: boolean;     // 新增/修改料件資料、出入庫調撥
  canDeleteItems: boolean;    // 刪除料件資料
  canManageShelves: boolean;  // 新增/編輯/刪除貨架與分區
  canAuditAdjust: boolean;    // 盤點送出差異數量調帳
  canScan: boolean;           // 相機條碼掃描功能
  canView: boolean;           // 查閱資料總表與貨架
}

export function normalizeRole(role?: string, username?: string): SystemRole {
  if (username?.toLowerCase() === 'admin') return '系統管理員';
  if (!role) return '一盤層級';

  const r = role.trim();
  if (r === '系統管理員' || r.includes('最高主管') || r.includes('系統主管')) {
    return '系統管理員';
  }
  if (r === '資料管理層級' || r.includes('課長') || r.includes('資深') || r.includes('組長') || r.includes('專員')) {
    return '資料管理層級';
  }
  if (r === '一盤層級') {
    return '一盤層級';
  }
  return '一盤層級';
}

export function getUserPermissions(role?: string, username?: string): UserPermissions {
  const normalizedRole = normalizeRole(role, username);
  const isSysAdmin = normalizedRole === '系統管理員' || username?.toLowerCase() === 'admin';
  const isDataAdmin = normalizedRole === '資料管理層級';
  const isAuditOnly = normalizedRole === '一盤層級';

  return {
    role: normalizedRole,
    isSysAdmin,
    isDataAdmin,
    isAuditOnly,
    canManageAccounts: isSysAdmin,
    canModifyData: isSysAdmin || isDataAdmin,
    canDeleteItems: isSysAdmin || isDataAdmin,
    canManageShelves: isSysAdmin || isDataAdmin,
    canAuditAdjust: isSysAdmin || isDataAdmin,
    canScan: true,
    canView: true,
  };
}

export type Department = '管理部' | '倉管課' | '生產課' | '模具課';

export const DEPARTMENTS_LIST: Department[] = [
  '管理部',
  '倉管課',
  '生產課',
  '模具課'
];

export function normalizeDepartment(dept?: string): Department {
  if (!dept) return '倉管課';
  const d = dept.trim();
  if (d === '管理部' || d.includes('智慧倉儲') || d.includes('運營') || d.includes('管理')) return '管理部';
  if (d === '生產課' || d.includes('智慧製造') || d.includes('組裝') || d.includes('生產')) return '生產課';
  if (d === '模具課' || d.includes('模具') || d.includes('加工') || d.includes('品質') || d.includes('品管')) return '模具課';
  if (d === '倉管課' || d.includes('倉儲') || d.includes('物流')) return '倉管課';
  return '倉管課';
}
