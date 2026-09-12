/**
 * scratch/test_phase21_deployment_readiness.js
 *
 * Phase 21: Production Deployment Preparation & Launch Readiness Suite
 *
 * Validates:
 * 1. Deployment configuration files & environment examples
 * 2. Client bundle secret scan (answers, database URLs, credentials)
 * 3. Dual health check endpoints (/health and /api/health)
 * 4. Inbound request body limit protection (100kb -> HTTP 413)
 * 5. Production error sanitization (stack trace suppression)
 * 6. End-to-end continuous Level 1 -> Level 10 progression with PostgreSQL
 * 7. Cumulative inventory accumulation (1 to 10 items)
 * 8. Atomic Level 10 completion & idempotent session finalization
 * 9. Speedrun scoring and global leaderboard ranking
 * 10. Post-completion recovery resilience (no infinite spinners)
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

async function request(endpoint, options = {}, retries = 2) {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if ((res.status >= 500 || res.status === 429) && retries > 0) {
      await new Promise((r) => setTimeout(r, 1200));
      return request(endpoint, options, retries - 1);
    }
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1200));
      return request(endpoint, options, retries - 1);
    }
    throw err;
  }
}

function assert(condition, message, details = null) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    if (details) console.error("     Details:", details);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runSuite() {
  console.log("================================================================================");
  console.log("  CORE QUEST FINDER — PHASE 21 PRODUCTION DEPLOYMENT & LAUNCH READINESS SUITE   ");
  console.log("================================================================================\n");

  const repoRoot = path.resolve(__dirname, "..");

  // ---------------------------------------------------------------------------
  // 1. DEPLOYMENT ARTIFACTS & ENVIRONMENT AUDIT
  // ---------------------------------------------------------------------------
  console.log("--- PART 1: DEPLOYMENT ARTIFACTS & ENVIRONMENT AUDIT ---");

  const backendEnvExPath = path.join(repoRoot, "backend", ".env.example");
  assert(fs.existsSync(backendEnvExPath), "backend/.env.example exists");
  const backendEnvEx = fs.readFileSync(backendEnvExPath, "utf-8");
  assert(!backendEnvEx.includes("postgres://postgres:"), "backend/.env.example contains no real password credentials");
  assert(backendEnvEx.includes("PORT=") && backendEnvEx.includes("DATABASE_URL="), "backend/.env.example contains required variables");

  const frontendEnvExPath = path.join(repoRoot, "frontend", ".env.example");
  assert(fs.existsSync(frontendEnvExPath), "frontend/.env.example exists");
  const frontendEnvEx = fs.readFileSync(frontendEnvExPath, "utf-8");
  assert(frontendEnvEx.includes("VITE_API_URL"), "frontend/.env.example contains VITE_API_URL");

  const pm2Path = path.join(repoRoot, "ecosystem.config.cjs");
  assert(fs.existsSync(pm2Path), "ecosystem.config.cjs exists for PM2 process supervision");

  const nginxPath = path.join(repoRoot, "nginx.conf");
  assert(fs.existsSync(nginxPath), "nginx.conf exists for reverse proxy configuration");

  const dockerfilePath = path.join(repoRoot, "backend", "Dockerfile");
  assert(fs.existsSync(dockerfilePath), "backend/Dockerfile exists for containerized builds");

  const dockerComposePath = path.join(repoRoot, "docker-compose.production.yml");
  assert(fs.existsSync(dockerComposePath), "docker-compose.production.yml exists");

  const deploymentDocPath = path.join(repoRoot, "DEPLOYMENT.md");
  assert(fs.existsSync(deploymentDocPath), "DEPLOYMENT.md runbook exists");

  // ---------------------------------------------------------------------------
  // 2. CLIENT BUNDLE SECRET SCAN
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 2: CLIENT PRODUCTION BUNDLE SECRET & ANSWER SCAN ---");

  const clientAssetsDir = path.join(repoRoot, "frontend", "dist", "client", "assets");
  assert(fs.existsSync(clientAssetsDir), "frontend/dist/client/assets exists");

  const assetFiles = fs.readdirSync(clientAssetsDir).filter((f) => f.endsWith(".js"));
  assert(assetFiles.length > 0, `Found ${assetFiles.length} compiled client JavaScript chunks`);

  let bundleText = "";
  for (const file of assetFiles) {
    bundleText += fs.readFileSync(path.join(clientAssetsDir, file), "utf-8");
  }

  const forbiddenStrings = [
    { label: "Level 10 Answer ('keyboard')", regex: /["']keyboard["']/ },
    { label: "Level 5 Answer ('salt')", regex: /["']salt["']/ },
    { label: "Level 4 Answer ('159')", regex: /["']159["']/ },
    { label: "Level 9 Answer ('443')", regex: /["']443["']/ },
    { label: "Level 6 Decoy Answer ('FOUNDER')", regex: /["']FOUNDER["']/ },
    { label: "Database URL connection string", regex: /postgres(ql)?:\/\//i },
    { label: "DATABASE_URL identifier", regex: /\bDATABASE_URL\b/ },
    { label: "DIRECT_URL identifier", regex: /\bDIRECT_URL\b/ },
  ];

  for (const { label, regex } of forbiddenStrings) {
    const match = regex.exec(bundleText);
    assert(!match, `Zero client bundle leakage for: ${label}`);
  }

  // Favicon verification
  const faviconPath = path.join(repoRoot, "frontend", "dist", "client", "favicon.ico");
  assert(fs.existsSync(faviconPath), "favicon.ico exists in production client bundle");
  assert(fs.statSync(faviconPath).size > 100, "favicon.ico is a valid non-empty asset");

  // ---------------------------------------------------------------------------
  // 3. CLOUD ORCHESTRATION & HEALTH CHECKS
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 3: HEALTH ENDPOINTS AUDIT ---");

  const rootHealth = await request("/health");
  assert(rootHealth.status === 200, "Root /health returns HTTP 200");
  assert(rootHealth.data?.success === true, "Root /health success flag is true");
  assert(rootHealth.data?.data?.database?.connected === true, "Root /health reports database.connected === true");

  const apiHealth = await request("/api/health");
  assert(apiHealth.status === 200, "API /api/health returns HTTP 200");
  assert(apiHealth.data?.success === true, "API /api/health success flag is true");
  assert(apiHealth.data?.data?.database?.connected === true, "API /api/health reports database.connected === true");

  // ---------------------------------------------------------------------------
  // 4. PAYLOAD LIMIT PROTECTION (100KB)
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 4: PAYLOAD SIZE LIMIT PROTECTION ---");

  const oversizedBody = JSON.stringify({
    playerName: "A".repeat(110 * 1024),
    enrollmentNumber: "OVERSIZED_TEST",
    team: "Test Team",
  });

  const payloadRes = await fetch(`${BASE_URL}/api/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: oversizedBody,
  });
  assert(payloadRes.status === 413, "Oversized request (>100kb) rejected with HTTP 413 Payload Too Large");

  // ---------------------------------------------------------------------------
  // 5. PRODUCTION ERROR SANITIZATION
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 5: PRODUCTION ERROR SANITIZATION ---");

  // Requesting non-existent player
  const nonExistentRes = await request("/api/players/NON_EXISTENT_ID_9999");
  assert(nonExistentRes.status === 404, "Invalid resource correctly returns 404");
  assert(!nonExistentRes.data?.stack, "Error responses do not leak server stack traces");

  // ---------------------------------------------------------------------------
  // 6. END-TO-END LEVEL 1 -> LEVEL 10 PRODUCTION FLOW
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 6: END-TO-END L1 -> L10 GAMEPLAY & PERSISTENCE ---");

  const timestamp = Date.now();
  const enrollmentNumber = `P21_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;

  // Step A: Register Player
  const regRes = await request("/api/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: `Operative P21 ${timestamp}`,
      enrollmentNumber,
      team: "Deployment Strike Team",
    }),
  });
  assert(regRes.status === 201, "Player registered with PostgreSQL database");
  const player = regRes.data.data;
  const playerId = player.id;
  assert(player.currentLevel === 1, "Player starts at Level 1");

  // Step B: Start Session
  const sessionRes = await request("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(sessionRes.status === 201, "Session initialized");
  const sessionId = sessionRes.data.data.sessionId;
  assert(sessionRes.data.data.status === "SEARCHING", "Session status is SEARCHING");

  // Level Progression Specs:
  const levels = [
    { level: 1, target: "lib_old_book", item: "usb_drive", challenge: "ch-1", answer: "65" },
    { level: 2, target: "robot_toolbox", item: "access_card", challenge: "ch-2", answer: "42" },
    { level: 3, target: "computer_server_rack", item: "encryption_key", challenge: "ch-3", answer: "63" },
    { level: 4, target: "auditorium_seat_row7", item: "circuit_piece", challenge: "ch-4", answer: "159" },
    { level: 5, target: "cafe_corner_table", item: "secret_note", challenge: "ch-5", answer: "salt" },
    { level: 6, target: "main_locker_404", item: "blue_key", challenge: "ch-6", answer: "64" },
    { level: 7, target: "electronics_oscilloscope", item: "logic_probe", challenge: "ch-7", answer: "90" },
    { level: 8, target: "garden_stone_marker", item: "survey_marker", challenge: "ch-8", answer: "127" },
    { level: 9, target: "server_mainframe_console", item: "admin_override", challenge: "ch-9", answer: "443" },
    { level: 10, target: "vault_containment_pod", item: "core_x_prototype", challenge: "ch-10", answer: "keyboard" },
  ];

  for (const lvl of levels) {
    // 1. Investigate target
    const invRes = await request("/api/game/investigate", {
      method: "POST",
      body: JSON.stringify({ playerId, objectId: lvl.target }),
    });
    assert(invRes.status === 200, `L${lvl.level} target '${lvl.target}' investigated successfully`);
    assert(invRes.data.data?.outcome === "clue", `L${lvl.level} confirmed target`);
    assert(invRes.data.data?.grantedItem === lvl.item, `L${lvl.level} granted item '${lvl.item}'`);

    // 2. Submit Answer
    const ansRes = await request("/api/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({ playerId, challengeId: lvl.challenge, answer: lvl.answer }),
    });
    assert(ansRes.status === 200, `L${lvl.level} challenge '${lvl.challenge}' solved with correct answer`);
    assert(ansRes.data.data?.correct === true, `L${lvl.level} answer correct`);
    assert(ansRes.data.data?.levelCompleted === true, `L${lvl.level} completed`);

    if (lvl.level < 10) {
      assert(ansRes.data.data?.nextLevel === lvl.level + 1, `Advances authoritatively to Level ${lvl.level + 1}`);
    } else {
      assert(ansRes.data.data?.nextLevel === null, "Level 10 marks terminal quest (nextLevel === null)");
    }
  }

  // ---------------------------------------------------------------------------
  // 7. LEVEL 10 ATOMIC COMPLETION & IDEMPOTENT FINALIZATION
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 7: ATOMIC FINALIZATION & IDEMPOTENT COMPLETION ---");

  // Call session complete (should be idempotent since L10 solve atomically finalized)
  const completeRes = await request("/api/sessions/complete", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(completeRes.status === 200, "Session complete call succeeds idempotently");

  // Verify Player Status in DB
  const playerRec = await request(`/api/players/${playerId}`);
  assert(playerRec.status === 200, "Player recovery endpoint reachable");
  assert(playerRec.data.data?.status === "COMPLETED", "Player status is authoritatively COMPLETED");
  assert(playerRec.data.data?.activeSession === null, "Active session is cleared upon completion");
  assert(typeof playerRec.data.data?.score === "number" && playerRec.data.data?.score > 0, "Final speedrun score recorded");

  // Verify Cumulative 10-Item Inventory
  const finalInventory = playerRec.data.data?.inventory || [];
  assert(finalInventory.length === 10, `Cumulative inventory contains all 10 items (got ${finalInventory.length})`);
  assert(finalInventory.includes("core_x_prototype"), "Final inventory contains CORE-X prototype");

  // ---------------------------------------------------------------------------
  // 8. GLOBAL LEADERBOARD DETERMINISTIC PLACEMENT
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 8: LEADERBOARD PLACEMENT AUDIT ---");

  const lbRes = await request("/api/leaderboard");
  assert(lbRes.status === 200, "Leaderboard fetched successfully");
  const leaderboard = lbRes.data.data || [];
  const entry = leaderboard.find((e) => e.playerId === playerId || e.id === playerId);
  assert(entry !== undefined, "Completed operative is ranked on global leaderboard");
  assert(entry?.status === "completed", "Leaderboard entry status is 'completed'");
  assert(entry?.location === "Vault Cleared", "Completed location displays 'Vault Cleared'");

  console.log("\n================================================================================");
  console.log("  🎉 ALL PHASE 21 DEPLOYMENT READINESS CHECKS PASSED (100%)!                    ");
  console.log("================================================================================\n");
}

runSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
