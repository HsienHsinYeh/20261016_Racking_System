import SEED_ITEMS_DATA from '../data/inventory.json';
import USER_ACCOUNTS_DATA from '../data/users.json';
import DEFAULT_SHELVES_DATA from '../data/shelves.json';
import { InventoryItem, InventoryHistory, SystemAlert } from './types/inventory';

export interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
  INVENTORY_KV?: KVNamespace;
}

const SEED_ITEMS = SEED_ITEMS_DATA as InventoryItem[];
const USER_ACCOUNTS = USER_ACCOUNTS_DATA as any[];
const DEFAULT_SHELVES = DEFAULT_SHELVES_DATA as any[];

const DGX_API_URL = 'https://dgx-api.ovantech.com.tw/v1/chat/completions';
const DGX_API_KEY = 'dgx_Q4txLJEuu5qqZDmjT5EdYE9jVmDxQFvDi3fgBCxTSto';
const DGX_MODEL = 'qwen3-8b';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

async function getItems(env: Env): Promise<InventoryItem[]> {
  if (env.INVENTORY_KV) {
    try {
      const raw = await env.INVENTORY_KV.get('inventory_items');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Error reading items from KV:', err);
    }
  }
  return [...SEED_ITEMS];
}

async function saveItems(env: Env, items: InventoryItem[]): Promise<void> {
  if (env.INVENTORY_KV) {
    try {
      await env.INVENTORY_KV.put('inventory_items', JSON.stringify(items));
    } catch (err) {
      console.warn('Error saving items to KV:', err);
    }
  }
}

function normalizeUserRole(role: string, username: string): string {
  if (username?.toLowerCase() === 'admin') return '系統管理員';
  if (!role) return '一盤層級';
  if (role === '系統管理員' || role.includes('最高主管') || role.includes('系統主管')) return '系統管理員';
  if (role === '資料管理層級' || role.includes('課長') || role.includes('組長') || role.includes('專員') || role.includes('倉管員')) return '資料管理層級';
  if (role === '一盤層級') return '一盤層級';
  return '一盤層級';
}

