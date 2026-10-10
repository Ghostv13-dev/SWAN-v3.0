// Phase 1: Foundation & Persistence
// Complete implementation of storage layer and type system

// ═══════════════════════════════════════════════════════════════
// src/types/enums.ts
// ═══════════════════════════════════════════════════════════════

export enum PostStatus {
  DRAFT = "draft",
  READY = "ready",
  PUBLISHED = "published",
  FAILED = "failed",
  ARCHIVED = "archived",
}

export enum BroadcastJobStatus {
  QUEUED = "queued",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum SupportTicketStatus {
  OPEN = "open",
  ASSIGNED = "assigned",
  CLOSED = "closed",
  ARCHIVED = "archived",
}

export enum SubscriberStatus {
  ACTIVE = "active",
  BLOCKED = "blocked",
  UNSUBSCRIBED = "unsubscribed",
}

export enum ChannelType {
  GROUP = "group",
  SUPERGROUP = "supergroup",
  CHANNEL = "channel",
  PRIVATE = "private",
}

export enum AuditAction {
  POST_CREATE = "post.create",
  POST_UPDATE = "post.update",
  POST_PUBLISH = "post.publish",
  POST_DELETE = "post.delete",
  BROADCAST_CREATE = "broadcast.create",
  BROADCAST_START = "broadcast.start",
  BROADCAST_PAUSE = "broadcast.pause",
  BROADCAST_RESUME = "broadcast.resume",
  BROADCAST_COMPLETE = "broadcast.complete",
  BROADCAST_FAIL = "broadcast.fail",
  SUBSCRIBER_ADD = "subscriber.add",
  SUBSCRIBER_REMOVE = "subscriber.remove",
  SUBSCRIBER_BLOCK = "subscriber.block",
  CHANNEL_ADD = "channel.add",
  CHANNEL_REMOVE = "channel.remove",
  SUPPORT_TICKET_CREATE = "support.ticket.create",
  SUPPORT_TICKET_CLOSE = "support.ticket.close",
  SYSTEM_ERROR = "system.error",
  SYSTEM_STARTUP = "system.startup",
  SYSTEM_SHUTDOWN = "system.shutdown",
  RBAC_UNAUTHORIZED = "rbac.unauthorized",
}

export enum SchedulerJobStatus {
  PENDING = "pending",
  ACTIVE = "active",
  EXECUTED = "executed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum MediaType {
  TEXT = "text",
  PHOTO = "photo",
  VIDEO = "video",
  DOCUMENT = "document",
  AUDIO = "audio",
  ANIMATION = "animation",
  POLL = "poll",
  INLINE_KEYBOARD = "inline_keyboard",
}

// ═══════════════════════════════════════════════════════════════
// src/types/schemas.ts
// ═══════════════════════════════════════════════════════════════

import {
  AuditAction,
  BroadcastJobStatus,
  ChannelType,
  MediaType,
  PostStatus,
  SchedulerJobStatus,
  SubscriberStatus,
  SupportTicketStatus,
} from "./enums.ts";

// ─── Post Draft ───────────────────────────────────────────────
export interface PostDraft {
  id: string;
  channelId: number;
  content: PostContent;
  status: PostStatus;
  media: MediaAttachment[];
  inlineKeyboard: InlineKeyboard | null;
  scheduledAt: number | null;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  metadata: Record<string, unknown>;
}

export interface PostContent {
  text: string;
  entities: MessageEntity[];
  parseMode: "html" | "markdown" | "plain";
}

export interface MessageEntity {
  type: "bold" | "italic" | "code" | "pre" | "link" | "mention";
  offset: number;
  length: number;
  url?: string;
}

export interface MediaAttachment {
  type: MediaType;
  fileId: string;
  fileUniqueId: string;
  caption: string;
  width?: number;
  height?: number;
  duration?: number;
  mimeType?: string;
  fileSize?: number;
}

export interface InlineKeyboard {
  rows: InlineKeyboardRow[];
}

export interface InlineKeyboardRow {
  buttons: InlineKeyboardButton[];
}

export interface InlineKeyboardButton {
  text: string;
  callbackData: string;
  url?: string;
}

// ─── Broadcast Job ────────────────────────────────────────────
export interface BroadcastJob {
  id: string;
  postId: string;
  channelIds: number[];
  status: BroadcastJobStatus;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  currentCursor: string | null;
  lastSubscriberId: string | null;
  floodWaitUntil: number | null;
  batchSize: number;
  delayBetweenBatches: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  errorLog: BroadcastError[];
  metadata: Record<string, unknown>;
}

export interface BroadcastError {
  subscriberId: string;
  channelId: number;
  errorCode: number;
  errorMessage: string;
  timestamp: number;
}

// ─── Subscriber ───────────────────────────────────────────────
export interface Subscriber {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  status: SubscriberStatus;
  subscribedChannels: number[];
  joinedAt: number;
  lastActivityAt: number;
  blockedAt: number | null;
  metadata: Record<string, unknown>;
}

// ─── Channel ──────────────────────────────────────────────────
export interface Channel {
  id: number;
  title: string;
  username: string | null;
  type: ChannelType;
  memberCount: number;
  isVerified: boolean;
  addedAt: number;
  lastPostAt: number | null;
  settings: ChannelSettings;
  metadata: Record<string, unknown>;
}

export interface ChannelSettings {
  allowBroadcast: boolean;
  postCooldown: number;
  maxMediaPerPost: number;
  requireApproval: boolean;
}

// ─── Audit Record ─────────────────────────────────────────────
export interface AuditRecord {
  id: string;
  action: AuditAction;
  actorId: number;
  targetId: string | null;
  details: Record<string, unknown>;
  success: boolean;
  errorMessage: string | null;
  timestamp: number;
  ipAddress: string | null;
}

// ─── Support Ticket ───────────────────────────────────────────
export interface SupportTicket {
  id: string;
  subscriberId: string;
  channelId: number;
  status: SupportTicketStatus;
  assignedTo: number | null;
  subject: string;
  messages: SupportMessage[];
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
}

export interface SupportMessage {
  id: string;
  senderId: number;
  content: string;
  timestamp: number;
  isAdmin: boolean;
}

// ─── Scheduler Job ────────────────────────────────────────────
export interface SchedulerJob {
  id: string;
  postId: string;
  channelIds: number[];
  executeAt: number;
  status: SchedulerJobStatus;
  createdAt: number;
  executedAt: number | null;
  broadcastJobId: string | null;
}

// ─── System Configuration ─────────────────────────────────────
export interface SystemConfig {
  adminUserIds: number[];
  broadcastDefaults: BroadcastDefaults;
  retentionPolicies: RetentionPolicies;
  rateLimits: RateLimits;
  sessionPoolSize: number;
}

export interface BroadcastDefaults {
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  floodWaitBuffer: number;
}

export interface RetentionPolicies {
  draftRetentionDays: number;
  auditLogRetentionDays: number;
  closedTicketRetentionDays: number;
  completedJobRetentionDays: number;
}

export interface RateLimits {
  maxCommandsPerMinute: number;
  maxBroadcastsPerHour: number;
  maxApiCallsPerSecond: number;
}

// ─── TDLib Types ──────────────────────────────────────────────
export interface TDLibUpdate {
  _: string;
  [key: string]: unknown;
}

export interface TDLibResponse {
  _: string;
  "@extra"?: unknown;
  [key: string]: unknown;
}

export interface TDLibError {
  _: "error";
  code: number;
  message: string;
}

// ─── Re-exports ───────────────────────────────────────────────
export * from "./enums.ts";

// ═══════════════════════════════════════════════════════════════
// src/types/mod.ts
// ═══════════════════════════════════════════════════════════════

export * from "./schemas.ts";
export * from "./enums.ts";

// ═══════════════════════════════════════════════════════════════
// src/storage/kv.ts - KV Storage Driver
// ═══════════════════════════════════════════════════════════════

// ─── Namespace Prefixes ────────────────────────────────────────
export const KV_NAMESPACES = {
  DRAFTS: "draft",
  JOBS: "job",
  SUBSCRIBERS: "subscriber",
  CHANNELS: "channel",
  AUDIT: "audit",
  TICKETS: "ticket",
  SCHEDULER: "scheduler",
  CONFIG: "config",
  CURSORS: "cursor",
} as const;

export type KVNamespace = typeof KV_NAMESPACES[keyof typeof KV_NAMESPACES];

// ─── KV Key Builder ───────────────────────────────────────────
export function kvKey(namespace: KVNamespace, ...parts: string[]): Deno.KvKey {
  return [namespace, ...parts];
}

// ─── KV Singleton ─────────────────────────────────────────────
let kvInstance: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    kvInstance = await Deno.openKv();
    console.log("[KV] Storage engine initialized");
  }
  return kvInstance;
}

