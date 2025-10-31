// src/pages/dashboard.jsx
import React, { useState } from 'react';
import Watchlist from '../components/Watchlist';
import SignalCenter from '../components/SignalCenter';
import BacktestLab from '../components/BacktestLab';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('watchlist');

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>
        Trading Dashboard
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
        Analyze signals, backtest strategies, and manage your watchlist
      </p>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('watchlist')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'watchlist' ? '#1976d2' : 'transparent',
            color: activeTab === 'watchlist' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontWeight: activeTab === 'watchlist' ? 'bold' : 'normal'
          }}
        >
          Watchlist
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'signals' ? '#1976d2' : 'transparent',
            color: activeTab === 'signals' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontWeight: activeTab === 'signals' ? 'bold' : 'normal'
          }}
        >
          Signal Center
        </button>
        <button
          onClick={() => setActiveTab('backtest')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'backtest' ? '#1976d2' : 'transparent',
            color: activeTab === 'backtest' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontWeight: activeTab === 'backtest' ? 'bold' : 'normal'
          }}
        >
          Backtest Lab
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {activeTab === 'watchlist' && <Watchlist />}
        {activeTab === 'signals' && <SignalCenter />}
        {activeTab === 'backtest' && <BacktestLab />}
      </div>
    </div>
  );
}
