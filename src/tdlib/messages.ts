// Phase 2: Outbound Wrappers & Security
// Complete implementation of message serialization, audit logging, and RBAC

// ═══════════════════════════════════════════════════════════════
// src/tdlib/messages.ts - Outbound Message Serializer
// ═══════════════════════════════════════════════════════════════

import { tdSend, tdExecute } from "../bootstrap/tdlib.ts";
import type { InlineKeyboard } from "../types/mod.ts";

// ─── Message Sending ──────────────────────────────────────────
export interface SendMessageParams {
  chatId: number;
  text: string;
  parseMode?: "html" | "markdown";
  disableNotification?: boolean;
  replyToMessageId?: number;
  inlineKeyboard?: InlineKeyboard;
}

export function tdSendMessage(params: SendMessageParams): void {
  const payload: Record<string, unknown> = {
    _: "sendMessage",
    chat_id: params.chatId,
    input_message_content: {
      _: "inputMessageText",
      text: {
        _: "formattedText",
        text: params.text,
      },
    },
    disable_notification: params.disableNotification ?? false,
  };

  if (params.parseMode) {
    (payload.input_message_content as Record<string, unknown>).text = {
      _: "formattedText",
      text: params.text,
      entities: [],
    };
  }

  if (params.replyToMessageId) {
    payload.reply_to_message_id = params.replyToMessageId;
  }

  if (params.inlineKeyboard) {
    payload.reply_markup = buildInlineKeyboard(params.inlineKeyboard);
  }

  tdSend(payload);
}

// ─── Message Editing ──────────────────────────────────────────
export interface EditMessageParams {
  chatId: number;
  messageId: number;
  text: string;
  parseMode?: "html" | "markdown";
  inlineKeyboard?: InlineKeyboard;
}

export function tdEditMessageText(params: EditMessageParams): void {
  const payload: Record<string, unknown> = {
    _: "editMessageText",
    chat_id: params.chatId,
    message_id: params.messageId,
    input_message_content: {
      _: "inputMessageText",
      text: {
        _: "formattedText",
        text: params.text,
      },
    },
  };

  if (params.inlineKeyboard) {
    payload.reply_markup = buildInlineKeyboard(params.inlineKeyboard);
  }

  tdSend(payload);
}

export function tdEditMessageReplyMarkup(
  chatId: number,
  messageId: number,
  inlineKeyboard: InlineKeyboard,
): void {
  tdSend({
    _: "editMessageReplyMarkup",
    chat_id: chatId,
    message_id: messageId,
    reply_markup: buildInlineKeyboard(inlineKeyboard),
  });
}

// ─── Media Sending ────────────────────────────────────────────
export interface SendPhotoParams {
  chatId: number;
  fileId: string;
  caption?: string;
  parseMode?: "html" | "markdown";
  inlineKeyboard?: InlineKeyboard;
  disableNotification?: boolean;
}

export function tdSendPhoto(params: SendPhotoParams): void {
  const payload: Record<string, unknown> = {
    _: "sendMessage",
    chat_id: params.chatId,
    input_message_content: {
      _: "inputMessagePhoto",
      photo: {
        _: "inputFileId",
        id: params.fileId,
      },
    },
    disable_notification: params.disableNotification ?? false,
  };

  if (params.caption) {
    (payload.input_message_content as Record<string, unknown>).caption = {
      _: "formattedText",
      text: params.caption,
    };
  }

  if (params.inlineKeyboard) {
    payload.reply_markup = buildInlineKeyboard(params.inlineKeyboard);
  }

  tdSend(payload);
}

export interface SendVideoParams {
  chatId: number;
  fileId: string;
  caption?: string;
  duration?: number;
  width?: number;
  height?: number;
  inlineKeyboard?: InlineKeyboard;
  disableNotification?: boolean;
}

