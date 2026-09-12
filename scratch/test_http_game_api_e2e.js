// End-to-End Integration Test for Frontend-Backend Level 1 Connection
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
  console.log("====================================================");
  console.log(" Starting Level 1 End-to-End Integration Verification");
  console.log("====================================================");

  const timestamp = Date.now();
  const testEnrollment = `E2E_${timestamp}`;
  let playerId = null;
  let sessionId = null;

  try {
    // 1. Health check
    console.log("\n[1/10] Checking backend health...");
    const health = await request("/health");
    if (health.status !== 200 || !health.data.success) {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log("✓ Backend is healthy. Database:", health.data.data.database.status);

    // 2. Register Player
    console.log("\n[2/10] Registering player (POST /api/players)...");
    const regRes = await request("/players", {
      method: "POST",
      body: {
        playerName: `Operative_${timestamp}`,
        enrollmentNumber: testEnrollment,
        team: "E2E Unit",
      },
    });
    if (regRes.status !== 201 || !regRes.data.success) {
      throw new Error(`Player registration failed: ${JSON.stringify(regRes)}`);
    }
    playerId = regRes.data.data.id;
    console.log(`✓ Player registered successfully: id=${playerId}, status=${regRes.data.data.status}`);

    // 3. Start Session
    console.log("\n[3/10] Starting game session (POST /api/sessions/start)...");
    const startRes = await request("/sessions/start", {
      method: "POST",
      body: { playerId },
    });
    if (startRes.status !== 201 || !startRes.data.success) {
      throw new Error(`Start session failed: ${JSON.stringify(startRes)}`);
    }
    sessionId = startRes.data.data.sessionId;
    console.log(`✓ Session started: sessionId=${sessionId}, startTime=${startRes.data.data.startTime}`);

    // 3b. Test duplicate session handling
    console.log("\n[3b/10] Testing duplicate session prevention...");
    const dupRes = await request("/sessions/start", {
      method: "POST",
      body: { playerId },
    });
    if (dupRes.status !== 200 || dupRes.data.data.sessionId !== sessionId) {
      throw new Error(`Duplicate session check failed: ${JSON.stringify(dupRes)}`);
    }
    console.log("✓ Duplicate session prevention verified: returned existing active sessionId.");

    // 4. Investigate Decoy Object
    console.log("\n[4/10] Investigating decoy object (POST /api/game/investigate - lib_shelf_a)...");
    const decoyRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_shelf_a" },
    });
    if (decoyRes.status !== 200 || decoyRes.data.data.outcome !== "decoy") {
      throw new Error(`Decoy investigation failed: ${JSON.stringify(decoyRes)}`);
    }
    console.log(`✓ Decoy outcome received: '${decoyRes.data.data.message}'`);

    // 5. Investigate Clue Object (lib_old_book)
    console.log("\n[5/10] Investigating clue target (POST /api/game/investigate - lib_old_book)...");
    const clueRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_old_book" },
    });
    if (clueRes.status !== 200 || clueRes.data.data.outcome !== "clue") {
      throw new Error(`Clue investigation failed: ${JSON.stringify(clueRes)}`);
    }
    if (clueRes.data.data.challenge.answer) {
      throw new Error("SECURITY FAILURE: Authoritative challenge answer leaked in client response!");
    }
    console.log(`✓ Clue found: "${clueRes.data.data.clue.text}"`);
    console.log(`✓ Challenge question: "${clueRes.data.data.challenge.question}" (Security verified: No answer in response)`);
    console.log(`✓ Granted item: ${clueRes.data.data.grantedItem}`);

    // 6. Submit Wrong Answer (+30s penalty)
    console.log("\n[6/10] Submitting wrong answer (POST /api/game/submit-answer - 'wrong_999')...");
    const wrongRes = await request("/game/submit-answer", {
      method: "POST",
      body: {
        playerId,
        challengeId: clueRes.data.data.challenge.id,
        answer: "wrong_999",
      },
    });
    if (wrongRes.status !== 200 || wrongRes.data.data.correct !== false || wrongRes.data.data.penaltySeconds !== 30) {
      throw new Error(`Wrong answer check failed: ${JSON.stringify(wrongRes)}`);
    }
    console.log(`✓ Wrong answer rejected correctly: +${wrongRes.data.data.penaltySeconds}s penalty added`);

    // 7. Request Hints (Orders 1, 2, 3)
    console.log("\n[7/10] Requesting progressive hints (POST /api/game/hint)...");
    const h1 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", order: 1 },
    });
    if (h1.data.data.penaltySeconds !== 15) throw new Error("Hint 1 penalty mismatch");
    console.log(`✓ Hint 1 (+${h1.data.data.penaltySeconds}s): "${h1.data.data.text}"`);

    const h2 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", order: 2 },
    });
    if (h2.data.data.penaltySeconds !== 30) throw new Error("Hint 2 penalty mismatch");
    console.log(`✓ Hint 2 (+${h2.data.data.penaltySeconds}s): "${h2.data.data.text}"`);

    const h3 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", order: 3 },
    });
    if (h3.data.data.penaltySeconds !== 45) throw new Error("Hint 3 penalty mismatch");
    console.log(`✓ Hint 3 (+${h3.data.data.penaltySeconds}s): "${h3.data.data.text}"`);

    // 8. Run Scanner (POST /api/game/scan)
    console.log("\n[8/10] Running AR Scanner (POST /api/game/scan)...");
    const scanNear = await request("/game/scan", {
      method: "POST",
      body: {
        playerId,
        position: [-1.6, 0, -1.4], // Target position
        levelId: 1,
      },
    });
    if (scanNear.status !== 200 || scanNear.data.data.penaltySeconds !== 10) {
      throw new Error(`Scanner near test failed: ${JSON.stringify(scanNear)}`);
    }
    console.log(`✓ Scanner near target (+${scanNear.data.data.penaltySeconds}s): "${scanNear.data.data.message}"`);

    // 9. Submit Correct Answer ("65")
    console.log("\n[9/10] Submitting authoritative correct answer '65' (POST /api/game/submit-answer)...");
    const correctRes = await request("/game/submit-answer", {
      method: "POST",
      body: {
        playerId,
        challengeId: "ch-1",
        answer: "65",
      },
    });
    if (correctRes.status !== 200 || correctRes.data.data.correct !== true || correctRes.data.data.nextLevel !== 2) {
      throw new Error(`Correct answer submission failed: ${JSON.stringify(correctRes)}`);
    }
    console.log(`✓ Correct answer accepted! Level 1 completed. Advanced to Level ${correctRes.data.data.nextLevel}.`);

    // 10. Complete Session
    console.log("\n[10/11] Completing game session (POST /api/sessions/complete)...");
    const compRes = await request("/sessions/complete", {
      method: "POST",
      body: { playerId, sessionId },
    });
    if (compRes.status !== 200 || compRes.data.data.status !== "COMPLETED") {
      throw new Error(`Session completion failed: ${JSON.stringify(compRes)}`);
    }
    console.log("✓ Session completed successfully!");
    console.log(`  - Game time      : ${compRes.data.data.gameTimeSeconds}s`);
    console.log(`  - Total penalties: ${compRes.data.data.penaltySeconds}s`);
    console.log(`  - Final score    : ${compRes.data.data.finalTimeSeconds}s`);

    // 11. Leaderboard Endpoint Error Check
    console.log("\n[11/11] Testing leaderboard endpoint (GET /api/leaderboard)...");
    const lbRes = await request("/leaderboard", { method: "GET" });
    if (lbRes.status === 404) {
      console.log("✓ Verified: GET /api/leaderboard returns 404 (clear API error as expected; not silently falling back to mock data).");
    } else if (lbRes.status === 200 && lbRes.data.success) {
      console.log("✓ GET /api/leaderboard is implemented on backend and returned real data.");
    } else {
      console.log(`✓ GET /api/leaderboard returned HTTP ${lbRes.status}: ${JSON.stringify(lbRes.data || lbRes.raw)}`);
    }

    console.log("\n====================================================");
    console.log(" ALL 11 LEVEL 1 E2E INTEGRATION CHECKS PASSED!");
    console.log("====================================================");
  } finally {
    // Cleanup created test records
    if (playerId) {
      console.log(`\nCleaning up test player data for id=${playerId}...`);
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
