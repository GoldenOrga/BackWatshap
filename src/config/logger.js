// src/config/logger.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'INFO', message, data };
    console.log(`[${timestamp}] ℹ️ ${message}`, data);
    appendLog(logEntry);
  },

  error: (message, error = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'ERROR', message, error: error.message || error };
    console.error(`[${timestamp}] ❌ ${message}`, error);
    appendLog(logEntry);
  },

  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'WARN', message, data };
    console.warn(`[${timestamp}] ⚠️ ${message}`, data);
    appendLog(logEntry);
  },

  debug: (message, data = {}) => {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      const logEntry = { timestamp, level: 'DEBUG', message, data };
      console.log(`[${timestamp}] 🐛 ${message}`, data);
      appendLog(logEntry);
    }
  }
};

const appendLog = (logEntry) => {
  const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

export default logger;
