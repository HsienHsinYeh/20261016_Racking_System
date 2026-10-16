import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'inventory.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const DGX_API_URL = 'https://dgx-api.ovantech.com.tw/v1/chat/completions';
const DGX_API_KEY = 'dgx_Q4txLJEuu5qqZDmjT5EdYE9jVmDxQFvDi3fgBCxTSto';
const DGX_MODEL = 'qwen3-8b';

// Interface definition matching client
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
  unit: string; // 單位
  shelfLocation: string; // 貨架位置 (例如: A區-01架-3層-02位)
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

// Initial default seed items for 賢欣工業
const SEED_ITEMS: InventoryItem[] = [
  {
    id: 'hh-item-001',
    sku: 'HH-M01-102',
    name: '三相高扭矩步進馬達 (NEMA 34)',
    finishedProductName: '賢欣智能高速包裝機 X-500',
    quantity: 38,
    unit: '組',
    shelfLocation: 'A區-01架-2層-01位',
    zone: 'A區',
    shelfRack: '01',
    shelfTier: '2層',
    shelfBin: '01',
    photo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    notes: '精密核心零件，防潮保管，出庫前需確認出廠校正標籤。',
    minSafeQuantity: 15,
    maxCapacity: 50,
    lastCountedAt: '2026-10-12T14:30:00.000Z',
    lastCountedBy: '陳建良 (資深倉管員)',
    lastCountedQty: 38,
    lastCountDiscrepancy: 0,
    status: 'normal',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-10-12T14:30:00.000Z',
    updatedBy: '陳建良',
    history: [
      {
        id: 'hist-1',
        timestamp: '2026-10-12T14:30:00.000Z',
        operator: '陳建良',
        type: 'audit_count',
        previousQty: 38,
        newQty: 38,
        note: '例行巡檢盤點，帳實相符'
      }
    ]
  },
  {
    id: 'hh-item-002',
    sku: 'HH-G02-045',
    name: '硬化斜齒輪減速機箱 (1:20)',
    finishedProductName: '賢欣重型傳動輸送帶系統 H-80',
    quantity: 6,
    unit: '台',
    shelfLocation: 'A區-02架-1層-02位',
    zone: 'A區',
    shelfRack: '02',
    shelfTier: '1層',
    shelfBin: '02',
    photo: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80',
    notes: '重量件，放置於底層以策安全。安全庫存臨界，請通知採購部備料。',
    minSafeQuantity: 10,
    maxCapacity: 20,
    lastCountedAt: '2026-10-14T09:15:00.000Z',
    lastCountedBy: '王小華 (倉管專員)',
    lastCountedQty: 6,
    lastCountDiscrepancy: 0,
    status: 'low_stock',
    createdAt: '2026-09-05T08:00:00.000Z',
    updatedAt: '2026-10-14T09:15:00.000Z',
    updatedBy: '王小華',
    history: [
      {
        id: 'hist-2',
        timestamp: '2026-10-14T09:15:00.000Z',
        operator: '王小華',
        type: 'stock_out',
        qtyChange: -4,
        previousQty: 10,
        newQty: 6,
        note: '產線領料：裝配 H-80 訂單工單 #9028'
      }
    ]
  },
  {
    id: 'hh-item-003',
    sku: 'HH-E03-312',
    name: '主控 PLC 擴充通訊模組 (EtherCAT)',
    finishedProductName: '賢欣全系列自動化設備電控箱',
    quantity: 24,
    unit: '片',
    shelfLocation: 'B區-01架-3層-04位',
    zone: 'B區',
    shelfRack: '01',
    shelfTier: '3層',
    shelfBin: '04',
    photo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    notes: '防靜電袋密封保存，不可受潮，拿取需佩戴防靜電手環。',
    minSafeQuantity: 8,
    maxCapacity: 60,
    lastCountedAt: '2026-10-10T16:00:00.000Z',
    lastCountedBy: '李秉勳 (品管組長)',
    lastCountedQty: 24,
    lastCountDiscrepancy: 0,
    status: 'normal',
    createdAt: '2026-09-10T08:00:00.000Z',
    updatedAt: '2026-10-10T16:00:00.000Z',
    updatedBy: '李秉勳',
    history: []
  },
  {
    id: 'hh-item-004',
    sku: 'HH-P04-088',
    name: '雙動氣壓缸 (行程 200mm, 缸徑 40mm)',
    finishedProductName: '賢欣精密氣動機械手臂爪夾',
    quantity: 18,
    unit: '支',
    shelfLocation: 'B區-03架-2層-01位',
    zone: 'B區',
    shelfRack: '03',
    shelfTier: '2層',
    shelfBin: '01',
    photo: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80',
    notes: '昨日盤點發現實體數量少 2 支，已立案異常通報查驗產線借出記錄。',
    minSafeQuantity: 12,
    maxCapacity: 40,
    lastCountedAt: '2026-10-15T11:20:00.000Z',
    lastCountedBy: '陳建良 (資深倉管員)',
    lastCountedQty: 18,
    lastCountDiscrepancy: -2,
    status: 'discrepancy',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-10-15T11:20:00.000Z',
    updatedBy: '陳建良',
    history: [
      {
        id: 'hist-3',
        timestamp: '2026-10-15T11:20:00.000Z',
        operator: '陳建良',
        type: 'audit_count',
        previousQty: 20,
        newQty: 18,
        note: '實地盤點數量為 18 支，系統原登載 20 支，差異 -2 支'
      }
    ]
  },
  {
    id: 'hh-item-005',
    sku: 'HH-S05-550',
    name: '工業級光電反射感測器 (IP67)',
    finishedProductName: '賢欣多功能自動計數篩選機 S-12',
    quantity: 3,
    unit: '組',
    shelfLocation: 'C區-01架-4層-03位',
    zone: 'C區',
    shelfRack: '01',
    shelfTier: '4層',
    shelfBin: '03',
    photo: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80',
    notes: '即將斷貨！最低安全庫存為 15 組，目前僅存 3 組。急件請催料。',
    minSafeQuantity: 15,
    maxCapacity: 80,
    lastCountedAt: '2026-10-13T10:00:00.000Z',
    lastCountedBy: '張家豪 (倉管主管)',
    lastCountedQty: 3,
    lastCountDiscrepancy: 0,
    status: 'low_stock',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
    updatedBy: '張家豪',
    history: []
  },
  {
    id: 'hh-item-006',
    sku: 'HH-A06-901',
    name: '陽極氧化航太級鋁合金滑軌 (1500mm)',
    finishedProductName: '賢欣五軸連動 CNC 雕銑加工中心',
    quantity: 42,
    unit: '支',
    shelfLocation: 'C區-02架-1層-01位',
    zone: 'C區',
    shelfRack: '02',
    shelfTier: '1層',
    shelfBin: '01',
    photo: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80',
    notes: '長型金屬件，整齊平放，避免重壓彎曲，兩端套保護防撞蓋。',
    minSafeQuantity: 20,
    maxCapacity: 50,
    lastCountedAt: null,
    lastCountedBy: null,
    lastCountedQty: null,
    lastCountDiscrepancy: null,
    status: 'pending_count',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    updatedBy: '系統初始匯入',
    history: []
  },
  {
    id: 'hh-item-007',
    sku: 'HH-B07-210',
    name: '聚氨酯同步齒形傳動皮帶 (T10-1250)',
    finishedProductName: '賢欣智能高速包裝機 X-500',
    quantity: 65,
    unit: '條',
    shelfLocation: 'A區-03架-3層-02位',
    zone: 'A區',
    shelfRack: '03',
    shelfTier: '3層',
    shelfBin: '02',
    photo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    notes: '常溫避光保存，避免與油污有機溶劑直接接觸。',
    minSafeQuantity: 25,
    maxCapacity: 100,
    lastCountedAt: '2026-10-15T09:00:00.000Z',
    lastCountedBy: '陳建良 (資深倉管員)',
    lastCountedQty: 65,
    lastCountDiscrepancy: 0,
    status: 'normal',
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    updatedBy: '陳建良',
    history: []
  },
  {
    id: 'hh-item-008',
    sku: 'HH-F08-019',
    name: '10.1 吋工業觸控人機介面 HMI 螢幕',
    finishedProductName: '賢欣觸控控制終端盤面 T-10',
    quantity: 0,
    unit: '組',
    shelfLocation: 'B區-02架-3層-01位',
    zone: 'B區',
    shelfRack: '02',
    shelfTier: '3層',
    shelfBin: '01',
    photo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    notes: '目前已全部出庫，供應商預計明天上午 10:00 補送 15 台進貨。',
    minSafeQuantity: 5,
    maxCapacity: 25,
    lastCountedAt: '2026-10-15T15:45:00.000Z',
    lastCountedBy: '張家豪 (倉管主管)',
    lastCountedQty: 0,
    lastCountDiscrepancy: 0,
    status: 'out_of_stock',
    createdAt: '2026-09-08T08:00:00.000Z',
    updatedAt: '2026-10-15T15:45:00.000Z',
    updatedBy: '張家豪',
    history: [
      {
        id: 'hist-4',
        timestamp: '2026-10-15T15:45:00.000Z',
        operator: '張家豪',
        type: 'stock_out',
        qtyChange: -5,
        previousQty: 5,
        newQty: 0,
        note: '全數調撥至 2 號總裝車間'
      }
    ]
  }
];

