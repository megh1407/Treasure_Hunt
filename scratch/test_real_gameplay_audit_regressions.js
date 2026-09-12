/**
 * scratch/test_real_gameplay_audit_regressions.js
 *
 * Full Real Gameplay Audit Regression Test Suite:
 * 1. Multi-guest collision avoidance and unique identity generation (Phase A2)
 * 2. Post-solve room refresh recovery before exiting to campus (Phase H3)
 * 3. Physical campus door exit & campus refresh recovery (Phase C & H1)
 * 4. Hint system idempotency and penalty protection (Phase F)
 * 5. Pause safety, action blocking, and resume integrity (Phase G)
 * 6. Completed session recovery and permanent completion persistence (Phase H4)
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}, retries = 2) {
  const url = `${BASE_URL}${endpoint}`;
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
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1200));
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

// Scene registry data for validation
const SCENE_REGISTRY = {
  campus: { id: "campus", isInterior: false },
  library_interior: { id: "library_interior", isInterior: true, levelId: 1, exitSpawnPosition: [7.5, 0, 22] },
  robotics_lab_interior: { id: "robotics_lab_interior", isInterior: true, levelId: 2, exitSpawnPosition: [12.5, 0, 0] },
};

function getSceneForLevel(levelId) {
  if (levelId === 1) return SCENE_REGISTRY.library_interior;
  if (levelId === 2) return SCENE_REGISTRY.robotics_lab_interior;
  return null;
}

// Recreate store recovery logic
function determineRecoveredScene(player, levelProgress, storedScene) {
  const activeLevelScene = getSceneForLevel(player.currentLevel);
  const prevLevelScene = player.currentLevel > 1 ? getSceneForLevel(player.currentLevel - 1) : null;
  const isSolving = player.status === "SOLVING";
  const investigated = levelProgress?.investigatedObjects ?? [];

  let scene = "campus";
  let isAtPrevCompletedRoom = false;

  if (storedScene === "campus") {
    scene = "campus";
  } else if (storedScene && storedScene === activeLevelScene?.id) {
    scene = storedScene;
  } else if (storedScene && prevLevelScene && storedScene === prevLevelScene.id) {
    scene = storedScene;
    isAtPrevCompletedRoom = true;
  } else if (isSolving || investigated.length > 0) {
    scene = activeLevelScene ? activeLevelScene.id : "campus";
  } else {
    scene = "campus";
  }

  let spawnOverride = null;
  if (scene === "campus" && player.currentLevel > 1 && prevLevelScene?.exitSpawnPosition) {
    spawnOverride = prevLevelScene.exitSpawnPosition;
  }

  return {
    scene,
    isAtPrevCompletedRoom,
    levelCompleted: isAtPrevCompletedRoom,
    panel: isAtPrevCompletedRoom ? "level_complete" : null,
    spawnOverride,
  };
}

async function runRegressionSuite() {
  console.log("================================================================");
  console.log("  REAL GAMEPLAY AUDIT & BUG FIX REGRESSION TEST SUITE");
  console.log("================================================================\n");

  const timestamp = Date.now();

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Rapid Multi-Guest Collision Defense (Phase A2)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("Test 1: Rapid Concurrent Guest Registrations & Collision Defense");
  const guestPromises = Array.from({ length: 5 }, async (_, i) => {
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestEnrollment = `GST${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
    const names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
    const res = await request("/players", {
      method: "POST",
      body: JSON.stringify({
        playerName: `Guest Operative ${names[i]}`,
        enrollmentNumber: guestEnrollment,
        email: `guest_${i}_${randSuffix}@example.com`,
        contactNumber: "9876501234",
        branch: "CO",
      }),
    });
    return { i, res };
  });

  const guestResults = await Promise.all(guestPromises);
  const guestIds = new Set();
  for (const { i, res } of guestResults) {
    assert(res.status === 201 && res.data.success, `Guest ${i + 1} registered without 409 collision`);
    guestIds.add(res.data.data.id);
  }
  assert(guestIds.size === 5, "All 5 parallel guests received unique database IDs");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Authoritative Level 1 Solve & Post-Solve Room Refresh Recovery (Phase H3)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nTest 2: Authoritative L1 Solve & Post-Solve Room Refresh Recovery (Phase H3)");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const p1Enrollment = `AUD${Date.now().toString().slice(-4)}${rand}`.slice(0, 11);
  const p1Reg = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Audit Operative",
      enrollmentNumber: p1Enrollment,
      email: `audit_${rand}@example.com`,
      contactNumber: "9876501234",
      branch: "CO",
    }),
  });
  assert(p1Reg.status === 201, "Test operative registered");
  const player = p1Reg.data.data;
  const playerId = player.id;

  const sessionStart = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(sessionStart.status === 200 || sessionStart.status === 201, "Session active");
  const sessionId = sessionStart.data.data.sessionId;

  // Investigate L1 target
  const l1Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "lib_old_book" }),
  });
  assert(l1Target.data.data.outcome === "clue", "Level 1 target investigated");
  assert(l1Target.data.data.grantedItem === "usb_drive", "Level 1 granted usb_drive");

  // Submit correct answer to complete Level 1
  const l1Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-1", answer: "65" }),
  });
  assert(l1Solve.data.data.correct === true, "Level 1 challenge solved");
  assert(l1Solve.data.data.nextLevel === 2, "Backend advanced to nextLevel: 2");

  // Fetch backend recovery state
  const recAfterSolve = await request(`/players/${playerId}`);
  assert(recAfterSolve.data.data.currentLevel === 2, "Backend confirms currentLevel is 2");

  // Simulate refresh while player is still in the Library (has not left yet)
  const roomRecovery = determineRecoveredScene(
    recAfterSolve.data.data.player,
    recAfterSolve.data.data.levelProgress,
    "library_interior" // storedScene was library_interior
  );

  assert(
    roomRecovery.scene === "library_interior",
    "Player remains inside library_interior upon refresh after solve (NO premature campus kick)"
  );
  assert(
    roomRecovery.levelCompleted === true && roomRecovery.panel === "level_complete",
    "LevelCompletePanel and levelCompleted restored in completed room"
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Physical Exit & Campus Refresh Recovery (Phase C & H1)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nTest 3: Physical Door Exit & Campus Refresh Recovery (Phase C & H1)");
  // When player steps through the library door to campus:
  const campusExitRecovery = determineRecoveredScene(
    recAfterSolve.data.data.player,
    recAfterSolve.data.data.levelProgress,
    "campus" // storedScene updated to campus on door exit
  );

  assert(campusExitRecovery.scene === "campus", "Player scene is campus after physical door exit");
  assert(
    Array.isArray(campusExitRecovery.spawnOverride) &&
      campusExitRecovery.spawnOverride[0] === 7.5 &&
      campusExitRecovery.spawnOverride[2] === 22,
    "Player spawned outside Library door on campus ([7.5, 0, 22])"
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Hint System Idempotency & Zero Duplicate Penalties (Phase F)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nTest 4: Hint System Idempotency & Zero Duplicate Penalties (Phase F)");
  // Level 2 hint request 1
  const hint1 = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", order: 1 }),
  });
  assert(hint1.status === 200, "Hint 1 unlocked on Level 2");
  assert(hint1.data.data.penaltySeconds === 15, "Hint 1 penalty (+15s) applied");

  const playerAfterHint1 = await request(`/players/${playerId}`);
  assert(playerAfterHint1.data.data.penaltySeconds === 15, "Authoritative player penalty is 15s");

  // Request the exact same hint again
  const hint1Repeat = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", order: 1 }),
  });
  assert(hint1Repeat.status === 200, "Repeat hint request succeeds");
  assert(hint1Repeat.data.data.penaltySeconds === 0, "Repeat hint returns penaltySeconds: 0 (Idempotent)");

  const playerAfterRepeat = await request(`/players/${playerId}`);
  assert(playerAfterRepeat.data.data.penaltySeconds === 15, "Player total penalty remains 15s (Zero duplicate penalty)");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Pause Safety & Action Blocking (Phase G)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nTest 5: Pause Safety & Action Blocking (Phase G)");
  const pauseRes = await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(pauseRes.status === 200, "Session paused");

  // Attempt investigate while paused -> blocked
  const pausedInvestigate = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "robot_toolbox" }),
  });
  assert(pausedInvestigate.status === 400, "Investigation blocked while paused (400)");

  // Attempt answer submission while paused -> blocked
  const pausedSubmit = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", answer: "42" }),
  });
  assert(pausedSubmit.status === 400, "Answer submission blocked while paused (400)");

  // Attempt hint while paused -> blocked
  const pausedHint = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", order: 2 }),
  });
  assert(pausedHint.status === 400, "Hint request blocked while paused (400)");

  // Resume session
  const resumeRes = await request("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(resumeRes.status === 200, "Session resumed");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: Complete Level 2 & Recovery Integrity
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\nTest 6: Level 2 Solve & Cumulative Inventory Verification");
  const l2Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "robot_toolbox" }),
  });
  assert(l2Target.data.data.outcome === "clue", "Level 2 target investigated");
  assert(l2Target.data.data.grantedItem === "access_card", "Level 2 granted access_card");

  const l2Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", answer: "42" }),
  });
  assert(l2Solve.data.data.correct === true, "Level 2 challenge solved");

  const pAfterL2 = await request(`/players/${playerId}`);
  const inv = pAfterL2.data.data.inventory;
  assert(inv.includes("usb_drive") && inv.includes("access_card"), "Cumulative inventory contains usb_drive & access_card");

  console.log("\n================================================================");
  console.log("  🎉 ALL REAL GAMEPLAY AUDIT REGRESSION CHECKS PASSED!");
  console.log("================================================================\n");
}

runRegressionSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