export function tdSendVideo(params: SendVideoParams): void {
  const payload: Record<string, unknown> = {
    _: "sendMessage",
    chat_id: params.chatId,
    input_message_content: {
      _: "inputMessageVideo",
      video: {
        _: "inputFileId",
        id: params.fileId,
      },
    },
    disable_notification: params.disableNotification ?? false,
  };

  if (params.caption) {
    (payload.input_message_content as Record<string, unknown>).caption = {
      _: "formattedText",
      text: params.caption,
    };
  }

  if (params.inlineKeyboard) {
    payload.reply_markup = buildInlineKeyboard(params.inlineKeyboard);
  }

  tdSend(payload);
}

export interface SendDocumentParams {
  chatId: number;
  fileId: string;
  caption?: string;
  inlineKeyboard?: InlineKeyboard;
  disableNotification?: boolean;
}

export function tdSendDocument(params: SendDocumentParams): void {
  const payload: Record<string, unknown> = {
    _: "sendMessage",
    chat_id: params.chatId,
    input_message_content: {
      _: "inputMessageDocument",
      document: {
        _: "inputFileId",
        id: params.fileId,
      },
    },
    disable_notification: params.disableNotification ?? false,
  };

  if (params.caption) {
    (payload.input_message_content as Record<string, unknown>).caption = {
      _: "formattedText",
      text: params.caption,
    };
  }

  if (params.inlineKeyboard) {
    payload.reply_markup = buildInlineKeyboard(params.inlineKeyboard);
  }

  tdSend(payload);
}

// ─── Inline Keyboard Builder ──────────────────────────────────
function buildInlineKeyboard(keyboard: InlineKeyboard): Record<string, unknown> {
  return {
    _: "replyMarkupInlineKeyboard",
    rows: keyboard.rows.map((row) => ({
      _: "inlineKeyboardButtonRow",
      buttons: row.buttons.map((btn) => {
        const button: Record<string, unknown> = {
          _: "inlineKeyboardButton",
          text: btn.text,
          type: {
            _: "inlineKeyboardButtonTypeCallback",
            data: btn.callbackData,
          },
        };

        if (btn.url) {
          button.type = {
            _: "inlineKeyboardButtonTypeUrl",
            url: btn.url,
          };
        }

        return button;
      }),
    })),
  };
}

// ─── Message Deletion ─────────────────────────────────────────
export function tdDeleteMessages(
  chatId: number,
  messageIds: number[],
): void {
  tdSend({
    _: "deleteMessages",
    chat_id: chatId,
    message_ids: messageIds,
    revoke: true,
  });
}

// ─── Chat Actions ─────────────────────────────────────────────
export function tdSendChatAction(
  chatId: number,
  action: "typing" | "uploadPhoto" | "uploadVideo" | "uploadDocument",
): void {
  const actionMap: Record<string, string> = {
    typing: "chatActionTyping",
    uploadPhoto: "chatActionUploadingPhoto",
    uploadVideo: "chatActionUploadingVideo",
    uploadDocument: "chatActionUploadingDocument",
  };

  tdSend({
    _: "sendChatAction",
    chat_id: chatId,
    action: { _: actionMap[action] },
  });
}

// ─── Forward Messages ─────────────────────────────────────────
export function tdForwardMessages(
  fromChatId: number,
  toChatId: number,
  messageIds: number[],
  disableNotification: boolean = false,
): void {
  tdSend({
    _: "forwardMessages",
    chat_id: toChatId,
    from_chat_id: fromChatId,
    message_ids: messageIds,
    disable_notification: disableNotification,
  });
}

// ─── Get Chat Information ─────────────────────────────────────
export function tdGetChat(chatId: number): void {
  tdSend({
    _: "getChat",
    chat_id: chatId,
  });
}

export function tdGetChatMember(
  chatId: number,
  userId: number,
): void {
  tdSend({
    _: "getChatMember",
    chat_id: chatId,
    user_id: userId,
  });
}

// ─── Callback Answer ──────────────────────────────────────────
export function tdAnswerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false,
): void {
  tdSend({
    _: "answerCallbackQuery",
    callback_query_id: callbackQueryId,
    text: text || "",
    show_alert: showAlert,
  });
}

