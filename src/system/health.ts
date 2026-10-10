// Phase 7: System Health & Monitoring
// src/system/health.ts

import { broadcastWorker } from "../workers/broadcast-worker.ts";
import { schedulerWorker } from "../workers/scheduler-worker.ts";
import { supportWorker } from "../workers/support-worker.ts";
import { retentionWorker } from "../workers/retention-worker.ts";
import { kvList, kvKey, KV_NAMESPACES } from "../storage/kv.ts";
import { analyticsController } from "../domain/analytics.ts";
import type { BroadcastJob, SchedulerJob } from "../types/mod.ts";
import { BroadcastJobStatus, SchedulerJobStatus } from "../types/mod.ts";

// ─── Health Check Types ─────────────────────────────────────────
export enum ComponentHealth {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
  UNKNOWN = "unknown",
}

export interface ComponentStatus {
  name: string;
  status: ComponentHealth;
  lastCheck: number;
  details: Record<string, unknown>;
  uptime?: number;
}

export interface SystemHealthReport {
  timestamp: number;
  overallHealth: ComponentHealth;
  components: ComponentStatus[];
  alerts: SystemAlert[];
  recommendations: string[];
}

export interface SystemAlert {
  level: "critical" | "warning" | "info";
  component: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

// ─── Health Monitor ─────────────────────────────────────────────
export class HealthMonitor {
  private alerts: Map<string, SystemAlert> = new Map();
  private checkInterval: number | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds

  start(): void {
    console.log("[HealthMonitor] Starting health checks...");

    this.checkInterval = setInterval(() => {
      this.performHealthChecks().catch((error) => {
        console.error("[HealthMonitor] Health check error:", error);
      });
    }, this.CHECK_INTERVAL_MS);

    // Immediate first check
    this.performHealthChecks().catch((error) => {
      console.error("[HealthMonitor] Initial health check error:", error);
    });
  }

  stop(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log("[HealthMonitor] Stopped health checks");
  }

  // ─── Health Checks ──────────────────────────────────────────
  private async performHealthChecks(): Promise<void> {
    const report = await this.generateHealthReport();

    // Log critical alerts
    for (const alert of report.alerts) {
      if (alert.level === "critical") {
        console.error(
          `[HealthMonitor] CRITICAL: ${alert.component} - ${alert.message}`,
        );
      }
    }

    // Log degradation
    if (
      report.overallHealth === ComponentHealth.DEGRADED ||
      report.overallHealth === ComponentHealth.UNHEALTHY
    ) {
      console.warn(
        `[HealthMonitor] System health: ${report.overallHealth.toUpperCase()}`,
      );

      for (const recommendation of report.recommendations) {
        console.warn(`[HealthMonitor] Recommendation: ${recommendation}`);
      }
    }
  }

  // ─── Broadcast Worker Health ────────────────────────────────
  private async checkBroadcastWorkerHealth(): Promise<ComponentStatus> {
    const status = broadcastWorker.getStatus();

    const entries = await kvList(
      kvKey(KV_NAMESPACES.JOBS),
      { limit: 100 },
    );

    const jobs = entries.map((entry) => entry.value as BroadcastJob);
    const pausedJobs = jobs.filter(
      (job) => job.status === BroadcastJobStatus.PAUSED,
    );
    const runningJobs = jobs.filter(
      (job) => job.status === BroadcastJobStatus.RUNNING,
    );

    let health = ComponentHealth.HEALTHY;
    const details: Record<string, unknown> = {
      isRunning: status.isRunning,
      activeJobs: status.activeJobs,
      pausedJobs: pausedJobs.length,
      runningJobs: runningJobs.length,
      totalJobs: jobs.length,
    };

    // Check for issues
    if (!status.isRunning) {
      health = ComponentHealth.UNHEALTHY;
    } else if (pausedJobs.length > 5) {
      health = ComponentHealth.DEGRADED;
    }

    // Add alert if needed
    if (health === ComponentHealth.UNHEALTHY) {
      this.addAlert("broadcast_worker", "critical", "Broadcast worker is not running");
    }

    return {
      name: "Broadcast Worker",
      status: health,
      lastCheck: Date.now(),
      details,
      uptime: status.isRunning ? Date.now() - (globalThis as Record<string, number>).STARTUP_TIME : 0,
    };
  }

