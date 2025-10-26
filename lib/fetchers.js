// lib/fetchers.js
// Helper functions to fetch price time series from Twelve Data or Alpha Vantage

/**
 * Fetch price series from Twelve Data (preferred) or Alpha Vantage (fallback)
 * @param {string} symbol - Stock symbol
 * @param {string} interval - Time interval (e.g., '15min', '1h', '1day')
 * @param {number} rangeDays - Number of days to fetch (default 5)
 * @returns {Promise<Array>} Array of candles: [{t, o, h, l, c, v}]
 */
export async function fetchPriceSeries(symbol, interval = '15min', rangeDays = 5) {
  // Validate inputs
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  // Try Twelve Data first
  if (process.env.TWELVE_DATA_API_KEY) {
    try {
      return await fetchFromTwelveData(symbol, interval, rangeDays);
    } catch (error) {
      console.error('Twelve Data fetch failed, trying Alpha Vantage:', error.message);
      // Fall through to Alpha Vantage
    }
  }

  // Fallback to Alpha Vantage
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      return await fetchFromAlphaVantage(symbol, interval, rangeDays);
    } catch (error) {
      console.error('Alpha Vantage fetch failed:', error.message);
      throw new Error('Failed to fetch price data from all sources');
    }
  }

  throw new Error('No API keys configured. Set TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY');
}

/**
 * Fetch from Twelve Data API
 * @private
 */
async function fetchFromTwelveData(symbol, interval, rangeDays) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  
  // Map interval to Twelve Data format
  const intervalMap = {
    '1min': '1min',
    '5min': '5min',
    '15min': '15min',
    '30min': '30min',
    '1h': '1h',
    '1hour': '1h',
    '1day': '1day',
    '1d': '1day',
    'daily': '1day'
  };
  
  const mappedInterval = intervalMap[interval] || interval;
  
  // Calculate outputsize based on rangeDays and interval
  let outputsize = 100;
  if (mappedInterval.includes('min')) {
    const minsPerDay = 390; // Market hours
    outputsize = Math.min(5000, rangeDays * minsPerDay / parseInt(mappedInterval));
  } else if (mappedInterval.includes('h')) {
    outputsize = Math.min(5000, rangeDays * 6.5);
  } else {
    outputsize = rangeDays;
  }
  
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${mappedInterval}&outputsize=${Math.ceil(outputsize)}&apikey=${apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Twelve Data API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Check for API errors
  if (data.status === 'error') {
    throw new Error(`Twelve Data API error: ${data.message || 'Unknown error'}`);
  }
  
  // Check for rate limit
  if (data.code === 429 || data.message?.includes('rate limit')) {
    throw new Error('Twelve Data rate limit exceeded');
  }
  
  if (!data.values || !Array.isArray(data.values)) {
    throw new Error('Invalid response format from Twelve Data');
  }
  
  // Convert to standard format
  return data.values.map(candle => ({
    t: new Date(candle.datetime).getTime(),
    o: parseFloat(candle.open),
    h: parseFloat(candle.high),
    l: parseFloat(candle.low),
    c: parseFloat(candle.close),
    v: parseFloat(candle.volume || 0)
  })).reverse(); // Twelve Data returns newest first, reverse to oldest first
}

/**
 * Fetch from Alpha Vantage API
 * @private
 */
async function fetchFromAlphaVantage(symbol, interval, rangeDays) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  // Determine function based on interval
  let func = 'TIME_SERIES_INTRADAY';
  let intervalParam = '15min';
  
  if (interval === '1day' || interval === '1d' || interval === 'daily') {
    func = 'TIME_SERIES_DAILY';
  } else {
    // Map interval for intraday
    const intervalMap = {
      '1min': '1min',
      '5min': '5min',
      '15min': '15min',
      '30min': '30min',
      '1h': '60min',
      '1hour': '60min'
    };
    intervalParam = intervalMap[interval] || '15min';
  }
  
  let url = `https://www.alphavantage.co/query?function=${func}&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  
  if (func === 'TIME_SERIES_INTRADAY') {
    url += `&interval=${intervalParam}&outputsize=full`;
  } else {
    url += '&outputsize=full';
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Check for API errors
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
  }
  
  if (data['Note']) {
    throw new Error('Alpha Vantage rate limit exceeded');
  }
  
  // Get the time series key
  const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
  
  if (!timeSeriesKey || !data[timeSeriesKey]) {
    throw new Error('Invalid response format from Alpha Vantage');
  }
  
  const timeSeries = data[timeSeriesKey];
  
  // Convert to standard format
  const candles = Object.entries(timeSeries).map(([datetime, values]) => ({
    t: new Date(datetime).getTime(),
    o: parseFloat(values['1. open']),
    h: parseFloat(values['2. high']),
    l: parseFloat(values['3. low']),
    c: parseFloat(values['4. close']),
    v: parseFloat(values['5. volume'] || values['6. volume'] || 0)
  }));
  
  // Sort by time (oldest first) and filter by rangeDays
  candles.sort((a, b) => a.t - b.t);
  
  const cutoffTime = Date.now() - (rangeDays * 24 * 60 * 60 * 1000);
  return candles.filter(c => c.t >= cutoffTime);
}
