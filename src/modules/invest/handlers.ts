/**
 * Investments Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createInvestment, getPortfolio } from './queries';
import { getStockPrice, getCryptoPrice } from './api';

export async function handleInvestMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@invest\s*/i, '').trim();

  if (/портфель|portfolio|мои инвестиции|investments/i.test(trimmed) && trimmed.length < 30) {
    const portfolio = await getPortfolio(user.id);
    const lines = portfolio.holdings.map(
      (h) => `${h.ticker}: ${h.quantity} × $${h.currentPrice.toFixed(2)} = $${h.value.toFixed(2)} (P/L: ${h.profitLoss >= 0 ? '+' : ''}${h.profitLoss.toFixed(2)})`
    ).join('\n');
    const modulePrompt = `
=== PORTFOLIO ===
Total value: $${portfolio.totalValue.toFixed(2)}
Cost: $${portfolio.totalCost.toFixed(2)}
P/L: $${portfolio.profitLoss.toFixed(2)} (${portfolio.profitLossPercent.toFixed(1)}%)

${lines || 'No holdings.'}

Summarize in ${user.language}.
    `.trim();
    return { modulePrompt, data: portfolio };
  }

  if (/цена|price|сколько стоит|курс/i.test(trimmed)) {
    const tickerMatch = trimmed.match(/([A-Z]{2,5}|BTC|ETH|SOL)/i);
    const ticker = tickerMatch ? tickerMatch[1].toUpperCase() : '';
    if (!ticker) return { modulePrompt: `Specify ticker (e.g. AAPL, BTC). Reply in ${user.language}.` };
    const isCrypto = ['BTC', 'ETH', 'USDT', 'SOL', 'XRP', 'DOGE'].includes(ticker);
    const data = isCrypto ? await getCryptoPrice(ticker) : await getStockPrice(ticker);
    const modulePrompt = `Price ${data.ticker}: $${data.price.toFixed(2)}${data.changePercent != null ? ` (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}% 24h)` : ''}. Reply in ${user.language}.`;
    return { modulePrompt, data };
  }

  const buyMatch = trimmed.match(/(?:купил|купи|buy)\s+(\w+)\s+(\d+(?:\.\d+)?)\s*(?:шт|по|@|\$)?\s*(\d+(?:\.\d+)?)/i)
    || trimmed.match(/(\w+)\s+(\d+(?:\.\d+)?)\s*(?:по|@)\s*\$?(\d+(?:\.\d+)?)/i);
  if (buyMatch) {
    const ticker = buyMatch[1].toUpperCase();
    const qty = parseFloat(buyMatch[2]);
    const price = parseFloat(buyMatch[3]);
    const isCrypto = ['BTC', 'ETH', 'USDT', 'SOL', 'XRP', 'DOGE'].includes(ticker);
    await createInvestment({
      userId: user.id,
      type: isCrypto ? 'CRYPTO' : 'STOCK',
      ticker,
      quantity: qty,
      avgPrice: price,
    });
    return {
      modulePrompt: `Recorded: ${qty} ${ticker} @ $${price}. Reply in ${user.language}.`,
    };
  }

  return {
    modulePrompt: `Use: "купил AAPL 10 по 150", "портфель", "цена BTC". Reply in ${user.language}.`,
  };
}