  // ─── Scheduler Worker Health ────────────────────────────────
  private async checkSchedulerWorkerHealth(): Promise<ComponentStatus> {
    const status = schedulerWorker.getStatus();

    const entries = await kvList(
      kvKey(KV_NAMESPACES.SCHEDULER),
      { limit: 100 },
    );

    const jobs = entries.map((entry) => entry.value as SchedulerJob);
    const pendingJobs = jobs.filter(
      (job) => job.status === SchedulerJobStatus.PENDING,
    );

    let health = ComponentHealth.HEALTHY;
    const details: Record<string, unknown> = {
      isRunning: status.isRunning,
      pendingCount: status.pendingCount,
      totalJobs: jobs.length,
      oldestPendingJob: pendingJobs.length > 0 ? pendingJobs[0].executeAt : null,
    };

    // Check for overdue jobs
    const now = Date.now();
    const overdueJobs = pendingJobs.filter((job) => job.executeAt < now);

    if (overdueJobs.length > 0) {
      health = ComponentHealth.DEGRADED;
      details.overdueJobs = overdueJobs.length;
    }

    if (!status.isRunning) {
      health = ComponentHealth.UNHEALTHY;
    }

    // Add alert if unhealthy
    if (health === ComponentHealth.UNHEALTHY) {
      this.addAlert("scheduler_worker", "critical", "Scheduler worker is not running");
    }

    return {
      name: "Scheduler Worker",
      status: health,
      lastCheck: Date.now(),
      details,
      uptime: status.isRunning ? Date.now() - (globalThis as Record<string, number>).STARTUP_TIME : 0,
    };
  }

  // ─── Support Worker Health ──────────────────────────────────
  private async checkSupportWorkerHealth(): Promise<ComponentStatus> {
    const status = supportWorker.getStatus();

    const health = status.isRunning ? ComponentHealth.HEALTHY : ComponentHealth.UNHEALTHY;

    const details: Record<string, unknown> = {
      isRunning: status.isRunning,
      activeTickets: status.activeTickets,
    };

    if (health === ComponentHealth.UNHEALTHY) {
      this.addAlert("support_worker", "warning", "Support worker is not running");
    }

    return {
      name: "Support Worker",
      status: health,
      lastCheck: Date.now(),
      details,
      uptime: status.isRunning ? Date.now() - (globalThis as Record<string, number>).STARTUP_TIME : 0,
    };
  }

  // ─── Storage Health ─────────────────────────────────────────
  private async checkStorageHealth(): Promise<ComponentStatus> {
    try {
      // Try a simple KV operation
      const { kvGet, kvKey, KV_NAMESPACES } = await import("../storage/kv.ts");
      await kvGet(kvKey(KV_NAMESPACES.CONFIG, "test"));

      return {
        name: "Deno KV Storage",
        status: ComponentHealth.HEALTHY,
        lastCheck: Date.now(),
        details: { operational: true },
      };
    } catch (error) {
      return {
        name: "Deno KV Storage",
        status: ComponentHealth.UNHEALTHY,
        lastCheck: Date.now(),
        details: { operational: false, error: String(error) },
      };
    }
  }

  // ─── Generate Health Report ─────────────────────────────────
  async generateHealthReport(): Promise<SystemHealthReport> {
    const components = [
      await this.checkBroadcastWorkerHealth(),
      await this.checkSchedulerWorkerHealth(),
      await this.checkSupportWorkerHealth(),
      await this.checkStorageHealth(),
    ];

    // Determine overall health
    let overallHealth = ComponentHealth.HEALTHY;

    if (components.some((c) => c.status === ComponentHealth.UNHEALTHY)) {
      overallHealth = ComponentHealth.UNHEALTHY;
    } else if (components.some((c) => c.status === ComponentHealth.DEGRADED)) {
      overallHealth = ComponentHealth.DEGRADED;
    }

    // Generate recommendations
    const recommendations: string[] = [];

    for (const component of components) {
      if (component.status === ComponentHealth.UNHEALTHY) {
        recommendations.push(`Restart ${component.name}`);
      } else if (component.status === ComponentHealth.DEGRADED) {
        recommendations.push(`Monitor ${component.name} closely`);
      }
    }

    // Collect active alerts
    const alerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);

    return {
      timestamp: Date.now(),
      overallHealth,
      components,
      alerts,
      recommendations,
    };
  }

  // ─── Alert Management ───────────────────────────────────────
  private addAlert(
    component: string,
    level: "critical" | "warning" | "info",
    message: string,
  ): void {
    const alertId = `${component}:${level}`;

    if (!this.alerts.has(alertId)) {
      this.alerts.set(alertId, {
        level,
        component,
        message,
        timestamp: Date.now(),
        resolved: false,
      });
    }
  }

  resolveAlert(component: string): void {
    for (const [key, alert] of this.alerts) {
      if (alert.component === component && !alert.resolved) {
        alert.resolved = true;
        alert.timestamp = Date.now();
      }
    }
  }

  getAlert(component: string): SystemAlert | undefined {
    for (const alert of this.alerts.values()) {
      if (alert.component === component && !alert.resolved) {
        return alert;
      }
    }
    return undefined;
  }

