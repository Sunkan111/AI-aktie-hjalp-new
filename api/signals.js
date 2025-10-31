// api/signals.js
// Generate trading signals based on technical indicators

import { fetchPriceSeries } from '../lib/fetchers.js';
import { sma, ema, rsi, macd, atr } from '../lib/indicators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { symbol, interval = '15min', rangeDays = 5, rules } = req.body || {};

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    // Fetch price series
    const candles = await fetchPriceSeries(symbol, interval, rangeDays);

    if (!candles || candles.length < 30) {
      return res.status(400).json({ 
        error: 'Insufficient data for analysis',
        message: `Need at least 30 candles, got ${candles?.length || 0}`
      });
    }

    // Extract price arrays
    const closes = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const volumes = candles.map(c => c.v);

    // Calculate indicators
    const rsiValues = rsi(closes, 14);
    const smaFast = sma(closes, 10); // 10-period SMA
    const smaSlow = sma(closes, 20); // 20-period SMA
    const macdData = macd(closes, 12, 26, 9);
    const atrValues = atr(highs, lows, closes, 14);

    // Get current values (most recent)
    const currentRSI = rsiValues[rsiValues.length - 1];
    const currentSMAFast = smaFast[smaFast.length - 1];
    const currentSMASlow = smaSlow[smaSlow.length - 1];
    const prevSMAFast = smaFast[smaFast.length - 2];
    const prevSMASlow = smaSlow[smaSlow.length - 2];
    const currentClose = closes[closes.length - 1];
    const currentATR = atrValues[atrValues.length - 1];

    // Check for golden cross (fast MA crosses above slow MA)
    const goldenCross = prevSMAFast <= prevSMASlow && currentSMAFast > currentSMASlow;
    
    // Check for death cross (fast MA crosses below slow MA)
    const deathCross = prevSMAFast >= prevSMASlow && currentSMAFast < currentSMASlow;

    // Generate signals using default rules or custom rules
    const signals = [];

    // BUY signal: RSI < 30 AND golden cross (or SMA fast above slow)
    if (currentRSI < 30 && (goldenCross || currentSMAFast > currentSMASlow)) {
      const strength = Math.max(0, Math.min(1, (30 - currentRSI) / 30));
      const stopLoss = currentClose - (currentATR * 2); // 2 ATR below
      const takeProfit = currentClose + (currentATR * 3); // 3 ATR above (1.5:1 RR)
      
      signals.push({
        type: 'BUY',
        strength: parseFloat(strength.toFixed(2)),
        stopLoss: parseFloat(stopLoss.toFixed(2)),
        takeProfit: parseFloat(takeProfit.toFixed(2)),
        timestamp: candles[candles.length - 1].t,
        explanation: `RSI oversold (${currentRSI.toFixed(2)}) with ${goldenCross ? 'golden cross' : 'bullish trend'}`
      });
    }

    // SELL signal: RSI > 70 OR death cross
    if (currentRSI > 70 || deathCross) {
      const strength = currentRSI > 70 
        ? Math.max(0, Math.min(1, (currentRSI - 70) / 30))
        : 0.7;
      const stopLoss = currentClose + (currentATR * 2); // 2 ATR above
      const takeProfit = currentClose - (currentATR * 3); // 3 ATR below
      
      signals.push({
        type: 'SELL',
        strength: parseFloat(strength.toFixed(2)),
        stopLoss: parseFloat(stopLoss.toFixed(2)),
        takeProfit: parseFloat(takeProfit.toFixed(2)),
        timestamp: candles[candles.length - 1].t,
        explanation: deathCross 
          ? 'Death cross detected (bearish trend)'
          : `RSI overbought (${currentRSI.toFixed(2)})`
      });
    }

    // Return comprehensive results
    return res.status(200).json({
      signals,
      indicators: {
        rsi: currentRSI ? parseFloat(currentRSI.toFixed(2)) : null,
        sma_fast: currentSMAFast ? parseFloat(currentSMAFast.toFixed(2)) : null,
        sma_slow: currentSMASlow ? parseFloat(currentSMASlow.toFixed(2)) : null,
        macd: {
          macd: macdData.macd[macdData.macd.length - 1]?.toFixed(2),
          signal: macdData.signal[macdData.signal.length - 1]?.toFixed(2),
          histogram: macdData.histogram[macdData.histogram.length - 1]?.toFixed(2)
        },
        atr: currentATR ? parseFloat(currentATR.toFixed(2)) : null,
        currentPrice: parseFloat(currentClose.toFixed(2))
      },
      candles: candles.slice(-50) // Return last 50 candles for charting
    });

  } catch (error) {
    console.error('Error in signals endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to generate signals',
      message: error.message 
    });
  }
}
