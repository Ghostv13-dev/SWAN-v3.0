// Phase 5: Dashboard & Observability
// src/ui/menus.ts

import { 
  tdSendMessage, tdEditMessageReplyMarkup, 
  tdEditMessageText 
} from "../tdlib/messages.ts";
import { 
  postController } from "../domain/posts.ts";
import { broadcastWorker } from "../workers/broadcast-worker.ts";
import { schedulerWorker } from "../workers/scheduler-worker.ts";
import { supportWorker } from "../workers/support-worker.ts";
import { subscriberController } from "../domain/subscribers.ts";
import type { 
  InlineKeyboard, InlineKeyboardRow, 
  InlineKeyboardButton 
} from "../types/mod.ts";
import { PostStatus } from "../types/mod.ts";

// ─── Menu Builder Utility ────────────────────────────────────────
export interface MenuButton {
  text: string;
  callbackData: string;
  url?: string;
}

export interface MenuRow {
  buttons: MenuButton[];
}

export interface MenuLayout {
  title: string;
  description: string;
  rows: MenuRow[];
}

function buildKeyboard(rows: MenuRow[]): InlineKeyboard {
  return {
    rows: rows.map((row) => ({
      buttons: row.buttons,
    })),
  };
}

// ─── Main Dashboard Menu ─────────────────────────────────────────
export const MAIN_DASHBOARD: MenuLayout = {
  title: "📊 SWAN Control Panel",
  description: "Select an operation below:",
  rows: [
    {
      buttons: [
        { text: "📝 Posts", callbackData: "menu:posts" },
        { text: "📢 Broadcasts", callbackData: "menu:broadcasts" },
      ],
    },
    {
      buttons: [
        { text: "📅 Scheduler", callbackData: "menu:scheduler" },
        { text: "🎫 Support", callbackData: "menu:support" },
      ],
    },
    {
      buttons: [
        { text: "👥 Subscribers", callbackData: "menu:subscribers" },
        { text: "📂 Channels", callbackData: "menu:channels" },
      ],
    },
    {
      buttons: [
        { text: "📊 Analytics", callbackData: "menu:analytics" },
        { text: "📜 Audit", callbackData: "menu:audit" },
      ],
    },
    {
      buttons: [
        { text: "⚙️ System", callbackData: "menu:system" },
      ],
    },
  ],
};

// ─── Posts Menu ──────────────────────────────────────────────────
export async function getPostsMenu(): Promise<MenuLayout> {
  const drafts = await postController.listDrafts();
  const draftCount = drafts.length;
  const readyCount = drafts.filter((d) => d.status === PostStatus.READY).length;

  return {
    title: "📝 Posts Management",
    description: `📊 Drafts: ${draftCount} | Ready to publish: ${readyCount}`,
    rows: [
      {
        buttons: [
          { text: "✏️ Create New", callbackData: "post:create" },
          { text: "👁️ View Drafts", callbackData: "post:list" },
        ],
      },
      {
        buttons: [
          { text: "🔄 Refresh", callbackData: "menu:posts" },
          { text: "◀️ Back", callbackData: "menu:main" },
        ],
      },
    ],
  };
}

