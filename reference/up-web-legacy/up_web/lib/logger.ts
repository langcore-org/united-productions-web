import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Environment detection
const isDev = process.env.NODE_ENV === 'development';

// Log directory setup
const logDir = path.join(process.cwd(), 'log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file paths
const logFile = isDev
  ? path.join(logDir, 'dev.log')
  : path.join(logDir, 'server.log');

const fullLogFile = isDev
  ? path.join(logDir, 'dev.full.log')
  : logFile;

// Log levels
const logLevel = isDev ? 'trace' : 'debug';

// File stream (full log)
const fileStream = fs.createWriteStream(fullLogFile, { flags: 'a' });

// Stream configuration
const streams: pino.StreamEntry[] = [
  {
    level: logLevel,
    stream: fileStream,
  },
];

// Development: Add console output
if (isDev) {
  streams.push({
    level: logLevel,
    stream: process.stdout,
  });
}

// Create logger
export const logger = pino(
  {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  },
  pino.multistream(streams)
);

// Development: 300-line rotation
if (isDev) {
  const MAX_LINES = 300;
  const TAIL_INTERVAL = 10000; // 10 seconds

  setInterval(() => {
    try {
      if (fs.existsSync(fullLogFile)) {
        const content = fs.readFileSync(fullLogFile, 'utf-8');
        const lines = content.split('\n').filter(Boolean);

        // Extract last 300 lines
        const tailLines = lines.slice(-MAX_LINES);

        // Write to dev.log (AI analysis target)
        fs.writeFileSync(logFile, tailLines.join('\n') + '\n');
      }
    } catch (error) {
      console.error('Failed to rotate log:', error);
    }
  }, TAIL_INTERVAL);
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.flush();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.flush();
  process.exit(0);
});

// Child logger factory
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
