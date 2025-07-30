export default async function handler(req, res) {
  // This API provides search suggestions for ticker symbols using
  // Yahoo Finance's search endpoint.  It accepts a query parameter `q`
  // and returns an array of matches.  See
  // https://query1.finance.yahoo.com/v1/finance/search for more.

  const { q } = req.query;
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', q);
    // We don't need news results in this context.
    url.searchParams.set('newsCount', 0);
    // Set language to English to improve symbol matching.
    url.searchParams.set('lang', 'en-US');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Yahoo Finance search failed: ${response.status}`);
    }
    const data = await response.json();
    // Map results to a simpler structure for the frontend.
    const suggestions = (data.quotes || []).map((item) => ({
      symbol: item.symbol,
      name: item.shortname || item.longname || item.symbol
    }));
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ suggestions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}