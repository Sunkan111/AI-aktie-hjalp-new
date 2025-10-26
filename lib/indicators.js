// lib/indicators.js
// Technical indicator calculations

/**
 * Simple Moving Average (SMA)
 * @param {number[]} arr - Array of values
 * @param {number} period - Period for the moving average
 * @returns {number[]} Array of SMA values
 */
export function sma(arr, period) {
  if (!arr || arr.length < period) return [];
  
  const result = [];
  for (let i = period - 1; i < arr.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += arr[i - j];
    }
    result.push(sum / period);
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 * @param {number[]} arr - Array of values
 * @param {number} period - Period for the moving average
 * @returns {number[]} Array of EMA values
 */
export function ema(arr, period) {
  if (!arr || arr.length < period) return [];
  
  const k = 2 / (period + 1);
  const result = [];
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += arr[i];
  }
  let emaValue = sum / period;
  result.push(emaValue);
  
  // Calculate subsequent EMAs
  for (let i = period; i < arr.length; i++) {
    emaValue = arr[i] * k + emaValue * (1 - k);
    result.push(emaValue);
  }
  
  return result;
}

/**
 * Relative Strength Index (RSI)
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - Period for RSI (default 14)
 * @returns {number[]} Array of RSI values
 */
export function rsi(closes, period = 14) {
  if (!closes || closes.length < period + 1) return [];
  
  const result = [];
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // Calculate first average gain and loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI for first period
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - (100 / (1 + rs)));
  
  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - (100 / (1 + rs)));
  }
  
  return result;
}

/**
 * Moving Average Convergence Divergence (MACD)
 * @param {number[]} closes - Array of closing prices
 * @param {number} fast - Fast period (default 12)
 * @param {number} slow - Slow period (default 26)
 * @param {number} signal - Signal period (default 9)
 * @returns {Object} Object with macd, signal, and histogram arrays
 */
export function macd(closes, fast = 12, slow = 26, signal = 9) {
  if (!closes || closes.length < slow) {
    return { macd: [], signal: [], histogram: [] };
  }
  
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  
  // MACD line is difference between fast and slow EMAs
  const macdLine = [];
  const offset = slow - fast;
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }
  
  // Signal line is EMA of MACD line
  const signalLine = ema(macdLine, signal);
  
  // Histogram is difference between MACD and signal
  const histogram = [];
  const signalOffset = macdLine.length - signalLine.length;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalOffset] - signalLine[i]);
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

/**
 * Average True Range (ATR)
 * @param {number[]} highs - Array of high prices
 * @param {number[]} lows - Array of low prices
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - Period for ATR (default 14)
 * @returns {number[]} Array of ATR values
 */
export function atr(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes || highs.length < period + 1) {
    return [];
  }
  
  const trueRanges = [];
  
  // Calculate true ranges
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Calculate first ATR (simple average)
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }
  const result = [sum / period];
  
  // Calculate subsequent ATR values (smoothed)
  for (let i = period; i < trueRanges.length; i++) {
    const atrValue = (result[result.length - 1] * (period - 1) + trueRanges[i]) / period;
    result.push(atrValue);
  }
  
  return result;
}

/**
 * Volume Weighted Moving Average (VWMA)
 * @param {number[]} prices - Array of prices
 * @param {number[]} volumes - Array of volumes
 * @param {number} period - Period for the moving average
 * @returns {number[]} Array of VWMA values
 */
export function vwma(prices, volumes, period) {
  if (!prices || !volumes || prices.length !== volumes.length || prices.length < period) {
    return [];
  }
  
  const result = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    let sumPV = 0;
    let sumV = 0;
    
    for (let j = 0; j < period; j++) {
      sumPV += prices[i - j] * volumes[i - j];
      sumV += volumes[i - j];
    }
    
    result.push(sumV === 0 ? 0 : sumPV / sumV);
  }
  
  return result;
}