  getAllAlerts(): SystemAlert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved);
  }

  formatHealthReport(report: SystemHealthReport): string {
    const statusEmoji = {
      [ComponentHealth.HEALTHY]: "✅",
      [ComponentHealth.DEGRADED]: "⚠️",
      [ComponentHealth.UNHEALTHY]: "❌",
      [ComponentHealth.UNKNOWN]: "❓",
    };

    let output = `
═══════════════════════════════════════════════════════════════
                    SYSTEM HEALTH REPORT
═══════════════════════════════════════════════════════════════

Generated: ${new Date(report.timestamp).toLocaleString()}
Overall Status: ${statusEmoji[report.overallHealth]} ${report.overallHealth.toUpperCase()}

┌─ COMPONENT STATUS ──────────────────────────────────────────┐
│
    `;

    for (const component of report.components) {
      output += `│ ${statusEmoji[component.status]} ${component.name}: ${component.status}\n`;
    }

    output += `│
└─────────────────────────────────────────────────────────────┘

    `;

    if (report.alerts.length > 0) {
      output += `┌─ ACTIVE ALERTS ─────────────────────────────────────────┐
│
      `;

      for (const alert of report.alerts) {
        const levelEmoji = alert.level === "critical" ? "🔴" : alert.level === "warning" ? "🟡" : "🔵";
        output += `│ ${levelEmoji} [${alert.component}] ${alert.message}\n`;
      }

      output += `│
└─────────────────────────────────────────────────────────────┘

      `;
    }

    if (report.recommendations.length > 0) {
      output += `┌─ RECOMMENDATIONS ───────────────────────────────────────┐
│
      `;

      for (const rec of report.recommendations) {
        output += `│ 💡 ${rec}\n`;
      }

      output += `│
└─────────────────────────────────────────────────────────────┘

      `;
    }

    output += `═══════════════════════════════════════════════════════════════
    `;

    return output;
  }
}

export const healthMonitor = new HealthMonitor();

// ─── Emergency Control Commands ──────────────────────────────────
// src/system/emergency.ts

import { broadcastWorker as broadcastWorkerInstance } from "../workers/broadcast-worker.ts";
import { schedulerWorker as schedulerWorkerInstance } from "../workers/scheduler-worker.ts";

export class EmergencyControl {
  // ─── Emergency Pause ────────────────────────────────────────
  static async emergencyPause(): Promise<void> {
    console.warn("[EmergencyControl] EMERGENCY PAUSE INITIATED");

    globalThis.SYSTEM_PAUSED = true;
    broadcastWorkerInstance.stop();
    schedulerWorkerInstance.stop();

    await import("../storage/audit.ts").then((mod) =>
      mod.auditLogger.logSystemError(0, "Emergency pause activated", {
        reason: "Manual emergency pause",
      }),
    );
  }

  // ─── System Resume ──────────────────────────────────────────
  static async systemResume(): Promise<void> {
    console.warn("[EmergencyControl] SYSTEM RESUME");

    globalThis.SYSTEM_PAUSED = false;
    broadcastWorkerInstance.start();
    schedulerWorkerInstance.start();

    await import("../storage/audit.ts").then((mod) =>
      mod.auditLogger.logSystemStartup(0),
    );
  }

  // ─── Graceful Drain ────────────────────────────────────────
  static async gracefulDrain(): Promise<void> {
    console.warn("[EmergencyControl] GRACEFUL DRAIN INITIATED");

    globalThis.SYSTEM_PAUSED = true;

    // Stop accepting new jobs but let running jobs complete
    broadcastWorkerInstance.stop();
    schedulerWorkerInstance.stop();

    console.log("[EmergencyControl] Waiting for active jobs to complete...");
    // In a real system, would track job completion
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("[EmergencyControl] Graceful drain complete");
  }

  // ─── Isolated Restart ───────────────────────────────────────
  static async isolatedRestart(component: string): Promise<void> {
    console.warn(`[EmergencyControl] ISOLATED RESTART: ${component}`);

    switch (component.toLowerCase()) {
      case "broadcast":
        broadcastWorkerInstance.stop();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        broadcastWorkerInstance.start();
        break;

      case "scheduler":
        schedulerWorkerInstance.stop();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        schedulerWorkerInstance.start();
        break;

      default:
        console.error(`[EmergencyControl] Unknown component: ${component}`);
    }
  }

  // ─── Check System State ─────────────────────────────────────
  static getSystemState(): {
    paused: boolean;
    broadcastRunning: boolean;
    schedulerRunning: boolean;
  } {
    return {
      paused: globalThis.SYSTEM_PAUSED,
      broadcastRunning: broadcastWorkerInstance.getStatus().isRunning,
      schedulerRunning: schedulerWorkerInstance.getStatus().isRunning,
    };
  }
}

export default EmergencyControl;
