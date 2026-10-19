import { InventoryItem, SystemAlert, Operator, ConnectedUser, AuthUser, ManagedAccount, ShelfZoneConfig } from '../types/inventory';

type WebSocketEventHandler = {
  onInit?: (data: { items: InventoryItem[]; alerts: SystemAlert[]; onlineCount: number }) => void;
  onItemCreated?: (data: { item: InventoryItem; operator: string }) => void;
  onItemUpdated?: (data: { item: InventoryItem; operator: string; action?: string; delta?: number }) => void;
  onItemCounted?: (data: { item: InventoryItem; operator: string; discrepancy: number; physicalQty: number }) => void;
  onItemDeleted?: (data: { id: string; name: string; sku: string }) => void;
  onAlertsSync?: (data: { alerts: SystemAlert[] }) => void;
  onPresenceSync?: (data: { users: ConnectedUser[]; totalCount: number }) => void;
  onOperatorsSync?: (data: { operators: Operator[] }) => void;
  onShelvesSync?: (data: { shelves: ShelfZoneConfig[] }) => void;
  onStatusChange?: (connected: boolean) => void;
};

class RealtimeInventoryClient {
  private ws: WebSocket | null = null;
  private handlers: WebSocketEventHandler = {};
  private reconnectTimer: any = null;
  private currentOperator: Operator | null = null;
  private isConnected: boolean = false;

  constructor() {
    //
  }

  public registerHandlers(handlers: WebSocketEventHandler) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public setOperator(operator: Operator) {
    this.currentOperator = operator;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'operator:identify',
        operatorId: operator.id,
        operatorName: operator.name,
        deviceType: this.detectDevice()
      });
    }
  }

  private detectDevice(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return '平板電腦 (Tablet)';
    if (/mobile|iphone|android/i.test(ua)) return '手持PDA/行動裝置';
    return '工作站網頁端';
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.handlers.onStatusChange?.(true);

        if (this.currentOperator) {
          this.setOperator(this.currentOperator);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { event: evt, payload } = message;

          switch (evt) {
            case 'init':
              this.handlers.onInit?.(payload);
              break;
            case 'item:created':
              this.handlers.onItemCreated?.(payload);
              break;
            case 'item:updated':
              this.handlers.onItemUpdated?.(payload);
              break;
            case 'item:counted':
              this.handlers.onItemCounted?.(payload);
              break;
            case 'item:deleted':
              this.handlers.onItemDeleted?.(payload);
              break;
            case 'alerts:sync':
              this.handlers.onAlertsSync?.(payload);
              break;
            case 'presence:sync':
              this.handlers.onPresenceSync?.(payload);
              break;
            case 'operators:sync':
              this.handlers.onOperatorsSync?.(payload);
              break;
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.handlers.onStatusChange?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.handlers.onStatusChange?.(false);
        this.ws?.close();
      };
    } catch (err) {
      console.error('WebSocket connection attempt failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // REST API Methods
  public async fetchInventory(): Promise<InventoryItem[]> {
    const res = await fetch('/api/inventory');
    if (!res.ok) throw new Error('無法讀取庫存資料');
    const data = await res.json();
    return data.items || [];
  }

  public async createItem(item: Partial<InventoryItem>, operatorName: string): Promise<InventoryItem> {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, operatorName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '新增失敗');
    return data.item;
  }

  public async updateItem(id: string, updates: Partial<InventoryItem>, operatorName: string, editNote?: string): Promise<InventoryItem> {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, operatorName, editNote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '更新失敗');
    return data.item;
  }

  public async adjustStock(id: string, delta: number, operatorName: string, reason?: string): Promise<InventoryItem> {
    const res = await fetch(`/api/inventory/${id}/stock-adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, operatorName, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '庫存調整失敗');
    return data.item;
  }

  public async auditCount(id: string, countedQty: number, operatorName: string, adjustSystemQty: boolean, note?: string): Promise<{ item: InventoryItem; discrepancy: number }> {
    const res = await fetch(`/api/inventory/${id}/audit-count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countedQty, operatorName, adjustSystemQty, note })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '盤點登載失敗');
    return { item: data.item, discrepancy: data.discrepancy };
  }

  public async deleteItem(id: string): Promise<void> {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '刪除失敗');
  }

  public async fetchAlerts(): Promise<SystemAlert[]> {
    const res = await fetch('/api/alerts');
    if (!res.ok) throw new Error('無法讀取告警');
    const data = await res.json();
    return data.alerts || [];
  }

  public async fetchOperators(): Promise<Operator[]> {
    const res = await fetch('/api/operators');
    if (!res.ok) throw new Error('無法讀取操作員列表');
    const data = await res.json();
    return data.operators || [];
  }

  public async login(username: string, password: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登入失敗');
    return data.user;
  }

  public async verifyAuth(token: string, userId: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '驗證失敗');
    return data.user;
  }

  // Account Management
  public async fetchAccounts(): Promise<ManagedAccount[]> {
    const res = await fetch('/api/accounts');
    if (!res.ok) throw new Error('無法讀取帳號列表');
    const data = await res.json();
    return data.accounts || [];
  }

  public async createAccount(accountData: Partial<ManagedAccount>): Promise<ManagedAccount> {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '建立帳號失敗');
    return data.account;
  }

  public async updateAccount(id: string, updates: Partial<ManagedAccount>): Promise<ManagedAccount> {
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '更新帳號失敗');
    return data.account;
  }

  public async deleteAccount(id: string): Promise<void> {
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '刪除帳號失敗');
  }

  // Shelf Management
  public async fetchShelves(): Promise<ShelfZoneConfig[]> {
    const res = await fetch('/api/shelves');
    if (!res.ok) throw new Error('無法讀取貨架設定');
    const data = await res.json();
    return data.shelves || [];
  }

  public async saveShelves(shelves: ShelfZoneConfig[]): Promise<ShelfZoneConfig[]> {
    const res = await fetch('/api/shelves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shelves })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '儲存貨架設定失敗');
    return data.shelves;
  }
}

export const realtimeClient = new RealtimeInventoryClient();
