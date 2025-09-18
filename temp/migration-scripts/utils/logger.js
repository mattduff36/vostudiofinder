"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationLogger = exports.MigrationLogger = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Migration Logger Utility
 * Provides structured logging for migration progress tracking
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class MigrationLogger {
    constructor(logLevel = LogLevel.INFO) {
        this.logLevel = LogLevel.INFO;
        this.logEntries = [];
        this.logLevel = logLevel;
        // Create logs directory if it doesn't exist
        const logsDir = path_1.default.join(process.cwd(), 'migration-scripts', 'logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        // Create log file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path_1.default.join(logsDir, `migration-${timestamp}.log`);
        this.info('Migration logger initialized', 'LOGGER', { logFile: this.logFile });
    }
    shouldLog(level) {
        return level >= this.logLevel;
    }
    formatMessage(level, message, context, data) {
        const timestamp = new Date().toISOString();
        const levelStr = LogLevel[level].padEnd(5);
        const contextStr = context ? `[${context}] ` : '';
        const dataStr = data ? ` | ${JSON.stringify(data, this.bigIntReplacer)}` : '';
        return `${timestamp} ${levelStr} ${contextStr}${message}${dataStr}`;
    }
    bigIntReplacer(_key, value) {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }
    log(level, message, context, data) {
        if (!this.shouldLog(level))
            return;
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: context || '',
            data,
        };
        this.logEntries.push(logEntry);
        const formattedMessage = this.formatMessage(level, message, context, data);
        // Console output with colors
        const consoleMessage = this.getConsoleMessage(level, message, context, data);
        console.log(consoleMessage);
        // File output
        fs_1.default.appendFileSync(this.logFile, formattedMessage + '\n');
    }
    getConsoleMessage(level, message, context, data) {
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
    debug(message, context, data) {
        this.log(LogLevel.DEBUG, message, context, data);
    }
    info(message, context, data) {
        this.log(LogLevel.INFO, message, context, data);
    }
    warn(message, context, data) {
        this.log(LogLevel.WARN, message, context, data);
    }
    error(message, context, data) {
        this.log(LogLevel.ERROR, message, context, data);
    }
    /**
     * Log migration phase start
     */
    startPhase(phaseName, description) {
        this.info(`🚀 Starting ${phaseName}`, 'PHASE', { description });
    }
    /**
     * Log migration phase completion
     */
    completePhase(phaseName, stats) {
        this.info(`✅ Completed ${phaseName}`, 'PHASE', stats);
    }
    /**
     * Log migration step progress
     */
    progress(step, current, total, context) {
        const percentage = ((current / total) * 100).toFixed(1);
        this.info(`${step}: ${current}/${total} (${percentage}%)`, context || 'PROGRESS');
    }
    /**
     * Log data statistics
     */
    stats(description, stats, context) {
        this.info(description, context || 'STATS', stats);
    }
    /**
     * Log validation results
     */
    validation(description, results, context) {
        const percentage = ((results.valid / results.total) * 100).toFixed(1);
        this.info(`${description}: ${results.valid}/${results.total} valid (${percentage}%)`, context || 'VALIDATION', results);
    }
    /**
     * Get all log entries
     */
    getLogEntries() {
        return [...this.logEntries];
    }
    /**
     * Get log entries by level
     */
    getLogEntriesByLevel(level) {
        return this.logEntries.filter(entry => entry.level === level);
    }
    /**
     * Get migration summary
     */
    getSummary() {
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
    exportLogs(filename) {
        const exportFile = filename || this.logFile.replace('.log', '.json');
        const exportData = {
            summary: this.getSummary(),
            entries: this.logEntries,
        };
        fs_1.default.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
        this.info(`Logs exported to ${exportFile}`, 'EXPORT');
        return exportFile;
    }
}
exports.MigrationLogger = MigrationLogger;
// Export singleton instance
exports.migrationLogger = new MigrationLogger(LogLevel.INFO);