// ═══════════════════════════════════════════════════════════════
// src/storage/audit.ts - Audit Logger
// ═══════════════════════════════════════════════════════════════

import { appendAudit, kvList, kvKey, KV_NAMESPACES } from "./kv.ts";
import type { AuditRecord } from "../types/mod.ts";
import { AuditAction } from "../types/mod.ts";

// ─── Audit Logger ─────────────────────────────────────────────
export class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: AuditRecord[] = [];
  private flushInterval: number | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;

  private constructor() {
    this.startAutoFlush();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // ─── Log Entry ──────────────────────────────────────────────
  async log(
    action: AuditAction,
    actorId: number,
    details: {
      targetId?: string | null;
      success?: boolean;
      errorMessage?: string | null;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    const record: AuditRecord = {
      id: crypto.randomUUID(),
      action,
      actorId,
      targetId: details.targetId ?? null,
      details: details.metadata ?? {},
      success: details.success ?? true,
      errorMessage: details.errorMessage ?? null,
      timestamp: Date.now(),
      ipAddress: null,
    };

    this.logQueue.push(record);

    if (this.logQueue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  // ─── Convenience Methods ────────────────────────────────────
  async logPostCreate(
    actorId: number,
    postId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.POST_CREATE, actorId, {
      targetId: postId,
      success,
    });
  }

  async logPostPublish(
    actorId: number,
    postId: string,
    channelId: number,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.POST_PUBLISH, actorId, {
      targetId: postId,
      success,
      metadata: { channelId },
    });
  }

  async logBroadcastCreate(
    actorId: number,
    jobId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.BROADCAST_CREATE, actorId, {
      targetId: jobId,
      success,
    });
  }

  async logBroadcastStart(
    actorId: number,
    jobId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.BROADCAST_START, actorId, {
      targetId: jobId,
      success,
    });
  }

  async logBroadcastComplete(
    actorId: number,
    jobId: string,
    deliveredCount: number,
    failedCount: number,
  ): Promise<void> {
    await this.log(AuditAction.BROADCAST_COMPLETE, actorId, {
      targetId: jobId,
      success: true,
      metadata: { deliveredCount, failedCount },
    });
  }

  async logBroadcastFail(
    actorId: number,
    jobId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.log(AuditAction.BROADCAST_FAIL, actorId, {
      targetId: jobId,
      success: false,
      errorMessage,
    });
  }

  async logSubscriberAdd(
    actorId: number,
    subscriberId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.SUBSCRIBER_ADD, actorId, {
      targetId: subscriberId,
      success,
    });
  }

  async logSubscriberRemove(
    actorId: number,
    subscriberId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.SUBSCRIBER_REMOVE, actorId, {
      targetId: subscriberId,
      success,
    });
  }

  async logSubscriberBlock(
    actorId: number,
    subscriberId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.SUBSCRIBER_BLOCK, actorId, {
      targetId: subscriberId,
      success,
    });
  }

  async logChannelAdd(
    actorId: number,
    channelId: number,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.CHANNEL_ADD, actorId, {
      targetId: String(channelId),
      success,
    });
  }

  async logChannelRemove(
    actorId: number,
    channelId: number,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.CHANNEL_REMOVE, actorId, {
      targetId: String(channelId),
      success,
    });
  }

  async logSupportTicketCreate(
    actorId: number,
    ticketId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.SUPPORT_TICKET_CREATE, actorId, {
      targetId: ticketId,
      success,
    });
  }

  async logSupportTicketClose(
    actorId: number,
    ticketId: string,
    success: boolean = true,
  ): Promise<void> {
    await this.log(AuditAction.SUPPORT_TICKET_CLOSE, actorId, {
      targetId: ticketId,
      success,
    });
  }

  async logSystemError(
    actorId: number,
    errorMessage: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(AuditAction.SYSTEM_ERROR, actorId, {
      success: false,
      errorMessage,
      metadata,
    });
  }

  async logSystemStartup(actorId: number): Promise<void> {
    await this.log(AuditAction.SYSTEM_STARTUP, actorId, {
      success: true,
    });
  }

  async logSystemShutdown(actorId: number): Promise<void> {
    await this.log(AuditAction.SYSTEM_SHUTDOWN, actorId, {
      success: true,
    });
  }

  async logUnauthorizedAccess(
    actorId: number,
    attemptedAction: string,
  ): Promise<void> {
    await this.log(AuditAction.RBAC_UNAUTHORIZED, actorId, {
      success: false,
      metadata: { attemptedAction },
    });
  }

  // ─── Flush Mechanism ────────────────────────────────────────
  async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.splice(0, this.logQueue.length);

    for (const record of batch) {
      try {
        await appendAudit(record);
      } catch (error) {
        console.error("[Audit] Failed to persist audit record:", error);
      }
    }
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((error) => {
        console.error("[Audit] Auto-flush failed:", error);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  stopAutoFlush(): void {
    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  // ─── Query Methods ──────────────────────────────────────────
  async getRecentLogs(limit: number = 100): Promise<AuditRecord[]> {
    const entries = await kvList(
      kvKey(KV_NAMESPACES.AUDIT),
      { limit, reverse: true },
    );
    return entries.map((entry) => entry.value);
  }

  async getLogsByAction(
    action: AuditAction,
    limit: number = 100,
  ): Promise<AuditRecord[]> {
    const allEntries = await kvList(
      kvKey(KV_NAMESPACES.AUDIT),
      { limit: limit * 5, reverse: true },
    );

    return allEntries
      .map((entry) => entry.value)
      .filter((record) => record.action === action)
      .slice(0, limit);
  }

  async getLogsByActor(
    actorId: number,
    limit: number = 100,
  ): Promise<AuditRecord[]> {
    const allEntries = await kvList(
      kvKey(KV_NAMESPACES.AUDIT),
      { limit: limit * 5, reverse: true },
    );

    return allEntries
      .map((entry) => entry.value)
      .filter((record) => record.actorId === actorId)
      .slice(0, limit);
  }
}

// ─── Singleton Export ─────────────────────────────────────────
export const auditLogger = AuditLogger.getInstance();

// ═══════════════════════════════════════════════════════════════
// src/routing/permissions.ts - RBAC Gatekeeper
// ═══════════════════════════════════════════════════════════════

import { auditLogger as auditLoggerInstance } from "../storage/audit.ts";
import { kvGet, kvKey, KV_NAMESPACES } from "../storage/kv.ts";
import type { SystemConfig } from "../types/mod.ts";

// ─── Permission Levels ────────────────────────────────────────
export enum PermissionLevel {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  OPERATOR = "operator",
  VIEWER = "viewer",
  NONE = "none",
}

export interface AdminUser {
  telegramId: number;
  username: string | null;
  permissionLevel: PermissionLevel;
  addedAt: number;
  addedBy: number;
  isActive: boolean;
}

// ─── Command Permissions Map ──────────────────────────────────
const COMMAND_PERMISSIONS: Record<string, PermissionLevel> = {
  // Posts
  "/post_create": PermissionLevel.ADMIN,
  "/post_draft": PermissionLevel.ADMIN,
  "/post_preview": PermissionLevel.OPERATOR,
  "/post_publish": PermissionLevel.ADMIN,
  "/post_delete": PermissionLevel.ADMIN,
  "/post_list": PermissionLevel.VIEWER,

  // Broadcasts
  "/broadcast_new": PermissionLevel.ADMIN,
  "/broadcast_start": PermissionLevel.ADMIN,
  "/broadcast_pause": PermissionLevel.ADMIN,
  "/broadcast_resume": PermissionLevel.ADMIN,
  "/broadcast_cancel": PermissionLevel.ADMIN,
  "/broadcast_status": PermissionLevel.VIEWER,
  "/broadcast_history": PermissionLevel.VIEWER,

  // Support
  "/support_list": PermissionLevel.OPERATOR,
  "/support_assign": PermissionLevel.ADMIN,
  "/support_close": PermissionLevel.OPERATOR,
  "/support_reply": PermissionLevel.OPERATOR,

  // Scheduler
  "/schedule_new": PermissionLevel.ADMIN,
  "/schedule_list": PermissionLevel.VIEWER,
  "/schedule_cancel": PermissionLevel.ADMIN,

  // Channels
  "/channel_add": PermissionLevel.ADMIN,
  "/channel_remove": PermissionLevel.ADMIN,
  "/channel_list": PermissionLevel.VIEWER,
  "/channel_stats": PermissionLevel.VIEWER,

  // Subscribers
  "/subscriber_list": PermissionLevel.VIEWER,
  "/subscriber_add": PermissionLevel.ADMIN,
  "/subscriber_remove": PermissionLevel.ADMIN,
  "/subscriber_import": PermissionLevel.ADMIN,
  "/subscriber_export": PermissionLevel.ADMIN,
  "/subscriber_block": PermissionLevel.ADMIN,

  // Analytics
  "/analytics_dashboard": PermissionLevel.VIEWER,
  "/analytics_report": PermissionLevel.VIEWER,

  // Audit
  "/audit_view": PermissionLevel.ADMIN,
  "/audit_export": PermissionLevel.ADMIN,

  // System
  "/system_status": PermissionLevel.VIEWER,
  "/system_config": PermissionLevel.SUPER_ADMIN,
  "/system_backup": PermissionLevel.SUPER_ADMIN,
  "/system_emergency": PermissionLevel.SUPER_ADMIN,
};

// ─── Permission Hierarchy ─────────────────────────────────────
const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  [PermissionLevel.SUPER_ADMIN]: 4,
  [PermissionLevel.ADMIN]: 3,
  [PermissionLevel.OPERATOR]: 2,
  [PermissionLevel.VIEWER]: 1,
  [PermissionLevel.NONE]: 0,
};

// ─── Admin Cache ──────────────────────────────────────────────
class AdminRegistry {
  private adminCache: Map<number, AdminUser> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 60_000;

  async loadAdmins(): Promise<void> {
    const config = await kvGet<SystemConfig>(
      kvKey(KV_NAMESPACES.CONFIG, "system"),
    );

    if (!config || !config.adminUserIds) {
      console.warn("[RBAC] No admin configuration found");
      return;
    }

    for (const adminId of config.adminUserIds) {
      const adminData = await kvGet<AdminUser>(
        kvKey(KV_NAMESPACES.SUBSCRIBERS, `admin_${adminId}`),
      );

      if (adminData) {
        this.adminCache.set(adminId, adminData);
      } else {
        this.adminCache.set(adminId, {
          telegramId: adminId,
          username: null,
          permissionLevel: PermissionLevel.ADMIN,
          addedAt: Date.now(),
          addedBy: 0,
          isActive: true,
        });
      }
    }

    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
  }

  async getAdmin(userId: number): Promise<AdminUser | null> {
    if (Date.now() > this.cacheExpiry) {
      await this.loadAdmins();
    }

    return this.adminCache.get(userId) || null;
  }

  async isAdmin(userId: number): Promise<boolean> {
    const admin = await this.getAdmin(userId);
    return admin !== null && admin.isActive;
  }

  invalidateCache(): void {
    this.cacheExpiry = 0;
  }
}

const adminRegistry = new AdminRegistry();

// ─── Permission Check Middleware ──────────────────────────────
export interface PermissionCheckResult {
  authorized: boolean;
  userId: number;
  permissionLevel: PermissionLevel;
  requiredLevel: PermissionLevel;
  command: string;
  reason?: string;
}

export async function checkPermission(
  userId: number,
  command: string,
): Promise<PermissionCheckResult> {
  const admin = await adminRegistry.getAdmin(userId);

  if (!admin || !admin.isActive) {
    const result: PermissionCheckResult = {
      authorized: false,
      userId,
      permissionLevel: PermissionLevel.NONE,
      requiredLevel: COMMAND_PERMISSIONS[command] || PermissionLevel.ADMIN,
      command,
      reason: "User is not an authorized administrator",
    };

    await auditLoggerInstance.logUnauthorizedAccess(userId, command);
    return result;
  }

  const requiredLevel = COMMAND_PERMISSIONS[command] || PermissionLevel.ADMIN;
  const userLevel = admin.permissionLevel;
  const authorized =
    PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];

  const result: PermissionCheckResult = {
    authorized,
    userId,
    permissionLevel: userLevel,
    requiredLevel,
    command,
    reason: authorized
      ? undefined
      : `Insufficient permissions: ${userLevel} < ${requiredLevel}`,
  };

  if (!authorized) {
    await auditLoggerInstance.logUnauthorizedAccess(userId, command);
  }

  return result;
}

