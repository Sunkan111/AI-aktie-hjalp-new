# API Usage Examples

This document provides curl examples for all API endpoints.

## Setup

Set your environment variables in Vercel or locally in `.env`:

```bash
cp .env.example .env
# Edit .env and add your API keys
```

## Signals API

Generate trading signals for a symbol:

```bash
# Production (replace with your Vercel URL)
curl -X POST https://your-app.vercel.app/api/signals \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "interval": "15min",
    "rangeDays": 5
  }'

# Local development (Vite dev server)
curl -X POST http://localhost:5173/api/signals \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "interval": "15min",
    "rangeDays": 5
  }'
```

Response:
```json
{
  "signals": [
    {
      "type": "BUY",
      "strength": 0.75,
      "stopLoss": 145.50,
      "takeProfit": 152.30,
      "timestamp": 1698345600000,
      "explanation": "RSI oversold (28.45) with golden cross"
    }
  ],
  "indicators": {
    "rsi": 28.45,
    "sma_fast": 148.20,
    "sma_slow": 147.80,
    "macd": { "macd": "0.45", "signal": "0.32", "histogram": "0.13" },
    "atr": 2.15,
    "currentPrice": 148.50
  },
  "candles": [...]
}
```

## Backtest API

Backtest a strategy on historical data:

```bash
# Production
curl -X POST https://your-app.vercel.app/api/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "from": "2024-01-01",
    "to": "2024-10-26",
    "strategy": {
      "rsiPeriod": 14,
      "smaPeriodFast": 10,
      "smaPeriodSlow": 20,
      "atrPeriod": 14,
      "rsiOversold": 30,
      "rsiOverbought": 70
    }
  }'

# Local development
curl -X POST http://localhost:5173/api/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "from": "2024-01-01",
    "to": "2024-10-26"
  }'
```

Response:
```json
{
  "trades": [
    {
      "entryDate": "2024-01-15T00:00:00.000Z",
      "exitDate": "2024-01-22T00:00:00.000Z",
      "entryPrice": 145.20,
      "exitPrice": 150.80,
      "shares": 68,
      "profit": 380.80,
      "profitPercent": 3.86,
      "exitReason": "TAKE_PROFIT"
    }
  ],
  "metrics": {
    "totalReturn": 15.25,
    "maxDrawdown": 8.50,
    "winRate": 65.00,
    "totalTrades": 20,
    "wins": 13,
    "losses": 7,
    "avgRR": 1.85,
    "sharpeApprox": 1.42,
    "finalCapital": 11525.00,
    "initialCapital": 10000
  },
  "strategy": {...}
}
```

## Journal API

### Save a trade entry

```bash
# Production
curl -X POST https://your-app.vercel.app/api/journal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "type": "BUY",
    "entry_price": 150.00,
    "exit_price": 155.00,
    "profit": 500,
    "notes": "RSI signal worked well"
  }'

# Local development
curl -X POST http://localhost:5173/api/journal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "type": "BUY",
    "entry_price": 150.00,
    "notes": "Testing RSI signal"
  }'
```

Response:
```json
{
  "success": true,
  "entry": {
    "id": "1698345600000-abc123",
    "timestamp": "2024-10-26T12:00:00.000Z",
    "symbol": "AAPL",
    "type": "BUY",
    "entry_price": 150.00,
    "exit_price": 155.00,
    "profit": 500,
    "notes": "RSI signal worked well"
  },
  "storage": "supabase"
}
```

### Get journal entries

```bash
# Get all entries (local dev)
curl http://localhost:5173/api/journal

# Get entries for specific symbol
curl "http://localhost:5173/api/journal?symbol=AAPL"

# Get entries with pagination
curl "http://localhost:5173/api/journal?limit=50&offset=0"

# Production
curl "https://your-app.vercel.app/api/journal?symbol=AAPL"
```

Response:
```json
{
  "entries": [...],
  "count": 50,
  "storage": "supabase"
}
```

## Notify API

### Send email notification

```bash
# Local development
curl -X POST http://localhost:5173/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "payload": {
      "to": "trader@example.com",
      "subject": "Trading Signal Alert - AAPL",
      "text": "BUY signal detected for AAPL at $150.00",
      "html": "<h2>BUY Signal</h2><p>AAPL at $150.00</p>"
    }
  }'
```

Response:
```json
{
  "success": true,
  "results": {
    "email": {
      "success": true,
      "statusCode": 202,
      "messageId": "abc123"
    },
    "webPush": null
  },
  "configured": {
    "sendGrid": true,
    "webPush": false
  }
}
```

### Send web push notification

```bash
# Local development
curl -X POST http://localhost:5173/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "webpush",
    "payload": {
      "subscription": {
        "endpoint": "https://fcm.googleapis.com/fcm/send/...",
        "keys": {
          "p256dh": "...",
          "auth": "..."
        }
      },
      "notification": {
        "title": "Trading Signal",
        "body": "BUY signal for AAPL",
        "icon": "/icon.png"
      }
    }
  }'
```

### Send both email and web push

```bash
# Local development
curl -X POST http://localhost:5173/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all",
    "payload": {
      "to": "trader@example.com",
      "subject": "Trading Signal Alert",
      "text": "BUY signal detected",
      "subscription": {...},
      "notification": {...}
    }
  }'
```

## Gemini Analysis API

Get AI-powered market analysis:

```bash
# Local development
curl -X POST http://localhost:5173/api/gemini-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL"
  }'

# Production
curl -X POST https://your-app.vercel.app/api/gemini-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL"
  }'
```

Response:
```json
{
  "analysis": "Based on current market data and sentiment analysis...",
  "cached": false
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created (for POST journal)
- `400` - Bad Request (missing/invalid parameters)
- `405` - Method Not Allowed
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error description",
  "message": "Additional details"
}
```

## Rate Limits

Be aware of API provider rate limits:

- **Twelve Data (free)**: 8 calls/minute, 800/day
- **Alpha Vantage (free)**: 5 calls/minute, 500/day
- **NewsAPI (free)**: 100 requests/day
- **Serper (free)**: 2,500 requests/month

## Testing Locally

1. Start the development server:
```bash
npm run dev
```

The Vite dev server will start on `http://localhost:5173` by default.

2. Test endpoints using the local dev URL:
```bash
# Test signals
curl -X POST http://localhost:5173/api/signals \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL"}'

# Test backtest
curl -X POST http://localhost:5173/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "from": "2024-01-01", "to": "2024-10-26"}'
```

**Note**: Vite's dev server runs on port 5173 and proxies API requests to the serverless functions.

## Production Usage

Replace the local URL with your Vercel deployment URL:

```bash
curl -X POST https://your-app.vercel.app/api/signals \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL"}'
```

## Notes

- Ensure all required environment variables are set before using the APIs
- The gemini-analysis endpoint has a 60-second cache to reduce API calls
- Journal entries are stored in Supabase if configured, otherwise in ephemeral file storage
- Web Push requires subscription object from browser's Push API
