// /src/services/database.ts
import sqlite3 from 'sqlite3';
import { DB_PATH, FRED_SERIES } from '../constants';
import { EconomicDataPoint } from '../types';

let db: sqlite3.Database;

const getDb = () => {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
};

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const columns = Object.keys(FRED_SERIES)
      .map(key => `${key} REAL`)
      .join(', \n');

    const query = `
      CREATE TABLE IF NOT EXISTS economic_data (
        date TEXT PRIMARY KEY,
        ${columns}
      )
    `;

    db.run(query, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const insertData = (data: EconomicDataPoint[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (data.length === 0) {
      return resolve();
    }

    const db = getDb();
    const allKeys = Object.keys(FRED_SERIES);
    const columns = ['date', ...allKeys];
    const placeholders = columns.map(() => '?').join(', ');

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO economic_data (${columns.join(', ')})
      VALUES (${placeholders})
    `);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      data.forEach(point => {
        const values = columns.map(col => point[col] ?? null);
        stmt.run(values);
      });
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
        } else {
          stmt.finalize(err => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  });
};

export const getAllData = (): Promise<EconomicDataPoint[]> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all('SELECT * FROM economic_data ORDER BY date ASC', (err, rows: EconomicDataPoint[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};