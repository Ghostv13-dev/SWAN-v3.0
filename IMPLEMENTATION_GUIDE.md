// deno.json - SWAN v3.0 Configuration
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

---

// Environment Configuration (.env.example)

# Telegram API Configuration
TELEGRAM_API_ID=94575
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_PHONE=+1234567890

# TDLib Configuration
TDLIB_PATH=/usr/local/lib/libtdjson.so
USE_TEST_DC=false

# System Configuration
LOG_LEVEL=info
ADMIN_USER_ID=123456789
PORT=3000

# KV Storage
ENABLE_KV_PERSISTENCE=true

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RETENTION_PRUNING=true

---

// Directory Structure
swan-engine/
├── src/
│   ├── bootstrap/
│   │   └── tdlib.ts                 # TDLib FFI initialization
│   ├── domain/
│   │   ├── posts.ts                 # Post draft management
│   │   ├── settings.ts              # System configuration
│   │   ├── subscribers.ts           # Subscriber registry
│   │   └── analytics.ts             # Metrics & analytics
│   ├── routing/
│   │   ├── update-router.ts         # Inbound event routing
│   │   ├── payload-parser.ts        # Stateless parsing
│   │   ├── channel-resolver.ts      # Channel ID resolution
│   │   └── permissions.ts           # RBAC gatekeeper
│   ├── storage/
│   │   ├── kv.ts                    # Deno KV abstraction
│   │   └── audit.ts                 # Audit logging
│   ├── tdlib/
│   │   └── messages.ts              # Outbound serializer
│   ├── ui/
│   │   └── menus.ts                 # Dashboard UI menus
│   ├── workers/
│   │   ├── broadcast-worker.ts      # Broadcast queue executor
│   │   ├── scheduler-worker.ts      # Schedule activation
│   │   ├── support-worker.ts        # Support ticket management
│   │   ├── retention-worker.ts      # Data retention pruning
│   │   └── circuit-breaker.ts       # FloodWait handling
│   └── system/
│       ├── health.ts                # System health monitoring
│       └── emergency.ts             # Emergency controls
├── main.ts                          # Application bootstrapper
├── deno.json                        # Deno configuration
├── lock.json                        # Dependency lock file
├── .env                             # Environment variables
├── .env.example                     # Environment template
├── data/
│   ├── tdlib/                       # TDLib database
│   └── files/                       # Telegram file cache
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
└── tests/
    └── /* test files */

---

// Implementation Checklist

## Phase 1: Foundation & Persistence ✅
- [x] Repository scaffolding
- [x] KV storage driver with namespace prefixes
- [x] Type definitions for all entities
- [x] TDLib FFI bindings and initialization

## Phase 2: Outbound Wrappers & Security ✅
- [x] Message serializer for all MTProto payload types
- [x] Audit logging with batch flushing
- [x] RBAC permission system with hierarchical access
- [x] Admin user registry and caching

## Phase 3: Inbound Routing & Parsing ✅
- [x] Raw TDLib update listener and event splitting
- [x] Text command and callback query parsing
- [x] Media type detection and extraction
- [x] Inline keyboard builder and matrix layout engine
- [x] Post and settings domain controllers

## Phase 4: Worker Plane ✅
- [x] Broadcast worker with cursor-based resumption
- [x] FloodWait circuit breaker with exponential backoff
- [x] Scheduler worker for temporal job activation
- [x] Retention worker for data cleanup
- [x] Support worker for ticket lifecycle management
- [x] Subscriber management controller

## Phase 5: Dashboard & Observability ✅
- [x] Interactive menu renderer for all dashboards
- [x] Analytics collection and metrics aggregation
- [x] Real-time status bar and health visualization
- [x] Report generation engine

## Phase 6: Bootstrapper & Initialization ✅
- [x] System initialization sequence
- [x] Command and callback registration
- [x] Worker lifecycle management
- [x] Graceful shutdown handling
- [x] Signal handling (SIGINT, SIGTERM)

## Phase 7: System Health & Emergency Controls ✅
- [x] Component health monitoring
- [x] Alert generation and tracking
- [x] Emergency pause/resume functionality
- [x] Isolated component restart
- [x] System state reporting

---

// Quick Start Guide

### Prerequisites
- Deno 1.40+
- TDLib compiled library (libtdjson.so / libtdjson.dylib)
- Telegram API credentials (API_ID, API_HASH)
- Optional: Docker for containerized deployment

### Installation

1. Clone or download the SWAN repository:
   ```bash
   git clone https://github.com/your-org/swan-engine.git
   cd swan-engine
   ```

2. Install TDLib:
   ```bash
   # macOS
   brew install tdlib
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install libssl-dev gperf cmake clang-10 libc++-10-dev libc++abi-10-dev
   git clone https://github.com/tdlib/td.git
   cd td && mkdir build && cd build
   cmake -DCMAKE_BUILD_TYPE=Release ..
   make && sudo make install
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Telegram API credentials
   ```

4. Run the system:
   ```bash
   # Development
   deno task dev
   
   # Production
   deno task start
   ```

### Telegram Bot Setup

