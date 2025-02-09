const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const util = require('util');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

class Logger {
    constructor() {
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        const date = new Date().toISOString().split('T')[0];
        this.logStream = fs.createWriteStream(
            path.join(logsDir, `console_${date}.log`),
            { flags: 'a' }
        );

        console.log = (...args) => this.log('LOG', ...args);
        console.error = (...args) => this.log('ERROR', ...args);
        console.warn = (...args) => this.log('WARN', ...args);
        console.info = (...args) => this.log('INFO', ...args);
    }

    log(level, ...args) {
        const timestamp = new Date().toISOString();
        const message = util.format(...args);
        
        const cleanMessage = message.replace(/\u001b\[[0-9;]*m/g, '');
        
        this.logStream.write(`[${timestamp}] ${level}: ${cleanMessage}\n`);
        
        this.originalConsole.log(...args);
    }

    logError(error, context = '') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR ${context}\nError: ${error.stack || error}\n\n`;
        
        const errorLogFile = path.join(logsDir, `errors_${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errorLogFile, logMessage);
        
        this.originalConsole.error(chalk.red('Error:'), error);
    }
}

const logger = new Logger();

module.exports = { logger, logError: logger.logError.bind(logger) };