export const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'op-1',
    name: '陳建良',
    role: 'A/B區資深倉管員',
    avatar: '👨‍🔧',
    department: '倉儲物流部'
  },
  {
    id: 'op-2',
    name: '張家豪',
    role: '倉管課長 / 系統主管',
    avatar: '👨‍💼',
    department: '運營管理部'
  },
  {
    id: 'op-3',
    name: '王小華',
    role: '現場入出庫專員',
    avatar: '👩‍🔧',
    department: '倉儲物流部'
  },
  {
    id: 'op-4',
    name: '李秉勳',
    role: '品管檢驗組長',
    avatar: '🧑‍🔬',
    department: '品質保證部'
  }
];

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // 'admin'
  name: string;
  role: string;
  avatar: string;
  department: string;
}

export const USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    passwordHash: 'admin',
    name: '系統管理員 (主管)',
    role: '系統最高主管 / 全權限',
    avatar: '🛡️',
    department: '智慧倉儲運營部'
  },
  {
    id: 'usr-chen',
    username: 'chen',
    passwordHash: 'admin',
    name: '陳建良',
    role: 'A/B區資深倉管員',
    avatar: '👨‍🔧',
    department: '倉儲物流部'
  },
  {
    id: 'usr-chang',
    username: 'chang',
    passwordHash: 'admin',
    name: '張家豪',
    role: '倉管課長 / 系統主管',
    avatar: '👨‍💼',
    department: '運營管理部'
  },
  {
    id: 'usr-wang',
    username: 'wang',
    passwordHash: 'admin',
    name: '王小華',
    role: '現場入出庫專員',
    avatar: '👩‍🔧',
    department: '倉儲物流部'
  },
  {
    id: 'usr-lee',
    username: 'lee',
    passwordHash: 'admin',
    name: '李秉勳',
    role: '品管檢驗組長',
    avatar: '🧑‍🔬',
    department: '品質保證部'
  }
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUsers(): UserAccount[] {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    saveUsers(USER_ACCOUNTS);
    return USER_ACCOUNTS;
  } catch (err) {
    console.error('Error loading users file:', err);
    return USER_ACCOUNTS;
  }
}

