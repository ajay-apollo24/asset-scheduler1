// utils/logViewer.js
const fs = require('fs');
const path = require('path');

class LogViewer {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
  }

  /**
   * Get all log files in the logs directory
   */
  getLogFiles() {
    if (!fs.existsSync(this.logsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.logsDir);
    return files.filter(file => file.endsWith('.log'));
  }

  /**
   * Read and parse log entries from a file
   */
  readLogFile(filename, limit = 100) {
    const filePath = path.join(this.logsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const entries = [];
    for (let i = Math.max(0, lines.length - limit); i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        entries.push(entry);
      } catch (err) {
        // Skip malformed JSON lines
        continue;
      }
    }
    
    return entries;
  }

  /**
   * Get recent log entries by type
   */
  getRecentLogs(type = 'application', limit = 50) {
    const files = this.getLogFiles();
    const targetFile = files.find(file => file.includes(type));
    
    if (!targetFile) {
      return [];
    }
    
    return this.readLogFile(targetFile, limit);
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit = 50) {
    return this.readLogFile('errors-' + this.getTodayDate() + '.log', limit);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit = 50) {
    return this.readLogFile('audit-' + this.getTodayDate() + '.log', limit);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const logs = this.getRecentLogs('application', 1000);
    const performanceLogs = logs.filter(log => log.type === 'performance');
    
    const metrics = {};
    performanceLogs.forEach(log => {
      const operation = log.operation;
      if (!metrics[operation]) {
        metrics[operation] = {
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          avgDuration: 0
        };
      }
      
      metrics[operation].count++;
      metrics[operation].totalDuration += log.duration;
      metrics[operation].minDuration = Math.min(metrics[operation].minDuration, log.duration);
      metrics[operation].maxDuration = Math.max(metrics[operation].maxDuration, log.duration);
    });
    
    // Calculate averages
    Object.keys(metrics).forEach(operation => {
      metrics[operation].avgDuration = metrics[operation].totalDuration / metrics[operation].count;
    });
    
    return metrics;
  }

  /**
   * Get rule validation statistics
   */
  getRuleValidationStats() {
    const logs = this.getRecentLogs('application', 1000);
    const ruleLogs = logs.filter(log => log.type === 'rule');
    
    const stats = {};
    ruleLogs.forEach(log => {
      const ruleName = log.ruleName;
      if (!stats[ruleName]) {
        stats[ruleName] = {
          total: 0,
          passed: 0,
          failed: 0,
          passRate: 0
        };
      }
      
      stats[ruleName].total++;
      if (log.result === 'PASSED') {
        stats[ruleName].passed++;
      } else {
        stats[ruleName].failed++;
      }
    });
    
    // Calculate pass rates
    Object.keys(stats).forEach(ruleName => {
      stats[ruleName].passRate = (stats[ruleName].passed / stats[ruleName].total * 100).toFixed(2);
    });
    
    return stats;
  }

  /**
   * Get booking statistics
   */
  getBookingStats() {
    const logs = this.getRecentLogs('application', 1000);
    const bookingLogs = logs.filter(log => log.type === 'booking');
    
    const stats = {
      total: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      byLOB: {},
      byAsset: {}
    };
    
    bookingLogs.forEach(log => {
      stats.total++;
      
      if (log.action.includes('CREATE')) stats.created++;
      if (log.action.includes('UPDATE')) stats.updated++;
      if (log.action.includes('DELETE')) stats.deleted++;
      
      if (log.lob) {
        stats.byLOB[log.lob] = (stats.byLOB[log.lob] || 0) + 1;
      }
      
      if (log.assetId) {
        stats.byAsset[log.assetId] = (stats.byAsset[log.assetId] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit = 50) {
    const logs = this.getRecentLogs('application', 1000);
    return logs.filter(log => log.type === 'security').slice(-limit);
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Search logs by criteria
   */
  searchLogs(criteria = {}) {
    const logs = this.getRecentLogs('application', 1000);
    
    return logs.filter(log => {
      for (const [key, value] of Object.entries(criteria)) {
        if (log[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get system health summary
   */
  getSystemHealth() {
    const performanceMetrics = this.getPerformanceMetrics();
    const ruleStats = this.getRuleValidationStats();
    const bookingStats = this.getBookingStats();
    const errorLogs = this.getErrorLogs(10);
    const securityEvents = this.getSecurityEvents(10);
    
    return {
      performance: performanceMetrics,
      rules: ruleStats,
      bookings: bookingStats,
      recentErrors: errorLogs.length,
      securityEvents: securityEvents.length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = LogViewer; 