export async function closeKv(): Promise<void> {
  if (kvInstance) {
    await kvInstance.close();
    kvInstance = null;
    console.log("[KV] Storage engine closed");
  }
}

// ─── Generic CRUD Operations ──────────────────────────────────
export async function kvSet<T>(
  key: Deno.KvKey,
  value: T,
  options?: { expireIn?: number },
): Promise<void> {
  const kv = await getKv();
  await kv.set(key, value, options);
}

export async function kvGet<T>(key: Deno.KvKey): Promise<T | null> {
  const kv = await getKv();
  const result = await kv.get(key);
  return result.value as T | null;
}

export async function kvDelete(key: Deno.KvKey): Promise<void> {
  const kv = await getKv();
  await kv.delete(key);
}

export async function kvAtomic(): Promise<Deno.AtomicOperation> {
  const kv = await getKv();
  return kv.atomic();
}

export async function kvList<T>(
  prefix: Deno.KvKey,
  options?: Deno.KvListOptions,
): Promise<Deno.KvEntry<T>[]> {
  const kv = await getKv();
  const entries: Deno.KvEntry<T>[] = [];
  const iter = kv.list<T>({ prefix }, options);
  for await (const entry of iter) {
    entries.push(entry);
  }
  return entries;
}

// ─── Namespace-Specific Helpers ───────────────────────────────
export async function setDraft<T>(draftId: string, data: T): Promise<void> {
  await kvSet(kvKey(KV_NAMESPACES.DRAFTS, draftId), data);
}