1. Create a bot via @BotFather on Telegram
2. Get the API ID and API Hash from https://my.telegram.org
3. Add the bot token to your .env file
4. Start the SWAN engine

### First Commands

Once running, send these commands to your bot:
- `/start` - Open main dashboard
- `/menu` - Show main menu
- `/status` - System health check
- `/report` - Generate system report
- `/pause` - Emergency pause (admin only)
- `/resume` - Resume operation (admin only)

---

// Performance Optimization Tips

### Tuning Broadcast Performance
- Adjust BATCH_SIZE in broadcast-worker.ts for larger batches (50-200)
- Increase DELAY_BETWEEN_MESSAGES_MS to respect rate limits
- Monitor FloodWait events and adjust FLOOD_WAIT_BUFFER

### Optimizing Storage
- Run retention worker more frequently for large deployments
- Monitor KV storage size with `deno run --allow-all ./scripts/kv-stats.ts`
- Archive old metrics to external storage if needed

### Memory Management
- Set appropriate limits in retentionWorker for old data
- Monitor Deno memory usage: `console.log(Deno.memoryUsage())`
- Consider worker isolation for heavy operations

### Database Performance
- Index frequently queried fields in KV
- Use prefix scans efficiently
- Batch mutations to reduce roundtrips

---

// Security Best Practices

1. **Admin Management**
   - Always use `/system:admins` to manage admin users
   - Rotate credentials regularly
   - Log all admin actions in audit center

2. **API Security**
   - Keep TELEGRAM_API_HASH secret
   - Don't commit .env to version control
   - Use environment-specific credentials

3. **Data Protection**
   - Enable TDLib database encryption
   - Use HTTPS for any external APIs
   - Implement rate limiting for sensitive operations

4. **Monitoring**
   - Enable audit logging for all changes
   - Review security logs daily
   - Set up alerts for critical events
   - Monitor for unauthorized access attempts

5. **Emergency Procedures**
   - Test emergency pause regularly
   - Keep backup of KV data
   - Document incident response procedures
   - Have isolated restart procedures ready

---

// Troubleshooting

### TDLib Connection Issues
```
Error: "[TDLib] Library not initialized"
Solution: Ensure TDLIB_PATH is correct and library is installed
```

### FloodWait Events
```
Error: "FLOOD_WAIT_30"
Solution: System will automatically pause and retry. Increase delay between batches.
```

### KV Storage Errors
```
Error: "Failed to open KV"
Solution: Check data/ directory permissions and available disk space
```

### Memory Issues
```
Error: "Deno max memory exceeded"
Solution: Lower BATCH_SIZE or increase Deno memory limit with --max-heap-size flag
```

---

// Monitoring & Metrics

### Key Metrics to Monitor
- Broadcast delivery rate (target: >95%)
- Average delivery latency (target: <2s per recipient)
- FloodWait event frequency (target: <5 per hour)
- Scheduler job accuracy (target: >99.9%)
- System uptime (target: >99.5%)

### Health Check Endpoints
- `/status` - System health snapshot
- `/report` - Full analytics report
- `/health` - Component-level status

### Alerting Thresholds
- Delivery rate < 90%: Warning
- Delivery rate < 70%: Critical
- Orphaned jobs > 100: Warning
- Worker down: Critical
- Storage full: Critical

---

// Production Deployment

### Docker Deployment
```dockerfile
FROM denoland/deno:latest
WORKDIR /app
COPY . .
RUN deno cache --unstable-kv main.ts
CMD ["deno", "run", "--allow-all", "--unstable-kv", "main.ts"]
```

### Kubernetes Deployment
- Use StatefulSet for persistent storage
- Mount KV volume for data persistence
- Configure health check probes
- Set resource limits appropriately

### Scaling Strategy
- Horizontal: Run multiple instances with shared KV backend
- Vertical: Increase CPU/memory for single instance
- Monitor load and adjust worker threads accordingly

---

// Contributing & Extensions

### Adding New Commands
1. Create handler function in main.ts
2. Register with `registerCommand()`
3. Add permission level in COMMAND_PERMISSIONS
4. Document in API.md

### Custom Domain Controllers
1. Create new file in src/domain/
2. Implement CRUD operations using kvSet/kvGet
3. Add audit logging for mutations
4. Export singleton instance

### New Worker Type
1. Create in src/workers/
2. Implement start() and stop() methods
3. Export singleton
4. Initialize in main.ts bootstrap sequence

---

// Version History

### v3.0 (Current)
- Complete rewrite with stateless architecture
- TDLib native integration
- Deno KV persistence layer
- Worker-based task execution
- Full audit logging
- RBAC permission system
- Circuit breaker for rate limiting
- Real-time analytics and monitoring

### v2.0 (Previous)
- Bot API based implementation
- In-memory state management
- Basic broadcast functionality

### v1.0 (Legacy)
- Initial prototype
- Limited features

---

// License & Support

SWAN is released under the MIT License.

For support:
- GitHub Issues: https://github.com/your-org/swan-engine/issues
- Documentation: https://swan-docs.example.com
- Community: Telegram group @swan_engine_community
