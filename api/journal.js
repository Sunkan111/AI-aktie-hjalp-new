// api/journal.js
// Trade journal with Supabase persistence (fallback to file storage)

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Initialize Supabase client if credentials available
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
} else {
  console.warn('⚠️  Supabase credentials not found. Using file-based storage (ephemeral in Vercel).');
}

const JOURNAL_FILE = path.join(process.cwd(), 'data', 'journal.json');

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      return await handlePost(req, res);
    } else if (req.method === 'GET') {
      return await handleGet(req, res);
    } else {
      return res.status(405).json({ error: 'Only GET and POST allowed' });
    }
  } catch (error) {
    console.error('Error in journal endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function handlePost(req, res) {
  const entry = req.body;

  // Validate entry
  if (!entry || typeof entry !== 'object') {
    return res.status(400).json({ error: 'Invalid entry format' });
  }

  // Add timestamp and ID if not present
  const journalEntry = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    ...entry
  };

  // Validate required fields
  if (!journalEntry.symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    if (supabase) {
      // Save to Supabase
      const { data, error } = await supabase
        .from('journal')
        .insert([journalEntry])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      return res.status(201).json({ 
        success: true, 
        entry: data[0],
        storage: 'supabase'
      });
    } else {
      // Fallback to file storage
      const entries = await readJournalFile();
      entries.push(journalEntry);
      await writeJournalFile(entries);

      return res.status(201).json({ 
        success: true, 
        entry: journalEntry,
        storage: 'file',
        warning: 'File storage is ephemeral in Vercel. Configure Supabase for persistence.'
      });
    }
  } catch (error) {
    console.error('Error saving journal entry:', error);
    return res.status(500).json({ 
      error: 'Failed to save entry',
      message: error.message 
    });
  }
}

async function handleGet(req, res) {
  const { symbol, limit = 100, offset = 0 } = req.query;

  try {
    if (supabase) {
      // Query from Supabase
      let query = supabase
        .from('journal')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      return res.status(200).json({ 
        entries: data,
        count: data.length,
        storage: 'supabase'
      });
    } else {
      // Read from file storage
      let entries = await readJournalFile();

      // Filter by symbol if provided
      if (symbol) {
        entries = entries.filter(e => e.symbol === symbol);
      }

      // Sort by timestamp descending
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const paginatedEntries = entries.slice(
        parseInt(offset), 
        parseInt(offset) + parseInt(limit)
      );

      return res.status(200).json({ 
        entries: paginatedEntries,
        count: paginatedEntries.length,
        total: entries.length,
        storage: 'file',
        warning: 'File storage is ephemeral in Vercel. Configure Supabase for persistence.'
      });
    }
  } catch (error) {
    console.error('Error reading journal entries:', error);
    return res.status(500).json({ 
      error: 'Failed to read entries',
      message: error.message 
    });
  }
}

async function readJournalFile() {
  try {
    const data = await fs.readFile(JOURNAL_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

async function writeJournalFile(entries) {
  try {
    // Ensure data directory exists
    await fs.mkdir(path.dirname(JOURNAL_FILE), { recursive: true });
    await fs.writeFile(JOURNAL_FILE, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('Error writing journal file:', error);
    throw error;
  }
}
