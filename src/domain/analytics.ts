// Phase 5.2: Analytics & Metrics Collection
// src/domain/analytics.ts

import { kvSet, kvGet, kvList, kvKey, KV_NAMESPACES } from "../storage/kv.ts";
import { postController } from "./posts.ts";
import { subscriberController } from "./subscribers.ts";
import { supportWorker } from "../workers/support-worker.ts";
import type { BroadcastJob, PostDraft, Subscriber } from "../types/mod.ts";
import { 
  BroadcastJobStatus, 
  PostStatus, 
  SubscriberStatus 
} from "../types/mod.ts";

// ─── Metric Types ───────────────────────────────────────────────
export interface MetricSnapshot {
  timestamp: number;
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export interface BroadcastMetrics {
  totalBroadcasts: number;
  successfulBroadcasts: number;
  failedBroadcasts: number;
  averageDeliveryRate: number;
  totalRecipients: number;
  totalDelivered: number;
  totalFailed: number;
  averageDeliveryTime: number;
}

export interface ChannelMetrics {
  channelId: number;
  totalPosts: number;
  lastPostTime: number | null;
  totalDeliveries: number;
  failedDeliveries: number;
  averageDeliveryRate: number;
  subscriberCount: number;
}

export interface SubscriberMetrics {
  totalSubscribers: number;
  activeSubscribers: number;
  blockedSubscribers: number;
  unsubscribedSubscribers: number;
  growthRate: number;
  churnRate: number;
  averageActivityScore: number;
}

export interface SystemMetrics {
  broadcasts: BroadcastMetrics;
  subscribers: SubscriberMetrics;
  channels: Map<number, ChannelMetrics>;
  uptime: number;
  memoryUsage: number;
  workersHealthy: boolean;
  lastUpdated: number;
}

// ─── Analytics Controller ────────────────────────────────────────
export class AnalyticsController {
  private metricsBuffer: MetricSnapshot[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL_MS = 60000; // 1 minute
  private flushInterval: number | null = null;

  start(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics().catch((error) => {
        console.error("[Analytics] Flush error:", error);
      });
    }, this.FLUSH_INTERVAL_MS);

    console.log("[Analytics] Analytics controller started");
  }

  stop(): void {
    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.flushMetrics().catch((error) => {
      console.error("[Analytics] Final flush error:", error);
    });

    console.log("[Analytics] Analytics controller stopped");
  }

