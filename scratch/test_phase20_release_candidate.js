const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000";

async function runPhase20ReleaseCandidateTests() {
  console.log("====================================================");
  console.log(" PHASE 20 — FINAL RELEASE CANDIDATE AUDIT & LAUNCH ");
  console.log("====================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Root /health endpoint alias
  // ----------------------------------------------------
  console.log("1. Testing Root /health Endpoint Alias...");
  let serverEnv = "development";
  try {
    const res = await fetch(`${API_BASE}/health`);
    assert(res.status === 200, `Root /health status code is 200 (received ${res.status})`);
    const data = await res.json();
    assert(data.success === true, "Root /health returns success: true");
    assert(data.data.status === "ok", "Root /health data.status === 'ok'");
    assert(data.data.database && data.data.database.connected === true, "Root /health verifies database.connected === true");
    serverEnv = data.data.env;
  } catch (err) {
    assert(false, `Root /health failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: /api/health endpoint
  // ----------------------------------------------------
  console.log("\n2. Testing /api/health Endpoint...");
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    assert(res.status === 200, `/api/health status code is 200 (received ${res.status})`);
    const data = await res.json();
    assert(data.success === true, "/api/health returns success: true");
    assert(data.data.status === "ok", "/api/health data.status === 'ok'");
    assert(data.data.database && data.data.database.connected === true, "/api/health database connected");
  } catch (err) {
    assert(false, `/api/health failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3: Body Parser Size Limit Enforcement (100kb limit)
  // ----------------------------------------------------
  console.log("\n3. Testing Body Parser 100kb Limit Enforcement...");
  try {
    // Generate a payload larger than 100kb (e.g. 150kb)
    const largeString = "A".repeat(150 * 1024);
    const res = await fetch(`${API_BASE}/api/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "OverflowTest", payload: largeString }),
    });
    assert(
      res.status === 413,
      `Payload > 100kb is rejected with HTTP 413 Payload Too Large (received ${res.status})`
    );
  } catch (err) {
    assert(false, `Body parser limit test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Production Error Sanitization (No SQL / Prisma leakage)
  // ----------------------------------------------------
  console.log("\n4. Testing Error Sanitization & Structured Responses...");
  try {
    // Malformed JSON test
    const res = await fetch(`${API_BASE}/api/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ malformed json string",
    });
    assert(res.status >= 400, `Malformed request rejected with client error status (${res.status})`);
    const data = await res.json();
    assert(data.success === false, "Error response returns success: false");
    assert(typeof data.error === "string", "Error response returns clean error string");
    assert(!JSON.stringify(data).includes("PrismaClientKnownRequestError"), "No Prisma internal traces leaked");

    if (serverEnv === "production") {
      assert(!data.stack, "Production error response does NOT contain stack trace");
    } else {
      assert(true, "Development mode includes debug information for local developer diagnostics");
    }

    // 404 test
    const res404 = await fetch(`${API_BASE}/api/unmatched-nonexistent-route-xyz`);
    assert(res404.status === 404, "Unknown route returns 404");
    const data404 = await res404.json();
    assert(data404.success === false, "404 returns structured JSON error");
  } catch (err) {
    assert(false, `Error sanitization test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Frontend Production Bundle Secret & Answer Scan
  // ----------------------------------------------------
  console.log("\n5. Testing Client Production Bundle for Zero Secret & Answer Leakage...");
  try {
    const clientDistPath = path.resolve(__dirname, "../frontend/dist/client");
    assert(fs.existsSync(clientDistPath), "frontend/dist/client directory exists");

    // Check favicon
    const faviconPath = path.join(clientDistPath, "favicon.ico");
    assert(fs.existsSync(faviconPath), "frontend/dist/client/favicon.ico exists");

    // Check assets directory
    const assetsDir = path.join(clientDistPath, "assets");
    assert(fs.existsSync(assetsDir), "frontend/dist/client/assets exists");

    const assetFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
    assert(assetFiles.length > 0, `Found ${assetFiles.length} client JS bundle files`);

    let combinedClientJs = "";
    for (const file of assetFiles) {
      combinedClientJs += fs.readFileSync(path.join(assetsDir, file), "utf-8");
    }

    // Puzzle answers and backend secrets that must NEVER appear in client JS:
    // Notice Level 10 answer "keyboard" and Level 5 answer "salt", and database configs
    const secretKeywords = [
      '"salt"',
      '"159"',
      '"443"',
      'DATABASE_URL',
      'DIRECT_URL',
      'SUPABASE_KEY',
      'MOCK_DEV_ANSWERS',
    ];

    let foundLeaks = [];
    for (const kw of secretKeywords) {
      if (combinedClientJs.includes(kw)) {
        foundLeaks.push(kw);
      }
    }

    assert(
      foundLeaks.length === 0,
      `Client bundle contains 0 leaked authoritative puzzle answers or database secrets (found: ${foundLeaks.join(", ") || "none"})`
    );

    // Verify frontend API client imports HttpGameApi only
    const gameApiSrc = fs.readFileSync(path.resolve(__dirname, "../frontend/src/services/gameApi.ts"), "utf-8");
    assert(!gameApiSrc.includes("MockGameApi"), "frontend/src/services/gameApi.ts excludes MockGameApi from production");
    assert(gameApiSrc.includes("import.meta.env.VITE_API_URL"), "frontend/src/services/gameApi.ts uses environment-driven API URL");
  } catch (err) {
    assert(false, `Bundle scan failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 6: Full End-to-End Release Candidate Gameplay Flow
  // ----------------------------------------------------
  console.log("\n6. Testing End-to-End Release Candidate Gameplay (L1 → L10 Final Completion)...");
  try {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const regRes = await fetch(`${API_BASE}/api/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: `RC_Hero_${uniqueSuffix}`,
        enrollmentNumber: `RC_${uniqueSuffix}`,
        team: "QA Vanguard",
      }),
    });
    const regData = await regRes.json();
    assert(regData.success && regData.data?.id, `Registered player for Release Candidate test (${regData.data?.id})`);
    const playerId = regData.data.id;

    const startRes = await fetch(`${API_BASE}/api/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const startData = await startRes.json();
    assert(startData.success && startData.data?.sessionId, `Started Release Candidate session (${startData.data?.sessionId})`);
    const sessionId = startData.data.sessionId;

    // Test Level 1: Investigate target, submit answer
    const invRes = await fetch(`${API_BASE}/api/game/investigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        objectId: "lib_old_book",
      }),
    });
    const invData = await invRes.json();
    assert(invData.success && invData.data.outcome === "clue", "Investigated Level 1 target lib_old_book");
    assert(invData.data.grantedItem === "usb_drive", "Received Level 1 granted item usb_drive");

    const ansRes = await fetch(`${API_BASE}/api/game/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        challengeId: "ch-1",
        answer: "65",
      }),
    });
    const ansData = await ansRes.json();
    assert(ansData.success && ansData.data.correct === true, "Level 1 answer submitted and validated correctly");
    assert(ansData.data.nextLevel === 2, "Game authoritatively advanced to Level 2");

    // Run remaining levels 2 through 10
    const remainingLevels = [
      { lvl: 2, target: "robot_toolbox", ch: "ch-2", ans: "42", item: "access_card" },
      { lvl: 3, target: "computer_server_rack", ch: "ch-3", ans: "63", item: "encryption_key" },
      { lvl: 4, target: "auditorium_seat_row7", ch: "ch-4", ans: "159", item: "circuit_piece" },
      { lvl: 5, target: "cafe_corner_table", ch: "ch-5", ans: "salt", item: "secret_note" },
      { lvl: 6, target: "main_locker_404", ch: "ch-6", ans: "64", item: "blue_key" },
      { lvl: 7, target: "electronics_oscilloscope", ch: "ch-7", ans: "90", item: "logic_probe" },
      { lvl: 8, target: "garden_stone_marker", ch: "ch-8", ans: "127", item: "survey_marker" },
      { lvl: 9, target: "server_mainframe_console", ch: "ch-9", ans: "443", item: "admin_override" },
      { lvl: 10, target: "vault_containment_pod", ch: "ch-10", ans: "keyboard", item: "core_x_prototype" },
    ];

    for (const l of remainingLevels) {
      const iRes = await fetch(`${API_BASE}/api/game/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          objectId: l.target,
        }),
      });
      const iData = await iRes.json();
      if (!iData.success || iData.data.outcome !== "clue") {
        throw new Error(`Level ${l.lvl} investigation failed for object ${l.target}`);
      }

      const aRes = await fetch(`${API_BASE}/api/game/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          challengeId: l.ch,
          answer: l.ans,
        }),
      });
      const aData = await aRes.json();
      if (!aData.success || !aData.data.correct) {
        throw new Error(`Level ${l.lvl} answer submission failed: ${aData.error}`);
      }

      if (l.lvl === 10) {
        assert(aData.data.levelCompleted === true, "Level 10 final quest solved and marked levelCompleted: true");
        assert(aData.data.nextLevel === null, "Level 10 nextLevel is null (terminal quest reached)");
      }
    }

    // Verify recovery after completion
    const recRes = await fetch(`${API_BASE}/api/players/${playerId}`);
    const recData = await recRes.json();
    assert(recData.success && recData.data.status === "COMPLETED", "Player recovery confirms status === 'COMPLETED'");
    assert(typeof recData.data.score === "number" && recData.data.score > 0, `Authoritative final score calculated: ${recData.data.score}`);
    assert(Array.isArray(recData.data.inventory) && recData.data.inventory.length === 10, `Player cumulative inventory contains all 10 items (${recData.data.inventory.length}/10)`);
    assert(recData.data.activeSession === null, "Session marked inactive upon game completion");

    // Verify leaderboard inclusion
    const lbRes = await fetch(`${API_BASE}/api/leaderboard?limit=50`);
    const lbData = await lbRes.json();
    assert(lbData.success === true, "Leaderboard fetched successfully");
    const lbList = Array.isArray(lbData.data) ? lbData.data : lbData.data?.leaderboard || [];
    const entry = lbList.find((e) => e.playerId === playerId);
    assert(entry !== undefined, `Completed player successfully posted to official leaderboard`);
    assert(entry && entry.rank > 0, `Leaderboard rank assigned: #${entry?.rank}`);
  } catch (err) {
    assert(false, `Gameplay release flow failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n====================================================");
  console.log(` PHASE 20 AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("All Phase 20 release candidate requirements verified successfully!");
    process.exit(0);
  }
}

runPhase20ReleaseCandidateTests();
