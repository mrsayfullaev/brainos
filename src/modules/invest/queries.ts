/**
 * Investments Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt } from '../../utils/encryption';
import { getStockPrice, getCryptoPrice } from './api';
import type { InvestType } from './types';

export async function createInvestment(params: {
  userId: string;
  type: InvestType;
  ticker: string;
  quantity: number;
  avgPrice: number;
  currency?: string;
}) {
  return prisma.investment.create({
    data: {
      userId: params.userId,
      type: params.type,
      ticker: params.ticker.toUpperCase(),
      quantity: params.quantity,
      avgPrice: params.avgPrice,
      currency: params.currency || 'USD',
    },
  });
}

export async function getPortfolio(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { transactions: true },
  });
  let totalCost = 0;
  let totalValue = 0;
  const holdings: Array<{
    ticker: string;
    type: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    cost: number;
    value: number;
    profitLoss: number;
  }> = [];

  for (const inv of investments) {
    const qty = Number(inv.quantity);
    const avg = Number(inv.avgPrice);
    const cost = qty * avg;
    totalCost += cost;
    const priceData = inv.type === 'CRYPTO' ? await getCryptoPrice(inv.ticker) : await getStockPrice(inv.ticker);
    const value = qty * priceData.price;
    totalValue += value;
    holdings.push({
      ticker: inv.ticker,
      type: inv.type,
      quantity: qty,
      avgPrice: avg,
      currentPrice: priceData.price,
      cost,
      value,
      profitLoss: value - cost,
    });
  }

  return {
    totalCost,
    totalValue,
    profitLoss: totalValue - totalCost,
    profitLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    holdings,
  };
}

export async function addTransaction(params: {
  investmentId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee?: number;
  note?: string;
}) {
  const total = params.quantity * params.price + (params.fee || 0);
  return prisma.investmentTransaction.create({
    data: {
      investmentId: params.investmentId,
      type: params.type,
      quantity: params.quantity,
      price: params.price,
      total,
      fee: params.fee,
      note: params.note ? encrypt(params.note) : null,
    },
  });
}
