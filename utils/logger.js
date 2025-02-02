const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

function logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${context}\nError: ${error.stack || error}\n\n`;
    const logFile = path.join(logsDir, `errors_${new Date().toISOString().split('T')[0]}.log`);
    
    fs.appendFileSync(logFile, logMessage);
    console.error(chalk.red('Error:'), error);
}

module.exports = { logError };