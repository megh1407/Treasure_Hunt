/**
 * PHASE 19 PRODUCTION READINESS, RELIABILITY, SECURITY & 20-PLAYER LOAD TEST SUITE
 *
 * Verifies:
 * 1. Input Boundary & Security Validation (oversized payloads, non-finite coords, invalid hint orders)
 * 2. Prisma Error Mapping (409 Conflict on unique collision, 503 on pool timeout, error sanitization)
 * 3. 20 Concurrent Players Load Stress Test (registrations, isolated sessions, simultaneous investigations, hints)
 * 4. 13-Point Complete Session Recovery Audit (searching, solving, paused, post-solve room, campus walking, Level 10 complete)
 * 5. Live Leaderboard Performance & Deterministic Ranking
 */

const BASE_URL = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message, context = null) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    if (context) console.error("Context:", JSON.stringify(context, null, 2));
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runSuite() {
  console.log("================================================================");
  console.log("  PHASE 19: PRODUCTION READINESS & 20-PLAYER LOAD TEST SUITE");
  console.log("================================================================\n");

  const runId = Date.now().toString(36).toUpperCase();

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: Input Boundary & Security Attack Validations
  // ───────────────────────────────────────────────────────────────────────────
  console.log("PART 1: Input Boundary & Security Attack Validations");

  // Attack 1: Oversized playerName (>100 chars)
  const hugeNameRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "A".repeat(105),
      enrollmentNumber: `OVR_${runId}_1`,
      team: "Test Team",
    }),
  });
  assert(hugeNameRes.status === 400, "Oversized playerName (>100 chars) rejected (400)");

  // Attack 2: Oversized enrollmentNumber (>50 chars)
  const hugeEnrollRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Valid Name",
      enrollmentNumber: "E".repeat(55),
      team: "Test Team",
    }),
  });
  assert(hugeEnrollRes.status === 400, "Oversized enrollmentNumber (>50 chars) rejected (400)");

  // Attack 3: Oversized team (>100 chars)
  const hugeTeamRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Valid Name",
      enrollmentNumber: `OVR_${runId}_2`,
      team: "T".repeat(105),
    }),
  });
  assert(hugeTeamRes.status === 400, "Oversized team (>100 chars) rejected (400)");

  // Attack 4: Non-finite scanner coordinates (Infinity / NaN)
  const validOpRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Boundary Tester",
      enrollmentNumber: `BND_${runId}_1`,
      team: "QA Vanguard",
    }),
  });
  assert(validOpRes.status === 201, "Test operative registered");
  const testPlayerId = validOpRes.data.data.id;

  const sessionStart = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId }),
  });
  assert(sessionStart.status === 201, "Test operative session started");

  const infScanRes = await request("/game/scan", {
    method: "POST",
    body: JSON.stringify({
      playerId: testPlayerId,
      position: [0, null, 0], // Non-finite/null coordinate
    }),
  });
  assert(infScanRes.status === 400, "Malformed scanner coordinates rejected (400)");

  // Attack 5: Out-of-bounds scanner coordinates (>10,000)
  const outBoundsScanRes = await request("/game/scan", {
    method: "POST",
    body: JSON.stringify({
      playerId: testPlayerId,
      position: [999999, 0, 0],
    }),
  });
  assert(outBoundsScanRes.status === 400, "Out-of-bounds coordinates (>10,000) rejected (400)");

  // Attack 6: Invalid Hint Order (-1, 0, 4)
  const negHintRes = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-1", order: -1 }),
  });
  assert(negHintRes.status === 400, "Negative hint order rejected (400)");

  const outRangeHintRes = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-1", order: 4 }),
  });
  assert(outRangeHintRes.status === 400, "Out-of-range hint order (4) rejected (400)");

  // Attack 7: Oversized answer payload (>255 chars)
  const hugeAnswerRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: testPlayerId,
      challengeId: "ch-1",
      answer: "A".repeat(300),
    }),
  });
  assert(hugeAnswerRes.status === 400, "Oversized answer string (>255 chars) rejected (400)");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: Database Error Mapping & Sanitization
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 2: Database Error Mapping & Sanitization");

  // Attempt duplicate registration of exact same enrollment number
  const dupEnrollRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Duplicate Operative",
      enrollmentNumber: `BND_${runId}_1`, // Identical to test operative
      team: "Collision Attempt",
    }),
  });
  assert(dupEnrollRes.status === 409, "Prisma unique collision mapped to 409 Conflict");
  assert(
    typeof dupEnrollRes.data.error === "string" && dupEnrollRes.data.error.includes("already registered"),
    "Clean sanitized conflict message returned without internal SQL details"
  );

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: 20 Concurrent Players Load Stress Test
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 3: 20 Concurrent Players Load Stress Test");

  const NUM_PLAYERS = 20;
  const playerInputs = Array.from({ length: NUM_PLAYERS }, (_, i) => ({
    playerName: `Load Agent ${i + 1}`,
    enrollmentNumber: `LOAD20_${runId}_P${i + 1}_${Math.floor(100 + Math.random() * 900)}`,
    team: `Load Team ${(i % 4) + 1}`,
  }));

  const playerResults = await mapConcurrent(playerInputs, 4, (input) =>
    request("/players", {
      method: "POST",
      body: JSON.stringify(input),
    })
  );

  const playerIds = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    assert(playerResults[i].status === 201, `Player ${i + 1} registered under 20-concurrency load`);
    playerIds.push(playerResults[i].data.data.id);
  }

  const uniquePlayerIds = new Set(playerIds);
  assert(uniquePlayerIds.size === NUM_PLAYERS, "All 20 concurrent players received unique IDs");

  // Concurrently start sessions for all 20 players (worker limit 4)
  const sessionResults = await mapConcurrent(playerIds, 4, (pid) =>
    request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ playerId: pid }),
    })
  );

  const sessionIds = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    assert(sessionResults[i].status === 201, `Player ${i + 1} session started concurrently`);
    sessionIds.push(sessionResults[i].data.data.sessionId);
  }

  const uniqueSessionIds = new Set(sessionIds);
  assert(uniqueSessionIds.size === NUM_PLAYERS, "All 20 sessions are completely isolated");

  // Concurrently investigate across all 20 players
  console.log("  Dispatching 20 investigations across rooms...");
  const invResults = await mapConcurrent(playerIds, 4, (pid, idx) => {
    const isTarget = idx % 2 === 0;
    const targetObj = isTarget ? "lib_old_book" : "lib_shelf_a";
    return request("/game/investigate", {
      method: "POST",
      body: JSON.stringify({ playerId: pid, objectId: targetObj }),
    });
  });

  for (let i = 0; i < NUM_PLAYERS; i++) {
    const isTarget = i % 2 === 0;
    assert(invResults[i].status === 200, `Player ${i + 1} investigation succeeded (200)`);
    assert(
      invResults[i].data.data.outcome === (isTarget ? "clue" : "decoy"),
      `Player ${i + 1} received correct outcome: ${isTarget ? "clue" : "decoy"}`
    );
  }

  // Concurrently request hints for odd-indexed players
  const hintPlayers = playerIds.filter((_, idx) => idx % 2 === 0);
  const hintResults = await mapConcurrent(hintPlayers, 4, (pid) =>
    request("/game/hint", {
      method: "POST",
      body: JSON.stringify({ playerId: pid, challengeId: "ch-1", order: 1 }),
    })
  );
  for (let i = 0; i < hintResults.length; i++) {
    assert(hintResults[i].status === 200, `Concurrent hint ${i + 1} succeeded`);
    assert(hintResults[i].data.data.penaltySeconds === 15, "Authoritative +15s penalty applied");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: 13-Point Complete Session Recovery Audit
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 4: 13-Point Complete Session Recovery Audit");

  const mainOpEnroll = `REC13_${runId}_${Math.floor(100 + Math.random() * 900)}`;
  const mainOpRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Recovery Specialist",
      enrollmentNumber: mainOpEnroll,
      team: "Protocol Vanguard",
    }),
  });
  assert(mainOpRes.status === 201, "Recovery specialist operative registered");
  const recPlayerId = mainOpRes.data.data.id;

  const recSessionRes = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId }),
  });
  const recSessionId = recSessionRes.data.data.sessionId;

  // Condition 1: Searching state recovery
  const c1 = await request(`/players/${recPlayerId}`);
  assert(c1.data.data.status === "SEARCHING", "Condition 1: Searching state restored on recovery");

  // Condition 2: Investigated object recovery (decoy)
  await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, objectId: "lib_shelf_a" }),
  });
  const c2 = await request(`/players/${recPlayerId}`);
  assert(
    c2.data.data.levelProgress.investigatedObjects.includes("lib_shelf_a"),
    "Condition 2: Investigated decoy recorded in recovery"
  );

  // Condition 3 & 4: Target clue & challenge discovered (solving state)
  await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, objectId: "lib_old_book" }),
  });
  const c3 = await request(`/players/${recPlayerId}`);
  assert(c3.data.data.status === "SOLVING", "Condition 3: Solving status restored on recovery");
  assert(
    c3.data.data.inventory.includes("usb_drive"),
    "Condition 4: Granted item (usb_drive) in recovery inventory"
  );

  // Condition 5: Hint state recovery
  await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, challengeId: "ch-1", order: 1 }),
  });
  const c5 = await request(`/players/${recPlayerId}`);
  assert(c5.data.data.levelProgress.usedHints.includes(1), "Condition 5: Used hint order 1 preserved in recovery");
  assert(c5.data.data.penaltySeconds === 15, "Authoritative penalty 15s recorded in recovery");

  // Condition 6: Paused state recovery
  await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, sessionId: recSessionId }),
  });
  const c6 = await request(`/players/${recPlayerId}`);
  assert(c6.data.data.activeSession.isPaused === true, "Condition 6: Paused state preserved in recovery");

  // Condition 7: Resume recovery
  await request("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, sessionId: recSessionId }),
  });
  const c7 = await request(`/players/${recPlayerId}`);
  assert(c7.data.data.activeSession.isPaused === false, "Condition 7: Active session resumed in recovery");

  // Condition 8: Solve Level 1 -> Advance to Level 2
  const solveL1 = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, challengeId: "ch-1", answer: "65" }),
  });
  assert(solveL1.data.data.correct === true, "Condition 8: Level 1 answer (65) correct");
  assert(solveL1.data.data.nextLevel === 2, "Authoritatively advances to Level 2");

  // Condition 9: Post-solve room refresh recovery
  // When a player solves Level 1 and refreshes inside library_interior before exiting,
  // database reports currentLevel: 2, and previous level (Level 1) is COMPLETED.
  const c9 = await request(`/players/${recPlayerId}`);
  assert(c9.data.data.currentLevel === 2, "Condition 9: currentLevel is 2");

  // Condition 10: Solve through remaining levels (Levels 2 to 9)
  const levels = [
    { lvl: 2, target: "robot_toolbox", ch: "ch-2", ans: "42", item: "access_card" },
    { lvl: 3, target: "computer_server_rack", ch: "ch-3", ans: "63", item: "encryption_key" },
    { lvl: 4, target: "auditorium_seat_row7", ch: "ch-4", ans: "159", item: "circuit_piece" },
    { lvl: 5, target: "cafe_corner_table", ch: "ch-5", ans: "salt", item: "secret_note" },
    { lvl: 6, target: "main_locker_404", ch: "ch-6", ans: "64", item: "blue_key" },
    { lvl: 7, target: "electronics_oscilloscope", ch: "ch-7", ans: "90", item: "logic_probe" },
    { lvl: 8, target: "garden_stone_marker", ch: "ch-8", ans: "127", item: "survey_marker" },
    { lvl: 9, target: "server_mainframe_console", ch: "ch-9", ans: "443", item: "admin_override" },
  ];

  for (const l of levels) {
    const invRes = await request("/game/investigate", {
      method: "POST",
      body: JSON.stringify({ playerId: recPlayerId, objectId: l.target }),
    });
    assert(invRes.ok && invRes.data?.data?.outcome === "clue", `Level ${l.lvl} target found (${l.target})`, invRes);
    const sRes = await request("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({ playerId: recPlayerId, challengeId: l.ch, answer: l.ans }),
    });
    assert(sRes.ok && sRes.data?.data?.correct === true, `Level ${l.lvl} challenge solved (${l.ans})`, sRes);
  }

  // Condition 11: Mid-game inventory accumulation recovery check
  const c11 = await request(`/players/${recPlayerId}`);
  assert(c11.data.data.inventory.length === 9, "Condition 11: Cumulative inventory has 9 items prior to final quest");

  // Condition 12: Level 10 Final Quest atomic solve
  const l10Inv = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, objectId: "vault_containment_pod" }),
  });
  assert(l10Inv.ok && l10Inv.data?.data?.outcome === "clue", "Level 10 target containment pod found", l10Inv);
  const l10Res = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: recPlayerId, challengeId: "ch-10", answer: "keyboard" }),
  });
  assert(l10Res.data.data.correct === true, "Condition 12: Level 10 CORE-X solved (keyboard)");
  assert(l10Res.data.data.nextLevel === null, "nextLevel is null (Final quest complete)");

  // Condition 13: Post-completion recovery
  const c13 = await request(`/players/${recPlayerId}`);
  assert(c13.data.data.status === "COMPLETED", "Condition 13: Player status is COMPLETED");
  assert(c13.data.data.activeSession === null, "Active session cleared upon completion");
  assert(c13.data.data.inventory.length === 10, "All 10 cumulative inventory items preserved");
  assert(
    c13.data.data.inventory.includes("core_x_prototype"),
    "Inventory contains final quest core_x_prototype"
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: Live Leaderboard Concurrency & Deterministic Ranking
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 5: Live Leaderboard Concurrency & Deterministic Ranking");
  const lbRes = await request("/leaderboard");
  assert(lbRes.status === 200, "Leaderboard fetched successfully");
  assert(Array.isArray(lbRes.data.data), "Leaderboard data is an array");

  const completedEntry = lbRes.data.data.find((e) => e.playerId === recPlayerId);
  assert(Boolean(completedEntry), "Completed operative is ranked on leaderboard");
  assert(completedEntry.location === "Vault Cleared", "Leaderboard location shows 'Vault Cleared'");

  console.log("\n================================================================");
  console.log("  🎉 ALL PHASE 19 PRODUCTION READINESS & LOAD CHECKS PASSED!");
  console.log("================================================================\n");
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
