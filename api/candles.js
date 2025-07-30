export default async function handler(req, res) {
  // Returns candlestick data for a given symbol.  Accepts `symbol`,
  // optional `range` (e.g. '1mo', '1d', '5d') and `interval`
  // (e.g. '15m', '1h').  Data comes from Yahoo Finance chart API.
  const { symbol } = req.query;
  const range = req.query.range || '5d';
  const interval = req.query.interval || '15m';
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  try {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set('range', range);
    url.searchParams.set('interval', interval);
    // we request adjusted close and other arrays
    url.searchParams.set('indicators', 'quote');
    url.searchParams.set('includePrePost', 'false');
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Yahoo Finance chart API failed: ${response.status}`);
    }
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error('No chart data returned');
    }
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];
    const candles = timestamps.map((t, i) => ({
      t: t * 1000, // convert to ms
      o: opens[i],
      h: highs[i],
      l: lows[i],
      c: closes[i],
      v: volumes[i]
    })).filter(c => c.o != null && c.h != null && c.l != null && c.c != null);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ candles });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}