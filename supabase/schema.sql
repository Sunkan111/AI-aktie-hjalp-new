-- Journal table for storing trading journal entries
CREATE TABLE IF NOT EXISTS journal (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL,
  entry_price NUMERIC,
  exit_price NUMERIC,
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  pnl NUMERIC,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal (created_at DESC);

-- Create an index on symbol for filtering
CREATE INDEX IF NOT EXISTS idx_journal_symbol ON journal (symbol);
