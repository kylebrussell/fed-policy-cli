// /src/services/database.ts
import sqlite3 from 'sqlite3';
import { DB_PATH, FRED_SERIES, CROSS_ASSET_SERIES } from '../constants';
import { EconomicDataPoint } from '../types';
import { ETFDataPoint, ETFFundamentals } from './etfDataService';

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

// Cross-Asset Data Tables and Functions

// Initialize cross-asset data table for FRED commodities/currencies
export const initCrossAssetTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    
    // Check if the table exists and get its schema
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='cross_asset_data'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        // Table exists, check if we need to add new columns
        db.all("PRAGMA table_info(cross_asset_data)", (err, columns: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const existingColumns = new Set(columns.map(col => col.name));
          const requiredColumns = Object.keys(CROSS_ASSET_SERIES);
          const missingColumns = requiredColumns.filter(col => !existingColumns.has(col));
          
          if (missingColumns.length > 0) {
            // Add missing columns
            const addColumnPromises = missingColumns.map(columnName => {
              return new Promise<void>((resolve, reject) => {
                const alterQuery = `ALTER TABLE cross_asset_data ADD COLUMN ${columnName} REAL`;
                db.run(alterQuery, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log(`Added cross-asset column: ${columnName}`);
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
        const columns = Object.keys(CROSS_ASSET_SERIES)
          .map(key => `${key} REAL`)
          .join(', \n');

        const query = `
          CREATE TABLE cross_asset_data (
            date TEXT PRIMARY KEY,
            ${columns}
          )
        `;

        db.run(query, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Created cross_asset_data table');
            resolve();
          }
        });
      }
    });
  });
};

// Initialize ETF data table for Alpha Vantage data
export const initETFTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const query = `
      CREATE TABLE IF NOT EXISTS etf_data (
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume INTEGER,
        asset_class TEXT,
        PRIMARY KEY (symbol, date)
      )
    `;

    db.run(query, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Initialized etf_data table');
        resolve();
      }
    });
  });
};

// Initialize ETF fundamentals table
export const initETFFundamentalsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const query = `
      CREATE TABLE IF NOT EXISTS etf_fundamentals (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        net_assets REAL,
        expense_ratio REAL,
        yield_percent REAL,
        asset_class TEXT,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(query, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Initialized etf_fundamentals table');
        resolve();
      }
    });
  });
};

// Cross-asset data point interface
export interface CrossAssetDataPoint {
  date: string;
  [key: string]: string | number | null | undefined;
}

// Insert cross-asset FRED data
export const insertCrossAssetData = (data: CrossAssetDataPoint[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (data.length === 0) {
      return resolve();
    }

    const db = getDb();
    const allKeys = Object.keys(CROSS_ASSET_SERIES);
    const columns = ['date', ...allKeys];
    const placeholders = columns.map(() => '?').join(', ');

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cross_asset_data (${columns.join(', ')})
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

// Insert ETF historical data
export const insertETFData = (data: ETFDataPoint[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (data.length === 0) {
      return resolve();
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO etf_data 
      (symbol, name, date, open, high, low, close, volume, asset_class)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      data.forEach(point => {
        stmt.run([
          point.symbol,
          point.name,
          point.date,
          point.open,
          point.high,
          point.low,
          point.close,
          point.volume,
          null // asset_class will be set from fundamentals
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

// Insert ETF fundamentals
export const insertETFFundamentals = (fundamentals: ETFFundamentals[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (fundamentals.length === 0) {
      return resolve();
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO etf_fundamentals 
      (symbol, name, net_assets, expense_ratio, yield_percent, asset_class)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      fundamentals.forEach(fund => {
        stmt.run([
          fund.symbol,
          fund.name,
          fund.netAssets,
          fund.expenseRatio,
          fund.yieldPercent,
          fund.assetClass
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

// Get all cross-asset data
export const getAllCrossAssetData = (): Promise<CrossAssetDataPoint[]> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all('SELECT * FROM cross_asset_data ORDER BY date ASC', (err, rows: CrossAssetDataPoint[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

// Get all ETF data
export const getAllETFData = (): Promise<ETFDataPoint[]> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all('SELECT * FROM etf_data ORDER BY symbol, date ASC', (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        const etfData: ETFDataPoint[] = rows.map(row => ({
          symbol: row.symbol,
          name: row.name,
          date: row.date,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume
        }));
        resolve(etfData);
      }
    });
  });
};

// Get ETF data for specific symbols
export const getETFDataBySymbols = (symbols: string[]): Promise<ETFDataPoint[]> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const placeholders = symbols.map(() => '?').join(', ');
    const query = `SELECT * FROM etf_data WHERE symbol IN (${placeholders}) ORDER BY symbol, date ASC`;
    
    db.all(query, symbols, (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        const etfData: ETFDataPoint[] = rows.map(row => ({
          symbol: row.symbol,
          name: row.name,
          date: row.date,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume
        }));
        resolve(etfData);
      }
    });
  });
};

// Get ETF fundamentals
export const getAllETFFundamentals = (): Promise<ETFFundamentals[]> => {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all('SELECT * FROM etf_fundamentals ORDER BY symbol ASC', (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        const fundamentals: ETFFundamentals[] = rows.map(row => ({
          symbol: row.symbol,
          name: row.name,
          netAssets: row.net_assets,
          expenseRatio: row.expense_ratio,
          yieldPercent: row.yield_percent,
          assetClass: row.asset_class
        }));
        resolve(fundamentals);
      }
    });
  });
};