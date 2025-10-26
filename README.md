# AI Aktie Hjälp Pro

A stock analysis and trading journal application with AI-powered insights.

## Features

- Real-time stock data and analysis
- AI-powered recommendations
- Trading journal with persistent storage (Supabase or local file)
- Interactive charts and visualizations

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sunkan111/AI-aktie-hjalp-new.git
   cd AI-aktie-hjalp-new
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env` (see Configuration section)

### Configuration

Create a `.env` file based on `.env.example`:

```env
# Supabase (optional - will fall back to file storage if not set)
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# OpenAI (optional)
OPENAI_API_KEY=your-openai-key
```

#### Supabase Setup (Optional)

The application supports two storage modes for the trading journal:

1. **Supabase** (recommended for production): Persistent cloud database
2. **File Storage** (automatic fallback): Local `data/journal.json` file

If `SUPABASE_URL` and `SUPABASE_KEY` are not set, the app automatically uses file storage.

For Supabase setup instructions, see [README-VERCEL.md](./README-VERCEL.md).

## Development

### Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Endpoints

### Trading Journal API

#### GET /api/journal

Retrieves all journal entries.

**Response:**
```json
{
  "entries": [
    {
      "id": 1,
      "symbol": "AAPL",
      "action": "BUY",
      "entryPrice": 150.50,
      "exitPrice": 155.75,
      "entryTime": "2024-01-15T10:30:00Z",
      "exitTime": "2024-01-16T14:00:00Z",
      "pnl": 5.25,
      "note": "Strong earnings report",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Example:**
```bash
# Using curl
curl http://localhost:5173/api/journal

# Using httpie
http GET http://localhost:5173/api/journal
```

#### POST /api/journal

Creates a new journal entry.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "action": "BUY",
  "entryPrice": 150.50,
  "exitPrice": 155.75,
  "entryTime": "2024-01-15T10:30:00Z",
  "exitTime": "2024-01-16T14:00:00Z",
  "pnl": 5.25,
  "note": "Strong earnings report"
}
```

**Required Fields:**
- `symbol` (string): Stock ticker symbol
- `action` (string): Trade action (e.g., "BUY", "SELL")

**Optional Fields:**
- `entryPrice` (number): Entry price
- `exitPrice` (number): Exit price
- `entryTime` (string): Entry timestamp (ISO 8601)
- `exitTime` (string): Exit timestamp (ISO 8601)
- `pnl` (number): Profit/loss amount
- `note` (string): Trade notes
- `metadata` (object): Additional metadata

**Response:**
```json
{
  "entry": {
    "id": 1,
    "symbol": "AAPL",
    "action": "BUY",
    "entryPrice": 150.50,
    "exitPrice": 155.75,
    "entryTime": "2024-01-15T10:30:00Z",
    "exitTime": "2024-01-16T14:00:00Z",
    "pnl": 5.25,
    "note": "Strong earnings report",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Examples:**

```bash
# Create a simple trade entry
curl -X POST http://localhost:5173/api/journal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "BUY",
    "entryPrice": 150.50,
    "note": "Test trade"
  }'

# Create a complete trade entry
curl -X POST http://localhost:5173/api/journal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TSLA",
    "action": "SELL",
    "entryPrice": 250.00,
    "exitPrice": 275.50,
    "entryTime": "2024-01-15T09:30:00Z",
    "exitTime": "2024-01-20T15:00:00Z",
    "pnl": 25.50,
    "note": "Good momentum trade",
    "metadata": {"strategy": "momentum"}
  }'

# Using httpie
http POST http://localhost:5173/api/journal \
  symbol="AAPL" \
  action="BUY" \
  entryPrice:=150.50 \
  note="Test trade"
```

**Error Responses:**

```bash
# 400 Bad Request - Missing required fields
{
  "error": "Missing required fields: symbol, action"
}

# 405 Method Not Allowed
{
  "error": "Method not allowed"
}

# 500 Internal Server Error
{
  "error": "Failed to create journal entry",
  "message": "Detailed error message"
}
```

## Testing the Journal API

### 1. Test with File Storage (No Supabase)

Make sure `SUPABASE_URL` and `SUPABASE_KEY` are not set in your `.env`:

```bash
# Start the dev server
npm run dev

# In another terminal, create an entry
curl -X POST http://localhost:5173/api/journal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "BUY",
    "entryPrice": 150.50,
    "note": "Test entry"
  }'

# Retrieve all entries
curl http://localhost:5173/api/journal

# Check the file directly
cat data/journal.json
```

### 2. Test with Supabase

1. Set up Supabase following [README-VERCEL.md](./README-VERCEL.md)
2. Add `SUPABASE_URL` and `SUPABASE_KEY` to your `.env`
3. Apply the schema from `supabase/schema.sql`
4. Run the same curl commands as above
5. Verify entries in the Supabase dashboard → Table Editor → journal table

### 3. Automated Testing

```bash
# Test file operations
node -e "
import { promises as fs } from 'fs';
const data = await fs.readFile('data/journal.json', 'utf-8');
console.log('Journal entries:', JSON.parse(data).length);
"

# Test Supabase client (should return null without env vars)
node -e "
import { getSupabaseClient } from './lib/supabaseClient.js';
const client = getSupabaseClient();
console.log('Supabase client:', client === null ? 'null (expected)' : 'initialized');
"
```

## Deployment

### Vercel (Recommended)

1. Import your repository in Vercel
2. Add environment variables in Project Settings
3. Deploy

See [README-VERCEL.md](./README-VERCEL.md) for detailed Supabase setup instructions.

### Other Platforms

The application is a standard Vite + React app and can be deployed to any platform that supports Node.js serverless functions (or Vercel-compatible API routes).

## Project Structure

```
.
├── api/                    # Serverless API endpoints
│   ├── journal.js         # Trading journal API
│   ├── chat.js            # AI chat endpoint
│   └── ...                # Other API endpoints
├── lib/                   # Shared libraries
│   └── supabaseClient.js  # Supabase client factory
├── data/                  # Local data storage
│   └── journal.json       # Trading journal (file storage fallback)
├── supabase/              # Database schema and migrations
│   └── schema.sql         # Journal table schema
├── src/                   # React application source
├── .env.example           # Environment variables template
├── README.md              # This file
├── README-VERCEL.md       # Vercel/Supabase setup guide
└── package.json           # Dependencies and scripts
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run migrate:schema` - Display schema migration instructions

## Technologies

- **Frontend**: React, Vite, Chart.js
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (optional, falls back to file storage)
- **AI**: OpenAI API (optional)

## License

Private project

## Contributing

This is a private repository. Contact the owner for contribution guidelines.
