// /src/services/database.ts
import sqlite3 from 'sqlite3';
import { DB_PATH } from '../constants';
import { EconomicDataPoint } from '../types';

let db: sqlite3.Database;

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        db.run(`
          CREATE TABLE IF NOT EXISTS economic_data (
            date TEXT PRIMARY KEY,
            unemployment_rate REAL,
            cpi_yoy REAL,
            fed_funds_rate REAL
          )
        `, (err) => {
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
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO economic_data (date, unemployment_rate, cpi_yoy, fed_funds_rate)
      VALUES (?, ?, ?, ?)
    `);

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      data.forEach(point => {
        stmt.run(point.date, point.unemployment_rate, point.cpi_yoy, point.fed_funds_rate);
      });
      db.run("COMMIT", (err) => {
        if(err) {
          reject(err)
        } else {
          stmt.finalize();
          resolve();
        }
      });
    })
  });
};

export const queryByDateRange = (start: string, end: string): Promise<EconomicDataPoint[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM economic_data WHERE date BETWEEN ? AND ? ORDER BY date ASC',
      [start, end],
      (err, rows: EconomicDataPoint[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

export const getAllData = (): Promise<EconomicDataPoint[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM economic_data ORDER BY date ASC', (err, rows: EconomicDataPoint[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};
