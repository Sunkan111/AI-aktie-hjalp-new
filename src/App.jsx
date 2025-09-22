import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title,
  ScatterController,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title,
  zoomPlugin,
  ScatterController,
);

function computeSignals(candles) {
  const buys = [];
  const sells = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].c;
    const cur = candles[i].c;
    const change = (cur - prev) / prev;
    if (change > 0.005) {
      buys.push({ x: candles[i].t, y: cur });
    } else if (change < -0.005) {
      sells.push({ x: candles[i].t, y: cur });
    }
  }
  return { buys, sells };
}

export default function App() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [candles, setCandles] = useState([]);
  const [buySignals, setBuySignals] = useState([]);
  const [sellSignals, setSellSignals] = useState([]);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [pastTrades, setPastTrades] = useState([]);
  const [currentTrades, setCurrentTrades] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [news, setNews] = useState([]);

  // Dessa tre states lades till för marknadsanalys- och säljsignal‑funktionaliteten
  const [marketSuggestions, setMarketSuggestions] = useState([]);
  const [updatingMarket, setUpdatingMarket] = useState(false);
  const [sellMessages, setSellMessages] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (search.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(search.trim())}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        // ignorera fel
      }
    };
    fetchSuggestions();
    return () => controller.abort();
  }, [search]);

  const fetchNews = async (symbol) => {
    try {
      const resp = await fetch('/api/serper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${symbol} aktienyheter` }),
      });
      const data = await resp.json();
      setNews(data.news || []);
    } catch (err) {
      console.error('Kunde inte hämta nyheter:', err);
    }
  };

  const loadSymbol = async (symbol, name) => {
    setSelected({ symbol, name });
    setSearch(`${symbol} - ${name}`);
    setSuggestions([]);
    setLoading(true);
    setAnalyzing(true);
    setCandles([]);
    setBuySignals([]);
    setSellSignals([]);
    setRecommendation('');
    try {
      // 1. Prisdata
      const resp = await fetch(
        `/api/candles?symbol=${encodeURIComponent(symbol)}&range=5d&interval=15m`,
      );
      const json = await resp.json();
      const c = json.candles || [];
      setCandles(c);

      // 2. Köp/Sälj‑signaler
      const { buys, sells } = computeSignals(c);
      setBuySignals(buys);
      setSellSignals(sells);

      // 3. Nyheter via Serper
      await fetchNews(symbol);

      // 4. Slutanalys via Gemini
      const geminiResp = await fetch('/api/gemini-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const geminiJson = await geminiResp.json();
      setRecommendation(
        geminiJson.analysis || 'Ingen analys tillgänglig just nu.',
      );
    } catch (error) {
      console.error('Fel vid laddning av symbol:', error);
      setRecommendation('Kunde inte hämta data.');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content) return;
    setChatHistory((hist) => [...hist, { role: 'user', content }]);
    setChatInput('');
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      const data = await resp.json();
      setChatHistory((hist) => [
        ...hist,
        { role: 'ai', content: data.reply || data.message || '' },
      ]);
    } catch (err) {
      setChatHistory((hist) => [
        ...hist,
        { role: 'ai', content: 'Jag kan tyvärr inte svara just nu.' },
      ]);
    }
  };

  const fetchTopStocks = async () => {
    try {
      const resp = await fetch('/api/topstocks');
      const data = await resp.json();
      setTopStocks(data.top || []);
    } catch (err) {
      // ignorera fel
    }
  };

  // Uppdatera marknaden: hämta trender och analysera med Gemini
  const handleUpdate = async () => {
    setUpdatingMarket(true);
    try {
      const resp = await fetch('/api/topstocks');
      const data = await resp.json();
      const trending = data.top || [];
      const suggestions = [];
      for (const item of trending) {
        try {
          const recResp = await fetch('/api/gemini-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: item.symbol }),
          });
          const recData = await recResp.json();
          const analysis = recData.analysis || recData.message || '';
          if (/köp/i.test(analysis) || /buy/i.test(analysis)) {
            suggestions.push({ symbol: item.symbol, analysis });
          }
          if (suggestions.length >= 5) break;
        } catch (err) {
          // ignorera fel för enskilda aktier
        }
      }
      setMarketSuggestions(suggestions);
    } catch (err) {
      setMarketSuggestions([]);
    } finally {
      setUpdatingMarket(false);
    }
  };

  // Köpfunktion som även genererar säljsignal från AI
  const buyStock = async (symbol) => {
    setCurrentTrades((trades) => [...trades, { symbol }]);
    try {
      const res = await fetch('/api/gemini-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      const analysis = data.analysis || data.message || '';
      setSellMessages((prev) => ({ ...prev, [symbol]: analysis }));
    } catch (err) {
      setSellMessages((prev) => ({
        ...prev,
        [symbol]: 'Ingen säljanalys tillgänglig.',
      }));
    }
  };

  const chartData = {
    datasets: [
      {
        label: selected ? `${selected.symbol} Pris` : 'Pris',
        data: candles.map((c) => ({ x: c.t, y: c.c })),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Köp',
        data: buySignals,
        type: 'scatter',
        backgroundColor: '#2e7d32',
        borderColor: '#2e7d32',
        pointRadius: 5,
        yAxisID: 'y',
      },
      {
        label: 'Sälj',
        data: sellSignals,
        type: 'scatter',
        backgroundColor: '#c62828',
        borderColor: '#c62828',
        pointRadius: 5,
        yAxisID: 'y',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd HH:mm' },
        ticks: { source: 'data' },
      },
      y: {
        beginAtZero: false,
        title: { display: true, text: 'Pris (USD)' },
      },
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            if (ctx.dataset.type === 'scatter') {
              const action = ctx.dataset.label;
              const value = ctx.parsed.y.toFixed(2);
              return `${action}: ${value}`;
            }
            return `Pris: ${ctx.parsed.y.toFixed(2)}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
        pan: { enabled: true, mode: 'x' },
      },
    },
  };

  const renderPanel = () => {
    if (activePanel === 'chat') {
      return (
        <div className="panel">
          <h2>Chat med AI</h2>
          <div className="chat-history">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={msg.role}>
                {msg.content}
              </div>
            ))}
          </div>
          <input
            className="chat-input"
            type="text"
            placeholder="Skriv meddelande..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendChat();
              }
            }}
          />
          <button className="chat-send-button" onClick={sendChat}>
            Skicka
          </button>
        </div>
      );
    } else if (activePanel === 'past') {
      return (
        <div className="panel">
          <h2>Tidigare trades</h2>
          {pastTrades.length === 0 ? (
            <p>Inga genomförda trades ännu.</p>
          ) : (
            <ul>
              {pastTrades.map((trade, idx) => (
                <li key={idx}>
                  {`${trade.date}: ${trade.type} ${trade.symbol} @ ${trade.price.toFixed(2)}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    } else if (activePanel === 'current') {
      return (
        <div className="panel">
          <h2>Aktuella trades</h2>
          {currentTrades.length === 0 ? (
            <p>Inga öppna trades.</p>
          ) : (
            <ul>
              {currentTrades.map((trade, idx) => {
                // Stöd både formatet { symbol } och bara strängen symbol
                const symbol = trade.symbol || trade;
                return (
                  <li key={idx}>
                    <strong>{symbol}</strong>
                    {sellMessages[symbol] && (
                      <p
                        style={{
                          marginLeft: '10px',
                          fontSize: '0.8rem',
                          color: 'gray',
                        }}
                      >
                        {sellMessages[symbol]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    } else if (activePanel === 'top') {
      return (
        <div className="panel">
          <h2>Dagens topval</h2>
          {topStocks.length === 0 ? (
            <p>Laddar...</p>
          ) : (
            <ol>
              {topStocks.map((item, idx) => (
                <li key={idx}>{`${item.symbol} (${item.pctChange.toFixed(
                  2,
                )}%)`}</li>
              ))}
            </ol>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative' }}>
      <h1>AI Aktie Hjälp</h1>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Sök efter en aktie och få realtidsdata med AI‑drivna rekommendationer.
      </p>
      <div className="search-container">
        <input
          className="search-input"
          type="text"
          placeholder="Sök efter aktie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((item, idx) => (
              <li
                key={idx}
                onClick={() => {
                  loadSymbol(item.symbol, item.name);
                }}
              >
                {item.symbol} – {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
        Meny
      </button>
      {menuOpen && (
        <div className="menu-dropdown">
          <button
            onClick={() => {
              setActivePanel('chat');
              setMenuOpen(false);
            }}
          >
            Chat med AI
          </button>
          <button
            onClick={() => {
              setActivePanel('past');
              setMenuOpen(false);
            }}
          >
            Tidigare trades
          </button>
          <button
            onClick={() => {
              setActivePanel('current');
              setMenuOpen(false);
            }}
          >
            Aktuella trades
          </button>
          <button
            onClick={() => {
              setActivePanel('top');
              setMenuOpen(false);
              fetchTopStocks();
            }}
          >
            Dagens topval
          </button>
        </div>
      )}
      {loading ? (
        <p>Laddar data...</p>
      ) : candles.length > 0 ? (
        <>
          <div className="chart-container" style={{ height: '300px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
          {analyzing && <p>AI analyserar data...</p>}
          {recommendation && <p>{recommendation}</p>}
        </>
      ) : (
        <p>Välj en aktie för att se grafen.</p>
      )}
      <div className="market-analysis">
        <h2>Marknadsanalys</h2>
        <button onClick={handleUpdate}>
          {updatingMarket ? 'Analyserar...' : 'Uppdatera'}
        </button>
        {marketSuggestions.length > 0 ? (
          <ul>
            {marketSuggestions.map((item, idx) => (
              <li key={idx}>
                {item.symbol} : {item.analysis}{' '}
                <button onClick={() => buyStock(item.symbol)}>Köp</button>
                {sellMessages[item.symbol] && (
                  <p style={{ fontSize: '0.8rem', color: 'gray' }}>
                    {sellMessages[item.symbol]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>Inga rekommendationer ännu.</p>
        )}
      </div>
      {news.length > 0 && (
        <div className="news-section">
          <h2>Senaste nyheter:</h2>
          <ul>
            {news.map((n, idx) => (
              <li key={idx}>
                <strong>{n.title}</strong>
                <p>{n.snippet}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activePanel && renderPanel()}
    </div>
  );
}
