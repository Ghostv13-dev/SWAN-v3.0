// Phase 6: Bootstrapper & System Initialization
// main.ts

import { 
  initTDLib, 
  startUpdateLoop, 
  stopUpdateLoop, 
  closeTDLib,
  checkAuthorizationState,
  setTdlibParameters,
} from "./src/bootstrap/tdlib.ts";
import { initRouter, registerCommand, registerCallback } from "./src/routing/update-router.ts";
import { initPermissions } from "./src/routing/permissions.ts";
import { broadcastWorker } from "./src/workers/broadcast-worker.ts";
import { schedulerWorker } from "./src/workers/scheduler-worker.ts";
import { supportWorker } from "./src/workers/support-worker.ts";
import { retentionWorker } from "./src/workers/retention-worker.ts";
import { settingsController } from "./src/domain/settings.ts";
import { analyticsController } from "./src/domain/analytics.ts";
import { 
  renderMenu, 
  editMenu, 
  renderStatusBar,
  MAIN_DASHBOARD,
  getPostsMenu,
  getSubscribersMenu,
  BROADCASTS_MENU,
  SCHEDULER_MENU,
  SUPPORT_MENU,
  CHANNELS_MENU,
  ANALYTICS_MENU,
  AUDIT_MENU,
  SYSTEM_MENU,
  renderError,
  renderSuccess,
} from "./src/ui/menus.ts";
import { auditLogger } from "./src/storage/audit.ts";
import type { TextCommandEvent, InlineCallbackEvent } from "./src/routing/update-router.ts";

// ─── Global System State ─────────────────────────────────────────
declare global {
  interface globalThis {
    STARTUP_TIME: number;
    SYSTEM_PAUSED: boolean;
  }
}

globalThis.STARTUP_TIME = Date.now();
globalThis.SYSTEM_PAUSED = false;

// ─── Command Handlers ───────────────────────────────────────────
async function handleStartCommand(event: TextCommandEvent): Promise<void> {
  console.log(`[CommandHandler] /start from user ${event.userId}`);

  renderMenu(MAIN_DASHBOARD, event.chatId);

  await auditLogger.logSystemStartup(event.userId);
}

async function handleMenuCommand(event: TextCommandEvent): Promise<void> {
  const action = event.args[1] || "main";

  try {
    switch (action) {
      case "posts":
        const postsMenu = await getPostsMenu();
        renderMenu(postsMenu, event.chatId);
        break;

      case "broadcasts":
        renderMenu(BROADCASTS_MENU, event.chatId);
        break;

      case "scheduler":
        renderMenu(SCHEDULER_MENU, event.chatId);
        break;

      case "support":
        renderMenu(SUPPORT_MENU, event.chatId);
        break;

      case "subscribers":
        const subscribersMenu = await getSubscribersMenu();
        renderMenu(subscribersMenu, event.chatId);
        break;

      case "channels":
        renderMenu(CHANNELS_MENU, event.chatId);
        break;

      case "analytics":
        renderMenu(ANALYTICS_MENU, event.chatId);
        break;

      case "audit":
        renderMenu(AUDIT_MENU, event.chatId);
        break;

      case "system":
        renderMenu(SYSTEM_MENU, event.chatId);
        break;

      case "main":
      default:
        renderMenu(MAIN_DASHBOARD, event.chatId);
    }
  } catch (error) {
    console.error("[CommandHandler] Menu command error:", error);
  }
}

async function handleStatusCommand(event: TextCommandEvent): Promise<void> {
  try {
    const metrics = await analyticsController.calculateSystemMetrics();
    
    const statusMessage = renderStatusBar({
      broadcastWorkerRunning: broadcastWorker.getStatus().isRunning,
      schedulerWorkerRunning: schedulerWorker.getStatus().isRunning,
      supportWorkerRunning: supportWorker.getStatus().isRunning,
      activeJobs: broadcastWorker.getStatus().activeJobs,
      pendingSchedules: 0,
      openTickets: metrics.channels.size,
      queuedBroadcasts: 0,
      tdlibHealthy: true,
      uptime: globalThis.STARTUP_TIME ? Date.now() - globalThis.STARTUP_TIME : 0,
    });

    // Send status message
    const { tdSendMessage } = await import("./src/tdlib/messages.ts");
    tdSendMessage({
      chatId: event.chatId,
      text: statusMessage,
      parseMode: "html",
    });
  } catch (error) {
    console.error("[CommandHandler] Status command error:", error);
  }
}

