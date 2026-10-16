import QRCode from 'qrcode';
import { InventoryItem } from '../types/inventory';

// Generate Data URL for item QR code
export async function generateItemQrCode(item: InventoryItem): Promise<string> {
  // Format standardized JSON payload or quick-lookup payload
  const payload = JSON.stringify({
    system: 'HSIEN_HSIN_WMS',
    id: item.id,
    sku: item.sku,
    name: item.name,
    shelf: item.shelfLocation,
    qty: item.quantity,
    unit: item.unit
  });

  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

// Generate shelf location QR Code
export async function generateShelfQrCode(shelfLocation: string): Promise<string> {
  const payload = JSON.stringify({
    system: 'HSIEN_HSIN_SHELF',
    shelf: shelfLocation
  });

  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate shelf QR code', err);
    return '';
  }
}

// Parse scanned content: could be raw SKU (e.g. HH-M01-102), JSON payload, or URL
export function parseScannedCode(rawText: string): { type: 'item' | 'shelf' | 'raw'; skuOrId?: string; shelfLocation?: string; raw: string } {
  const trimmed = rawText.trim();

  // Try JSON parse
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.system === 'HSIEN_HSIN_WMS' || parsed.sku || parsed.id) {
        return {
          type: 'item',
          skuOrId: parsed.sku || parsed.id,
          shelfLocation: parsed.shelf,
          raw: trimmed
        };
      }
      if (parsed.system === 'HSIEN_HSIN_SHELF' || parsed.shelf) {
        return {
          type: 'shelf',
          shelfLocation: parsed.shelf,
          raw: trimmed
        };
      }
    } catch {
      // not json
    }
  }

  // Check if it's a URL with ?sku=... or ?id=...
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const sku = url.searchParams.get('sku') || url.searchParams.get('id');
      if (sku) {
        return { type: 'item', skuOrId: sku, raw: trimmed };
      }
    } catch {}
  }

  // Otherwise assume it's directly the SKU or ID or shelf string
  if (trimmed.includes('區-') || trimmed.includes('架-')) {
    return { type: 'shelf', shelfLocation: trimmed, raw: trimmed };
  }

  return { type: 'item', skuOrId: trimmed, raw: trimmed };
}
