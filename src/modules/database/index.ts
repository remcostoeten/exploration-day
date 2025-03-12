import { Database } from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db: any = null;

/**
 * Get or initialize the database connection
 * @returns SQLite database instance
 */
export async function getDb() {
  if (db) return db;

  // Get database path from environment variable or use default
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'knowledge.db');

  // Open database connection
  db = await open({
    filename: dbPath,
    driver: Database
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * Close the database connection
 */
export async function closeDb() {
  if (db) {
    await db.close();
    db = null;
  }
}