async function getUsers(env: Env): Promise<any[]> {
  let list = USER_ACCOUNTS;
  if (env.INVENTORY_KV) {
    try {
      const raw = await env.INVENTORY_KV.get('user_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch (err) {
      console.warn('Error reading users from KV:', err);
    }
  }
  return list.map((u: any) => ({
    ...u,
    role: normalizeUserRole(u.role, u.username),
    name: u.username?.toLowerCase() === 'admin' && (u.name === '系統管理員 (主管)' || !u.name) ? '系統管理員' : u.name
  }));
}

async function saveUsers(env: Env, users: any[]): Promise<void> {
  if (env.INVENTORY_KV) {
    try {
      await env.INVENTORY_KV.put('user_accounts', JSON.stringify(users));
    } catch (err) {
      console.warn('Error saving users to KV:', err);
    }
  }
}

async function getShelves(env: Env): Promise<any[]> {
  if (env.INVENTORY_KV) {
    try {
      const raw = await env.INVENTORY_KV.get('shelf_configs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Error reading shelves from KV:', err);
    }
  }
  return [...DEFAULT_SHELVES];
}

async function saveShelves(env: Env, shelves: any[]): Promise<void> {
  if (env.INVENTORY_KV) {
    try {
      await env.INVENTORY_KV.put('shelf_configs', JSON.stringify(shelves));
    } catch (err) {
      console.warn('Error saving shelves to KV:', err);
    }
  }
}

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
        acknowledged: false,
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
        acknowledged: false,
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
        acknowledged: false,
      });
    }
  }

  return alerts;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // WebSocket /ws
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const webSocketPair = new (globalThis as any).WebSocketPair();
      const [client, server] = Object.values(webSocketPair) as [WebSocket, WebSocket];

      (server as any).accept();

      const items = await getItems(env);
      const alerts = generateAlerts(items);
      const users = await getUsers(env);
      const operators = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        department: u.department,
      }));

      // Initial state
      server.send(
        JSON.stringify({
          event: 'init',
          payload: {
            items,
            alerts,
            onlineCount: 1,
          },
        })
      );

      server.send(
        JSON.stringify({
          event: 'operators:sync',
          payload: { operators },
        })
      );

      server.addEventListener('message', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            server.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch {}
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname;
      const method = request.method;

      try {
        // AI Chatbot with DGX GPU API (Qwen3-8B)
        if (path === '/api/chat' && method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          const { messages, userQuery, context } = body;

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
              ...(body.history || []),
              { role: 'user', content: userQuery }
            ];
          }

          if (!chatMessages || !Array.isArray(chatMessages)) {
            return errorResponse('請提供對話訊息內容', 400);
          }

          try {
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
              return errorResponse(`DGX GPU API 伺服器回應異常: ${dgxRes.status}`, 502);
            }

            const dgxData: any = await dgxRes.json();
            const reply = dgxData.choices?.[0]?.message?.content || '';

            return jsonResponse({
              success: true,
              reply,
              model: DGX_MODEL,
              provider: 'NVIDIA DGX GPU (Qwen3-8B)',
              usage: dgxData.usage,
            });
          } catch (apiErr: any) {
            console.error('Fetch to DGX failed:', apiErr);
            return errorResponse(`無法連線至 DGX GPU 伺服器: ${apiErr.message}`, 500);
          }
        }

        // Auth: Login
        if (path === '/api/auth/login' && method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          const { username, password } = body;
          if (!username || !password) {
            return errorResponse('請輸入使用者帳號與密碼', 400);
          }

          const users = await getUsers(env);
          const cleanUsername = String(username).trim().toLowerCase();
          const account = users.find(
            (a: any) => a.username.toLowerCase() === cleanUsername && a.passwordHash === password
          );

          if (!account) {
            return errorResponse('帳號或密碼錯誤，請重新確認', 401);
          }

          const token = `hh_auth_${account.id}_${Date.now()}`;
          return jsonResponse({
            success: true,
            user: {
              id: account.id,
              username: account.username,
              name: account.name,
              role: account.role,
              avatar: account.avatar,
              department: account.department,
              token,
            },
          });
        }

        // Auth: Verify
        if (path === '/api/auth/verify' && method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          const { token, userId } = body;
          const users = await getUsers(env);
          const account = users.find((a: any) => a.id === userId);
          if (!account || !token) {
            return errorResponse('登入狀態已過期，請重新登入', 401);
          }
          return jsonResponse({
            success: true,
            user: {
              id: account.id,
              username: account.username,
              name: account.name,
              role: account.role,
              avatar: account.avatar,
              department: account.department,
              token,
            },
          });
        }

        // Accounts list
        if (path === '/api/accounts' && method === 'GET') {
          const users = await getUsers(env);
          const accounts = users.map((u: any) => ({
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            avatar: u.avatar,
            department: u.department,
            password: u.passwordHash,
          }));
          return jsonResponse({ success: true, accounts });
        }

        // Create account
        if (path === '/api/accounts' && method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          const { username, password, name, role, department, avatar } = body;
          if (!username || !password || !name) {
            return errorResponse('帳號、密碼與使用者姓名為必填項目', 400);
          }

          const cleanUsername = String(username).trim().toLowerCase();
          if (!/^[a-zA-Z0-9_-]{2,20}$/.test(cleanUsername)) {
            return errorResponse('帳號須為 2-20 位英數字或底線', 400);
          }

          const users = await getUsers(env);
          if (users.some((u: any) => u.username.toLowerCase() === cleanUsername)) {
            return errorResponse(`帳號【${cleanUsername}】已存在，請使用其他帳號名稱`, 400);
          }

          const newAccount = {
            id: `usr-${cleanUsername}-${Date.now().toString(36)}`,
            username: cleanUsername,
            passwordHash: String(password).trim(),
            name: String(name).trim(),
            role: normalizeUserRole(role, cleanUsername),
            avatar: String(avatar || '👨‍🔧').trim(),
            department: String(department || '倉儲物流部').trim(),
          };

          users.push(newAccount);
          await saveUsers(env, users);

          return jsonResponse(
            {
              success: true,
              account: {
                ...newAccount,
                password: newAccount.passwordHash,
              },
            },
            201
          );
        }

        // Update account
        const accountUpdateMatch = path.match(/^\/api\/accounts\/([^/]+)$/);
        if (accountUpdateMatch && method === 'PUT') {
          const accountId = accountUpdateMatch[1];
          const users = await getUsers(env);
          const index = users.findIndex((u: any) => u.id === accountId);
          if (index === -1) {
            return errorResponse('找不到該使用者帳號', 404);
          }

          const existing = users[index];
          const body: any = await request.json().catch(() => ({}));
          const { name, role, department, avatar, password, username } = body;

          if (existing.username.toLowerCase() === 'admin' && username && username.toLowerCase() !== 'admin') {
            return errorResponse('不可修改系統最高管理員 admin 的帳號名稱', 400);
          }

          const targetRole = existing.username.toLowerCase() === 'admin'
            ? '系統管理員'
            : (role ? normalizeUserRole(role, existing.username) : existing.role);

          const updatedAccount = {
            ...existing,
            name: name ? String(name).trim() : existing.name,
            role: targetRole,
            department: department ? String(department).trim() : existing.department,
            avatar: avatar ? String(avatar).trim() : existing.avatar,
            passwordHash:
              password && String(password).trim().length > 0
                ? String(password).trim()
                : existing.passwordHash,
          };

          users[index] = updatedAccount;
          await saveUsers(env, users);

          return jsonResponse({
            success: true,
            account: {
              ...updatedAccount,
              password: updatedAccount.passwordHash,
            },
          });
        }

        // Delete account
        if (accountUpdateMatch && method === 'DELETE') {
          const accountId = accountUpdateMatch[1];
          const users = await getUsers(env);
          const target = users.find((u: any) => u.id === accountId);
          if (!target) {
            return errorResponse('找不到該帳號', 404);
          }

          if (target.username.toLowerCase() === 'admin' || target.id === 'usr-admin') {
            return errorResponse('系統最高管理員 admin 為系統核心帳號，禁止刪除！', 403);
          }

          const filtered = users.filter((u: any) => u.id !== accountId);
          await saveUsers(env, filtered);

          return jsonResponse({ success: true, deletedId: accountId });
        }

        // Get inventory
        if (path === '/api/inventory' && method === 'GET') {
          const items = await getItems(env);
          return jsonResponse({ success: true, items });
        }

        // Create item
        if (path === '/api/inventory' && method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          if (!body.sku || !body.name || !body.shelfLocation) {
            return errorResponse('貨號、貨品名稱與貨架位置為必填欄位', 400);
          }

          const items = await getItems(env);
          const exists = items.some(
            (i) => i.sku.trim().toLowerCase() === body.sku.trim().toLowerCase()
          );
          if (exists) {
            return errorResponse(`貨號【${body.sku}】已存在，請使用不同貨號`, 400);
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
            photo:
              body.photo ||
              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
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
                note: '新增貨品初始入庫',
              },
            ],
          };

          items.unshift(newItem);
          await saveItems(env, items);

          return jsonResponse({ success: true, item: newItem }, 201);
        }

        // Quick stock adjust
        const stockAdjustMatch = path.match(/^\/api\/inventory\/([^/]+)\/stock-adjust$/);
        if (stockAdjustMatch && method === 'POST') {
          const itemId = stockAdjustMatch[1];
          const items = await getItems(env);
          const index = items.findIndex((i) => i.id === itemId);
          if (index === -1) {
            return errorResponse('找不到該貨品', 404);
          }

          const item = items[index];
          const body: any = await request.json().catch(() => ({}));
          const { delta, operatorName, reason } = body;
          const numDelta = Number(delta);

          if (isNaN(numDelta) || numDelta === 0) {
            return errorResponse('異動數量必須為非零數值', 400);
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
            note: reason || (numDelta > 0 ? `入庫 +${numDelta} ${item.unit}` : `出庫 ${numDelta} ${item.unit}`),
          };

          item.quantity = newQty;
          item.status = status;
          item.updatedAt = now;
          item.updatedBy = operatorName || '操作人員';
          item.history = [historyEntry, ...(item.history || [])].slice(0, 50);

          items[index] = item;
          await saveItems(env, items);

          return jsonResponse({ success: true, item });
        }

        // Stock audit
        const auditCountMatch = path.match(/^\/api\/inventory\/([^/]+)\/audit-count$/);
        if (auditCountMatch && method === 'POST') {
          const itemId = auditCountMatch[1];
          const items = await getItems(env);
          const index = items.findIndex((i) => i.id === itemId);
          if (index === -1) {
            return errorResponse('找不到該貨品', 404);
          }

          const item = items[index];
          const body: any = await request.json().catch(() => ({}));
          const { countedQty, operatorName, note, adjustSystemQty } = body;
          const physicalQty = Number(countedQty);

          if (isNaN(physicalQty) || physicalQty < 0) {
            return errorResponse('盤點數量必須為大於或等於0之數字', 400);
          }

          const previousQty = item.quantity;
          const discrepancy = physicalQty - previousQty;
          const now = new Date().toISOString();
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
            note: `實地盤點：實點 ${physicalQty} ${item.unit} (差異 ${discrepancy > 0 ? '+' : ''}${discrepancy})。${adjustSystemQty ? '已同步修正系統庫存。' : '保留差異待查。'} ${note || ''}`,
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
          await saveItems(env, items);

          return jsonResponse({ success: true, item, discrepancy });
        }

        // Update item by ID
        const itemMatch = path.match(/^\/api\/inventory\/([^/]+)$/);
        if (itemMatch && method === 'PUT') {
          const itemId = itemMatch[1];
          const items = await getItems(env);
          const index = items.findIndex((i) => i.id === itemId);
          if (index === -1) {
            return errorResponse('找不到該貨品資料', 404);
          }

          const prev = items[index];
          const body: any = await request.json().catch(() => ({}));
          const now = new Date().toISOString();

          const newQty = body.quantity !== undefined ? Number(body.quantity) : prev.quantity;
          const minSafe =
            body.minSafeQuantity !== undefined ? Number(body.minSafeQuantity) : prev.minSafeQuantity;

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
            note: body.editNote || `資料由 ${body.operatorName || '操作人員'} 編輯更新`,
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
            history: [historyEntry, ...(prev.history || [])].slice(0, 50),
          };

          items[index] = updatedItem;
          await saveItems(env, items);

          return jsonResponse({ success: true, item: updatedItem });
        }

        // Delete item
        if (itemMatch && method === 'DELETE') {
          const itemId = itemMatch[1];
          const items = await getItems(env);
          const index = items.findIndex((i) => i.id === itemId);
          if (index === -1) {
            return errorResponse('找不到該貨品', 404);
          }

          items.splice(index, 1);
          await saveItems(env, items);

          return jsonResponse({ success: true, deletedId: itemId });
        }

        // Alerts list
        if (path === '/api/alerts' && method === 'GET') {
          const items = await getItems(env);
          return jsonResponse({ success: true, alerts: generateAlerts(items) });
        }

        // Operators list
        if (path === '/api/operators' && method === 'GET') {
          const users = await getUsers(env);
          const ops = users.map((u: any) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            avatar: u.avatar,
            department: u.department,
          }));
          return jsonResponse({ success: true, operators: ops });
        }

        // Shelf Configurations
        if (path === '/api/shelves' && method === 'GET') {
          const shelves = await getShelves(env);
          return jsonResponse({ success: true, shelves });
        }

        if (path === '/api/shelves' && method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          const { shelves } = body;
          if (!shelves || !Array.isArray(shelves)) {
            return errorResponse('無效的貨架設定資料格式', 400);
          }
          await saveShelves(env, shelves);
          return jsonResponse({ success: true, shelves });
        }

        // Reset seed
        if (path === '/api/reset-seed' && method === 'POST') {
          await saveItems(env, [...SEED_ITEMS]);
          return jsonResponse({ success: true, message: '已重置為賢欣工廠預設示範貨品資料' });
        }

        return errorResponse('API endpoint not found', 404);
      } catch (err: any) {
        return errorResponse(err.message || 'Internal server error', 500);
      }
    }

    // Static Assets fallback (serve dist files / index.html SPA)
    return env.ASSETS.fetch(request);
  },
};
