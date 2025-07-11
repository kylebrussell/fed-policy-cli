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
    
    // First, check if the table exists and get its schema
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='economic_data'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        // Table exists, check if we need to add new columns
        db.all("PRAGMA table_info(economic_data)", (err, columns: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const existingColumns = new Set(columns.map(col => col.name));
          const requiredColumns = Object.keys(FRED_SERIES);
          const missingColumns = requiredColumns.filter(col => !existingColumns.has(col));
          
          if (missingColumns.length > 0) {
            // Add missing columns
            const addColumnPromises = missingColumns.map(columnName => {
              return new Promise<void>((resolve, reject) => {
                const alterQuery = `ALTER TABLE economic_data ADD COLUMN ${columnName} REAL`;
                db.run(alterQuery, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log(`Added column: ${columnName}`);
                    resolve();
                  }
                });
              });
            });
            
            Promise.all(addColumnPromises)
              .then(() => resolve())
              .catch(reject);
          } else {
            resolve();
          }
        });
      } else {
        // Table doesn't exist, create it
        const columns = Object.keys(FRED_SERIES)
          .map(key => `${key} REAL`)
          .join(', \n');

        const query = `
          CREATE TABLE economic_data (
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

// Initialize FOMC projections table for Fed dot plot data
export const initProjectionsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const query = `
      CREATE TABLE IF NOT EXISTS fomc_projections (
        meeting_date TEXT NOT NULL,
        projection_year TEXT NOT NULL,
        median_rate REAL,
        range_midpoint REAL,
        range_low REAL,
        range_high REAL,
        longer_run_median REAL,
        PRIMARY KEY (meeting_date, projection_year)
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

// Insert FOMC projection data
export interface FOMCProjection {
  meeting_date: string;
  projection_year: string;
  median_rate?: number;
  range_midpoint?: number;
  range_low?: number;
  range_high?: number;
  longer_run_median?: number;
}

export const insertProjections = (projections: FOMCProjection[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (projections.length === 0) {
      return resolve();
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO fomc_projections 
      (meeting_date, projection_year, median_rate, range_midpoint, range_low, range_high, longer_run_median)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      projections.forEach(proj => {
        stmt.run([
          proj.meeting_date,
          proj.projection_year,
          proj.median_rate ?? null,
          proj.range_midpoint ?? null,
          proj.range_low ?? null,
          proj.range_high ?? null,
          proj.longer_run_median ?? null
        ]);
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

// Get latest FOMC projections
export const getLatestProjections = (): Promise<FOMCProjection[]> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const query = `
      SELECT * FROM fomc_projections 
      WHERE meeting_date = (SELECT MAX(meeting_date) FROM fomc_projections)
      ORDER BY projection_year ASC
    `;
    
    db.all(query, (err, rows: FOMCProjection[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};