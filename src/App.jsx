import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, Tooltip, Legend } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import { Chart } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register the necessary Chart.js components
ChartJS.register(
  CandlestickController,
  CandlestickElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
);

// Register the zoom plugin to enable pan/zoom
ChartJS.register(zoomPlugin);

function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [symbol, setSymbol] = useState(null);
  const [candles, setCandles] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  // Dropdown and extended UI state
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // 'chat', 'pastTrades', 'currentTrades', 'topStocks'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [pastTrades, setPastTrades] = useState([]);
  const [currentTrades, setCurrentTrades] = useState([]);
  const [topStocks, setTopStocks] = useState([]);

  // Fetch search suggestions as the user types
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data.results);
      } catch (err) {
        console.error('Error fetching suggestions:', err.message);
      }
    };
    // Debounce suggestions by 300ms
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Fetch candles and recommendation when a symbol is selected
  useEffect(() => {
    if (!symbol) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const candleRes = await axios.get(`/api/candles?symbol=${encodeURIComponent(symbol)}`);
        const { candles: rawCandles } = candleRes.data;
        setCandles(rawCandles);
        updateChart(rawCandles);
        await fetchRecommendation(symbol, rawCandles);
      } catch (err) {
        console.error('Error fetching data:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Set up periodic refresh every 60 seconds
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // Fetch top stocks when menu is opened
  useEffect(() => {
    const fetchTop = async () => {
      try {
        const res = await axios.get('/api/topstocks');
        setTopStocks(res.data.top || []);
      } catch (err) {
        console.error('Error fetching top stocks:', err.message);
      }
    };
    if (activeMenu === 'topStocks' && topStocks.length === 0) {
      fetchTop();
    }
  }, [activeMenu]);

  const updateChart = (candleData) => {
    // Prepare candlestick dataset
    const candlestick = candleData.map((c) => ({ x: c.t, o: c.o, h: c.h, l: c.l, c: c.c }));
    // Compute simple buy/sell signals: flag large upward or downward moves relative to previous close
    const buys = [];
    const sells = [];
    for (let i = 1; i < candleData.length; i++) {
      const prev = candleData[i - 1];
      const cur = candleData[i];
      if (prev && typeof prev.c === 'number' && typeof cur.c === 'number') {
        const change = (cur.c - prev.c) / prev.c;
        if (change > 0.01) {
          buys.push({ x: cur.t, y: cur.c });
        } else if (change < -0.01) {
          sells.push({ x: cur.t, y: cur.c });
        }
      }
    }
    setChartData({
      datasets: [
        {
          label: symbol,
          data: candlestick,
          type: 'candlestick',
          color: {
            up: '#4caf50',
            down: '#f44336',
            unchanged: '#757575',
          },
        },
        {
          type: 'scatter',
          label: 'Buy signals',
          data: buys,
          pointStyle: 'triangle',
          pointBackgroundColor: '#00c853',
          pointBorderColor: '#00c853',
          pointRadius: 5,
        },
        {
          type: 'scatter',
          label: 'Sell signals',
          data: sells,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#d50000',
          pointBorderColor: '#d50000',
          pointRadius: 5,
        },
      ],
    });
  };

  const fetchRecommendation = async (ticker, candleData) => {
    try {
      const res = await axios.post('/api/recommendation', {
        ticker,
        data: candleData,
      });
      setRecommendation(res.data.recommendation);
    } catch (err) {
      console.error('Error fetching recommendation:', err.message);
    }
  };

  const handleSuggestionClick = (item) => {
    setSymbol(item.symbol);
    setQuery(item.symbol);
    setSuggestions([]);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          tooltipFormat: 'PPpp',
        },
        ticks: {
          source: 'auto',
          maxRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        beginAtZero: false,
        position: 'right',
        title: {
          display: true,
          text: 'Pris (USD)',
        },
      },
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          drag: {
            enabled: true,
          },
          mode: 'x',
        },
      },
    },
  };

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Handle menu selection
  const handleMenu = (menu) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
    setShowDropdown(false);
  };

  // Send a chat message to the backend
  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    const userMsg = { sender: 'user', text: msg };
    setChatMessages((msgs) => [...msgs, userMsg]);
    setChatInput('');
    try {
      const res = await axios.post('/api/chat', { message: msg });
      const reply = res.data.reply;
      setChatMessages((msgs) => [...msgs, { sender: 'assistant', text: reply }]);
    } catch (err) {
      setChatMessages((msgs) => [...msgs, { sender: 'assistant', text: 'Kunde inte svara. Försök igen senare.' }]);
    }
  };

  // Render components for each dropdown menu
  const renderActiveMenu = () => {
    switch (activeMenu) {
      case 'chat':
        return (
          <div className="panel chat-panel">
            <div className="chat-log">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`chat-message ${m.sender}`}>{m.text}</div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Skriv ditt meddelande..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendChat();
                }}
              />
              <button onClick={sendChat}>Skicka</button>
            </div>
          </div>
        );
      case 'pastTrades':
        return (
          <div className="panel trades-panel">
            <h3>Tidigare trades</h3>
            {pastTrades.length === 0 ? (
              <p>Inga genomförda trades ännu.</p>
            ) : (
              <ul>
                {pastTrades.map((t, idx) => (
                  <li key={idx}>{`${t.symbol} – ${t.action} @ ${t.price.toFixed(2)} USD`}</li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'currentTrades':
        return (
          <div className="panel trades-panel">
            <h3>Aktuella trades</h3>
            {currentTrades.length === 0 ? (
              <p>Inga öppna positioner.</p>
            ) : (
              <ul>
                {currentTrades.map((t, idx) => (
                  <li key={idx}>{`${t.symbol} – ${t.quantity} st @ ${t.entry.toFixed(2)} USD`}</li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'topStocks':
        return (
          <div className="panel top-panel">
            <h3>Dagens topval</h3>
            {topStocks.length === 0 ? (
              <p>Hämtar topplistan...</p>
            ) : (
              <ol>
                {topStocks.map((s, idx) => (
                  <li key={idx}>{`${s.symbol} (${s.change.toFixed(2)} %)`}</li>
                ))}
              </ol>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>AI Aktie Hjälp</h1>
        <p>Sök efter en aktie och få realtidsdata med AI‑drivna rekommendationer.</p>
        <button className="menu-button" onClick={toggleDropdown}>☰ Meny</button>
        {showDropdown && (
          <div className="dropdown-menu">
            <div onClick={() => handleMenu('chat')}>Chat med AI</div>
            <div onClick={() => handleMenu('pastTrades')}>Tidigare trades</div>
            <div onClick={() => handleMenu('currentTrades')}>Aktuella trades</div>
            <div onClick={() => handleMenu('topStocks')}>Dagens topval</div>
          </div>
        )}
      </header>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Sök efter aktie..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((item) => (
              <div
                key={item.symbol}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(item)}
              >
                {item.symbol} – {item.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="chart-container">
        {chartData ? (
          <Chart type='candlestick' data={chartData} options={chartOptions} />
        ) : (
          <p>Välj en aktie för att se grafen.</p>
        )}
      </div>
      {loading && <div className="loading">Laddar data...</div>}
      {recommendation && (
        <div className="recommendation">
          <strong>AI‑förslag:</strong> {recommendation}
        </div>
      )}
      {/* Render extended menus */}
      {renderActiveMenu()}
    </div>
  );
}

export default App;