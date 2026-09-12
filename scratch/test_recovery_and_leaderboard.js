// Verification script for Persistent Recovery + Real Leaderboard
const http = require("http");

const BASE_URL = "http://localhost:5000/api";

async function request(path, options = {}) {
  const url = new URL(`${BASE_URL}${path}`);
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

async function runTests() {
  console.log("=================================================================");
  console.log(" Starting Persistent Game Recovery + Real Leaderboard Test Suite");
  console.log("=================================================================");

  const timestamp = Date.now();
  const testEnrollment = `REC${String(timestamp).slice(-5)}${Math.floor(100 + Math.random() * 900)}`.slice(0, 11);
  let playerId = null;
  let sessionId = null;
  let initialStartTime = null;

  try {
    // 1. Health check
    console.log("\n[1/19] Checking backend health...");
    const health = await request("/health");
    if (health.status !== 200 || !health.data.success) {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log("✓ Backend is healthy. Database:", health.data.data.database.status);

    // 2. Register Player
    console.log("\n[2/19] Registering test player (POST /api/players)...");
    const regRes = await request("/players", {
      method: "POST",
      body: {
        playerName: "Operative Recovery",
        enrollmentNumber: testEnrollment,
        email: "recovery@example.com",
        contactNumber: "9876543210",
        branch: "CO",
        team: "Recovery Unit",
      },
    });
    if (regRes.status !== 201 || !regRes.data.success) {
      throw new Error(`Player registration failed: ${JSON.stringify(regRes)}`);
    }
    playerId = regRes.data.data.id;
    console.log(`✓ Player registered: id=${playerId}, name=${regRes.data.data.playerName}`);

    // 3. Store player identity (simulate localStorage core_quest_player_id)
    console.log("\n[3/19] Storing player identifier in localStorage simulation...");
    const localStorageSimulation = { core_quest_player_id: playerId };
    console.log(`✓ Stored key: core_quest_player_id = "${localStorageSimulation.core_quest_player_id}"`);

    // 4. Start Session
    console.log("\n[4/19] Starting game session (POST /api/sessions/start)...");
    const startRes = await request("/sessions/start", {
      method: "POST",
      body: { playerId },
    });
    if (startRes.status !== 201 || !startRes.data.success) {
      throw new Error(`Session start failed: ${JSON.stringify(startRes)}`);
    }
    sessionId = startRes.data.data.sessionId;
    initialStartTime = startRes.data.data.startTime;
    console.log(`✓ Session started: sessionId=${sessionId}, startTime=${initialStartTime}`);

    // 5. Verify active session exists
    console.log("\n[5/19] Verifying active session via GET /api/players/:id...");
    const verifySessionRes = await request(`/players/${playerId}`);
    if (verifySessionRes.status !== 200 || !verifySessionRes.data.success) {
      throw new Error(`Session verification failed: ${JSON.stringify(verifySessionRes)}`);
    }
    const recData = verifySessionRes.data.data;
    if (!recData.activeSession || recData.activeSession.id !== sessionId || !recData.activeSession.isActive) {
      throw new Error(`Active session mismatch: ${JSON.stringify(recData.activeSession)}`);
    }
    console.log(`✓ Active session confirmed: id=${recData.activeSession.id}, isActive=${recData.activeSession.isActive}`);

    // 6. Progress through Level 1: Investigate clue target
    console.log("\n[6/19] Investigating clue target (POST /api/game/investigate - lib_old_book)...");
    const clueRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_old_book" },
    });
    if (clueRes.status !== 200 || clueRes.data.data.outcome !== "clue") {
      throw new Error(`Clue investigation failed: ${JSON.stringify(clueRes)}`);
    }
    console.log(`✓ Target investigated, puzzle unlocked: "${clueRes.data.data.challenge?.question}"`);

    // 7. Submit wrong answer (+30s penalty)
    console.log("\n[7/19] Submitting wrong answer (POST /api/game/submit-answer)...");
    const wrongRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", answer: "bad_answer" },
    });
    if (wrongRes.status !== 200 || wrongRes.data.data.correct !== false || wrongRes.data.data.penaltySeconds !== 30) {
      throw new Error(`Wrong answer penalty check failed: ${JSON.stringify(wrongRes)}`);
    }
    console.log(`✓ Wrong answer penalized correctly (+${wrongRes.data.data.penaltySeconds}s)`);

    // 8. Request Hint 1 (+15s penalty)
    console.log("\n[8/19] Requesting progressive Hint 1 (POST /api/game/hint)...");
    const hintRes = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", order: 1 },
    });
    if (hintRes.status !== 200 || hintRes.data.data.penaltySeconds !== 15) {
      throw new Error(`Hint penalty check failed: ${JSON.stringify(hintRes)}`);
    }
    console.log(`✓ Hint 1 received (+${hintRes.data.data.penaltySeconds}s): "${hintRes.data.data.text}"`);

    // 9. Verify penalty persistence in database (30 + 15 = 45s)
    console.log("\n[9/19] Verifying penalty persistence in backend...");
    const playerCheck = await request(`/players/${playerId}`);
    const totalPenalty = playerCheck.data.data.penaltySeconds;
    if (totalPenalty !== 45) {
      throw new Error(`Expected total penalty 45s, got ${totalPenalty}s`);
    }
    console.log(`✓ Penalties persistently stored in database: ${totalPenalty}s`);

    // 10. Simulate browser refresh / frontend hydration
    console.log("\n[10/19] Simulating frontend browser refresh (reading core_quest_player_id)...");
    const recoveredPlayerId = localStorageSimulation.core_quest_player_id;
    if (!recoveredPlayerId) throw new Error("Missing simulated localStorage player ID");
    console.log(`✓ Read recovered player ID: ${recoveredPlayerId}`);

    // 11. Recover player and session from backend
    console.log("\n[11/19] Hydrating player state from GET /api/players/:id...");
    const recoveryRes = await request(`/players/${recoveredPlayerId}`);
    if (recoveryRes.status !== 200 || !recoveryRes.data.success) {
      throw new Error(`Player recovery failed: ${JSON.stringify(recoveryRes)}`);
    }
    const recovered = recoveryRes.data.data;
    console.log("✓ Backend recovery payload received.");

    // 12. Verify restored state matches authoritative backend
    console.log("\n[12/19] Verifying restored player attributes...");
    if (recovered.id !== playerId) throw new Error("Restored player ID mismatch");
    if (recovered.currentLevel !== 1) throw new Error("Restored currentLevel mismatch");
    if (recovered.penaltySeconds !== 45) throw new Error("Restored penaltySeconds mismatch");
    if (!recovered.activeSession || recovered.activeSession.id !== sessionId) {
      throw new Error("Restored activeSession mismatch");
    }
    if (recovered.activeSession.startedAt !== initialStartTime) {
      throw new Error("Restored startedAt timestamp altered");
    }
    console.log("✓ Restored player properties verified:");
    console.log(`  - currentLevel   : ${recovered.currentLevel}`);
    console.log(`  - penaltySeconds : ${recovered.penaltySeconds}s`);
    console.log(`  - activeSessionId: ${recovered.activeSession.id}`);
    console.log(`  - startedAt      : ${recovered.activeSession.startedAt} (unchanged)`);

    // 13. Verify duplicate session prevention after refresh
    console.log("\n[13/19] Calling POST /api/sessions/start again to verify NO duplicate session is created...");
    const dupStartRes = await request("/sessions/start", {
      method: "POST",
      body: { playerId },
    });
    if (dupStartRes.status !== 200 || dupStartRes.data.data.sessionId !== sessionId) {
      throw new Error(`Duplicate session guard failed: ${JSON.stringify(dupStartRes)}`);
    }
    if (dupStartRes.data.data.startTime !== initialStartTime) {
      throw new Error("Timer was reset by startSession call!");
    }
    console.log("✓ Duplicate session prevention verified: existing session retained, timer did NOT restart.");

    // 14. Fetch real leaderboard while player is active
    console.log("\n[14/19] Fetching real leaderboard (GET /api/leaderboard)...");
    const lbRes1 = await request("/leaderboard?limit=500");
    if (lbRes1.status !== 200 || !lbRes1.data.success || !Array.isArray(lbRes1.data.data)) {
      throw new Error(`Leaderboard fetch failed: ${JSON.stringify(lbRes1)}`);
    }
    console.log(`✓ Real leaderboard returned ${lbRes1.data.data.length} entries.`);

    // 15. Verify test player appears on real leaderboard
    console.log("\n[15/19] Verifying test player entry in real leaderboard...");
    const playerEntry = lbRes1.data.data.find((row) => row.playerId === playerId);
    if (!playerEntry) {
      throw new Error(`Player ${playerId} not found in leaderboard rows: ${JSON.stringify(lbRes1.data.data)}`);
    }
    if (playerEntry.team !== "Recovery Unit") throw new Error("Leaderboard team mismatch");
    if (playerEntry.level !== 1) throw new Error("Leaderboard level mismatch");
    if (playerEntry.penaltySeconds !== 45) throw new Error("Leaderboard penaltySeconds mismatch");
    console.log("✓ Active player verified on real leaderboard:");
    console.log(`  - Rank           : #${playerEntry.rank}`);
    console.log(`  - Name           : ${playerEntry.playerName}`);
    console.log(`  - Team           : ${playerEntry.team}`);
    console.log(`  - Level          : ${playerEntry.level}`);
    console.log(`  - Time           : ${playerEntry.timeSeconds}s`);
    console.log(`  - Penalty        : +${playerEntry.penaltySeconds}s`);
    console.log(`  - Final Score    : ${playerEntry.finalTimeSeconds}s`);

    // 16. Solve challenge and complete session
    console.log("\n[16/19] Submitting correct answer '65' (POST /api/game/submit-answer)...");
    const solveRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", answer: "65" },
    });
    if (!solveRes.data.data.correct || solveRes.data.data.nextLevel !== 2) {
      throw new Error(`Answer solve failed: ${JSON.stringify(solveRes)}`);
    }
    console.log(`✓ Challenge solved! Advanced to Level ${solveRes.data.data.nextLevel}.`);

    console.log("\n[17/19] Completing game session (POST /api/sessions/complete)...");
    const compRes = await request("/sessions/complete", {
      method: "POST",
      body: { playerId, sessionId },
    });
    if (compRes.status !== 200 || compRes.data.data.status !== "COMPLETED") {
      throw new Error(`Session completion failed: ${JSON.stringify(compRes)}`);
    }
    console.log("✓ Session completed authoritatively:");
    console.log(`  - Game time      : ${compRes.data.data.gameTimeSeconds}s`);
    console.log(`  - Penalty seconds: ${compRes.data.data.penaltySeconds}s`);
    console.log(`  - Final time     : ${compRes.data.data.finalTimeSeconds}s`);

    // 18. Fetch leaderboard again to verify completed player ranking
    console.log("\n[18/19] Fetching real leaderboard after completion (GET /api/leaderboard)...");
    const lbRes2 = await request("/leaderboard?limit=500");
    const completedEntry = lbRes2.data.data.find((row) => row.playerId === playerId);
    if (!completedEntry) throw new Error("Completed player missing from leaderboard");
    if (completedEntry.status !== "completed") {
      throw new Error(`Expected completed status on leaderboard, got ${completedEntry.status}`);
    }
    if (completedEntry.finalTimeSeconds !== compRes.data.data.finalTimeSeconds) {
      throw new Error("Leaderboard final time does not match session completion final time");
    }
    console.log("✓ Completed player verified on real leaderboard:");
    console.log(`  - Rank           : #${completedEntry.rank}`);
    console.log(`  - Name           : ${completedEntry.playerName}`);
    console.log(`  - Status         : ${completedEntry.status}`);
    console.log(`  - Final Time     : ${completedEntry.finalTimeSeconds}s`);
    console.log(`  - Location       : ${completedEntry.location}`);

    // Verify recovery after completion still preserves profile
    console.log("\n[18b/19] Testing recovery after completion (GET /api/players/:id)...");
    const postCompRecovery = await request(`/players/${playerId}`);
    if (postCompRecovery.data.data.status !== "COMPLETED") {
      throw new Error("Status after completion mismatch");
    }
    if (postCompRecovery.data.data.activeSession !== null) {
      throw new Error("Active session must be null after session is completed!");
    }
    console.log("✓ Post-completion recovery verified: status is COMPLETED and activeSession is null.");

    console.log("\n=================================================================");
    console.log(" ALL 19 RECOVERY + LEADERBOARD INTEGRATION CHECKS PASSED!");
    console.log("=================================================================");
  } finally {
    // 19. Cleanup test data
    if (playerId) {
      console.log(`\n[19/19] Cleaning up test player data for id=${playerId}...`);
      const { PrismaClient } = require("d:/MEGH/core-quest-finder/backend/node_modules/@prisma/client");
      const prisma = new PrismaClient();
      try {
        await prisma.levelProgress.deleteMany({ where: { playerId } });
        await prisma.gameSession.deleteMany({ where: { playerId } });
        await prisma.player.delete({ where: { id: playerId } });
        console.log("✓ Cleanup completed cleanly.");
      } catch (err) {
        console.warn("Cleanup warning:", err.message);
      } finally {
        await prisma.$disconnect();
      }
    }
  }
}

runTests().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
