/**
 * API endpoint for computing a list of daily top candidates based on price momentum.
 *
 * This endpoint looks at a predefined list of popular tickers, fetches 1‑day
 * candlestick data for each, computes the percentage change between the first
 * and last close, and returns the top 10 symbols with the strongest
 * positive momentum. In a production system you might replace this with a
 * screener or more sophisticated criteria.
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Predefined universe of tickers to consider. These are large cap US stocks
  // and a few popular names. You can modify this list as you see fit.
  const universe = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
    'BABA', 'ADBE', 'AMD', 'INTC', 'JPM', 'BAC', 'V', 'MA', 'DIS',
    'NKE', 'KO', 'PEP', 'CSCO', 'CRM', 'ORCL', 'UBER', 'SHOP', 'SQ'
  ];

  const fetchCandles = async (symbol) => {
    try {
      const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
      url.searchParams.set('range', '1d');
      url.searchParams.set('interval', '1m');
      url.searchParams.set('includePrePost', 'false');
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) return null;
      const closes = result.indicators?.quote?.[0]?.close || [];
      // Filter out NaN values
      const valid = closes.filter((v) => typeof v === 'number');
      if (valid.length < 2) return null;
      return { first: valid[0], last: valid[valid.length - 1] };
    } catch (err) {
      return null;
    }
  };

  // Fetch candles in parallel with a modest concurrency limit to avoid
  // overwhelming Yahoo. We simply map all requests and await them.
  const results = await Promise.all(universe.map(async (sym) => {
    const data = await fetchCandles(sym);
    if (!data) return null;
    const changePct = ((data.last - data.first) / data.first) * 100;
    return { symbol: sym, change: changePct };
  }));

  // Filter out failed fetches and sort by change descending
  const sorted = results.filter(Boolean).sort((a, b) => b.change - a.change);
  const top = sorted.slice(0, 10);

  return res.status(200).json({ top });
}