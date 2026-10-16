export interface InventoryHistory {
  id: string;
  timestamp: string;
  operator: string;
  type: 'create' | 'edit' | 'stock_in' | 'stock_out' | 'audit_count' | 'relocate';
  qtyChange?: number;
  previousQty?: number;
  newQty?: number;
  note?: string;
}

export interface InventoryItem {
  id: string;
  sku: string; // 貨號
  name: string; // 名稱
  finishedProductName: string; // 成品名稱
  quantity: number; // 數量
  unit: string; // 單位 (件、台、組、支、個、箱、捲)
  shelfLocation: string; // 貨架位置 (如: A區-01架-3層-02位)
  zone: string; // A區, B區, C區, D區
  shelfRack: string; // 01, 02, 03...
  shelfTier: string; // 1層, 2層, 3層, 4層
  shelfBin: string; // 01, 02, 03...
  photo: string; // 照片 URL / Base64
  notes: string; // 備註
  minSafeQuantity: number; // 安全庫存量
  maxCapacity?: number; // 貨架容積上限
  lastCountedAt: string | null; // 最後盤點時間
  lastCountedBy: string | null; // 最後盤點人
  lastCountedQty: number | null; // 上次盤點實點數量
  lastCountDiscrepancy: number | null; // 差異量 (實點 - 系統)
  status: 'normal' | 'low_stock' | 'out_of_stock' | 'discrepancy' | 'pending_count';
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  history: InventoryHistory[];
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
}

export interface SystemAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'discrepancy' | 'overcapacity';
  itemId: string;
  itemSku: string;
  itemName: string;
  shelfLocation: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  timestamp: string;
  acknowledged: boolean;
}

export interface ConnectedUser {
  operatorId: string;
  operatorName: string;
  deviceType: string;
  connectedAt: string;
}

export interface ShelfSlot {
  zone: string;
  rack: string;
  tier: string;
  bin: string;
  locationCode: string;
  items: InventoryItem[];
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
  token?: string;
}

export interface ManagedAccount {
  id: string;
  username: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
  password?: string;
  createdAt?: string;
  lastLoginAt?: string;
}


