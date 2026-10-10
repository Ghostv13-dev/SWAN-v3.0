// Phase 4.5: Support Worker
// src/workers/support-worker.ts

import { 
  kvSet, kvGet, kvList, kvKey, 
  KV_NAMESPACES, kvDelete 
} from "../storage/kv.ts";
import { auditLogger } from "../storage/audit.ts";
import type { SupportTicket, SupportMessage, Subscriber } from "../types/mod.ts";
import { SupportTicketStatus } from "../types/mod.ts";

// ─── Support Worker ────────────────────────────────────────────
export class SupportWorker {
  private isRunning = false;
  private pollInterval: number | null = null;
  private readonly POLL_INTERVAL_MS = 30000; // Check every 30 seconds

  start(): void {
    if (this.isRunning) {
      console.warn("[SupportWorker] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[SupportWorker] Starting support worker");

    this.pollInterval = setInterval(() => {
      this.processTickets().catch((error) => {
        console.error("[SupportWorker] Processing error:", error);
      });
    }, this.POLL_INTERVAL_MS);

    // Immediate first run
    this.processTickets().catch((error) => {
      console.error("[SupportWorker] Initial processing error:", error);
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log("[SupportWorker] Stopped");
  }

  // ─── Ticket Processing ──────────────────────────────────────
  private async processTickets(): Promise<void> {
    if (!this.isRunning) return;

    const openTickets = await this.getOpenTickets();

    for (const ticket of openTickets) {
      // Check for auto-close eligibility (no activity for 7 days)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const lastMessageTime = ticket.messages[ticket.messages.length - 1]?.timestamp || ticket.createdAt;
      
      if (Date.now() - lastMessageTime > sevenDaysMs) {
        await this.autoCloseTicket(ticket.id, "Auto-closed due to inactivity");
      }
    }
  }

  // ─── Ticket CRUD ─────────────────────────────────────────
  async createTicket(
    subscriberId: string,
    channelId: number,
    subject: string,
    initialMessage: string,
    actorId: number,
  ): Promise<SupportTicket> {
    const ticketId = crypto.randomUUID();

    const ticket: SupportTicket = {
      id: ticketId,
      subscriberId,
      channelId,
      status: SupportTicketStatus.OPEN,
      assignedTo: null,
      subject,
      messages: [
        {
          id: crypto.randomUUID(),
          senderId: parseInt(subscriberId.replace("subscriber_", "")) || 0,
          content: initialMessage,
          timestamp: Date.now(),
          isAdmin: false,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      closedAt: null,
    };

    await kvSet(kvKey(KV_NAMESPACES.TICKETS, ticketId), ticket);
    await auditLogger.logSupportTicketCreate(actorId, ticketId);
    return ticket;
  }

  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    return await kvGet(kvKey(KV_NAMESPACES.TICKETS, ticketId));
  }

  async addMessage(
    ticketId: string,
    senderId: number,
    content: string,
    isAdmin: boolean,
  ): Promise<SupportTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) return null;

    ticket.messages.push({
      id: crypto.randomUUID(),
      senderId,
      content,
      timestamp: Date.now(),
      isAdmin,
    });

    ticket.updatedAt = Date.now();
    await kvSet(kvKey(KV_NAMESPACES.TICKETS, ticketId), ticket);
    return ticket;
  }

  async assignTicket(ticketId: string, adminId: number): Promise<SupportTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) return null;

    ticket.assignedTo = adminId;
    ticket.status = SupportTicketStatus.ASSIGNED;
    ticket.updatedAt = Date.now();

    await kvSet(kvKey(KV_NAMESPACES.TICKETS, ticketId), ticket);
    return ticket;
  }

  async closeTicket(ticketId: string, closingMessage?: string): Promise<SupportTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) return null;

    if (closingMessage) {
      ticket.messages.push({
        id: crypto.randomUUID(),
        senderId: ticket.assignedTo || 0,
        content: closingMessage,
        timestamp: Date.now(),
        isAdmin: true,
      });
    }

    ticket.status = SupportTicketStatus.CLOSED;
    ticket.closedAt = Date.now();
    ticket.updatedAt = Date.now();

    await kvSet(kvKey(KV_NAMESPACES.TICKETS, ticketId), ticket);
    return ticket;
  }

  private async autoCloseTicket(ticketId: string, reason: string): Promise<void> {
    const ticket = await this.closeTicket(
      ticketId,
      `[AUTOMATED] ${reason}`,
    );

    if (ticket) {
      await auditLogger.logSupportTicketClose(0, ticketId, true);
    }
  }

  // ─── Ticket Queries ─────────────────────────────────────────
  private async getOpenTickets(): Promise<SupportTicket[]> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.TICKETS),
      { limit: 100 },
    );

    return entries
      .map((entry) => entry.value)
      .filter((ticket) => 
        ticket.status === SupportTicketStatus.OPEN || 
        ticket.status === SupportTicketStatus.ASSIGNED
      );
  }

  async getTicketsBySubscriber(subscriberId: string): Promise<SupportTicket[]> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.TICKETS),
      { limit: 100 },
    );

    return entries
      .map((entry) => entry.value)
      .filter((ticket) => ticket.subscriberId === subscriberId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getTicketsByAssignee(adminId: number): Promise<SupportTicket[]> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.TICKETS),
      { limit: 100 },
    );

    return entries
      .map((entry) => entry.value)
      .filter((ticket) => ticket.assignedTo === adminId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getAllTickets(): Promise<SupportTicket[]> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.TICKETS),
      { limit: 500 },
    );

    return entries
      .map((entry) => entry.value)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getStatus(): { isRunning: boolean; activeTickets: number } {
    return {
      isRunning: this.isRunning,
      activeTickets: 0,
    };
  }
}

