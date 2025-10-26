// src/components/Watchlist.jsx
import React, { useState, useEffect } from 'react';

export default function Watchlist() {
  const [symbols, setSymbols] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setSymbols(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever symbols change
  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(symbols));
  }, [symbols]);

  const addSymbol = () => {
    const trimmed = newSymbol.trim().toUpperCase();
    if (trimmed && !symbols.includes(trimmed)) {
      setSymbols([...symbols, trimmed]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const fetchQuote = async (symbol) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/candles?symbol=${symbol}&range=1d&interval=1day`);
      const data = await response.json();
      
      if (data.candles && data.candles.length > 0) {
        const latest = data.candles[data.candles.length - 1];
        return {
          price: latest.c.toFixed(2),
          change: data.candles.length > 1 
            ? ((latest.c - data.candles[0].o) / data.candles[0].o * 100).toFixed(2)
            : '0.00'
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Your Watchlist</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Add symbol (e.g., AAPL)"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={addSymbol}
          style={{
            padding: '8px 16px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>

      {symbols.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
          No symbols in watchlist. Add some to get started!
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {symbols.map((symbol) => (
            <WatchlistItem 
              key={symbol} 
              symbol={symbol} 
              onRemove={() => removeSymbol(symbol)}
              fetchQuote={fetchQuote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistItem({ symbol, onRemove, fetchQuote }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadQuote = async () => {
      setLoading(true);
      const data = await fetchQuote(symbol);
      setQuote(data);
      setLoading(false);
    };
    loadQuote();
  }, [symbol]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      background: '#fafafa'
    }}>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: '18px' }}>{symbol}</strong>
        {loading ? (
          <span style={{ marginLeft: '10px', color: '#666' }}>Loading...</span>
        ) : quote ? (
          <div style={{ fontSize: '14px', marginTop: '4px', color: '#666' }}>
            Price: ${quote.price} 
            <span style={{ 
              marginLeft: '10px',
              color: parseFloat(quote.change) >= 0 ? '#2e7d32' : '#c62828'
            }}>
              {parseFloat(quote.change) >= 0 ? '+' : ''}{quote.change}%
            </span>
          </div>
        ) : null}
      </div>
      <button
        onClick={onRemove}
        style={{
          padding: '6px 12px',
          background: '#c62828',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Remove
      </button>
    </div>
  );
}
