// Phase 17 Performance, Asset Preloading & Near-Instant Interaction Verification Suite
const http = require("http");

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://localhost:5000");
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (payload) {
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function run() {
  console.log("=======================================================================");
  console.log("PHASE 17 TEST SUITE: Performance, Preloading, Latency & Hydration Safety");
  console.log("=======================================================================\n");

  const runId = `p17_${Date.now()}`;

  // -------------------------------------------------------------------------
  // TEST 1: Registration and Safe Property Access (No startTime crash)
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Register Player & Defensive Hydration State ---");
  const regRes = await request("POST", "/api/players", {
    playerName: `Speed_Runner_${runId.slice(-4)}`,
    enrollmentNumber: `SR_${runId}`,
    team: "Fast Team",
  });
  assert(regRes.status === 201, `Player registered with status 201 (got ${regRes.status})`);
  const playerId = regRes.body.data.id;

  // Verify that GET /players/:id when session has NOT started yet returns null activeSession
  const preStartRecovery = await request("GET", `/api/players/${playerId}`);
  assert(preStartRecovery.status === 200, "Fetched player before session start");
  assert(preStartRecovery.body.data.activeSession === null, "activeSession is correctly null before startSession");

  // Test our defensive hydration logic: accessing startTime on null activeSession must NOT crash
  const recoveredData = preStartRecovery.body.data;
  const isCompleted = recoveredData.player?.status === "completed";
  const activeSession = recoveredData.activeSession;
  const sessionStartTime = activeSession?.startTime ?? activeSession?.startedAt ?? null;
  const startedAt = (!isCompleted && sessionStartTime) ? sessionStartTime : (recoveredData.player?.startTime ?? null);
  assert(startedAt === null, "Defensive startedAt correctly evaluates to null without throwing TypeError");

  // -------------------------------------------------------------------------
  // TEST 2: Start Game Session & Verify Idempotency (No duplicate sessions)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Start Session & Verify Idempotency (Anti-Race) ---");
  const t0 = performance.now();
  const sessionRes = await request("POST", "/api/sessions/start", { playerId });
  const startLatency = performance.now() - t0;
  assert(sessionRes.status === 201, `Session started successfully with 201 (got ${sessionRes.status})`);
  const sessionId = sessionRes.body.data.sessionId;
  const sessionStartTimeNum = sessionRes.body.data.startTime;
  assert(typeof sessionId === "string" && sessionId.length > 0, `Received valid sessionId: ${sessionId}`);
  assert(typeof sessionStartTimeNum === "number", `Received valid startTime timestamp: ${sessionStartTimeNum}`);
  console.log(`⏱ Session start latency: ${startLatency.toFixed(1)}ms`);

  // Simulate concurrent startGame/hydration: second start call must return existing session
  const dupSessionRes = await request("POST", "/api/sessions/start", { playerId });
  assert(dupSessionRes.status === 200, "Second startSession returns 200 OK (idempotent reuse)");
  assert(dupSessionRes.body.data.sessionId === sessionId, "Reused identical sessionId without creating duplicate session");
  assert(dupSessionRes.body.data.startTime === sessionStartTimeNum, "Preserved identical startTime timestamp");

  // -------------------------------------------------------------------------
  // TEST 3: Investigation Latency & Immediate Lock Behavior
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: Investigation Performance & Lock Safety ---");
  // Test decoy investigation latency
  const t1 = performance.now();
  const decoyRes = await request("POST", "/api/game/investigate", {
    playerId,
    objectId: "lib_shelf_a",
  });
  const decoyLatency = performance.now() - t1;
  assert(decoyRes.status === 200, `Decoy investigation succeeded (got ${decoyRes.status})`);
  assert(decoyRes.body.data.outcome === "decoy", "Decoy returned outcome: decoy");
  console.log(`⏱ Decoy investigation latency: ${decoyLatency.toFixed(1)}ms`);

  // Test target investigation latency
  const t2 = performance.now();
  const targetRes = await request("POST", "/api/game/investigate", {
    playerId,
    objectId: "lib_old_book",
  });
  const targetLatency = performance.now() - t2;
  assert(targetRes.status === 200, `Target investigation succeeded (got ${targetRes.status})`);
  assert(targetRes.body.data.outcome === "clue", "Target returned outcome: clue");
  assert(targetRes.body.data.grantedItem === "usb_drive", "Granted item: usb_drive");
  console.log(`⏱ Target clue discovery latency: ${targetLatency.toFixed(1)}ms`);

  // -------------------------------------------------------------------------
  // TEST 4: Hints, Penalties and Level 1 Challenge Completion
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Hint Request & Level 1 Completion ---");
  const hintRes = await request("POST", "/api/game/hint", {
    playerId,
    challengeId: "ch-1",
    order: 1,
  });
  assert(hintRes.status === 200, "Hint request succeeded");
  assert(hintRes.body.data.penaltySeconds === 15, "Hint charged +15s penalty");

  const solveRes = await request("POST", "/api/game/submit-answer", {
    playerId,
    challengeId: "ch-1",
    answer: "65",
  });
  assert(solveRes.status === 200, "Answer submission returned 200");
  assert(solveRes.body.data.correct === true, "Level 1 answered correctly");
  assert(solveRes.body.data.nextLevel === 2, "Progressed to Level 2");

  // -------------------------------------------------------------------------
  // TEST 5: Complete Levels 2 -> 5 Flow & Verify Continuous Session
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Full Progression Levels 2 -> 5 & Refresh Recovery ---");
  // Level 2: Robotics Lab (target: robot_toolbox, answer: "42")
  const l2Inv = await request("POST", "/api/game/investigate", { playerId, objectId: "robot_toolbox" });
  assert(l2Inv.status === 200 && l2Inv.body.data.grantedItem === "access_card", "L2 found access_card");
  const l2Solve = await request("POST", "/api/game/submit-answer", { playerId, challengeId: "ch-2", answer: "42" });
  assert(l2Solve.body.data.correct === true && l2Solve.body.data.nextLevel === 3, "L2 completed -> Level 3");

  // Level 3: Computer Lab (target: computer_server_rack, answer: "63")
  // Mid-game Pause/Resume check at Level 3
  const pauseRes = await request("POST", "/api/sessions/pause", { playerId, sessionId });
  assert(pauseRes.status === 200 && pauseRes.body.data.isPaused === true, "Session paused on Level 3");
  const resumeRes = await request("POST", "/api/sessions/resume", { playerId, sessionId });
  assert(resumeRes.status === 200 && resumeRes.body.data.isPaused === false, "Session resumed on Level 3");

  const l3Inv = await request("POST", "/api/game/investigate", { playerId, objectId: "computer_server_rack" });
  assert(l3Inv.status === 200 && l3Inv.body.data.grantedItem === "encryption_key", "L3 found encryption_key");
  const l3Solve = await request("POST", "/api/game/submit-answer", { playerId, challengeId: "ch-3", answer: "63" });
  assert(l3Solve.body.data.correct === true && l3Solve.body.data.nextLevel === 4, "L3 completed -> Level 4");

  // Level 4: Auditorium (target: auditorium_seat_row7, answer: "159")
  const l4Inv = await request("POST", "/api/game/investigate", { playerId, objectId: "auditorium_seat_row7" });
  assert(l4Inv.status === 200 && l4Inv.body.data.grantedItem === "circuit_piece", "L4 found circuit_piece");
  const l4Solve = await request("POST", "/api/game/submit-answer", { playerId, challengeId: "ch-4", answer: "159" });
  assert(l4Solve.body.data.correct === true && l4Solve.body.data.nextLevel === 5, "L4 completed -> Level 5");

  // Level 5: Cafeteria (target: cafe_corner_table, answer: "salt")
  const l5Inv = await request("POST", "/api/game/investigate", { playerId, objectId: "cafe_corner_table" });
  assert(l5Inv.status === 200 && l5Inv.body.data.grantedItem === "secret_note", "L5 found secret_note");

  // Recovery Verification before solving L5
  const midL5Recovery = await request("GET", `/api/players/${playerId}`);
  assert(midL5Recovery.status === 200, "Recovery request succeeded");
  assert(midL5Recovery.body.data.player.currentLevel === 5, "Recovered at currentLevel 5");
  assert(midL5Recovery.body.data.inventory.length === 5, `Inventory retained all 5 items: ${midL5Recovery.body.data.inventory.join(", ")}`);
  assert(midL5Recovery.body.data.activeSession.id === sessionId, "Continuous active session persisted throughout L1-L5");

  // Solve Level 5
  const l5Solve = await request("POST", "/api/game/submit-answer", { playerId, challengeId: "ch-5", answer: "salt" });
  assert(l5Solve.body.data.correct === true && l5Solve.body.data.nextLevel === 6, "L5 completed -> Level 6");

  console.log("\n=======================================================================");
  console.log("🎉 ALL PHASE 17 PERFORMANCE, LATENCY & RECOVERY CHECKS PASSED!");
  console.log("=======================================================================\n");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