export async function getDraft<T>(draftId: string): Promise<T | null> {
  return await kvGet<T>(kvKey(KV_NAMESPACES.DRAFTS, draftId));
}

export async function setJob<T>(jobId: string, data: T): Promise<void> {
  await kvSet(kvKey(KV_NAMESPACES.JOBS, jobId), data);
}

export async function getJob<T>(jobId: string): Promise<T | null> {
  return await kvGet<T>(kvKey(KV_NAMESPACES.JOBS, jobId));
}

export async function setSubscriber<T>(
  subscriberId: string,
  data: T,
): Promise<void> {
  await kvSet(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId), data);
}

export async function getSubscriber<T>(
  subscriberId: string,
): Promise<T | null> {
  return await kvGet<T>(kvKey(KV_NAMESPACES.SUBSCRIBERS, subscriberId));
}

export async function setChannel<T>(
  channelId: number,
  data: T,
): Promise<void> {
  await kvSet(kvKey(KV_NAMESPACES.CHANNELS, String(channelId)), data);
}

export async function getChannel<T>(channelId: number): Promise<T | null> {
  return await kvGet<T>(kvKey(KV_NAMESPACES.CHANNELS, String(channelId)));
}

export async function appendAudit(record: unknown): Promise<void> {
  const auditId = crypto.randomUUID();
  await kvSet(kvKey(KV_NAMESPACES.AUDIT, auditId), record);
}

// ═══════════════════════════════════════════════════════════════
// src/bootstrap/tdlib.ts - TDLib FFI Bindings
// ═══════════════════════════════════════════════════════════════

import type { TDLibResponse, TDLibUpdate } from "../types/mod.ts";

