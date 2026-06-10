/** Investments Module (V3) */
export type InvestType = 'STOCK' | 'CRYPTO' | 'ETF' | 'BOND';

export interface PriceData {
  ticker: string;
  price: number;
  change?: number;
  changePercent?: number;
}
