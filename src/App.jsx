import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

// Register Chart.js components and plugins.
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title,
  zoomPlugin
);

// Helper function to compute simple buy and sell signals based on
// momentum between consecutive closing prices.  Returns two arrays
// containing { x, y } objects for buy and sell points.
function computeSignals(candles) {
  const buys = [];
  const sells = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].c;
    const cur = candles[i].c;
    const change = (cur - prev) / prev;
    // Mark buy when price jumps more than 0.5%
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [pastTrades, setPastTrades] = useState([]);
  const [currentTrades, setCurrentTrades] = useState([]);
  const [topStocks, setTopStocks] = useState([]);

  // Fetch suggestions when the search query changes.
  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (search.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(search.trim())}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        // ignore aborted requests
      }
    };
    fetchSuggestions();
    return () => controller.abort();
  }, [search]);

  // Load candlestick data and recommendation for the selected symbol.
  const loadSymbol = async (symbol, name) => {
    setSelected({ symbol, name });
    setSearch(`${symbol} - ${name}`);
    setSuggestions([]);
    setLoading(true);
    setCandles([]);
    setBuySignals([]);
    setSellSignals([]);
    setRecommendation('');
    try {
      // Fetch recent candlestick data (5 days, 15 minute intervals).
      const resp = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&range=5d&interval=15m`);
      const json = await resp.json();
      const c = json.candles || [];
      setCandles(c);
      // Compute buy and sell signals from candles.
      const { buys, sells } = computeSignals(c);
      setBuySignals(buys);
      setSellSignals(sells);
      // Extract closing prices for recommendation.
      const closes = c.map(item => item.c).filter(val => typeof val === 'number');
      // Fetch AI recommendation.
      const recResp = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, closes })
      });
      const recJson = await recResp.json();
      setRecommendation(recJson.message || recJson.reply || '');
    } catch (error) {
      setRecommendation('Kunde inte hämta data.');
    } finally {
      setLoading(false);
    }
  };

  // Send a chat message to the AI and update chat history.
  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content) return;
    setChatHistory((hist) => [...hist, { role: 'user', content }]);
    setChatInput('');
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      });
      const data = await resp.json();
      setChatHistory((hist) => [...hist, { role: 'ai', content: data.reply || data.message || '' }]);
    } catch (err) {
      setChatHistory((hist) => [...hist, { role: 'ai', content: 'Jag kan tyvärr inte svara just nu.' }]);
    }
  };

  // Fetch top stocks when needed.
  const fetchTopStocks = async () => {
    try {
      const resp = await fetch('/api/topstocks');
      const data = await resp.json();
      setTopStocks(data.top || []);
    } catch (err) {
      setTopStocks([]);
    }
  };

  // Chart.js data and options definition.
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
        yAxisID: 'y'
      },
      {
        label: 'Köp',
        data: buySignals,
        type: 'scatter',
        backgroundColor: '#2e7d32',
        borderColor: '#2e7d32',
        pointRadius: 5,
        yAxisID: 'y'
      },
      {
        label: 'Sälj',
        data: sellSignals,
        type: 'scatter',
        backgroundColor: '#c62828',
        borderColor: '#c62828',
        pointRadius: 5,
        yAxisID: 'y'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'yyyy-MM-dd HH:mm'
        },
        ticks: {
          source: 'data'
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Pris (USD)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            if (ctx.dataset.type === 'scatter') {
              const action = ctx.dataset.label;
              const value = ctx.parsed.y.toFixed(2);
              return `${action}: ${value}`;
            }
            return `Pris: ${ctx.parsed.y.toFixed(2)}`;
          }
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'x'
        },
        pan: {
          enabled: true,
          mode: 'x'
        }
      }
    }
  };

  // Panel rendering helper: returns a panel component based on active panel.
  const renderPanel = () => {
    if (activePanel === 'chat') {
      return (
        <div className="panel">
          <h2>Chat med AI</h2>
          <div className="chat-history">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role === 'ai' ? 'ai' : ''}`}>{msg.content}</div>
            ))}
          </div>
          <div className="chat-input-container">
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
            <button className="chat-send-button" onClick={sendChat}>Skicka</button>
          </div>
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
                <li key={idx}>{`${trade.date}: ${trade.type} ${trade.symbol} @ ${trade.price.toFixed(2)}`}</li>
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
              {currentTrades.map((trade, idx) => (
                <li key={idx}>{`${trade.symbol}: ${trade.type} @ ${trade.price.toFixed(2)}`}</li>
              ))}
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
                <li key={idx}>{`${item.symbol} (${item.pctChange.toFixed(2)}%)`}</li>
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
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>Sök efter en aktie och få realtidsdata med AI‑drivna rekommendationer.</p>
      <div className="search-container">
        <input
          className="search-input"
          type="text"
          placeholder="Sök efter aktie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="suggestions-list">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => loadSymbol(item.symbol, item.name)}
              >
                {item.symbol} – {item.name}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Menu Button */}
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>Meny</button>
      {menuOpen && (
        <div className="dropdown">
          <div className="dropdown-item" onClick={() => { setActivePanel('chat'); setMenuOpen(false); }}>
            Chat med AI
          </div>
          <div className="dropdown-item" onClick={() => { setActivePanel('past'); setMenuOpen(false); }}>
            Tidigare trades
          </div>
          <div className="dropdown-item" onClick={() => { setActivePanel('current'); setMenuOpen(false); }}>
            Aktuella trades
          </div>
          <div className="dropdown-item" onClick={() => { setActivePanel('top'); setMenuOpen(false); fetchTopStocks(); }}>
            Dagens topval
          </div>
        </div>
      )}
      {/* Chart Section */}
      <div style={{ height: '400px', marginTop: '1rem', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '1rem' }}>
        {loading ? (
          <div className="loading">Laddar data...</div>
        ) : candles.length > 0 ? (
          <>
            <Line data={chartData} options={chartOptions} />
            {recommendation && (
              <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>{recommendation}</p>
            )}
          </>
        ) : (
          <p>Välj en aktie för att se grafen.</p>
        )}
      </div>
      {/* Render panel if any is active */}
      {activePanel && renderPanel()}
    </div>
  );
}