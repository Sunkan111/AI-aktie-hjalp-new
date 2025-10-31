import { getSupabaseClient } from '../lib/supabaseClient.js';
import { promises as fs } from 'fs';
import path from 'path';

const JOURNAL_FILE = path.join(process.cwd(), 'data', 'journal.json');

/**
 * Ensures the data directory and journal file exist
 */
async function ensureJournalFile() {
  try {
    const dir = path.dirname(JOURNAL_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    try {
      await fs.access(JOURNAL_FILE);
    } catch {
      // File doesn't exist, create it with empty array
      await fs.writeFile(JOURNAL_FILE, '[]', 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring journal file:', error);
    throw error;
  }
}

/**
 * Reads journal entries from file storage
 */
async function readJournalFromFile() {
  try {
    await ensureJournalFile();
    const data = await fs.readFile(JOURNAL_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading journal file:', error);
    return [];
  }
}

/**
 * Writes journal entries to file storage
 */
async function writeJournalToFile(entries) {
  try {
    await ensureJournalFile();
    await fs.writeFile(JOURNAL_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing journal file:', error);
    throw error;
  }
}

/**
 * Validates journal entry payload
 */
function validateJournalEntry(entry) {
  const required = ['symbol', 'action'];
  const missing = required.filter(field => !entry[field]);
  
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }
  
  return { valid: true };
}

export default async function handler(req, res) {
  const supabase = getSupabaseClient();
  const useSupabase = supabase !== null;

  // GET: Fetch journal entries
  if (req.method === 'GET') {
    try {
      if (useSupabase) {
        const { data, error } = await supabase
          .from('journal')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }

        return res.status(200).json({ entries: data || [] });
      } else {
        // Fallback to file storage
        const entries = await readJournalFromFile();
        return res.status(200).json({ entries });
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch journal entries', 
        message: error.message 
      });
    }
  }

  // POST: Create a new journal entry
  if (req.method === 'POST') {
    try {
      const entry = req.body;
      
      // Validate required fields
      const validation = validateJournalEntry(entry);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      if (useSupabase) {
        // Insert into Supabase
        const insertData = {
          symbol: entry.symbol,
          action: entry.action,
          entry_price: entry.entryPrice || null,
          exit_price: entry.exitPrice || null,
          entry_time: entry.entryTime || null,
          exit_time: entry.exitTime || null,
          pnl: entry.pnl || null,
          note: entry.note || null,
          metadata: entry.metadata || null
        };

        const { data, error } = await supabase
          .from('journal')
          .insert([insertData])
          .select()
          .single();

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }

        return res.status(201).json({ entry: data });
      } else {
        // Fallback to file storage
        const entries = await readJournalFromFile();
        
        const newEntry = {
          id: entries.length > 0 ? Math.max(...entries.map(e => e.id || 0)) + 1 : 1,
          symbol: entry.symbol,
          action: entry.action,
          entryPrice: entry.entryPrice || null,
          exitPrice: entry.exitPrice || null,
          entryTime: entry.entryTime || null,
          exitTime: entry.exitTime || null,
          pnl: entry.pnl || null,
          note: entry.note || null,
          metadata: entry.metadata || null,
          created_at: new Date().toISOString()
        };

        entries.unshift(newEntry); // Add to beginning for DESC order
        await writeJournalToFile(entries);

        return res.status(201).json({ entry: newEntry });
      }
    } catch (error) {
      console.error('Error creating journal entry:', error);
      return res.status(500).json({ 
        error: 'Failed to create journal entry', 
        message: error.message 
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
