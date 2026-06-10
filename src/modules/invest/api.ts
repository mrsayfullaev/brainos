/**
 * Investments - External APIs (V3)
 */

import axios from 'axios';
import { logger } from '../../utils/logger';
import type { PriceData } from './types';

export async function getStockPrice(ticker: string): Promise<PriceData> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    logger.warn('ALPHA_VANTAGE_API_KEY not set');
    return { ticker: ticker.toUpperCase(), price: 0 };
  }
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${key}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    const q = data['Global Quote'];
    if (!q) return { ticker: ticker.toUpperCase(), price: 0 };
    return {
      ticker: q['01. symbol'] || ticker,
      price: parseFloat(q['05. price']) || 0,
      change: parseFloat(q['09. change']) || 0,
      changePercent: parseFloat(String(q['10. change percent']).replace('%', '')) || 0,
    };
  } catch (e) {
    logger.error('getStockPrice error:', e);
    return { ticker: ticker.toUpperCase(), price: 0 };
  }
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
};

export async function getCryptoPrice(ticker: string): Promise<PriceData> {
  try {
    const id = COINGECKO_IDS[ticker.toUpperCase()] || ticker.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const { data } = await axios.get(url, { timeout: 5000 });
    const o = data[id];
    if (!o) return { ticker: ticker.toUpperCase(), price: 0 };
    return {
      ticker: ticker.toUpperCase(),
      price: o.usd ?? 0,
      change: o.usd_24h_change ?? 0,
      changePercent: o.usd_24h_change ?? 0,
    };
  } catch (e) {
    logger.error('getCryptoPrice error:', e);
    return { ticker: ticker.toUpperCase(), price: 0 };
  }
}