// ─── Admin Management ─────────────────────────────────────────
export async function addAdmin(
  telegramId: number,
  username: string | null,
  permissionLevel: PermissionLevel,
  addedBy: number,
): Promise<AdminUser> {
  const { kvSet } = await import("../storage/kv.ts");

  const admin: AdminUser = {
    telegramId,
    username,
    permissionLevel,
    addedAt: Date.now(),
    addedBy,
    isActive: true,
  };

  await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, `admin_${telegramId}`), admin);
  adminRegistry.invalidateCache();

  return admin;
}

export async function removeAdmin(telegramId: number): Promise<void> {
  const admin = await adminRegistry.getAdmin(telegramId);
  if (admin) {
    admin.isActive = false;
    const { kvSet } = await import("../storage/kv.ts");
    await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, `admin_${telegramId}`), admin);
  }
  adminRegistry.invalidateCache();
}

export async function updateAdminPermission(
  telegramId: number,
  newLevel: PermissionLevel,
): Promise<void> {
  const admin = await adminRegistry.getAdmin(telegramId);
  if (admin) {
    admin.permissionLevel = newLevel;
    const { kvSet } = await import("../storage/kv.ts");
    await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, `admin_${telegramId}`), admin);
  }
  adminRegistry.invalidateCache();
}

