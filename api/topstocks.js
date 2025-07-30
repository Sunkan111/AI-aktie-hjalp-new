// This endpoint computes the top 10 stocks by price momentum over the
// last week.  It queries Yahoo Finance for daily closing prices for a
// predefined list of well‑known large cap stocks, calculates the
// percentage change over the period and returns the top movers.  The
// aim is to give the user a quick overview of currently trending
// companies.

const tickers = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META',
  'V', 'UNH', 'JPM', 'MA', 'HD', 'BAC', 'XOM', 'DIS'
];

async function fetchChart(symbol) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set('range', '7d');
  url.searchParams.set('interval', '1d');
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`Failed chart for ${symbol}: ${resp.status}`);
  const data = await resp.json();
  const result = data.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  return closes;
}

export default async function handler(req, res) {
  try {
    const performances = [];
    for (const symbol of tickers) {
      try {
        const closes = await fetchChart(symbol);
        if (closes.length >= 2) {
          const first = closes[0];
          const last = closes[closes.length - 1];
          const pctChange = ((last - first) / first) * 100;
          performances.push({ symbol, pctChange });
        }
      } catch (err) {
        // skip symbol on error
      }
    }
    performances.sort((a, b) => b.pctChange - a.pctChange);
    const top = performances.slice(0, 10);
    return res.status(200).json({ top });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}