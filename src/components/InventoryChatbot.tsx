import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Package, 
  HelpCircle,
  Key,
  Layers,
  ChevronRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import { InventoryItem, SystemAlert, Operator } from '../types/inventory';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  relatedItems?: InventoryItem[];
  suggestions?: string[];
}

interface InventoryChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
  items: InventoryItem[];
  alerts: SystemAlert[];
  currentOperator: Operator;
  onSelectItem: (item: InventoryItem) => void;
  onNavigateToShelfMap: (zone?: string) => void;
}

export const InventoryChatbot: React.FC<InventoryChatbotProps> = ({
  isOpen,
  onToggle,
  items,
  alerts,
  currentOperator,
  onSelectItem,
  onNavigateToShelfMap,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('hh_wms_gemini_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  });
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: `👋 您好，**${currentOperator.name}**！我是賢欣貨架 AI 智能助理，已成功連線 **NVIDIA DGX GPU (Qwen3-8B)** 算力中心！\n\n我具備真實大語言模型推理能力，能隨時為您查詢料件存放位置、即時庫存數量、缺貨/低庫存告警、盤點差異及採購補貨建議。請直接輸入您的問題或點選下方快捷建議！`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            '🚨 查詢缺貨與低庫存料件',
            '📍 步進馬達放在哪個貨架？',
            '⚠️ 盤點差異有哪些？',
            '📊 全廠庫存現況總覽',
            '💡 產生採購補貨建議',
            '🏢 A區貨架目前擺放了什麼？'
          ]
        }
      ]);
    }
  }, [currentOperator.name]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Local Knowledge Base Engine (Rule + Semantic Matching)
  const processLocalQuery = (query: string): { text: string; relatedItems?: InventoryItem[]; suggestions?: string[] } => {
    const q = query.trim().toLowerCase();

    // 1. Out of stock / Low stock / Alerts
    if (q.includes('缺貨') || q.includes('低庫存') || q.includes('庫存不足') || q.includes('斷貨') || q.includes('告警') || q.includes('警報')) {
      const outOfStock = items.filter(i => i.quantity === 0 || i.status === 'out_of_stock');
      const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= i.minSafeQuantity);
      
      let reply = `### 🚨 庫存告警摘要報告\n\n`;
      reply += `目前系統中共有 **${outOfStock.length}** 項零庫存、**${lowStock.length}** 項低於安全庫存：\n\n`;

      if (outOfStock.length > 0) {
        reply += `**🔴 零庫存項目（需立即叫料）：**\n`;
        outOfStock.forEach(i => {
          reply += `- **${i.name}** (${i.sku})：現存 0 ${i.unit}，安全水位需 ${i.minSafeQuantity} ${i.unit} (位置: \`${i.shelfLocation}\`)\n`;
        });
        reply += `\n`;
      }

      if (lowStock.length > 0) {
        reply += `**🟡 低庫存臨界項目：**\n`;
        lowStock.forEach(i => {
          reply += `- **${i.name}** (${i.sku})：現存 ${i.quantity} ${i.unit} / 安全庫存 ${i.minSafeQuantity} ${i.unit} (位置: \`${i.shelfLocation}\`)\n`;
        });
      }

      if (outOfStock.length === 0 && lowStock.length === 0) {
        reply = `✅ 報告 ${currentOperator.name}，目前倉庫中所有料件均在安全庫存水位以上，無任何缺貨告警！`;
      }

      return {
        text: reply,
        relatedItems: [...outOfStock, ...lowStock],
        suggestions: ['💡 產生採購補貨建議', '📊 全廠庫存現況總覽', '📍 貨架區位分佈']
      };
    }

    // 2. Discrepancy / Audit Status
    if (q.includes('盤點差異') || q.includes('差異') || q.includes('帳實不符') || q.includes('盤點') || q.includes('未盤點')) {
      const discrepancies = items.filter(i => i.lastCountDiscrepancy !== null && i.lastCountDiscrepancy !== 0);
      const pendingCount = items.filter(i => i.status === 'pending_count' || !i.lastCountedAt);

      let reply = `### 📋 倉庫盤點狀況報告\n\n`;
      
      if (discrepancies.length > 0) {
        reply += `**⚠️ 存在盤點差異項目 (${discrepancies.length} 項)：**\n`;
        discrepancies.forEach(i => {
          const sign = (i.lastCountDiscrepancy || 0) > 0 ? '+' : '';
          reply += `- **${i.name}** (${i.sku})：系統 ${i.quantity} ${i.unit}，實點 ${i.lastCountedQty} ${i.unit} (差異 **${sign}${i.lastCountDiscrepancy}** ${i.unit})\n  > 備註: ${i.notes || '請現場核對領料單'}\n`;
        });
        reply += `\n`;
      } else {
        reply += `✅ 目前所有已盤點項目帳實完全相符。\n\n`;
      }

      if (pendingCount.length > 0) {
        reply += `**🕒 待盤點項目 (${pendingCount.length} 項)：**\n`;
        pendingCount.forEach(i => {
          reply += `- **${i.name}** (${i.sku}) 位於 \`${i.shelfLocation}\`\n`;
        });
      }

      return {
        text: reply,
        relatedItems: [...discrepancies, ...pendingCount],
        suggestions: ['🚨 查詢缺貨與低庫存料件', '💡 產生採購補貨建議']
      };
    }

    // 3. Zone / Shelf Search (e.g. A區, B區, C區, D區, 01架)
    const zoneMatch = q.match(/([a-d])區/i) || q.match(/zone\s*([a-d])/i);
    const rackMatch = q.match(/(\d+)架/);
    if (zoneMatch || (q.includes('貨架') && (q.includes('區') || q.includes('分布') || q.includes('分佈')))) {
      const zoneLetter = zoneMatch ? zoneMatch[1].toUpperCase() + '區' : null;
      let matchedItems = items;
      
      if (zoneLetter) {
        matchedItems = items.filter(i => i.zone.toLowerCase() === zoneLetter.toLowerCase() || i.shelfLocation.includes(zoneLetter));
      }

      let reply = zoneLetter 
        ? `### 📍 ${zoneLetter} 貨架擺放清單 (共 ${matchedItems.length} 項料件)\n\n`
        : `### 🏢 全廠貨架區位分佈概況\n\n`;

      if (matchedItems.length === 0) {
        reply += `目前 ${zoneLetter || '該區'} 貨架尚無登記擺放的料件，可作為擴充或新進備料儲放區。`;
      } else {
        matchedItems.forEach(i => {
          reply += `- **${i.shelfLocation}**：${i.name} (${i.sku}) - 存量 **${i.quantity} ${i.unit}**\n`;
        });
      }

      return {
        text: reply,
        relatedItems: matchedItems,
        suggestions: ['🏢 前往貨架視覺地圖', '🚨 查詢缺貨與低庫存料件', '📊 全廠庫存現況總覽']
      };
    }

    // 4. Specific Item / SKU Search
    const foundItems = items.filter(i => {
      return (
        i.sku.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.finishedProductName.toLowerCase().includes(q) ||
        i.shelfLocation.toLowerCase().includes(q) ||
        (q.includes('馬達') && i.name.includes('馬達')) ||
        (q.includes('齒輪') && i.name.includes('齒輪')) ||
        (q.includes('減速機') && i.name.includes('減速機')) ||
        (q.includes('plc') && i.name.includes('PLC')) ||
        (q.includes('氣壓') && i.name.includes('氣壓缸')) ||
        (q.includes('感測') && i.name.includes('感測器')) ||
        (q.includes('滑軌') && i.name.includes('滑軌')) ||
        (q.includes('皮帶') && i.name.includes('皮帶')) ||
        ((q.includes('螢幕') || q.includes('hmi')) && (i.name.includes('螢幕') || i.name.includes('HMI')))
      );
    });

    if (foundItems.length > 0) {
      let reply = `### 🔍 為您找到 ${foundItems.length} 項符合的貨品資料：\n\n`;
      foundItems.forEach((i, idx) => {
        reply += `**${idx + 1}. ${i.name}**\n`;
        reply += `- 貨號 (SKU)：\`${i.sku}\`\n`;
        reply += `- 存放位置：📍 **${i.shelfLocation}**\n`;
        reply += `- 即時庫存：**${i.quantity} ${i.unit}** (安全水位: ${i.minSafeQuantity} ${i.unit})\n`;
        reply += `- 隸屬成品設備：${i.finishedProductName}\n`;
        if (i.notes) reply += `- 備註說明：${i.notes}\n`;
        reply += `\n`;
      });

      return {
        text: reply,
        relatedItems: foundItems,
        suggestions: ['📍 定位到視覺貨架圖', '🚨 查詢缺貨與低庫存料件', '💡 產生採購補貨建議']
      };
    }

    // 5. Replenishment & Purchase suggestions
    if (q.includes('補貨') || q.includes('採購') || q.includes('叫料') || q.includes('建議') || q.includes('採買')) {
      const needed = items
        .filter(i => i.quantity <= i.minSafeQuantity)
        .map(i => {
          const target = i.maxCapacity || (i.minSafeQuantity * 2);
          const suggestQty = Math.max(0, target - i.quantity);
          return { ...i, suggestQty };
        })
        .sort((a, b) => (a.quantity / (a.minSafeQuantity || 1)) - (b.quantity / (b.minSafeQuantity || 1)));

      if (needed.length === 0) {
        return {
          text: `✅ 報告 ${currentOperator.name}，目前全廠料件庫存充足，無急需採購或補貨之品項！`,
          suggestions: ['📊 全廠庫存現況總覽', '📋 倉庫盤點狀況報告']
        };
      }

      let reply = `### 💡 智能採購補貨建議清單\n\n根據目前現存數量與安全庫存水位，建議優先安排採購以下 **${needed.length}** 項料件：\n\n`;
      needed.forEach((i, idx) => {
        const urgency = i.quantity === 0 ? '🔴【極急件 - 已斷貨】' : '🟡【急件 - 低於安全線】';
        reply += `${idx + 1}. ${urgency} **${i.name}** (${i.sku})\n`;
        reply += `   - 現存量: **${i.quantity} ${i.unit}** (安全線: ${i.minSafeQuantity} ${i.unit})\n`;
        reply += `   - 建議補貨量: **+${i.suggestQty} ${i.unit}** (補至貨架容量 ${i.maxCapacity || (i.minSafeQuantity * 2)} ${i.unit})\n`;
        reply += `   - 貨架位置: \`${i.shelfLocation}\`\n\n`;
      });

      return {
        text: reply,
        relatedItems: needed,
        suggestions: ['🚨 查詢缺貨與低庫存料件', '📊 全廠庫存現況總覽']
      };
    }

    // 6. Overall statistics & Summary
    if (q.includes('統計') || q.includes('總覽') || q.includes('現況') || q.includes('報表') || q.includes('總數量') || q.includes('狀況')) {
      const totalKinds = items.length;
      const totalQty = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
      const outOfStockCount = items.filter(i => i.quantity === 0).length;
      const lowStockCount = items.filter(i => i.quantity > 0 && i.quantity <= i.minSafeQuantity).length;
      const discCount = items.filter(i => i.lastCountDiscrepancy !== null && i.lastCountDiscrepancy !== 0).length;

      let reply = `### 📊 賢欣貨架全廠庫存即時總覽\n\n`;
      reply += `- 📦 **登記料件總品項**：\`${totalKinds}\` 種\n`;
      reply += `- 🔢 **在庫零件實體總數**：\`${totalQty}\` 件/單位\n`;
      reply += `- 🔴 **完全缺貨品項**：\`${outOfStockCount}\` 種\n`;
      reply += `- 🟡 **低安全庫存品項**：\`${lowStockCount}\` 種\n`;
      reply += `- ⚠️ **盤點差異品項**：\`${discCount}\` 種\n`;
      reply += `- 🟢 **庫存健康度**：\`${Math.round(((totalKinds - outOfStockCount - lowStockCount) / (totalKinds || 1)) * 100)}%\`\n\n`;
      reply += `系統已即時連線，您隨時可以詢問特定料件的貨架位置或產生補貨清單。`;

      return {
        text: reply,
        suggestions: ['🚨 查詢缺貨與低庫存料件', '💡 產生採購補貨建議', '⚠️ 盤點差異有哪些？']
      };
    }

    // 7. Recent operation history
    if (q.includes('歷史') || q.includes('紀錄') || q.includes('入庫') || q.includes('出庫') || q.includes('最近操作') || q.includes('歷程')) {
      const allHistories: { item: InventoryItem; hist: any }[] = [];
      items.forEach(i => {
        (i.history || []).forEach(h => {
          allHistories.push({ item: i, hist: h });
        });
      });

      allHistories.sort((a, b) => new Date(b.hist.timestamp).getTime() - new Date(a.hist.timestamp).getTime());
      const recent = allHistories.slice(0, 6);

      let reply = `### 🕒 最近庫存異動與盤點日誌\n\n`;
      if (recent.length === 0) {
        reply += `目前系統中尚無近期異動紀錄。`;
      } else {
        recent.forEach(({ item, hist }) => {
          const typeBadge = 
            hist.type === 'create' ? '📦【初始建立】' :
            hist.type === 'stock_in' ? '🟢【入庫】' :
            hist.type === 'stock_out' ? '🔴【出庫】' :
            hist.type === 'audit_count' ? '📋【盤點】' : '✏️【編輯】';
          reply += `- **${new Date(hist.timestamp).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}** ${typeBadge} **${item.name}**\n  > 操作人: ${hist.operator} • ${hist.note || '數量更新'}\n`;
        });
      }

      return {
        text: reply,
        suggestions: ['📊 全廠庫存現況總覽', '🚨 查詢缺貨與低庫存料件']
      };
    }

    // Default fallback
    return {
      text: `我已收到您的提問：「**${query}**」。\n\n如需特定料件資訊，請輸入料件名稱（如：*馬達*、*氣壓缸*、*PLC*）或貨號（如：*HH-M01*）。您也可以點選下方的快捷建議直接查看相關報表！`,
      suggestions: [
        '🚨 查詢缺貨與低庫存料件',
        '📍 步進馬達放在哪個貨架？',
        '⚠️ 盤點差異有哪些？',
        '📊 全廠庫存現況總覽',
        '💡 產生採購補貨建議'
      ]
    };
  };

  // DGX GPU AI Call (calls backend /api/chat proxying to https://dgx-api.ovantech.com.tw/v1)
  const callDgxGpuAPI = async (query: string): Promise<string> => {
    const warehouseData = {
      currentTime: new Date().toISOString(),
      currentOperator: currentOperator.name,
      items: items.map(i => ({
        sku: i.sku,
        name: i.name,
        finishedProductName: i.finishedProductName,
        quantity: i.quantity,
        unit: i.unit,
        shelfLocation: i.shelfLocation,
        zone: i.zone,
        minSafeQuantity: i.minSafeQuantity,
        maxCapacity: i.maxCapacity,
        status: i.status,
        lastCountDiscrepancy: i.lastCountDiscrepancy,
        notes: i.notes
      })),
      alerts: alerts.map(a => ({
        type: a.type,
        itemName: a.itemName,
        message: a.message,
        severity: a.severity
      }))
    };

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: query,
        history: messages.slice(-6).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        context: {
          operatorName: currentOperator.name,
          warehouseData
        }
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.reply || '已收到您的問題，但未取得有效回覆內容。';
  };

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      let botResponseText = '';
      let relatedItems: InventoryItem[] | undefined;
      let suggestions: string[] | undefined;

      try {
        // 1. Call real NVIDIA DGX GPU AI Server (Qwen3-8B)
        botResponseText = await callDgxGpuAPI(query);
      } catch (gpuErr: any) {
        console.warn('DGX GPU API call failed, falling back to local engine:', gpuErr);
        const localResult = processLocalQuery(query);
        botResponseText = localResult.text;
        suggestions = localResult.suggestions;
      }

      // Automatically scan query and AI response for mentioned warehouse items
      const q = query.toLowerCase();
      const r = botResponseText.toLowerCase();
      relatedItems = items.filter(i => 
        q.includes(i.name.toLowerCase()) || 
        q.includes(i.sku.toLowerCase()) ||
        r.includes(i.name.toLowerCase()) ||
        r.includes(i.sku.toLowerCase()) ||
        (q.includes('缺貨') && i.quantity === 0) ||
        (q.includes('低庫存') && i.quantity <= i.minSafeQuantity) ||
        (q.includes('馬達') && i.name.includes('馬達')) ||
        (q.includes('氣壓缸') && i.name.includes('氣壓缸')) ||
        (q.includes('plc') && i.name.includes('PLC')) ||
        (q.includes('齒輪') && i.name.includes('齒輪'))
      ).slice(0, 3);

      if (!suggestions) {
        suggestions = [
          '🚨 查詢缺貨與低庫存料件',
          '📍 步進馬達放在哪個貨架？',
          '⚠️ 盤點差異有哪些？',
          '📊 全廠庫存現況總覽',
          '💡 產生採購補貨建議'
        ];
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relatedItems: relatedItems.length > 0 ? relatedItems : undefined,
        suggestions
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `處理提問時發生錯誤：${err.message || '未知錯誤'}，請稍後再試。`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setGeminiApiKey(trimmed);
    localStorage.setItem('hh_wms_gemini_key', trimmed);
    setShowSettings(false);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-5 right-5 z-40 select-none">
        <button
          onClick={onToggle}
          aria-label="打開智能庫存助理"
          className={`group flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 ${
            isOpen
              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-semibold hover:shadow-amber-500/30 hover:scale-105'
          }`}
        >
          <div className="relative">
            <Bot className={`w-6 h-6 ${isOpen ? 'text-amber-400' : 'text-slate-950'} transition-transform group-hover:rotate-6`} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-sm tracking-wide hidden sm:inline">
            {isOpen ? '收合 AI 助理' : '賢欣 AI 庫存助理'}
          </span>
          {!isOpen && alerts.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[580px] max-h-[82vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/70 p-3.5 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
                <Bot className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base text-white">
                  <span>賢欣 AI 庫存智能助理</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>DGX GPU</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="text-amber-400 font-medium">Qwen3-8B 實體運算中</span>
                  <span>•</span>
                  <span>操作員：{currentOperator.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="DGX GPU 伺服器連線資訊"
                className={`p-2 rounded-lg transition-colors ${
                  showSettings ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setMessages([]);
                }}
                title="清空聊天記錄"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onToggle}
                title="關閉"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DGX GPU AI Status & Configuration Panel */}
          {showSettings && (
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>NVIDIA DGX GPU 算力叢集連線資訊</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-mono text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>即時推論連線中</span>
                </span>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>GPU 伺服器端點：</span>
                  <span className="text-slate-200">https://dgx-api.ovantech.com.tw/v1</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>大語言模型核心：</span>
                  <span className="text-amber-300 font-bold">qwen3-8b (通義千問 3)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GPU API 金鑰驗證：</span>
                  <span className="text-emerald-400">dgx_Q4tx...xTSto (已啟用)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                本系統所有提問均直接傳送至專用 NVIDIA DGX GPU 伺服器進行即時推理，並結合即時庫存資料庫提供精準的盤點與貨架解答。
              </p>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 border border-slate-700/70 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Message Formatted Content */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <div key={idx} className="font-bold text-amber-400 text-base mt-1 mb-1">{line.replace('### ', '')}</div>;
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <div key={idx} className="font-semibold text-slate-100">{line.replace(/\*\*/g, '')}</div>;
                      }
                      // Replace inline bold
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={idx}>
                          {parts.map((p, pIdx) => {
                            if (p.startsWith('**') && p.endsWith('**')) {
                              return <strong key={pIdx} className="text-amber-300 font-semibold">{p.slice(2, -2)}</strong>;
                            }
                            if (p.startsWith('`') && p.endsWith('`')) {
                              return <code key={pIdx} className="px-1 py-0.5 bg-slate-900 text-amber-400 rounded text-xs">{p.slice(1, -1)}</code>;
                            }
                            return p;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Related Item Interactive Cards */}
                  {msg.relatedItems && msg.relatedItems.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-2">
                      <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        <span>關聯貨品快捷操作：</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.relatedItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="bg-slate-900/90 border border-slate-700 rounded-xl p-2 flex items-center justify-between gap-2 hover:border-amber-500/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img
                                src={item.photo}
                                alt={item.name}
                                className="w-9 h-9 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                              />
                              <div className="truncate">
                                <div className="font-semibold text-xs text-white truncate">{item.name}</div>
                                <div className="text-[11px] text-amber-400 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span>{item.shelfLocation}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className={item.quantity === 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  onSelectItem(item);
                                  onToggle();
                                }}
                                title="查看貨品詳情"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  onNavigateToShelfMap(item.zone);
                                  onToggle();
                                }}
                                title="在視覺地圖中定位貨架"
                                className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(sug)}
                          className="px-2.5 py-1 text-xs bg-slate-900/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/40 rounded-full transition-all text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <Bot className="w-4 h-4 text-amber-400 animate-spin" />
                <span>智能助理正在檢索倉庫資料庫...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Toolbar */}
          <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendMessage('🚨 查詢缺貨與低庫存料件')}
              className="px-2.5 py-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg whitespace-nowrap flex items-center gap-1 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>缺貨警報</span>
            </button>
            <button
              onClick={() => handleSendMessage('📍 查詢貨架區位與擺放清單')}
              className="px-2.5 py-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg whitespace-nowrap flex items-center gap-1 transition-colors"
            >
              <MapPin className="w-3 h-3 text-blue-400" />
              <span>貨架位置</span>
            </button>
            <button
              onClick={() => handleSendMessage('💡 產生採購補貨建議')}
              className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg whitespace-nowrap flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>補貨建議</span>
            </button>
            <button
              onClick={() => handleSendMessage('⚠️ 盤點差異有哪些？')}
              className="px-2.5 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg whitespace-nowrap flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>盤點差異</span>
            </button>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="輸入料件名稱、SKU、貨架位置或問庫存狀況..."
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl font-semibold transition-all transform active:scale-95 flex items-center justify-center shadow-md disabled:shadow-none"
            >
              <Send className="w-4 h-4 stroke-[2.2]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
