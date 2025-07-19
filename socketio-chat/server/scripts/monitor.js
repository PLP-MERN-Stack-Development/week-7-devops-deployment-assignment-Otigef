const axios = require('axios');
const mongoose = require('mongoose');

class HealthMonitor {
  constructor(config) {
    this.config = config;
    this.checks = [];
  }

  // Add health check
  addCheck(name, checkFunction) {
    this.checks.push({ name, check: checkFunction });
  }

  // Database health check
  async checkDatabase() {
    try {
      const state = mongoose.connection.readyState;
      return {
        status: state === 1 ? 'healthy' : 'unhealthy',
        details: {
          readyState: state,
          connected: state === 1
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error.message }
      };
    }
  }

  // Memory usage check
  checkMemory() {
    const used = process.memoryUsage();
    const memoryUsage = {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100
    };

    const isHealthy = memoryUsage.heapUsed < 500; // 500MB limit

    return {
      status: isHealthy ? 'healthy' : 'warning',
      details: memoryUsage
    };
  }

  // CPU usage check
  checkCPU() {
    const usage = process.cpuUsage();
    const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds

    return {
      status: totalUsage < 100 ? 'healthy' : 'warning',
      details: {
        user: usage.user / 1000000,
        system: usage.system / 1000000,
        total: totalUsage
      }
    };
  }

  // Uptime check
  checkUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    return {
      status: 'healthy',
      details: {
        uptime: `${days}d ${hours}h ${minutes}m`,
        seconds: uptime
      }
    };
  }

  // Run all health checks
  async runChecks() {
    const results = {};
    
    for (const check of this.checks) {
      try {
        results[check.name] = await check.check();
      } catch (error) {
        results[check.name] = {
          status: 'error',
          details: { error: error.message }
        };
      }
    }

    return results;
  }

  // Generate health report
  async generateReport() {
    const checks = await this.runChecks();
    const overallStatus = Object.values(checks).every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      timestamp: new Date().toISOString(),
      status: overallStatus,
      checks,
      summary: {
        total: Object.keys(checks).length,
        healthy: Object.values(checks).filter(check => check.status === 'healthy').length,
        warning: Object.values(checks).filter(check => check.status === 'warning').length,
        error: Object.values(checks).filter(check => check.status === 'error').length
      }
    };
  }
}

// Export the monitor
module.exports = HealthMonitor; 