export const supportWorker = new SupportWorker();

// ─── Subscriber Controller ────────────────────────────────────────
// src/domain/subscribers.ts

import { kvSet, kvGet, kvDelete, kvList, kvKey, KV_NAMESPACES } from "../storage/kv.ts";
import type { Subscriber } from "../types/mod.ts";
import { SubscriberStatus } from "../types/mod.ts";

export class SubscriberController {
  async addSubscriber(
    telegramId: number,
    username: string | null,
    firstName: string,
    lastName: string | null,
    channelIds: number[] = [],
  ): Promise<Subscriber> {
    const subscriberId = `subscriber_${telegramId}`;

    const subscriber: Subscriber = {
      id: subscriberId,
      telegramId,
      username,
      firstName,
      lastName,
      status: SubscriberStatus.ACTIVE,
      subscribedChannels: channelIds,
      joinedAt: Date.now(),
      lastActivityAt: Date.now(),
      blockedAt: null,
      metadata: {},
    };

    await kvSet(
      kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId),
      subscriber,
    );

    return subscriber;
  }

  async getSubscriber(subscriberId: string): Promise<Subscriber | null> {
    return await kvGet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId));
  }

  async blockSubscriber(subscriberId: string): Promise<Subscriber | null> {
    const subscriber = await this.getSubscriber(subscriberId);
    if (!subscriber) return null;

    subscriber.status = SubscriberStatus.BLOCKED;
    subscriber.blockedAt = Date.now();
    subscriber.subscribedChannels = [];

    await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), subscriber);
    return subscriber;
  }

  async unblockSubscriber(subscriberId: string): Promise<Subscriber | null> {
    const subscriber = await this.getSubscriber(subscriberId);
    if (!subscriber) return null;

    subscriber.status = SubscriberStatus.ACTIVE;
    subscriber.blockedAt = null;

    await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), subscriber);
    return subscriber;
  }

  async unsubscribeSubscriber(subscriberId: string): Promise<Subscriber | null> {
    const subscriber = await this.getSubscriber(subscriberId);
    if (!subscriber) return null;

    subscriber.status = SubscriberStatus.UNSUBSCRIBED;
    subscriber.subscribedChannels = [];

    await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), subscriber);
    return subscriber;
  }

  async updateLastActivity(subscriberId: string): Promise<void> {
    const subscriber = await this.getSubscriber(subscriberId);
    if (subscriber) {
      subscriber.lastActivityAt = Date.now();
      await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), subscriber);
    }
  }

  async subscribeToChannel(subscriberId: string, channelId: number): Promise<Subscriber | null> {
    const subscriber = await this.getSubscriber(subscriberId);
    if (!subscriber) return null;

    if (!subscriber.subscribedChannels.includes(channelId)) {
      subscriber.subscribedChannels.push(channelId);
      await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), subscriber);
    }

    return subscriber;
  }

  async unsubscribeFromChannel(subscriberId: string, channelId: number): Promise<Subscriber | null> {
    const subscriber = await this.getSubscriber(subscriberId);
    if (!subscriber) return null;

    subscriber.subscribedChannels = subscriber.subscribedChannels.filter((id) => id !== channelId);
    await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), subscriber);

    return subscriber;
  }

  async getAllSubscribers(status?: SubscriberStatus): Promise<Subscriber[]> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.SUBSCRIBERS),
      { limit: 10000 },
    );

    let subscribers = entries.map((entry) => entry.value);

    if (status) {
      subscribers = subscribers.filter((sub) => sub.status === status);
    }

    return subscribers.sort((a, b) => b.joinedAt - a.joinedAt);
  }

  async getActiveSubscriberCount(): Promise<number> {
    const allSubscribers = await this.getAllSubscribers(SubscriberStatus.ACTIVE);
    return allSubscribers.length;
  }

  async getSubscribersByChannel(channelId: number): Promise<Subscriber[]> {
    const allSubscribers = await this.getAllSubscribers(SubscriberStatus.ACTIVE);
    return allSubscribers.filter((sub) => sub.subscribedChannels.includes(channelId));
  }

  async deleteSubscriber(subscriberId: string): Promise<boolean> {
    await kvDelete(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId));
    return true;
  }
}

export const subscriberController = new SubscriberController();
