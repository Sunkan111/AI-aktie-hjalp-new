# AI Aktie Hjälp - Vercel Deployment Guide

This guide explains how to deploy and configure the AI Stock Helper application on Vercel.

## Prerequisites

- Vercel account
- API keys for required services (see below)
- Node.js 18+ installed locally for development

## Required API Keys

The application uses several external services. You'll need to obtain API keys for:

### Market Data (At least one required)
- **Twelve Data** (Primary): https://twelvedata.com/
- **Alpha Vantage** (Fallback): https://www.alphavantage.co/

### AI Analysis
- **Gemini API** (Required): https://makersuite.google.com/app/apikey
- **OpenRouter** (Optional): https://openrouter.ai/
- **OpenAI** (Optional): https://platform.openai.com/

### News & Social
- **NewsAPI** (Optional): https://newsapi.org/
- **Serper** (Optional): https://serper.dev/
- **X/Twitter API** (Optional): https://developer.twitter.com/

### Database
- **Supabase** (Recommended for persistence): https://supabase.com/

### Notifications
- **SendGrid** (Optional for email): https://sendgrid.com/
- **Web Push VAPID Keys** (Optional for push notifications)

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sunkan111/AI-aktie-hjalp-new.git
   cd AI-aktie-hjalp-new
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Run locally with Vercel CLI**
   ```bash
   npm install -g vercel
   vercel dev
   ```

   The app will be available at `http://localhost:3000`

5. **Or run with Vite**
   ```bash
   npm run dev
   ```

## Vercel Deployment

### Option 1: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure environment variables (see below)
4. Deploy

### Option 2: Deploy via CLI

```bash
vercel
# Follow the prompts
```

## Environment Variables Setup

In your Vercel project settings, add these environment variables:

### Required
```
TWELVE_DATA_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

### Recommended
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### Optional
```
ALPHA_VANTAGE_API_KEY=your_key_here
NEWSAPI_API_KEY=your_key_here
SERPER_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
X_API_BEARER=your_bearer_token
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your_email@example.com
```

## Supabase Setup

If using Supabase for trade journal persistence:

1. Create a new project at https://supabase.com/
2. Create a table called `journal`:

```sql
CREATE TABLE journal (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT,
  entry_price DECIMAL,
  exit_price DECIMAL,
  profit DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX idx_journal_symbol ON journal(symbol);
CREATE INDEX idx_journal_timestamp ON journal(timestamp DESC);
```

3. Get your project URL and anon key from Settings > API
4. Add to Vercel environment variables

**Note:** Without Supabase, the app will use file-based storage which is ephemeral in Vercel (data will be lost on redeploys).

## Web Push Setup (Optional)

To enable web push notifications, generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add the generated keys to your environment variables.

## API Endpoints

### Trading Signals
```bash
POST /api/signals
Content-Type: application/json

{
  "symbol": "AAPL",
  "interval": "15min",
  "rangeDays": 5
}
```

### Backtesting
```bash
POST /api/backtest
Content-Type: application/json

{
  "symbol": "AAPL",
  "from": "2024-01-01",
  "to": "2024-10-26",
  "strategy": {
    "rsiPeriod": 14,
    "smaPeriodFast": 10,
    "smaPeriodSlow": 20
  }
}
```

### Journal
```bash
# Save entry
POST /api/journal
Content-Type: application/json

{
  "symbol": "AAPL",
  "type": "BUY",
  "entry_price": 150.00,
  "notes": "Testing RSI signal"
}

# Get entries
GET /api/journal?symbol=AAPL&limit=100
```

### Notifications
```bash
POST /api/notify
Content-Type: application/json

{
  "type": "email",
  "payload": {
    "to": "user@example.com",
    "subject": "Trading Signal Alert",
    "text": "BUY signal detected for AAPL"
  }
}
```

### Gemini Analysis
```bash
POST /api/gemini-analysis
Content-Type: application/json

{
  "symbol": "AAPL"
}
```

## Testing

Run unit tests:
```bash
npm test
```

## Troubleshooting

### API Rate Limits
- Twelve Data free tier: 8 API calls/minute, 800/day
- Alpha Vantage free tier: 5 API calls/minute, 500/day
- Consider upgrading if you hit limits frequently

### Supabase Connection Issues
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check that the `journal` table exists
- Ensure RLS (Row Level Security) policies allow inserts/selects

### Cache Issues
- Gemini analysis is cached for 60 seconds
- Clear cache by redeploying or waiting for TTL expiration

## Performance Tips

1. Use Twelve Data as primary API (faster than Alpha Vantage)
2. Enable Supabase for persistent storage
3. Implement client-side caching for frequent requests
4. Use longer intervals (1h, 1day) to reduce API calls

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review API provider documentation

## License

This project is private and proprietary.
