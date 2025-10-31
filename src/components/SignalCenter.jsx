// src/components/SignalCenter.jsx
import React, { useState } from 'react';

export default function SignalCenter() {
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('15min');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const fetchSignals = async () => {
    if (!symbol.trim()) {
      setError('Please enter a symbol');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          interval,
          rangeDays: 5
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch signals');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Signal Center</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Analyze trading signals based on technical indicators
      </p>

      <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Symbol
          </label>
          <input
            type="text"
            placeholder="e.g., AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            <option value="1min">1 minute</option>
            <option value="5min">5 minutes</option>
            <option value="15min">15 minutes</option>
            <option value="30min">30 minutes</option>
            <option value="1h">1 hour</option>
            <option value="1day">1 day</option>
          </select>
        </div>

        <button
          onClick={fetchSignals}
          disabled={loading}
          style={{
            padding: '12px',
            background: loading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Analyzing...' : 'Get Signals'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {results && (
        <div>
          {/* Current Indicators */}
          <div style={{
            padding: '15px',
            background: '#f5f5f5',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>Current Indicators</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div>
                <strong>Price:</strong> ${results.indicators.currentPrice}
              </div>
              <div>
                <strong>RSI:</strong> {results.indicators.rsi}
              </div>
              <div>
                <strong>SMA Fast:</strong> {results.indicators.sma_fast}
              </div>
              <div>
                <strong>SMA Slow:</strong> {results.indicators.sma_slow}
              </div>
              <div>
                <strong>ATR:</strong> {results.indicators.atr}
              </div>
            </div>
          </div>

          {/* Signals */}
          <h3>Trading Signals</h3>
          {results.signals.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No signals detected at this time
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {results.signals.map((signal, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '15px',
                    border: `2px solid ${signal.type === 'BUY' ? '#2e7d32' : '#c62828'}`,
                    borderRadius: '4px',
                    background: signal.type === 'BUY' ? '#e8f5e9' : '#ffebee'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: signal.type === 'BUY' ? '#2e7d32' : '#c62828' }}>
                      {signal.type} SIGNAL
                    </h4>
                    <span style={{ 
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Strength: {(signal.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p style={{ margin: '10px 0', color: '#333' }}>
                    {signal.explanation}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                    <div>
                      <strong>Stop Loss:</strong> ${signal.stopLoss}
                    </div>
                    <div>
                      <strong>Take Profit:</strong> ${signal.takeProfit}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                    {new Date(signal.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