// ─── Broadcasts Menu ─────────────────────────────────────────────
export const BROADCASTS_MENU: MenuLayout = {
  title: "📢 Broadcast Operations",
  description: "Manage bulk message delivery to subscribers.",
  rows: [
    {
      buttons: [
        { text: "🚀 New Broadcast", callbackData: "broadcast:new" },
        { text: "📋 Queue", callbackData: "broadcast:queue" },
      ],
    },
    {
      buttons: [
        { text: "▶️ Running", callbackData: "broadcast:running" },
        { text: "📊 History", callbackData: "broadcast:history" },
      ],
    },
    {
      buttons: [
        { text: "⚠️ Failed Jobs", callbackData: "broadcast:failed" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── Scheduler Menu ──────────────────────────────────────────────
export const SCHEDULER_MENU: MenuLayout = {
  title: "📅 Task Scheduler",
  description: "Schedule posts and broadcasts for future execution.",
  rows: [
    {
      buttons: [
        { text: "➕ New Schedule", callbackData: "schedule:create" },
        { text: "📋 Queue", callbackData: "schedule:queue" },
      ],
    },
    {
      buttons: [
        { text: "⏸️ Pause All", callbackData: "schedule:pause_all" },
        { text: "▶️ Resume All", callbackData: "schedule:resume_all" },
      ],
    },
    {
      buttons: [
        { text: "📊 Stats", callbackData: "schedule:stats" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── Support Menu ────────────────────────────────────────────────
export const SUPPORT_MENU: MenuLayout = {
  title: "🎫 Support Tickets",
  description: "Manage subscriber support requests.",
  rows: [
    {
      buttons: [
        { text: "📖 Open Tickets", callbackData: "support:open" },
        { text: "👤 My Assigned", callbackData: "support:assigned" },
      ],
    },
    {
      buttons: [
        { text: "✅ Closed", callbackData: "support:closed" },
        { text: "📊 Stats", callbackData: "support:stats" },
      ],
    },
    {
      buttons: [
        { text: "🔄 Refresh", callbackData: "menu:support" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── Subscribers Menu ────────────────────────────────────────────
export async function getSubscribersMenu(): Promise<MenuLayout> {
  const activeCount = await subscriberController.getActiveSubscriberCount();

  return {
    title: "👥 Subscriber Management",
    description: `📊 Active subscribers: ${activeCount}`,
    rows: [
      {
        buttons: [
          { text: "👀 View All", callbackData: "subscriber:list" },
          { text: "🔍 Search", callbackData: "subscriber:search" },
        ],
      },
      {
        buttons: [
          { text: "📥 Import", callbackData: "subscriber:import" },
          { text: "📤 Export", callbackData: "subscriber:export" },
        ],
      },
      {
        buttons: [
          { text: "🚫 Blocked", callbackData: "subscriber:blocked" },
          { text: "📊 Stats", callbackData: "subscriber:stats" },
        ],
      },
      {
        buttons: [
          { text: "🔄 Refresh", callbackData: "menu:subscribers" },
          { text: "◀️ Back", callbackData: "menu:main" },
        ],
      },
    ],
  };
}

// ─── Channels Menu ───────────────────────────────────────────────
export const CHANNELS_MENU: MenuLayout = {
  title: "📂 Channel Management",
  description: "Configure broadcast target channels.",
  rows: [
    {
      buttons: [
        { text: "👀 Registry", callbackData: "channel:list" },
        { text: "➕ Add Channel", callbackData: "channel:add" },
      ],
    },
    {
      buttons: [
        { text: "🗑️ Remove", callbackData: "channel:remove" },
        { text: "⚙️ Settings", callbackData: "channel:settings" },
      ],
    },
    {
      buttons: [
        { text: "📊 Stats", callbackData: "channel:stats" },
        { text: "🧪 Test Post", callbackData: "channel:test" },
      ],
    },
    {
      buttons: [
        { text: "🔄 Refresh", callbackData: "menu:channels" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── Analytics Menu ──────────────────────────────────────────────
export const ANALYTICS_MENU: MenuLayout = {
  title: "📊 Analytics & Reports",
  description: "Monitor delivery and growth metrics.",
  rows: [
    {
      buttons: [
        { text: "📈 Channel Stats", callbackData: "analytics:channels" },
        { text: "📉 Broadcast Stats", callbackData: "analytics:broadcasts" },
      ],
    },
    {
      buttons: [
        { text: "🎯 Delivery Rate", callbackData: "analytics:delivery" },
        { text: "📊 Growth", callbackData: "analytics:growth" },
      ],
    },
    {
      buttons: [
        { text: "⚠️ Failures", callbackData: "analytics:failures" },
        { text: "📄 Export Report", callbackData: "analytics:export" },
      ],
    },
    {
      buttons: [
        { text: "🔄 Refresh", callbackData: "menu:analytics" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── Audit Menu ──────────────────────────────────────────────────
export const AUDIT_MENU: MenuLayout = {
  title: "📜 Audit Center",
  description: "Review system actions and alerts.",
  rows: [
    {
      buttons: [
        { text: "📖 Recent Logs", callbackData: "audit:recent" },
        { text: "🔍 Search", callbackData: "audit:search" },
      ],
    },
    {
      buttons: [
        { text: "⚠️ Errors", callbackData: "audit:errors" },
        { text: "🔐 Security", callbackData: "audit:security" },
      ],
    },
    {
      buttons: [
        { text: "📤 Export", callbackData: "audit:export" },
        { text: "🗑️ Clear Old", callbackData: "audit:cleanup" },
      ],
    },
    {
      buttons: [
        { text: "🔄 Refresh", callbackData: "menu:audit" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── System Menu ────────────────────────────────────────────────
export const SYSTEM_MENU: MenuLayout = {
  title: "⚙️ System Control",
  description: "Advanced operations and emergency controls.",
  rows: [
    {
      buttons: [
        { text: "📊 Status", callbackData: "system:status" },
        { text: "🔧 Config", callbackData: "system:config" },
      ],
    },
    {
      buttons: [
        { text: "👥 Admins", callbackData: "system:admins" },
        { text: "📋 Retention", callbackData: "system:retention" },
      ],
    },
    {
      buttons: [
        { text: "🌐 TDLib Health", callbackData: "system:tdlib" },
        { text: "👷 Workers", callbackData: "system:workers" },
      ],
    },
    {
      buttons: [
        { text: "⏹️ Emergency Pause", callbackData: "system:pause" },
        { text: "💾 Backup", callbackData: "system:backup" },
      ],
    },
    {
      buttons: [
        { text: "🔄 Refresh", callbackData: "menu:system" },
        { text: "◀️ Back", callbackData: "menu:main" },
      ],
    },
  ],
};

// ─── Render Menu ────────────────────────────────────────────────
export function renderMenu(menu: MenuLayout, chatId: number): void {
  const keyboard = buildKeyboard(menu.rows);

  const messageText = `${menu.title}\n\n${menu.description}`;

  tdSendMessage({
    chatId,
    text: messageText,
    parseMode: "html",
    inlineKeyboard: keyboard,
  });
}

// ─── Edit Menu ──────────────────────────────────────────────────
export function editMenu(
  chatId: number,
  messageId: number,
  menu: MenuLayout,
): void {
  const keyboard = buildKeyboard(menu.rows);

  tdEditMessageText({
    chatId,
    messageId,
    text: `${menu.title}\n\n${menu.description}`,
    inlineKeyboard: keyboard,
  });
}

// ─── Status Bar Renderer ─────────────────────────────────────────
export interface SystemStatus {
  broadcastWorkerRunning: boolean;
  schedulerWorkerRunning: boolean;
  supportWorkerRunning: boolean;
  activeJobs: number;
  pendingSchedules: number;
  openTickets: number;
  queuedBroadcasts: number;
  tdlibHealthy: boolean;
  uptime: number;
}

export function renderStatusBar(status: SystemStatus): string {
  const bwStatus = status.broadcastWorkerRunning ? "✓" : "✗";
  const swStatus = status.schedulerWorkerRunning ? "✓" : "✗";
  const hwStatus = status.supportWorkerRunning ? "✓" : "✗";
  const tdStatus = status.tdlibHealthy ? "✓" : "✗";

  const uptimeHours = Math.floor(status.uptime / (60 * 60 * 1000));
  const uptimeMinutes = Math.floor((status.uptime % (60 * 60 * 1000)) / (60 * 1000));

  return `
<b>🔴 SWAN System Status</b>

<b>Workers</b>
🚀 Broadcast: ${bwStatus} | 📅 Scheduler: ${swStatus} | 🎫 Support: ${hwStatus}

<b>Queue Depth</b>
📢 Broadcasts: ${status.queuedBroadcasts} | 🕐 Scheduled: ${status.pendingSchedules}

<b>Active Workload</b>
⚡ Active Jobs: ${status.activeJobs} | 📋 Open Tickets: ${status.openTickets}

<b>Infrastructure</b>
🌐 TDLib: ${tdStatus}

<b>System Health</b>
⏱️ Uptime: ${uptimeHours}h ${uptimeMinutes}m
  `.trim();
}

// ─── Error Message Renderer ─────────────────────────────────────
export function renderError(errorMessage: string, details?: string): string {
  let message = `<b>⚠️ Error</b>\n\n${errorMessage}`;

  if (details) {
    message += `\n\n<code>${details}</code>`;
  }

  return message;
}

// ─── Success Message Renderer ────────────────────────────────────
export function renderSuccess(successMessage: string): string {
  return `<b>✅ Success</b>\n\n${successMessage}`;
}

// ─── Breadcrumb Navigation ──────────────────────────────────────
export function addBreadcrumb(menu: MenuLayout, path: string[]): MenuLayout {
  const breadcrumb = path.join(" > ");
  return {
    ...menu,
    description: `<code>${breadcrumb}</code>\n\n${menu.description}`,
  };
}

// ─── Format Timestamp ───────────────────────────────────────────
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Format Number with Thousands Separator ────────────────────
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ─── Pagination Button Builder ──────────────────────────────────
export interface PaginationButtons {
  previous?: MenuButton;
  next?: MenuButton;
  pageInfo: string;
}

export function buildPaginationButtons(
  currentPage: number,
  totalPages: number,
  baseCallback: string,
): PaginationButtons {
  const buttons: PaginationButtons = {
    pageInfo: `Page ${currentPage} of ${totalPages}`,
  };

  if (currentPage > 1) {
    buttons.previous = {
      text: "◀️ Previous",
      callbackData: `${baseCallback}:page:${currentPage - 1}`,
    };
  }

  if (currentPage < totalPages) {
    buttons.next = {
      text: "Next ▶️",
      callbackData: `${baseCallback}:page:${currentPage + 1}`,
    };
  }

  return buttons;
}

// ─── Confirmation Dialog Builder ─────────────────────────────────
export function buildConfirmationDialog(
  actionText: string,
  confirmCallback: string,
  cancelCallback: string = "menu:main",
): MenuLayout {
  return {
    title: "⚠️ Confirm Action",
    description: actionText,
    rows: [
      {
        buttons: [
          { text: "✅ Confirm", callbackData: confirmCallback },
          { text: "❌ Cancel", callbackData: cancelCallback },
        ],
      },
    ],
  };
}
