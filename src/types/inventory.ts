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

export interface ShelfRackConfig {
  id: string;
  zoneId: string;
  code: string; // '01', '02', '03'...
  name: string; // '01號 核心傳動多層鋼架'
  tierCount: number; // 1~8 層
  binsPerTier: number; // 1~8 位 (預設 4)
  description?: string;
}

export interface ShelfZoneConfig {
  id: string; // 'A區'
  name: string; // 'A區 - 機電傳動配件'
  desc: string;
  racks: ShelfRackConfig[];
}

export const DEFAULT_SHELF_ZONES: ShelfZoneConfig[] = [
  {
    id: 'A區',
    name: 'A區 - 機電傳動配件',
    desc: '步進馬達、斜齒輪箱、傳動皮帶',
    racks: [
      {
        id: 'rack-A-01',
        zoneId: 'A區',
        code: '01',
        name: '01號 核心傳動多層鋼架',
        tierCount: 4,
        binsPerTier: 4,
        description: '精密步進馬達專區'
      },
      {
        id: 'rack-A-02',
        zoneId: 'A區',
        code: '02',
        name: '02號 斜齒輪減速機架',
        tierCount: 4,
        binsPerTier: 4,
        description: '大型重量件存放，低層承重'
      },
      {
        id: 'rack-A-03',
        zoneId: 'A區',
        code: '03',
        name: '03號 傳動同步皮帶架',
        tierCount: 4,
        binsPerTier: 4,
        description: '常溫避光皮帶專放'
      }
    ]
  },
  {
    id: 'B區',
    name: 'B區 - 氣動電控模組',
    desc: 'PLC通訊卡、雙動氣缸、HMI螢幕',
    racks: [
      {
        id: 'rack-B-01',
        zoneId: 'B區',
        code: '01',
        name: '01號 主控PLC電控通訊架',
        tierCount: 4,
        binsPerTier: 4,
        description: '防靜電袋密封保存'
      },
      {
        id: 'rack-B-02',
        zoneId: 'B區',
        code: '02',
        name: '02號 工業觸控人機HMI專架',
        tierCount: 4,
        binsPerTier: 4,
        description: '10.1吋觸控屏及配件'
      },
      {
        id: 'rack-B-03',
        zoneId: 'B區',
        code: '03',
        name: '03號 雙動氣壓缸立體架',
        tierCount: 4,
        binsPerTier: 4,
        description: '氣動機械手臂爪夾備料'
      }
    ]
  },
  {
    id: 'C區',
    name: 'C區 - 原料軌道結構',
    desc: '航太鋁滑軌、結構支架、光電感測',
    racks: [
      {
        id: 'rack-C-01',
        zoneId: 'C區',
        code: '01',
        name: '01號 工業光電感測備料架',
        tierCount: 4,
        binsPerTier: 4,
        description: 'IP67感測器精密存放'
      },
      {
        id: 'rack-C-02',
        zoneId: 'C區',
        code: '02',
        name: '02號 航太鋁滑軌平置架',
        tierCount: 4,
        binsPerTier: 4,
        description: '1500mm長型金屬滑軌'
      },
      {
        id: 'rack-C-03',
        zoneId: 'C區',
        code: '03',
        name: '03號 機台五金結構扣件架',
        tierCount: 4,
        binsPerTier: 4,
        description: '各規格螺絲與滑塊'
      }
    ]
  },
  {
    id: 'D區',
    name: 'D區 - 檢驗與暫存區',
    desc: '進貨品檢、出貨緩衝',
    racks: [
      {
        id: 'rack-D-01',
        zoneId: 'D區',
        code: '01',
        name: '01號 進貨待檢品保緩衝架',
        tierCount: 3,
        binsPerTier: 4,
        description: '待QC檢驗進料暫存'
      },
      {
        id: 'rack-D-02',
        zoneId: 'D區',
        code: '02',
        name: '02號 出庫包裝待發儲運架',
        tierCount: 3,
        binsPerTier: 4,
        description: '已裝箱待出廠貨件'
      }
    ]
  }
];



