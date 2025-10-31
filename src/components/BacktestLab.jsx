// src/components/BacktestLab.jsx
import React, { useState } from 'react';

export default function BacktestLab() {
  const [symbol, setSymbol] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Set default dates
  React.useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const runBacktest = async () => {
    if (!symbol.trim()) {
      setError('Please enter a symbol');
      return;
    }

    if (!fromDate || !toDate) {
      setError('Please select date range');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          from: fromDate,
          to: toDate,
          strategy: {
            rsiPeriod: 14,
            smaPeriodFast: 10,
            smaPeriodSlow: 20,
            atrPeriod: 14,
            rsiOversold: 30,
            rsiOverbought: 70
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to run backtest');
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
      <h2 style={{ marginTop: 0 }}>Backtest Lab</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Test your trading strategy on historical data
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
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
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>

        <button
          onClick={runBacktest}
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
          {loading ? 'Running Backtest...' : 'Run Backtest'}
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
          {/* Metrics */}
          <div style={{
            padding: '15px',
            background: '#f5f5f5',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>Performance Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <MetricCard 
                label="Total Return" 
                value={`${results.metrics.totalReturn}%`}
                color={results.metrics.totalReturn >= 0 ? '#2e7d32' : '#c62828'}
              />
              <MetricCard 
                label="Max Drawdown" 
                value={`${results.metrics.maxDrawdown}%`}
                color="#ff9800"
              />
              <MetricCard 
                label="Win Rate" 
                value={`${results.metrics.winRate}%`}
                color="#1976d2"
              />
              <MetricCard 
                label="Total Trades" 
                value={results.metrics.totalTrades}
                color="#333"
              />
              <MetricCard 
                label="Wins / Losses" 
                value={`${results.metrics.wins} / ${results.metrics.losses}`}
                color="#333"
              />
              <MetricCard 
                label="Avg Risk/Reward" 
                value={results.metrics.avgRR.toFixed(2)}
                color="#9c27b0"
              />
              <MetricCard 
                label="Sharpe Ratio" 
                value={results.metrics.sharpeApprox.toFixed(2)}
                color="#00796b"
              />
              <MetricCard 
                label="Final Capital" 
                value={`$${results.metrics.finalCapital.toFixed(2)}`}
                color="#2e7d32"
              />
            </div>
          </div>

          {/* Trade History */}
          <h3>Trade History</h3>
          {results.trades.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No trades executed during this period
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Entry Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Exit Date</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #e0e0e0' }}>Entry Price</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #e0e0e0' }}>Exit Price</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #e0e0e0' }}>Profit</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #e0e0e0' }}>Return %</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Exit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {results.trades.map((trade, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', border: '1px solid #e0e0e0', fontSize: '12px' }}>
                        {new Date(trade.entryDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e0e0e0', fontSize: '12px' }}>
                        {new Date(trade.exitDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                        ${trade.entryPrice}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                        ${trade.exitPrice}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        border: '1px solid #e0e0e0', 
                        textAlign: 'right',
                        color: trade.profit >= 0 ? '#2e7d32' : '#c62828',
                        fontWeight: 'bold'
                      }}>
                        ${trade.profit}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        border: '1px solid #e0e0e0', 
                        textAlign: 'right',
                        color: trade.profitPercent >= 0 ? '#2e7d32' : '#c62828'
                      }}>
                        {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent}%
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e0e0e0', fontSize: '12px' }}>
                        {trade.exitReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{
      padding: '12px',
      background: 'white',
      borderRadius: '4px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color }}>
        {value}
      </div>
    </div>
  );
}