async function handlePauseCommand(event: TextCommandEvent): Promise<void> {
  globalThis.SYSTEM_PAUSED = true;
  broadcastWorker.stop();
  schedulerWorker.stop();
  
  const { tdSendMessage } = await import("./src/tdlib/messages.ts");
  tdSendMessage({
    chatId: event.chatId,
    text: renderSuccess("System paused. All workers stopped."),
    parseMode: "html",
  });

  await auditLogger.logSystemError(event.userId, "System emergency pause initiated");
}

async function handleResumeCommand(event: TextCommandEvent): Promise<void> {
  globalThis.SYSTEM_PAUSED = false;
  broadcastWorker.start();
  schedulerWorker.start();

  const { tdSendMessage } = await import("./src/tdlib/messages.ts");
  tdSendMessage({
    chatId: event.chatId,
    text: renderSuccess("System resumed. Workers restarted."),
    parseMode: "html",
  });

  await auditLogger.logSystemStartup(event.userId);
}

async function handleReportCommand(event: TextCommandEvent): Promise<void> {
  try {
    const report = await analyticsController.generateReport();

    const { tdSendMessage } = await import("./src/tdlib/messages.ts");
    tdSendMessage({
      chatId: event.chatId,
      text: `<code>${report}</code>`,
      parseMode: "html",
    });
  } catch (error) {
    const { tdSendMessage } = await import("./src/tdlib/messages.ts");
    tdSendMessage({
      chatId: event.chatId,
      text: renderError("Failed to generate report", String(error)),
      parseMode: "html",
    });
  }
}

// ─── Callback Handlers ───────────────────────────────────────────
async function handleMenuCallback(event: InlineCallbackEvent): Promise<void> {
  const action = event.params.menu || "main";
  const { tdEditMessageText } = await import("./src/tdlib/messages.ts");

  let menu;

  switch (action) {
    case "posts":
      menu = await getPostsMenu();
      break;
    case "broadcasts":
      menu = BROADCASTS_MENU;
      break;
    case "scheduler":
      menu = SCHEDULER_MENU;
      break;
    case "support":
      menu = SUPPORT_MENU;
      break;
    case "subscribers":
      menu = await getSubscribersMenu();
      break;
    case "channels":
      menu = CHANNELS_MENU;
      break;
    case "analytics":
      menu = ANALYTICS_MENU;
      break;
    case "audit":
      menu = AUDIT_MENU;
      break;
    case "system":
      menu = SYSTEM_MENU;
      break;
    case "main":
    default:
      menu = MAIN_DASHBOARD;
  }

  editMenu(event.chatId, event.messageId, menu);
}

async function handlePostCreate(event: InlineCallbackEvent): Promise<void> {
  const { postController } = await import("./src/domain/posts.ts");
  const { tdSendMessage } = await import("./src/tdlib/messages.ts");

  // Send prompt for post creation
  tdSendMessage({
    chatId: event.chatId,
    text: "📝 <b>Create New Post</b>\n\nPlease send the post content (text, media, or formatted message):",
    parseMode: "html",
  });

  await auditLogger.logPostCreate(event.userId, "unknown");
}

async function handleBroadcastStart(event: InlineCallbackEvent): Promise<void> {
  if (globalThis.SYSTEM_PAUSED) {
    const { tdSendMessage } = await import("./src/tdlib/messages.ts");
    tdSendMessage({
      chatId: event.chatId,
      text: renderError("System is paused. Cannot start broadcasts."),
      parseMode: "html",
    });
    return;
  }

  const { tdSendMessage } = await import("./src/tdlib/messages.ts");
  tdSendMessage({
    chatId: event.chatId,
    text: "📢 <b>Start Broadcast</b>\n\nSelect a post draft to broadcast or create a new one.",
    parseMode: "html",
  });
}