function saveUsers(users: UserAccount[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users file:', err);
  }
}

function loadItems(): InventoryItem[] {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    // write seed items
    saveItems(SEED_ITEMS);
    return SEED_ITEMS;
  } catch (err) {
    console.error('Error loading inventory file:', err);
    return SEED_ITEMS;
  }
}

function saveItems(items: InventoryItem[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving inventory file:', err);
  }
}

// Compute alerts from items
function generateAlerts(items: InventoryItem[]): SystemAlert[] {
  const alerts: SystemAlert[] = [];

  for (const item of items) {
    if (item.quantity === 0) {
      alerts.push({
        id: `alert-out-${item.id}`,
        type: 'out_of_stock',
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        shelfLocation: item.shelfLocation,
        message: `貨品【${item.name} (${item.sku})】目前已零庫存，請儘速聯繫採購或排程進貨！`,
        severity: 'critical',
        timestamp: item.updatedAt || new Date().toISOString(),
        acknowledged: false
      });
    } else if (item.quantity <= item.minSafeQuantity) {
      alerts.push({
        id: `alert-low-${item.id}`,
        type: 'low_stock',
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        shelfLocation: item.shelfLocation,
        message: `貨品【${item.name}】數量剩餘 ${item.quantity} ${item.unit}，已低於安全庫存 (${item.minSafeQuantity} ${item.unit})`,
        severity: 'warning',
        timestamp: item.updatedAt || new Date().toISOString(),
        acknowledged: false
      });
    }

    if (item.lastCountDiscrepancy !== null && item.lastCountDiscrepancy !== 0) {
      alerts.push({
        id: `alert-disc-${item.id}`,
        type: 'discrepancy',
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        shelfLocation: item.shelfLocation,
        message: `貨品【${item.name}】盤點發現差異：${item.lastCountDiscrepancy > 0 ? '+' : ''}${item.lastCountDiscrepancy} ${item.unit} (實點 ${item.lastCountedQty} vs 系統 ${item.quantity})`,
        severity: 'critical',
        timestamp: item.lastCountedAt || new Date().toISOString(),
        acknowledged: false
      });
    }
  }

  return alerts;
}

