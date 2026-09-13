/**
 * Integration Test for Persistent Gameplay State for Level 1
 * 
 * Verifies the complete 17-step lifecycle:
 * 1. Health check
 * 2. Player registration
 * 3. Session start
 * 4. Decoy object investigation
 * 5. Target clue object investigation (lib_old_book)
 * 6. Progressive Hint 1
 * 7. Progressive Hint 2
 * 8. Wrong answer submission
 * 9. Penalty calculation verification (15 + 30 + 30 = 75s)
 * 10. Player recovery endpoint query (GET /api/players/:id)
 * 11. Verification of all returned gameplay progress
 * 12. Browser refresh simulation
 * 13. State restoration verification (no duplicate sessions, unchanged start time, restored items/hints)
 * 14. Level 1 completion with correct answer "65"
 * 15. Level 2 clean start verification (empty hints, items, investigations)
 * 16. Level 1 historical progress integrity in database
 * 17. Test data cleanup
 */

const http = require("http");
const path = require("path");

// Load PrismaClient from backend/node_modules
const { PrismaClient } = require("d:/MEGH/core-quest-finder/backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

const BASE_URL = "http://localhost:5000/api";

function request(apiPath, options = {}) {
  const url = new URL(`${BASE_URL}${apiPath}`);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, data });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runLevel1RecoveryTests() {
  console.log("=================================================================");
  console.log(" Starting Level 1 Persistent Gameplay State Integration Tests");
  console.log("=================================================================");

  const timestamp = Date.now();
  const testEnrollment = `GMP${String(timestamp).slice(-5)}${Math.floor(100 + Math.random() * 900)}`.slice(0, 11);
  let playerId = null;
  let activeSessionId = null;
  let sessionStartTime = null;

  try {
    // 1. Health check
    console.log("\n[1/17] Checking backend health (GET /api/health)...");
    const health = await request("/health");
    assert(health.status === 200 && health.data.success, "Backend health check failed");
    console.log("✓ Backend is healthy. Database:", health.data.data.database.status);

    // 2. Register a new test player
    console.log("\n[2/17] Registering test player (POST /api/players)...");
    const regRes = await request("/players", {
      method: "POST",
      body: {
        playerName: "Player Gameplay",
        enrollmentNumber: testEnrollment,
        email: "gameplay@example.com",
        contactNumber: "9876543210",
        branch: "CO",
        team: "Persistence Unit",
      },
    });
    assert(regRes.status === 201 && regRes.data.success, "Registration failed");
    playerId = regRes.data.data.id;
    console.log(`✓ Player registered: id=${playerId}, name=${regRes.data.data.playerName}`);

    // 3. Start a session
    console.log("\n[3/17] Starting session (POST /api/sessions/start)...");
    const sessionRes = await request("/sessions/start", {
      method: "POST",
      body: { playerId },
    });
    assert(sessionRes.status === 201 && sessionRes.data.success, "Session start failed");
    activeSessionId = sessionRes.data.data.sessionId;
    sessionStartTime = sessionRes.data.data.startTime;
    console.log(`✓ Session started: sessionId=${activeSessionId}, startTime=${sessionStartTime}`);

    // 4. Investigate a decoy object
    console.log("\n[4/17] Investigating decoy object 'lib_shelf_a' (POST /api/game/investigate)...");
    const decoyRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_shelf_a" },
    });
    assert(decoyRes.status === 200 && decoyRes.data.success, "Decoy investigation request failed");
    assert(decoyRes.data.data.outcome === "decoy", "Decoy outcome should be 'decoy'");
    console.log("✓ Decoy object investigated successfully:", decoyRes.data.data.message);

    // 5. Investigate clue target 'lib_old_book'
    console.log("\n[5/17] Investigating clue target 'lib_old_book' (POST /api/game/investigate)...");
    const clueRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_old_book" },
    });
    assert(clueRes.status === 200 && clueRes.data.success, "Clue investigation request failed");
    assert(clueRes.data.data.outcome === "clue", "Target outcome should be 'clue'");
    assert(clueRes.data.data.grantedItem === "usb_drive", "Granted item should be 'usb_drive'");
    assert(clueRes.data.data.challenge.id.startsWith("ch-1"), "Challenge id should start with 'ch-1'");
    const activeChallengeId = clueRes.data.data.challenge.id;
    // Verify security: answer must NOT be leaked
    assert(!clueRes.data.data.challenge.answer, "SECURITY: Answer must NOT be present in challenge response");
    console.log("✓ Clue investigated, challenge unlocked & item granted without leaking answer:", activeChallengeId);

    // 6. Request Hint 1
    console.log("\n[6/17] Requesting Hint 1 (POST /api/game/hint)...");
    const hint1Res = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: activeChallengeId, order: 1 },
    });
    assert(hint1Res.status === 200 && hint1Res.data.success, "Hint 1 request failed");
    assert(hint1Res.data.data.order === 1, "Hint order should be 1");
    assert(hint1Res.data.data.penaltySeconds === 15, "Hint 1 penalty should be 15s");
    console.log("✓ Hint 1 revealed:", hint1Res.data.data.text, `(+${hint1Res.data.data.penaltySeconds}s)`);

    // 7. Request Hint 2
    console.log("\n[7/17] Requesting Hint 2 (POST /api/game/hint)...");
    const hint2Res = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: activeChallengeId, order: 2 },
    });
    assert(hint2Res.status === 200 && hint2Res.data.success, "Hint 2 request failed");
    assert(hint2Res.data.data.order === 2, "Hint order should be 2");
    assert(hint2Res.data.data.penaltySeconds === 30, "Hint 2 penalty should be 30s");
    console.log("✓ Hint 2 revealed:", hint2Res.data.data.text, `(+${hint2Res.data.data.penaltySeconds}s)`);

    // 8. Submit one wrong answer
    console.log("\n[8/17] Submitting wrong answer (POST /api/game/submit-answer)...");
    const wrongAnsRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: activeChallengeId, answer: "wrong_answer_42" },
    });
    assert(wrongAnsRes.status === 200 && wrongAnsRes.data.success, "Wrong answer request failed");
    assert(wrongAnsRes.data.data.correct === false, "Answer should be incorrect");
    assert(wrongAnsRes.data.data.penaltySeconds === 30, "Wrong answer penalty should be 30s");
    console.log("✓ Wrong answer rejected with penalty:", wrongAnsRes.data.data.message);

    // 9. Verify penalties
    console.log("\n[9/17] Verifying player penalties...");
    const playerCheckRes = await request(`/players/${playerId}`);
    assert(playerCheckRes.status === 200 && playerCheckRes.data.success, "Player check failed");
    const expectedPenalty = 15 + 30 + 30; // Hint 1 (15) + Hint 2 (30) + Wrong answer (30) = 75
    assert(
      playerCheckRes.data.data.penaltySeconds === expectedPenalty,
      `Expected penalty ${expectedPenalty}s, got ${playerCheckRes.data.data.penaltySeconds}s`
    );
    console.log(`✓ Total penalties verified: ${playerCheckRes.data.data.penaltySeconds}s (Expected: 75s)`);

    // 10. Fetch GET /api/players/:id for recovery data
    console.log("\n[10/17] Fetching recovery data (GET /api/players/:id)...");
    const recoveryRes = await request(`/players/${playerId}`);
    assert(recoveryRes.status === 200 && recoveryRes.data.success, "Recovery fetch failed");
    const recData = recoveryRes.data.data;
    assert(recData.levelProgress !== null && recData.levelProgress !== undefined, "levelProgress is missing");
    console.log("✓ Recovery data retrieved successfully with levelProgress");

    // 11. Verify all gameplay progress is returned correctly
    console.log("\n[11/17] Verifying all gameplay progress fields...");
    const progress = recData.levelProgress;
    assert(progress.level === 1, "Level progress level should be 1");
    assert(
      progress.investigatedObjects.includes("lib_shelf_a"),
      "investigatedObjects must include decoy 'lib_shelf_a'"
    );
    assert(
      progress.investigatedObjects.includes("lib_old_book"),
      "investigatedObjects must include target 'lib_old_book'"
    );
    assert(
      progress.collectedItems.includes("usb_drive"),
      "collectedItems must include 'usb_drive'"
    );
    assert(
      JSON.stringify(progress.usedHints) === JSON.stringify([1, 2]),
      `usedHints should be [1, 2], got ${JSON.stringify(progress.usedHints)}`
    );
    assert(
      progress.revealedHints && progress.revealedHints.length === 2,
      "revealedHints should contain exactly 2 revealed hints"
    );
    assert(progress.attempts === 1, `attempts should be 1, got ${progress.attempts}`);
    console.log("✓ Level 1 gameplay progress verified:", {
      investigatedObjects: progress.investigatedObjects,
      collectedItems: progress.collectedItems,
      usedHints: progress.usedHints,
      revealedHintsCount: progress.revealedHints.length,
      attempts: progress.attempts,
    });

    // 12 & 13. Simulate browser refresh recovery
    console.log("\n[12/17 & 13/17] Simulating browser refresh recovery...");
    // Simulate frontend hydration logic from gameStore.ts
    const simulatedStore = {
      player: recData.player,
      activeSessionId: recData.activeSession?.id ?? null,
      startedAt: recData.activeSession?.startedAt ?? null,
      penaltySeconds: recData.player.penaltySeconds,
      status: recData.player.status,
      currentLevel: recData.player.currentLevel,
      investigated: progress.investigatedObjects,
      inventory: progress.collectedItems,
      usedHints: progress.usedHints,
      revealedHints: progress.revealedHints,
      attempts: progress.attempts,
    };

    // Assertions for step 13
    assert(simulatedStore.player.id === playerId, "Restored player ID mismatch");
    assert(simulatedStore.player.status === "SOLVING", `Player status should be SOLVING, got ${simulatedStore.player.status}`);
    assert(simulatedStore.activeSessionId === activeSessionId, "Active session ID mismatch");
    assert(simulatedStore.startedAt === sessionStartTime, "Session startedAt timestamp mismatch");
    assert(
      simulatedStore.investigated.includes("lib_shelf_a") && simulatedStore.investigated.includes("lib_old_book"),
      "Restored investigated objects mismatch"
    );
    assert(
      simulatedStore.inventory.includes("usb_drive"),
      "Restored inventory mismatch"
    );
    assert(
      JSON.stringify(simulatedStore.usedHints) === JSON.stringify([1, 2]),
      "Restored used hints mismatch"
    );
    assert(simulatedStore.penaltySeconds === 75, "Restored penalties mismatch");
    assert(simulatedStore.attempts === 1, "Restored attempts mismatch");

    // Verify no duplicate session was created
    const sessionCount = await prisma.gameSession.count({
      where: { playerId },
    });
    assert(sessionCount === 1, `Expected exactly 1 session, found ${sessionCount}`);
    console.log("✓ Simulated refresh recovery fully verified with zero session duplication and exact state restoration");

    // 14. Complete Level 1 with correct answer based on assigned challenge
    const answersMap = {
      "ch-1": "65",
      "ch-1-1": "65",
      "ch-1-2": "96",
      "ch-1-3": "42",
    };
    const validAnswer = answersMap[activeChallengeId] || "65";
    console.log(`\n[14/17] Submitting correct answer '${validAnswer}' for ${activeChallengeId} (POST /api/game/submit-answer)...`);
    const correctAnsRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: activeChallengeId, answer: validAnswer },
    });
    assert(correctAnsRes.status === 200 && correctAnsRes.data.success, "Correct answer submission failed");
    assert(correctAnsRes.data.data.correct === true, "Answer should be accepted as correct");
    assert(correctAnsRes.data.data.levelCompleted === true, "Level should be completed");
    assert(correctAnsRes.data.data.nextLevel === 2, "Next level should be 2");
    console.log("✓ Correct answer accepted! Level 1 completed. Advanced to Level 2.");

    // 15. Verify Level 2 starts with clean Level 2 gameplay progress
    console.log("\n[15/17] Verifying Level 2 starts with clean Level 2 gameplay progress...");
    const level2RecoveryRes = await request(`/players/${playerId}`);
    assert(level2RecoveryRes.status === 200 && level2RecoveryRes.data.success, "Level 2 recovery fetch failed");
    const l2Player = level2RecoveryRes.data.data.player;
    const l2Progress = level2RecoveryRes.data.data.levelProgress;
    assert(l2Player.currentLevel === 2, `Player current level should be 2, got ${l2Player.currentLevel}`);
    assert(l2Player.status === "SEARCHING", `Player status should be SEARCHING, got ${l2Player.status}`);
    assert(l2Progress.level === 2, `LevelProgress level should be 2, got ${l2Progress.level}`);
    assert(l2Progress.investigatedObjects.length === 0, "Level 2 investigatedObjects must be clean/empty");
    assert(l2Progress.collectedItems.length === 0, "Level 2 collectedItems must be clean/empty");
    assert(l2Progress.usedHints.length === 0, "Level 2 usedHints must be clean/empty");
    assert(l2Progress.attempts === 0, "Level 2 attempts must be 0");
    console.log("✓ Level 2 gameplay progress is completely clean:", {
      level: l2Progress.level,
      investigatedObjects: l2Progress.investigatedObjects,
      collectedItems: l2Progress.collectedItems,
      usedHints: l2Progress.usedHints,
      attempts: l2Progress.attempts,
    });

    // 16. Verify Level 1 historical progress remains valid in database
    console.log("\n[16/17] Verifying Level 1 historical progress remains intact in database...");
    const l1Historical = await prisma.levelProgress.findUnique({
      where: {
        playerId_levelId: {
          playerId,
          levelId: 1,
        },
      },
    });
    assert(l1Historical !== null, "Level 1 historical progress record not found in DB");
    assert(l1Historical.status === "COMPLETED", `Level 1 status should be COMPLETED, got ${l1Historical.status}`);
    assert(l1Historical.completedAt !== null, "Level 1 completedAt should not be null");
    const l1Data = l1Historical.progressData;
    assert(l1Data.investigatedObjects.includes("lib_shelf_a"), "Historical progress should include lib_shelf_a");
    assert(l1Data.investigatedObjects.includes("lib_old_book"), "Historical progress should include lib_old_book");
    assert(l1Data.collectedItems.includes("usb_drive"), "Historical progress should include usb_drive");
    assert(JSON.stringify(l1Data.usedHints) === JSON.stringify([1, 2]), "Historical progress should include used hints [1, 2]");
    assert(l1Data.attempts === 2, `Historical attempts should be 2 (1 wrong + 1 correct), got ${l1Data.attempts}`);
    console.log("✓ Level 1 historical progress in database verified:", {
      status: l1Historical.status,
      completedAt: l1Historical.completedAt,
      progressData: l1Historical.progressData,
    });

    console.log("\n=================================================================");
    console.log(" ALL 16 GAMEPLAY AND RECOVERY VERIFICATION CHECKS PASSED!        ");
    console.log("=================================================================");
  } finally {
    // 17. Cleanup all test data
    console.log("\n[17/17] Cleaning up all test data...");
    if (playerId) {
      await prisma.levelProgress.deleteMany({ where: { playerId } });
      await prisma.gameSession.deleteMany({ where: { playerId } });
      await prisma.player.deleteMany({ where: { id: playerId } });
      console.log(`✓ Cleaned up player ${playerId} and related sessions/progress records`);
    }
    await prisma.$disconnect();
    console.log("✓ Database disconnected cleanly.");
  }
}

runLevel1RecoveryTests()
  .then(() => {
    console.log("\n🎉 TEST SUITE COMPLETE: 100% SUCCESS");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  });