// ─── FFI Library Configuration ────────────────────────────────
interface TDLibSymbols {
  td_create_client_id: {
    parameters: [];
    result: "i32";
  };
  td_send: {
    parameters: ["i32", "buffer", "i32"];
    result: "void";
  };
  td_receive: {
    parameters: ["f64"];
    result: "pointer";
  };
  td_execute: {
    parameters: ["buffer", "i32"];
    result: "pointer";
  };
  td_set_log_message_callback: {
    parameters: ["i32", "function"];
    result: "void";
  };
}

let tdlib: Deno.DynamicLibrary<TDLibSymbols> | null = null;
let clientId: number | null = null;
let isRunning = false;

// ─── Library Path Resolution ──────────────────────────────────
function getLibraryPath(): string {
  const envPath = Deno.env.get("TDLIB_PATH");
  if (envPath) return envPath;

  const platform = Deno.build.os;
  const paths: Record<string, string> = {
    linux: "/usr/local/lib/libtdjson.so",
    darwin: "/usr/local/lib/libtdjson.dylib",
    windows: "C:\\tdlib\\libtdjson.dll",
  };

  return paths[platform] || paths.linux;
}

// ─── Text Encoding Helpers ────────────────────────────────────
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeString(str: string): Uint8Array {
  return encoder.encode(str + "\0");
}

function decodeBuffer(ptr: Deno.PointerValue): string {
  if (ptr === null) return "";

  const view = new Deno.UnsafePointerView(ptr);
  const bytes: number[] = [];
  let offset = 0;

  while (true) {
    const byte = view.getUint8(offset);
    if (byte === 0) break;
    bytes.push(byte);
    offset++;
  }

  return decoder.decode(new Uint8Array(bytes));
}

// ─── TDLib Initialization ─────────────────────────────────────
export function initTDLib(): void {
  const libPath = getLibraryPath();
  console.log(`[TDLib] Loading library from: ${libPath}`);

  tdlib = Deno.dlopen(libPath, {
    td_create_client_id: { parameters: [], result: "i32" },
    td_send: { parameters: ["i32", "buffer", "i32"], result: "void" },
    td_receive: { parameters: ["f64"], result: "pointer" },
    td_execute: { parameters: ["buffer", "i32"], result: "pointer" },
    td_set_log_message_callback: {
      parameters: ["i32", "function"],
      result: "void",
    },
  });

  clientId = tdlib.symbols.td_create_client_id();
  console.log(`[TDLib] Client initialized with ID: ${clientId}`);
}

// ─── Send MTProto Payload ─────────────────────────────────────
export function tdSend(payload: Record<string, unknown>): void {
  if (!tdlib || clientId === null) {
    throw new Error(
      "[TDLib] Library not initialized. Call initTDLib() first.",
    );
  }

  const json = JSON.stringify(payload);
  const buffer = encodeString(json);
  tdlib.symbols.td_send(clientId, buffer, buffer.length);
}

// ─── Receive MTProto Response ─────────────────────────────────
export function tdReceive(timeout: number = 1.0): TDLibResponse | null {
  if (!tdlib) {
    throw new Error("[TDLib] Library not initialized.");
  }

  const ptr = tdlib.symbols.td_receive(timeout);
  if (ptr === null) return null;

  const json = decodeBuffer(ptr);
  try {
    return JSON.parse(json) as TDLibResponse;
  } catch {
    console.error("[TDLib] Failed to parse response:", json);
    return null;
  }
}

// ─── Execute Synchronous TDLib Method ─────────────────────────
export function tdExecute(
  method: string,
  params: Record<string, unknown> = {},
): TDLibResponse | null {
  if (!tdlib) {
    throw new Error("[TDLib] Library not initialized.");
  }

  const payload = { _: method, ...params };
  const json = JSON.stringify(payload);
  const buffer = encodeString(json);

  const ptr = tdlib.symbols.td_execute(buffer, buffer.length);
  if (ptr === null) return null;

  const response = decodeBuffer(ptr);
  try {
    return JSON.parse(response) as TDLibResponse;
  } catch {
    return null;
  }
}

// ─── Update Event Loop ────────────────────────────────────────
type UpdateHandler = (update: TDLibUpdate) => void | Promise<void>;
const updateHandlers: Set<UpdateHandler> = new Set();

