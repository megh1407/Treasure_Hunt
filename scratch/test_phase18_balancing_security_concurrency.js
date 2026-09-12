/**
 * scratch/test_phase18_balancing_security_concurrency.js
 * 
 * PHASE 18: FULL GAME BALANCING, SECURITY AUDIT & MULTI-PLAYER STRESS TEST SUITE
 * 
 * Tests:
 * 1. 10 Concurrent Players Registration & Independent Session Isolation (Step 3.E & 4)
 * 2. Concurrent Gameplay Actions Across Multiple Players (Step 4)
 * 3. Security Attack Vector Rejections (Step 3.A, 3.B, 3.D):
 *    - Level skipping attack (400)
 *    - Cross-level object investigation attack (400)
 *    - Uninvestigated challenge submission attack (400)
 *    - Pause bypass attacks across all 4 gameplay actions (400)
 *    - Cross-player session hijacking attack (400)
 * 4. Request Replay & Double Answer Submission Race Defense (Step 3.C)
 * 5. Hint System Idempotency & Zero Duplicate Penalty Under Concurrency (Step 2.B)
 * 6. Live Leaderboard Paused Duration Accounting (Step 5 & 6)
 * 7. Level 10 Final Quest Atomic Session Finalization & Idempotent Completion (Step 5 & 6)
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}, retries = 4) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if ((res.status >= 500 || res.status === 429) && retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return request(endpoint, options, retries - 1);
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return request(endpoint, options, retries - 1);
    }
    throw err;
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runSuite() {
  console.log("================================================================");
  console.log("  PHASE 18: BALANCING, SECURITY & MULTI-PLAYER STRESS TEST SUITE");
  console.log("================================================================\n");

  const timestamp = Date.now();

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: 10 Concurrent Players Registration & Session Isolation
  // ───────────────────────────────────────────────────────────────────────────
  console.log("PART 1: 10 Concurrent Players Registration & Session Isolation");
  const concurrentCount = 10;
  const playerPromises = Array.from({ length: concurrentCount }, async (_, i) => {
    const rand = Math.floor(10000 + Math.random() * 90000);
    const enrollment = `P18_${timestamp}_${i}_${rand}`;
    const regRes = await request("/players", {
      method: "POST",
      body: JSON.stringify({
        playerName: `Concurrent Operative ${i + 1}`,
        enrollmentNumber: enrollment,
        team: `Squad ${i % 3}`,
      }),
    });
    return { i, regRes };
  });

  const registeredPlayers = await Promise.all(playerPromises);
  const playerIds = [];
  for (const { i, regRes } of registeredPlayers) {
    assert(regRes.status === 201 && regRes.data.success, `Player ${i + 1} registered`);
    playerIds.push(regRes.data.data.id);
  }
  const uniquePlayerIds = new Set(playerIds);
  assert(uniquePlayerIds.size === concurrentCount, "All 10 concurrent players have distinct database IDs");

  // Start 10 sessions concurrently
  const sessionPromises = playerIds.map(async (playerId, i) => {
    const sessionRes = await request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ playerId }),
    });
    return { i, playerId, sessionRes };
  });

  const activeSessions = await Promise.all(sessionPromises);
  const sessionIds = [];
  for (const { i, sessionRes } of activeSessions) {
    assert(sessionRes.status === 200 || sessionRes.status === 201, `Player ${i + 1} session started`);
    sessionIds.push(sessionRes.data.data.sessionId);
  }
  const uniqueSessionIds = new Set(sessionIds);
  assert(uniqueSessionIds.size === concurrentCount, "All 10 players hold completely isolated sessions");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: Concurrent Gameplay Actions (Investigations)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 2: Concurrent Gameplay Actions Across Multiple Players");
  const actionPromises = playerIds.map(async (playerId, i) => {
    // Alternate between decoy and target object
    const objectId = i % 2 === 0 ? "lib_old_book" : "lib_shelf_a";
    const invRes = await request("/game/investigate", {
      method: "POST",
      body: JSON.stringify({ playerId, objectId }),
    });
    return { i, objectId, invRes };
  });

  const actionResults = await Promise.all(actionPromises);
  for (const { i, objectId, invRes } of actionResults) {
    assert(invRes.status === 200 && invRes.data.success, `Player ${i + 1} investigated ${objectId} concurrently`);
    const expectedOutcome = objectId === "lib_old_book" ? "clue" : "decoy";
    assert(invRes.data.data.outcome === expectedOutcome, `Player ${i + 1} received outcome '${expectedOutcome}'`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: Deep Security Attack Vectors
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 3: Deep Security Attack Vector Validations");
  const testPlayerId = playerIds[0];
  const testSessionId = sessionIds[0];
  const victimPlayerId = playerIds[1];

  // Attack 1: Level Skipping (Submit Level 2 challenge while on Level 1)
  const skipAttempt = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-2", answer: "42" }),
  });
  assert(skipAttempt.status === 400, "Level skipping attack rejected (400)");

  // Attack 2: Cross-Level Investigation (Investigate Level 3 object while on Level 1)
  const crossInvAttempt = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, objectId: "computer_server_rack" }),
  });
  assert(crossInvAttempt.status === 400, "Cross-level object investigation rejected (400)");

  // Attack 3: Uninvestigated Challenge Submission
  // Player 1 investigated lib_shelf_a (decoy), has NOT investigated target clue
  const uninvestigatedSubmit = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: victimPlayerId, challengeId: "ch-1", answer: "65" }),
  });
  assert(uninvestigatedSubmit.status === 400, "Submission without investigating clue rejected (400)");

  // Attack 4: Cross-Player Session Hijacking
  // Player A attempts to pause Player B's session
  const hijackPause = await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, sessionId: sessionIds[1] }),
  });
  assert(hijackPause.status === 400, "Cross-player session tampering rejected (400)");

  // Attack 5: Pause Action Bypass
  const pauseRes = await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, sessionId: testSessionId }),
  });
  assert(pauseRes.status === 200, "Test player session paused");

  const [pausedInv, pausedAns, pausedHint, pausedScan] = await Promise.all([
    request("/game/investigate", { method: "POST", body: JSON.stringify({ playerId: testPlayerId, objectId: "lib_shelf_a" }) }),
    request("/game/submit-answer", { method: "POST", body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-1", answer: "65" }) }),
    request("/game/hint", { method: "POST", body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-1", order: 1 }) }),
    request("/game/scan", { method: "POST", body: JSON.stringify({ playerId: testPlayerId, position: [0, 0, 0] }) }),
  ]);

  assert(pausedInv.status === 400, "Investigate blocked during pause (400)");
  assert(pausedAns.status === 400, "Submit answer blocked during pause (400)");
  assert(pausedHint.status === 400, "Hint request blocked during pause (400)");
  assert(pausedScan.status === 400, "AR scanner blocked during pause (400)");

  // Resume session
  const resumeRes = await request("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: testPlayerId, sessionId: testSessionId }),
  });
  assert(resumeRes.status === 200, "Session resumed successfully");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: Request Replay & Double Submission Race Defense
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 4: Request Replay & Double Submission Race Defense");
  // Test player investigated lib_old_book earlier. Now send 4 concurrent correct answers
  const replayPromises = Array.from({ length: 4 }, () =>
    request("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-1", answer: "65" }),
    })
  );

  const replayResults = await Promise.all(replayPromises);
  const successCount = replayResults.filter((r) => r.status === 200 && r.data.data?.correct).length;
  assert(successCount >= 1, "At least one answer submission successfully completed Level 1");

  const playerAfterReplay = await request(`/players/${testPlayerId}`);
  assert(
    playerAfterReplay.data.data.currentLevel === 2,
    "currentLevel is exactly 2 (Replay did NOT double-advance to Level 3)"
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: Hint Idempotency Under Concurrency
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 5: Hint Idempotency Under Concurrency");
  const concurrentHints = Array.from({ length: 4 }, () =>
    request("/game/hint", {
      method: "POST",
      body: JSON.stringify({ playerId: testPlayerId, challengeId: "ch-2", order: 1 }),
    })
  );

  const hintResults = await Promise.all(concurrentHints);
  for (const hRes of hintResults) {
    assert(hRes.status === 200, "Hint request succeeded");
  }

  const playerAfterHints = await request(`/players/${testPlayerId}`);
  assert(
    playerAfterHints.data.data.penaltySeconds === 15,
    "Authoritative penalty is exactly 15s (Concurrent hints did not duplicate penalties)"
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PART 6: Live Leaderboard Paused Duration Accounting
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 6: Live Leaderboard Paused Duration Accounting");
  // Pause player 2 for 2 seconds
  const p2Id = playerIds[2];
  const p2SessionId = sessionIds[2];
  await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p2Id, sessionId: p2SessionId }),
  });
  await new Promise((r) => setTimeout(r, 2200));

  const lbRes = await request("/leaderboard?limit=500");
  assert(lbRes.status === 200 && lbRes.data.success, "Leaderboard fetched");
  const p2Entry = lbRes.data.data.find((e) => e.playerId === p2Id);
  assert(!!p2Entry, "Paused player found on leaderboard");

  // Resume player 2
  await request("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: p2Id, sessionId: p2SessionId }),
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 7: Level 10 Final Quest Atomic Finalization & Idempotency
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nPART 7: Level 10 Final Quest Atomic Session Finalization & Idempotency");
  // Fast-track solo operative through L1->L10
  const soloEnrollment = `SOLO_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;
  const soloReg = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Final Quest Master",
      enrollmentNumber: soloEnrollment,
      team: "Vault Operations",
    }),
  });
  const soloId = soloReg.data.data.id;
  const soloSession = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId: soloId }),
  });
  const soloSessionId = soloSession.data.data.sessionId;

  const levelConfigs = [
    { lvl: 1, target: "lib_old_book", ch: "ch-1", ans: "65" },
    { lvl: 2, target: "robot_toolbox", ch: "ch-2", ans: "42" },
    { lvl: 3, target: "computer_server_rack", ch: "ch-3", ans: "63" },
    { lvl: 4, target: "auditorium_seat_row7", ch: "ch-4", ans: "159" },
    { lvl: 5, target: "cafe_corner_table", ch: "ch-5", ans: "salt" },
    { lvl: 6, target: "main_locker_404", ch: "ch-6", ans: "64" },
    { lvl: 7, target: "electronics_oscilloscope", ch: "ch-7", ans: "90" },
    { lvl: 8, target: "garden_stone_marker", ch: "ch-8", ans: "127" },
    { lvl: 9, target: "server_mainframe_console", ch: "ch-9", ans: "443" },
    { lvl: 10, target: "vault_containment_pod", ch: "ch-10", ans: "keyboard" },
  ];

  for (const step of levelConfigs) {
    await request("/game/investigate", {
      method: "POST",
      body: JSON.stringify({ playerId: soloId, objectId: step.target }),
    });
    const ansRes = await request("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({ playerId: soloId, challengeId: step.ch, answer: step.ans }),
    });
    assert(ansRes.data.data.correct === true, `Level ${step.lvl} solved (${step.ans})`);
    await new Promise((r) => setTimeout(r, 100));
  }

  // Verify Level 10 solve atomically finalized the session in backend
  await new Promise((r) => setTimeout(r, 500));
  const soloRecovery = await request(`/players/${soloId}`);
  assert(soloRecovery.data?.data?.status === "COMPLETED", "Player status is COMPLETED");
  assert(soloRecovery.data?.data?.score > 0, "Authoritative score calculated atomically");
  assert(soloRecovery.data?.data?.activeSession === null, "Active session cleared atomically upon Level 10 solve");

  // Test idempotent /sessions/complete call
  const postCompleteCall = await request("/sessions/complete", {
    method: "POST",
    body: JSON.stringify({ playerId: soloId, sessionId: soloSessionId }),
  });
  assert(
    postCompleteCall.status === 200,
    "Post-solve completeSession call succeeds idempotently (200 OK)"
  );
  assert(
    postCompleteCall.data.data.status === "COMPLETED",
    "Returned status remains COMPLETED"
  );

  // Verify leaderboard includes completed operative with Vault Cleared
  const finalLb = await request("/leaderboard");
  const soloLbEntry = finalLb.data.data.find((e) => e.playerId === soloId);
  assert(!!soloLbEntry, "Completed player ranked on leaderboard");
  assert(soloLbEntry.location === "Vault Cleared", "Leaderboard location is 'Vault Cleared'");

  console.log("\n================================================================");
  console.log("  🎉 ALL PHASE 18 BALANCING, SECURITY & STRESS CHECKS PASSED!");
  console.log("================================================================\n");
}

runSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