// Create Express app & HTTP server
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  const httpServer = createServer(app);

  // WebSocket Server for real-time multi-user synchronization
  const wss = new WebSocketServer({ noServer: true });

  interface ConnectedClient {
    ws: WebSocket;
    operatorId: string;
    operatorName: string;
    deviceType: string;
    connectedAt: string;
  }

  const clients = new Map<WebSocket, ConnectedClient>();

  function broadcast(event: string, payload: any, senderWs?: WebSocket) {
    const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    for (const [ws] of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        // optionally don't send to sender if requested, but for state sync broadcast to all is usually best
        ws.send(message);
      }
    }
  }

  function broadcastOnlineUsers() {
    const userList = Array.from(clients.values()).map(c => ({
      operatorId: c.operatorId,
      operatorName: c.operatorName,
      deviceType: c.deviceType,
      connectedAt: c.connectedAt
    }));
    broadcast('presence:sync', { users: userList, totalCount: clients.size });
  }

  // Handle upgrade for /ws
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientInfo: ConnectedClient = {
      ws,
      operatorId: 'op-1',
      operatorName: '陳建良',
      deviceType: '平板電腦/網頁端',
      connectedAt: new Date().toISOString()
    };
    clients.set(ws, clientInfo);

    // Send initial snapshot
    const items = loadItems();
    const alerts = generateAlerts(items);
    ws.send(JSON.stringify({
      event: 'init',
      payload: {
        items,
        alerts,
        onlineCount: clients.size
      }
    }));

    broadcastOnlineUsers();

    ws.on('message', (messageRaw: string) => {
      try {
        const data = JSON.parse(messageRaw.toString());
        if (data.type === 'operator:identify') {
          clientInfo.operatorId = data.operatorId || 'op-1';
          clientInfo.operatorName = data.operatorName || '倉管人員';
          clientInfo.deviceType = data.deviceType || '未知裝置';
          broadcastOnlineUsers();
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastOnlineUsers();
    });

    ws.on('error', () => {
      clients.delete(ws);
      broadcastOnlineUsers();
    });
  });

  // REST API Routes

  // AI Chatbot with DGX GPU API (Qwen3-8B)
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, userQuery, context } = req.body || {};

      let chatMessages = messages;
      if (!chatMessages && userQuery) {
        const systemPrompt = `你是「賢欣貨架管理系統 (Hsien-Hsin WMS Pro)」的專業 AI 倉管問答專家。
當前操作人員是：${context?.operatorName || '倉管人員'}。
這是目前倉庫即時庫存與貨架數據庫：
${JSON.stringify(context?.warehouseData || {}, null, 2)}

請以親切、專業、條理清晰且繁體中文（台灣習慣用語）回答使用者的問題。
支援使用 Markdown 標題、粗體、清單以方便閱讀。
若問題與特定料件或貨架有關，請務必精準指出其貨號 (SKU)、存放貨架位置 (例如 A區-01架-2層-01位) 與當前數量。`;

        chatMessages = [
          { role: 'system', content: systemPrompt },
          ...(req.body.history || []),
          { role: 'user', content: userQuery }
        ];
      }

      if (!chatMessages || !Array.isArray(chatMessages)) {
        return res.status(400).json({ error: '請提供對話訊息內容' });
      }

      const dgxRes = await fetch(DGX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DGX_API_KEY}`,
        },
        body: JSON.stringify({
          model: DGX_MODEL,
          messages: chatMessages,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!dgxRes.ok) {
        const errText = await dgxRes.text();
        console.error('DGX API error:', dgxRes.status, errText);
        return res.status(502).json({ error: `DGX GPU API 伺服器回應異常: ${dgxRes.status}` });
      }

      const dgxData: any = await dgxRes.json();
      const reply = dgxData.choices?.[0]?.message?.content || '';

      res.json({
        success: true,
        reply,
        model: DGX_MODEL,
        provider: 'NVIDIA DGX GPU (Qwen3-8B)',
        usage: dgxData.usage,
      });
    } catch (err: any) {
      console.error('Fetch to DGX failed:', err);
      res.status(500).json({ error: `無法連線至 DGX GPU 伺服器: ${err.message}` });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: '請輸入使用者帳號與密碼' });
      }

      const users = loadUsers();
      const cleanUsername = String(username).trim().toLowerCase();
      const account = users.find(
        (a) => a.username.toLowerCase() === cleanUsername && a.passwordHash === password
      );

      if (!account) {
        return res.status(401).json({ error: '帳號或密碼錯誤，請重新確認' });
      }

      const token = `hh_auth_${account.id}_${Date.now()}`;
      res.json({
        success: true,
        user: {
          id: account.id,
          username: account.username,
          name: account.name,
          role: account.role,
          avatar: account.avatar,
          department: account.department,
          token
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth: Verify Session
  app.post('/api/auth/verify', (req, res) => {
    const { token, userId } = req.body || {};
    const users = loadUsers();
    const account = users.find((a) => a.id === userId);
    if (!account || !token) {
      return res.status(401).json({ error: '登入狀態已過期，請重新登入' });
    }
    res.json({
      success: true,
      user: {
        id: account.id,
        username: account.username,
        name: account.name,
        role: account.role,
        avatar: account.avatar,
        department: account.department,
        token
      }
    });
  });

  // Accounts Management (Admin Only)
  // 1. Get all accounts
  app.get('/api/accounts', (req, res) => {
    const users = loadUsers();
    // Return sanitized account list with masked password flag
    const accounts = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      department: u.department,
      password: u.passwordHash,
    }));
    res.json({ success: true, accounts });
  });

  // 2. Create account (Admin only)
  app.post('/api/accounts', (req, res) => {
    try {
      const { username, password, name, role, department, avatar } = req.body || {};
      if (!username || !password || !name) {
        return res.status(400).json({ error: '帳號、密碼與使用者姓名為必填項目' });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      if (!/^[a-zA-Z0-9_-]{2,20}$/.test(cleanUsername)) {
        return res.status(400).json({ error: '帳號須為 2-20 位英數字或底線' });
      }

      const users = loadUsers();
      if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
        return res.status(400).json({ error: `帳號【${cleanUsername}】已存在，請使用其他帳號名稱` });
      }

      const newAccount: UserAccount = {
        id: `usr-${cleanUsername}-${Date.now().toString(36)}`,
        username: cleanUsername,
        passwordHash: String(password).trim(),
        name: String(name).trim(),
        role: String(role || '倉管人員').trim(),
        avatar: String(avatar || '👨‍🔧').trim(),
        department: String(department || '倉儲物流部').trim(),
      };

      users.push(newAccount);
      saveUsers(users);

      broadcast('operators:sync', {
        operators: users.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
          department: u.department,
        })),
      });

      res.status(201).json({
        success: true,
        account: {
          id: newAccount.id,
          username: newAccount.username,
          name: newAccount.name,
          role: newAccount.role,
          avatar: newAccount.avatar,
          department: newAccount.department,
          password: newAccount.passwordHash,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update account (Admin only)
  app.put('/api/accounts/:id', (req, res) => {
    try {
      const users = loadUsers();
      const index = users.findIndex((u) => u.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '找不到該使用者帳號' });
      }

      const existing = users[index];
      const { name, role, department, avatar, password, username } = req.body || {};

      // Safety protection for primary admin account
      if (existing.username === 'admin') {
        if (username && username.toLowerCase() !== 'admin') {
          return res.status(400).json({ error: '不可修改系統最高管理員 admin 的帳號名稱' });
        }
      }

      const updatedAccount: UserAccount = {
        ...existing,
        name: name ? String(name).trim() : existing.name,
        role: role ? String(role).trim() : existing.role,
        department: department ? String(department).trim() : existing.department,
        avatar: avatar ? String(avatar).trim() : existing.avatar,
        passwordHash: password && String(password).trim().length > 0 ? String(password).trim() : existing.passwordHash,
      };

      users[index] = updatedAccount;
      saveUsers(users);

      broadcast('operators:sync', {
        operators: users.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
          department: u.department,
        })),
      });

      res.json({
        success: true,
        account: {
          id: updatedAccount.id,
          username: updatedAccount.username,
          name: updatedAccount.name,
          role: updatedAccount.role,
          avatar: updatedAccount.avatar,
          department: updatedAccount.department,
          password: updatedAccount.passwordHash,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Delete account (Admin only)
  app.delete('/api/accounts/:id', (req, res) => {
    try {
      const users = loadUsers();
      const target = users.find((u) => u.id === req.params.id);
      if (!target) {
        return res.status(404).json({ error: '找不到該帳號' });
      }

      // Safeguard: cannot delete admin
      if (target.username.toLowerCase() === 'admin' || target.id === 'usr-admin') {
        return res.status(403).json({ error: '系統最高管理員 admin 為系統核心帳號，禁止刪除！' });
      }

      const filtered = users.filter((u) => u.id !== req.params.id);
      saveUsers(filtered);

      broadcast('operators:sync', {
        operators: filtered.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
          department: u.department,
        })),
      });

      res.json({ success: true, deletedId: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Get all items
  app.get('/api/inventory', (req, res) => {
    const items = loadItems();
    res.json({ success: true, items });
  });

  // 2. Create item
  app.post('/api/inventory', (req, res) => {
    try {
      const items = loadItems();
      const body = req.body;

      if (!body.sku || !body.name || !body.shelfLocation) {
        return res.status(400).json({ error: '貨號、貨品名稱與貨架位置為必填欄位' });
      }

      // Check sku duplicate
      const exists = items.some(i => i.sku.trim().toLowerCase() === body.sku.trim().toLowerCase());
      if (exists) {
        return res.status(400).json({ error: `貨號【${body.sku}】已存在，請使用不同貨號` });
      }

      const now = new Date().toISOString();
      const qty = Number(body.quantity) || 0;
      const minSafe = Number(body.minSafeQuantity) || 10;

      let status: InventoryItem['status'] = 'normal';
      if (qty === 0) status = 'out_of_stock';
      else if (qty <= minSafe) status = 'low_stock';

      const newItem: InventoryItem = {
        id: `hh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sku: body.sku.trim(),
        name: body.name.trim(),
        finishedProductName: body.finishedProductName?.trim() || '通用備料',
        quantity: qty,
        unit: body.unit?.trim() || '件',
        shelfLocation: body.shelfLocation.trim(),
        zone: body.zone || 'A區',
        shelfRack: body.shelfRack || '01',
        shelfTier: body.shelfTier || '1層',
        shelfBin: body.shelfBin || '01',
        photo: body.photo || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
        notes: body.notes?.trim() || '',
        minSafeQuantity: minSafe,
        maxCapacity: Number(body.maxCapacity) || 50,
        lastCountedAt: null,
        lastCountedBy: null,
        lastCountedQty: null,
        lastCountDiscrepancy: null,
        status,
        createdAt: now,
        updatedAt: now,
        updatedBy: body.operatorName || '系統管理員',
        history: [
          {
            id: `hist-${Date.now()}`,
            timestamp: now,
            operator: body.operatorName || '系統管理員',
            type: 'create',
            newQty: qty,
            note: '新增貨品初始入庫'
          }
        ]
      };

      items.unshift(newItem);
      saveItems(items);

      // Broadcast real-time event to all connected tablets & browsers
      broadcast('item:created', { item: newItem, operator: body.operatorName || '倉管人員' });
      broadcast('alerts:sync', { alerts: generateAlerts(items) });

      res.status(201).json({ success: true, item: newItem });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update item
  app.put('/api/inventory/:id', (req, res) => {
    try {
      const items = loadItems();
      const index = items.findIndex(i => i.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '找不到該貨品資料' });
      }

      const prev = items[index];
      const body = req.body;
      const now = new Date().toISOString();

      const newQty = body.quantity !== undefined ? Number(body.quantity) : prev.quantity;
      const minSafe = body.minSafeQuantity !== undefined ? Number(body.minSafeQuantity) : prev.minSafeQuantity;

      let status: InventoryItem['status'] = prev.status;
      if (newQty === 0) status = 'out_of_stock';
      else if (newQty <= minSafe) status = 'low_stock';
      else if (status === 'out_of_stock' || status === 'low_stock') status = 'normal';

      const historyEntry: InventoryHistory = {
        id: `hist-${Date.now()}`,
        timestamp: now,
        operator: body.operatorName || '倉管專員',
        type: 'edit',
        previousQty: prev.quantity,
        newQty: newQty,
        note: body.editNote || `資料由 ${body.operatorName || '操作人員'} 編輯更新`
      };

      const updatedItem: InventoryItem = {
        ...prev,
        sku: body.sku?.trim() ?? prev.sku,
        name: body.name?.trim() ?? prev.name,
        finishedProductName: body.finishedProductName?.trim() ?? prev.finishedProductName,
        quantity: newQty,
        unit: body.unit?.trim() ?? prev.unit,
        shelfLocation: body.shelfLocation?.trim() ?? prev.shelfLocation,
        zone: body.zone ?? prev.zone,
        shelfRack: body.shelfRack ?? prev.shelfRack,
        shelfTier: body.shelfTier ?? prev.shelfTier,
        shelfBin: body.shelfBin ?? prev.shelfBin,
        photo: body.photo !== undefined ? body.photo : prev.photo,
        notes: body.notes?.trim() ?? prev.notes,
        minSafeQuantity: minSafe,
        maxCapacity: Number(body.maxCapacity) || prev.maxCapacity,
        status,
        updatedAt: now,
        updatedBy: body.operatorName || '操作人員',
        history: [historyEntry, ...(prev.history || [])].slice(0, 50)
      };

      items[index] = updatedItem;
      saveItems(items);

      broadcast('item:updated', { item: updatedItem, operator: body.operatorName || '操作人員' });
      broadcast('alerts:sync', { alerts: generateAlerts(items) });

      res.json({ success: true, item: updatedItem });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Quick stock adjust (入庫 / 出庫)
  app.post('/api/inventory/:id/stock-adjust', (req, res) => {
    try {
      const items = loadItems();
      const index = items.findIndex(i => i.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '找不到該貨品' });
      }

      const item = items[index];
      const { delta, operatorName, reason, type } = req.body;
      const numDelta = Number(delta);

      if (isNaN(numDelta) || numDelta === 0) {
        return res.status(400).json({ error: '異動數量必須為非零數值' });
      }

      const previousQty = item.quantity;
      const newQty = Math.max(0, previousQty + numDelta);
      const now = new Date().toISOString();

      let status = item.status;
      if (newQty === 0) status = 'out_of_stock';
      else if (newQty <= item.minSafeQuantity) status = 'low_stock';
      else status = 'normal';

      const historyEntry: InventoryHistory = {
        id: `hist-${Date.now()}`,
        timestamp: now,
        operator: operatorName || '操作人員',
        type: numDelta > 0 ? 'stock_in' : 'stock_out',
        qtyChange: numDelta,
        previousQty,
        newQty,
        note: reason || (numDelta > 0 ? `入庫 +${numDelta} ${item.unit}` : `出庫 ${numDelta} ${item.unit}`)
      };

      item.quantity = newQty;
      item.status = status;
      item.updatedAt = now;
      item.updatedBy = operatorName || '操作人員';
      item.history = [historyEntry, ...(item.history || [])].slice(0, 50);

      items[index] = item;
      saveItems(items);

      broadcast('item:updated', {
        item,
        operator: operatorName || '操作人員',
        action: numDelta > 0 ? '入庫' : '出庫',
        delta: numDelta
      });
      broadcast('alerts:sync', { alerts: generateAlerts(items) });

      res.json({ success: true, item });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Stock Audit / Cycle Count (盤點實點與差異記錄)
  app.post('/api/inventory/:id/audit-count', (req, res) => {
    try {
      const items = loadItems();
      const index = items.findIndex(i => i.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '找不到該貨品' });
      }

      const item = items[index];
      const { countedQty, operatorName, note, adjustSystemQty } = req.body;
      const physicalQty = Number(countedQty);

      if (isNaN(physicalQty) || physicalQty < 0) {
        return res.status(400).json({ error: '盤點數量必須為大於或等於0之數字' });
      }

      const previousQty = item.quantity;
      const discrepancy = physicalQty - previousQty;
      const now = new Date().toISOString();

      // If user chooses to adjust system qty immediately to match physical count
      const finalQty = adjustSystemQty ? physicalQty : previousQty;

      let status = item.status;
      if (discrepancy !== 0 && !adjustSystemQty) {
        status = 'discrepancy';
      } else if (finalQty === 0) {
        status = 'out_of_stock';
      } else if (finalQty <= item.minSafeQuantity) {
        status = 'low_stock';
      } else {
        status = 'normal';
      }

      const historyEntry: InventoryHistory = {
        id: `hist-${Date.now()}`,
        timestamp: now,
        operator: operatorName || '盤點人員',
        type: 'audit_count',
        previousQty,
        newQty: finalQty,
        note: `實地盤點：實點 ${physicalQty} ${item.unit} (差異 ${discrepancy > 0 ? '+' : ''}${discrepancy})。${adjustSystemQty ? '已同步修正系統庫存。' : '保留差異待查。'} ${note || ''}`
      };

      item.quantity = finalQty;
      item.lastCountedAt = now;
      item.lastCountedBy = operatorName || '盤點人員';
      item.lastCountedQty = physicalQty;
      item.lastCountDiscrepancy = discrepancy;
      item.status = status;
      item.updatedAt = now;
      item.updatedBy = operatorName || '盤點人員';
      item.history = [historyEntry, ...(item.history || [])].slice(0, 50);

      items[index] = item;
      saveItems(items);

      broadcast('item:counted', {
        item,
        operator: operatorName || '盤點人員',
        discrepancy,
        physicalQty
      });
      broadcast('alerts:sync', { alerts: generateAlerts(items) });

      res.json({ success: true, item, discrepancy });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Delete item
  app.delete('/api/inventory/:id', (req, res) => {
    try {
      const items = loadItems();
      const index = items.findIndex(i => i.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: '找不到該貨品' });
      }

      const [deleted] = items.splice(index, 1);
      saveItems(items);

      broadcast('item:deleted', { id: deleted.id, name: deleted.name, sku: deleted.sku });
      broadcast('alerts:sync', { alerts: generateAlerts(items) });

      res.json({ success: true, deletedId: deleted.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Get alerts
  app.get('/api/alerts', (req, res) => {
    const items = loadItems();
    res.json({ success: true, alerts: generateAlerts(items) });
  });

  // 8. Get system operators
  app.get('/api/operators', (req, res) => {
    const users = loadUsers();
    const ops = users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      department: u.department,
    }));
    res.json({ success: true, operators: ops });
  });

  // 9. Reset seed data if needed
  app.post('/api/reset-seed', (req, res) => {
    saveItems(SEED_ITEMS);
    broadcast('init', {
      items: SEED_ITEMS,
      alerts: generateAlerts(SEED_ITEMS),
      onlineCount: clients.size
    });
    res.json({ success: true, message: '已重置為賢欣工廠預設示範貨品資料' });
  });

  // Mount Vite middleware in development or serve static in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[賢欣貨架管理系統] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