  // ─── Record Metric ──────────────────────────────────────────
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    this.metricsBuffer.push(snapshot);

    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics().catch((error) => {
        console.error("[Analytics] Auto-flush error:", error);
      });
    }
  }

  // ─── Flush Metrics ──────────────────────────────────────────
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const batch = this.metricsBuffer.splice(0, this.metricsBuffer.length);

    for (const metric of batch) {
      const bucketKey = this.getMetricBucket(metric.timestamp);
      const metricId = `${metric.name}:${Date.now()}:${Math.random()}`;

      try {
        await kvSet(kvKey(KV_NAMESPACES.CONFIG, bucketKey, metricId), metric);
      } catch (error) {
        console.error("[Analytics] Failed to persist metric:", error);
      }
    }
  }

  private getMetricBucket(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `metrics:${year}-${month}-${day}`;
  }

  // ─── Calculate Broadcast Metrics ─────────────────────────────
  async calculateBroadcastMetrics(): Promise<BroadcastMetrics> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.JOBS),
      { limit: 1000 },
    );

    const jobs = entries.map((entry) => entry.value) as BroadcastJob[];

    const successful = jobs.filter(
      (job) => job.status === BroadcastJobStatus.COMPLETED,
    );
    const failed = jobs.filter((job) => job.status === BroadcastJobStatus.FAILED);

    const totalDelivered = jobs.reduce((sum, job) => sum + job.deliveredCount, 0);
    const totalFailed = jobs.reduce((sum, job) => sum + job.failedCount, 0);
    const totalRecipients = totalDelivered + totalFailed;

    const deliveryRate =
      totalRecipients > 0
        ? (totalDelivered / totalRecipients) * 100
        : 0;

    const deliveryTimes = successful
      .filter((job) => job.completedAt && job.startedAt)
      .map((job) => (job.completedAt! - job.startedAt!) / 1000)
      .filter((time) => !isNaN(time));

    const averageDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        : 0;

    return {
      totalBroadcasts: jobs.length,
      successfulBroadcasts: successful.length,
      failedBroadcasts: failed.length,
      averageDeliveryRate: Math.round(deliveryRate * 100) / 100,
      totalRecipients,
      totalDelivered,
      totalFailed,
      averageDeliveryTime: Math.round(averageDeliveryTime),
    };
  }

  // ─── Calculate Subscriber Metrics ────────────────────────────
  async calculateSubscriberMetrics(): Promise<SubscriberMetrics> {
    const allSubscribers = await subscriberController.getAllSubscribers();

    const activeCount = allSubscribers.filter(
      (sub) => sub.status === SubscriberStatus.ACTIVE,
    ).length;

    const blockedCount = allSubscribers.filter(
      (sub) => sub.status === SubscriberStatus.BLOCKED,
    ).length;

    const unsubscribedCount = allSubscribers.filter(
      (sub) => sub.status === SubscriberStatus.UNSUBSCRIBED,
    ).length;

    // Calculate activity score (average days since last activity)
    const now = Date.now();
    const activityScores = allSubscribers.map((sub) => {
      const daysSinceActivity = (now - sub.lastActivityAt) / (24 * 60 * 60 * 1000);
      return daysSinceActivity;
    });

    const averageActivityScore =
      activityScores.length > 0
        ? activityScores.reduce((a, b) => a + b, 0) / activityScores.length
        : 0;

    return {
      totalSubscribers: allSubscribers.length,
      activeSubscribers: activeCount,
      blockedSubscribers: blockedCount,
      unsubscribedSubscribers: unsubscribedCount,
      growthRate: 0, // Would require historical data
      churnRate: 0, // Would require historical data
      averageActivityScore: Math.round(averageActivityScore * 100) / 100,
    };
  }

  // ─── Calculate Channel Metrics ───────────────────────────────
  async calculateChannelMetrics(
    channelId: number,
  ): Promise<ChannelMetrics> {
    const subscribers = await subscriberController.getSubscribersByChannel(channelId);

    const entries = await kvList(
      kvKey(KV_NAMESPACES.JOBS),
      { limit: 1000 },
    );

    const jobsForChannel = entries
      .map((entry) => entry.value as BroadcastJob)
      .filter((job) => job.channelIds.includes(channelId));

    const totalDeliveries = jobsForChannel.reduce(
      (sum, job) => sum + job.deliveredCount,
      0,
    );
    const failedDeliveries = jobsForChannel.reduce(
      (sum, job) => sum + job.failedCount,
      0,
    );

    const deliveryRate =
      totalDeliveries + failedDeliveries > 0
        ? (totalDeliveries / (totalDeliveries + failedDeliveries)) * 100
        : 0;

    const lastPost = await this.getLastPostForChannel(channelId);

    return {
      channelId,
      totalPosts: 0, // Would require post tracking
      lastPostTime: lastPost?.publishedAt || null,
      totalDeliveries,
      failedDeliveries,
      averageDeliveryRate: Math.round(deliveryRate * 100) / 100,
      subscriberCount: subscribers.length,
    };
  }

  private async getLastPostForChannel(
    channelId: number,
  ): Promise<PostDraft | null> {
    const drafts = await postController.getDraftsByChannel(channelId);
    return drafts.find((d) => d.status === PostStatus.PUBLISHED) || null;
  }

  // ─── Calculate System Metrics ────────────────────────────────
  async calculateSystemMetrics(): Promise<SystemMetrics> {
    const broadcastMetrics = await this.calculateBroadcastMetrics();
    const subscriberMetrics = await this.calculateSubscriberMetrics();

    // Get all channels
    const channelEntries = await kvList(
      kvKey(KV_NAMESPACES.CHANNELS),
      { limit: 1000 },
    );

    const channelMetrics = new Map<number, ChannelMetrics>();

    for (const entry of channelEntries) {
      const channel = entry.value;
      const metrics = await this.calculateChannelMetrics(channel.id);
      channelMetrics.set(channel.id, metrics);
    }

    // Get tickets for worker health
    const tickets = await supportWorker.getAllTickets();
    const workersHealthy = tickets.length < 100; // Simple health check

    return {
      broadcasts: broadcastMetrics,
      subscribers: subscriberMetrics,
      channels: channelMetrics,
      uptime: Date.now() - (globalThis as Record<string, unknown>).STARTUP_TIME as number || 0,
      memoryUsage: 0, // Would require Deno.memoryUsage()
      workersHealthy,
      lastUpdated: Date.now(),
    };
  }

  // ─── Generate Report ────────────────────────────────────────
  async generateReport(): Promise<string> {
    const metrics = await this.calculateSystemMetrics();

    const report = `
═══════════════════════════════════════════════════════════════
                    SWAN SYSTEM REPORT
═══════════════════════════════════════════════════════════════

Generated: ${new Date().toLocaleString()}

┌─ BROADCAST METRICS ─────────────────────────────────────────┐
│
│ Total Broadcasts: ${metrics.broadcasts.totalBroadcasts}
│ Successful: ${metrics.broadcasts.successfulBroadcasts}
│ Failed: ${metrics.broadcasts.failedBroadcasts}
│ 
│ Recipients: ${metrics.broadcasts.totalRecipients}
│ Delivered: ${metrics.broadcasts.totalDelivered}
│ Failed: ${metrics.broadcasts.totalFailed}
│
│ Average Delivery Rate: ${metrics.broadcasts.averageDeliveryRate}%
│ Average Delivery Time: ${metrics.broadcasts.averageDeliveryTime}s
│
└─────────────────────────────────────────────────────────────┘

┌─ SUBSCRIBER METRICS ────────────────────────────────────────┐
│
│ Total Subscribers: ${metrics.subscribers.totalSubscribers}
│ Active: ${metrics.subscribers.activeSubscribers}
│ Blocked: ${metrics.subscribers.blockedSubscribers}
│ Unsubscribed: ${metrics.subscribers.unsubscribedSubscribers}
│
│ Avg Activity Score: ${metrics.subscribers.averageActivityScore} days
│
└─────────────────────────────────────────────────────────────┘

┌─ SYSTEM HEALTH ─────────────────────────────────────────────┐
│
│ Uptime: ${Math.floor(metrics.uptime / (60 * 60 * 1000))}h
│ Workers: ${metrics.workersHealthy ? "✓ Healthy" : "✗ Issues"}
│ Last Updated: ${new Date(metrics.lastUpdated).toLocaleTimeString()}
│
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
    `;

    return report;
  }

  // ─── Query Metrics by Time Range ─────────────────────────────
  async getMetricsForTimeRange(
    startTime: number,
    endTime: number,
  ): Promise<MetricSnapshot[]> {
    const metrics: MetricSnapshot[] = [];

    // Would iterate through date buckets and collect metrics
    // This is simplified for the blueprint

    return metrics.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime);
  }
}

export const analyticsController = new AnalyticsController();
