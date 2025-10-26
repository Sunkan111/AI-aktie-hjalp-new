// api/backtest.js
// Backtest trading strategies

import { fetchPriceSeries } from '../lib/fetchers.js';
import { sma, rsi, atr } from '../lib/indicators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { 
    symbol, 
    from, 
    to, 
    strategy = { 
      rsiPeriod: 14, 
      smaPeriodFast: 10, 
      smaPeriodSlow: 20,
      atrPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70
    } 
  } = req.body || {};

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    // Calculate range in days
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    const rangeDays = Math.ceil((toDate - fromDate) / (24 * 60 * 60 * 1000));

    // Fetch historical data (use daily for backtesting to reduce API calls)
    const candles = await fetchPriceSeries(symbol, '1day', rangeDays);

    if (!candles || candles.length < 30) {
      return res.status(400).json({ 
        error: 'Insufficient data for backtesting',
        message: `Need at least 30 candles, got ${candles?.length || 0}`
      });
    }

    // Extract price arrays
    const closes = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);

    // Calculate indicators
    const rsiValues = rsi(closes, strategy.rsiPeriod);
    const smaFast = sma(closes, strategy.smaPeriodFast);
    const smaSlow = sma(closes, strategy.smaPeriodSlow);
    const atrValues = atr(highs, lows, closes, strategy.atrPeriod);

    // Simulate trading
    const trades = [];
    let position = null; // Current open position
    let capital = 10000; // Starting capital
    const initialCapital = capital;

    // Start from index where all indicators are available
    const startIdx = Math.max(
      candles.length - rsiValues.length,
      candles.length - smaFast.length,
      candles.length - smaSlow.length,
      candles.length - atrValues.length
    );

    for (let i = startIdx + 1; i < candles.length; i++) {
      const rsiIdx = i - (candles.length - rsiValues.length);
      const smaIdx = i - (candles.length - smaFast.length);
      const atrIdx = i - (candles.length - atrValues.length);

      if (rsiIdx < 1 || smaIdx < 1 || atrIdx < 0) continue;

      const currentRSI = rsiValues[rsiIdx];
      const currentSMAFast = smaFast[smaIdx];
      const currentSMASlow = smaSlow[smaIdx];
      const prevSMAFast = smaFast[smaIdx - 1];
      const prevSMASlow = smaSlow[smaIdx - 1];
      const currentATR = atrValues[atrIdx];
      const currentPrice = candles[i].c;

      // Check for golden cross
      const goldenCross = prevSMAFast <= prevSMASlow && currentSMAFast > currentSMASlow;
      
      // Check for death cross
      const deathCross = prevSMAFast >= prevSMASlow && currentSMAFast < currentSMASlow;

      // Entry logic - BUY signal
      if (!position && currentRSI < strategy.rsiOversold && (goldenCross || currentSMAFast > currentSMASlow)) {
        position = {
          type: 'LONG',
          entryPrice: currentPrice,
          entryDate: candles[i].t,
          stopLoss: currentPrice - (currentATR * 2),
          takeProfit: currentPrice + (currentATR * 3),
          shares: Math.floor(capital / currentPrice)
        };
      }

      // Exit logic
      if (position) {
        let exitReason = null;
        let exitPrice = currentPrice;

        // Stop loss hit
        if (currentPrice <= position.stopLoss) {
          exitReason = 'STOP_LOSS';
          exitPrice = position.stopLoss;
        }
        // Take profit hit
        else if (currentPrice >= position.takeProfit) {
          exitReason = 'TAKE_PROFIT';
          exitPrice = position.takeProfit;
        }
        // Signal reversal
        else if (currentRSI > strategy.rsiOverbought || deathCross) {
          exitReason = 'SIGNAL';
        }

        if (exitReason) {
          const profit = (exitPrice - position.entryPrice) * position.shares;
          capital += profit;

          trades.push({
            entryDate: new Date(position.entryDate).toISOString(),
            exitDate: new Date(candles[i].t).toISOString(),
            entryPrice: parseFloat(position.entryPrice.toFixed(2)),
            exitPrice: parseFloat(exitPrice.toFixed(2)),
            shares: position.shares,
            profit: parseFloat(profit.toFixed(2)),
            profitPercent: parseFloat(((profit / (position.entryPrice * position.shares)) * 100).toFixed(2)),
            exitReason
          });

          position = null;
        }
      }
    }

    // Calculate metrics
    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit <= 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    
    const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
    
    // Calculate max drawdown
    let peak = initialCapital;
    let maxDrawdown = 0;
    let runningCapital = initialCapital;
    
    for (const trade of trades) {
      runningCapital += trade.profit;
      if (runningCapital > peak) {
        peak = runningCapital;
      }
      const drawdown = ((peak - runningCapital) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate average risk/reward
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length) : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate Sharpe ratio approximation (using daily returns)
    if (trades.length > 1) {
      const returns = trades.map(t => t.profitPercent / 100);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      var sharpeApprox = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    } else {
      var sharpeApprox = 0;
    }

    return res.status(200).json({
      trades,
      metrics: {
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(2)),
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        avgRR: parseFloat(avgRR.toFixed(2)),
        sharpeApprox: parseFloat(sharpeApprox.toFixed(2)),
        finalCapital: parseFloat(capital.toFixed(2)),
        initialCapital
      },
      strategy
    });

  } catch (error) {
    console.error('Error in backtest endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to run backtest',
      message: error.message 
    });
  }
}