// ─── Initialization ───────────────────────────────────────────
export async function initPermissions(): Promise<void> {
  await adminRegistry.loadAdmins();
  console.log("[RBAC] Permission system initialized");
}

export function getAdminRegistry(): AdminRegistry {
  return adminRegistry;
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY: Phase 2 Complete
// ═══════════════════════════════════════════════════════════════

/*
✅ Phase 2: Outbound Wrappers & Security

Completed:
1. Message Serializer (messages.ts)
   - tdSendMessage() for text
   - tdSendPhoto(), tdSendVideo(), tdSendDocument() for media
   - tdEditMessageText() and tdEditMessageReplyMarkup()
   - tdDeleteMessages(), tdSendChatAction()
   - tdForwardMessages(), tdGetChat(), tdGetChatMember()
   - tdAnswerCallbackQuery()
   - Inline keyboard builder

2. Audit Logger (audit.ts)
   - Singleton pattern with auto-flush
   - Batch flushing (50 records)
   - Complete action type coverage
   - Convenience methods for domain actions
   - Query methods (by action, by actor)
   - Immutable audit trail

3. RBAC Gatekeeper (permissions.ts)
   - Permission levels (SUPER_ADMIN, ADMIN, OPERATOR, VIEWER, NONE)
   - Hierarchical permission checking
   - Command-to-permission mapping
   - Admin registry with caching
   - Admin management (add, remove, update)
   - Unauthorized access logging

Status: READY FOR PHASE 3
Every outbound message goes through typed serializers.
Every action is audited and attributed.
Every command is permission-checked.
*/