export function onUpdate(handler: UpdateHandler): () => void {
  updateHandlers.add(handler);
  return () => updateHandlers.delete(handler);
}

export async function startUpdateLoop(
  pollInterval: number = 100,
): Promise<void> {
  if (isRunning) {
    console.warn("[TDLib] Update loop is already running");
    return;
  }

  isRunning = true;
  console.log("[TDLib] Starting update receive loop");

  while (isRunning) {
    const response = tdReceive(0.1);
    if (response) {
      for (const handler of updateHandlers) {
        try {
          await handler(response as TDLibUpdate);
        } catch (error) {
          console.error("[TDLib] Update handler error:", error);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

export function stopUpdateLoop(): void {
  isRunning = false;
  console.log("[TDLib] Update loop stopped");
}

// ─── Cleanup ──────────────────────────────────────────────────
export function closeTDLib(): void {
  stopUpdateLoop();
  if (tdlib) {
    tdlib.close();
    tdlib = null;
    clientId = null;
    console.log("[TDLib] Library closed");
  }
}

// ─── Authorization Helpers ────────────────────────────────────
export function setTdlibParameters(params: {
  apiId: number;
  apiHash: string;
  databaseDirectory: string;
  filesDirectory: string;
  useTestDc: boolean;
}): void {
  tdSend({
    _: "setTdlibParameters",
    parameters: {
      _: "tdlibParameters",
      use_test_dc: params.useTestDc,
      database_directory: params.databaseDirectory,
      files_directory: params.filesDirectory,
      use_file_database: true,
      use_chat_info_database: true,
      use_message_database: true,
      use_secret_chats: false,
      api_id: params.apiId,
      api_hash: params.apiHash,
      system_language_code: "en",
      device_model: "SWAN Engine",
      application_version: "3.0.0",
      enable_storage_optimizer: true,
    },
  });
}

export function checkAuthorizationState(): void {
  tdSend({ _: "getAuthorizationState" });
}

export function sendPhoneNumber(phoneNumber: string): void {
  tdSend({
    _: "setAuthenticationPhoneNumber",
    phone_number: phoneNumber,
  });
}

export function sendAuthCode(code: string): void {
  tdSend({
    _: "checkAuthenticationCode",
    code: code,
  });
}

// ═══════════════════════════════════════════════════════════════
// deno.json - Configuration
// ═══════════════════════════════════════════════════════════════

/*
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "lib": ["deno.window", "deno.unstable"]
  },
  "tasks": {
    "dev": "deno run --allow-net --allow-ffi --allow-read --allow-write --allow-env --unstable-kv --watch main.ts",
    "start": "deno run --allow-net --allow-ffi --allow-read --allow-write --allow-env --unstable-kv main.ts",
    "build": "deno cache --lock=lock.json --lock-write main.ts",
    "test": "deno test --allow-all --unstable-kv tests/",
    "fmt": "deno fmt src/ tests/ main.ts",
    "lint": "deno lint src/ tests/ main.ts"
  },
  "imports": {
    "std/": "https://deno.land/std@0.208.0/"
  }
}
*/

// ═══════════════════════════════════════════════════════════════
// SUMMARY: Phase 1 Complete
// ═══════════════════════════════════════════════════════════════

/*
✅ Phase 1: Foundation & Persistence

Completed:
1. Type System (enums.ts, schemas.ts)
   - All entity types defined
   - Strict TypeScript interfaces
   - Enum-based status types

2. KV Storage Layer (kv.ts)
   - Deno.openKv() singleton
   - 9 namespace prefixes
   - Generic CRUD operations
   - Type-safe key building
   - List and range queries

3. TDLib FFI Bindings (tdlib.ts)
   - Deno.dlopen() for libtdjson
   - Client creation and lifecycle
   - Send/receive/execute operations
   - Update event loop with handlers
   - Authorization helpers

4. Configuration (deno.json)
   - Strict TypeScript settings
   - All required permissions
   - Task definitions
   - Dependency imports

Status: READY FOR PHASE 2
All state is persistent. Memory is transient. Crashes are resumable.
*/
