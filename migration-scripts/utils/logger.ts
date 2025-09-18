import fs from 'fs';
import path from 'path';

/**
 * Migration Logger Utility
 * Provides structured logging for migration progress tracking
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

export class MigrationLogger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logFile: string;
  private logEntries: LogEntry[] = [];

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'migration-scripts', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(logsDir, `migration-${timestamp}.log`);
    
    this.info('Migration logger initialized', 'LOGGER', { logFile: this.logFile });
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level].padEnd(5);
    const contextStr = context ? `[${context}] ` : '';
    const dataStr = data ? ` | ${JSON.stringify(data, this.bigIntReplacer)}` : '';
    
    return `${timestamp} ${levelStr} ${contextStr}${message}${dataStr}`;
  }

  private bigIntReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };

    this.logEntries.push(logEntry);
    
    const formattedMessage = this.formatMessage(level, message, context, data);
    
    // Console output with colors
    const consoleMessage = this.getConsoleMessage(level, message, context, data);
    console.log(consoleMessage);
    
    // File output
    fs.appendFileSync(this.logFile, formattedMessage + '\n');
  }

  private getConsoleMessage(level: LogLevel, message: string, context?: string, data?: any): string {
    const timestamp = new Date().toLocaleTimeString();
    const contextStr = context ? `[${context}] ` : '';
    const dataStr = data ? ` | ${JSON.stringify(data, this.bigIntReplacer, 2)}` : '';
    
    let emoji = '';
    let color = '';
    
    switch (level) {
      case LogLevel.DEBUG:
        emoji = '🔍';
        color = '\x1b[36m'; // Cyan
        break;
      case LogLevel.INFO:
        emoji = 'ℹ️';
        color = '\x1b[32m'; // Green
        break;
      case LogLevel.WARN:
        emoji = '⚠️';
        color = '\x1b[33m'; // Yellow
        break;
      case LogLevel.ERROR:
        emoji = '❌';
        color = '\x1b[31m'; // Red
        break;
    }
    
    return `${color}${emoji} ${timestamp} ${contextStr}${message}\x1b[0m${dataStr}`;
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  /**
   * Log migration phase start
   */
  startPhase(phaseName: string, description?: string): void {
    this.info(`🚀 Starting ${phaseName}`, 'PHASE', { description });
  }

  /**
   * Log migration phase completion
   */
  completePhase(phaseName: string, stats?: any): void {
    this.info(`✅ Completed ${phaseName}`, 'PHASE', stats);
  }

  /**
   * Log migration step progress
   */
  progress(step: string, current: number, total: number, context?: string): void {
    const percentage = ((current / total) * 100).toFixed(1);
    this.info(`${step}: ${current}/${total} (${percentage}%)`, context || 'PROGRESS');
  }

  /**
   * Log data statistics
   */
  stats(description: string, stats: any, context?: string): void {
    this.info(description, context || 'STATS', stats);
  }

  /**
   * Log validation results
   */
  validation(description: string, results: {
    total: number;
    valid: number;
    invalid: number;
    errors?: string[];
  }, context?: string): void {
    const percentage = ((results.valid / results.total) * 100).toFixed(1);
    this.info(
      `${description}: ${results.valid}/${results.total} valid (${percentage}%)`,
      context || 'VALIDATION',
      results
    );
  }

  /**
   * Get all log entries
   */
  getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Get log entries by level
   */
  getLogEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get migration summary
   */
  getSummary(): {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    logFile: string;
    duration: string;
  } {
    const errors = this.getLogEntriesByLevel(LogLevel.ERROR);
    const warnings = this.getLogEntriesByLevel(LogLevel.WARN);
    
    const firstEntry = this.logEntries[0];
    const lastEntry = this.logEntries[this.logEntries.length - 1];
    
    let duration = 'N/A';
    if (firstEntry && lastEntry) {
      const start = new Date(firstEntry.timestamp);
      const end = new Date(lastEntry.timestamp);
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffSeconds = Math.floor((diffMs % 60000) / 1000);
      duration = `${diffMinutes}m ${diffSeconds}s`;
    }
    
    return {
      totalEntries: this.logEntries.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      logFile: this.logFile,
      duration,
    };
  }

  /**
   * Export logs to JSON file
   */
  exportLogs(filename?: string): string {
    const exportFile = filename || this.logFile.replace('.log', '.json');
    const exportData = {
      summary: this.getSummary(),
      entries: this.logEntries,
    };
    
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    this.info(`Logs exported to ${exportFile}`, 'EXPORT');
    
    return exportFile;
  }
}

// Export singleton instance
export const migrationLogger = new MigrationLogger(LogLevel.INFO);