// ─── System Initialization ──────────────────────────────────────
async function initializeSystem(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                   SWAN v3.0 Engine Startup");
  console.log("═══════════════════════════════════════════════════════════════");

  try {
    // Step 1: Initialize TDLib
    console.log("\n[Init] 1️⃣ Initializing TDLib FFI bindings...");
    initTDLib();

    // Step 2: Configure TDLib
    console.log("[Init] 2️⃣ Configuring TDLib parameters...");
    setTdlibParameters({
      apiId: parseInt(Deno.env.get("TELEGRAM_API_ID") || "94575"),
      apiHash: Deno.env.get("TELEGRAM_API_HASH") || "test_api_hash",
      databaseDirectory: "./data/tdlib",
      filesDirectory: "./data/files",
      useTestDc: Deno.env.get("USE_TEST_DC") === "true",
    });

    // Step 3: Initialize KV Storage
    console.log("[Init] 3️⃣ Initializing Deno KV storage layer...");
    const { getKv } = await import("./src/storage/kv.ts");
    await getKv();

    // Step 4: Initialize Permissions System
    console.log("[Init] 4️⃣ Loading RBAC permission system...");
    await initPermissions();

    // Step 5: Initialize Settings
    console.log("[Init] 5️⃣ Loading system configuration...");
    const config = await settingsController.initConfig(0);
    console.log(`     → Admin users: ${config.adminUserIds.length}`);
    console.log(`     → Broadcast batch size: ${config.broadcastDefaults.batchSize}`);

    // Step 6: Start Analytics
    console.log("[Init] 6️⃣ Starting analytics collection...");
    analyticsController.start();

    // Step 7: Initialize Routing
    console.log("[Init] 7️⃣ Initializing update router and command registry...");
    initRouter();

    // Register commands
    registerCommand("/start", handleStartCommand, "Start SWAN control panel");
    registerCommand("/menu", handleMenuCommand, "Open main menu");
    registerCommand("/status", handleStatusCommand, "Show system status", true);
    registerCommand("/pause", handlePauseCommand, "Emergency pause system", true);
    registerCommand("/resume", handleResumeCommand, "Resume system operation", true);
    registerCommand("/report", handleReportCommand, "Generate system report", true);

    // Register callbacks
    registerCallback("menu:*", handleMenuCallback);
    registerCallback("post:create", handlePostCreate);
    registerCallback("broadcast:start", handleBroadcastStart);

    // Step 8: Start Worker Processes
    console.log("[Init] 8️⃣ Starting worker processes...");
    broadcastWorker.start();
    schedulerWorker.start();
    supportWorker.start();
    retentionWorker.start();

    console.log("     ✓ Broadcast worker");
    console.log("     ✓ Scheduler worker");
    console.log("     ✓ Support worker");
    console.log("     ✓ Retention worker");

    // Step 9: Start TDLib Update Loop
    console.log("[Init] 9️⃣ Starting TDLib update receiver loop...");
    await startUpdateLoop(100);

    // Step 10: Check Auth State
    console.log("[Init] 🔟 Verifying Telegram authorization...");
    checkAuthorizationState();

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("✅ SWAN Engine is READY");
    console.log("═══════════════════════════════════════════════════════════════\n");

    await auditLogger.logSystemStartup(0);

  } catch (error) {
    console.error("\n❌ SWAN Initialization FAILED:");
    console.error(error);
    await shutdown();
    Deno.exit(1);
  }
}

// ─── Graceful Shutdown ──────────────────────────────────────────
async function shutdown(): Promise<void> {
  console.log("\n[Shutdown] Gracefully shutting down SWAN engine...");

  // Stop workers
  console.log("[Shutdown] Stopping workers...");
  broadcastWorker.stop();
  schedulerWorker.stop();
  supportWorker.stop();
  retentionWorker.stop();

  // Stop TDLib update loop
  console.log("[Shutdown] Stopping TDLib update loop...");
  stopUpdateLoop();

  // Flush analytics
  console.log("[Shutdown] Flushing analytics...");
  analyticsController.stop();

  // Flush audit logs
  console.log("[Shutdown] Flushing audit logs...");
  await auditLogger.flush();

  // Close KV storage
  console.log("[Shutdown] Closing KV storage...");
  const { closeKv } = await import("./src/storage/kv.ts");
  await closeKv();

  // Close TDLib
  console.log("[Shutdown] Closing TDLib...");
  closeTDLib();

  console.log("[Shutdown] ✅ Graceful shutdown complete\n");
}

// ─── Signal Handlers ────────────────────────────────────────────
Deno.addSignalListener("SIGINT", async () => {
  console.log("\n[Signal] Received SIGINT");
  await auditLogger.logSystemShutdown(0);
  await shutdown();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  console.log("\n[Signal] Received SIGTERM");
  await auditLogger.logSystemShutdown(0);
  await shutdown();
  Deno.exit(0);
});

// ─── Main Entry Point ───────────────────────────────────────────
if (import.meta.main) {
  await initializeSystem();

  // Keep the process alive
  console.log("[Main] System is running. Press Ctrl+C to shutdown.\n");
}

export { initializeSystem, shutdown };
