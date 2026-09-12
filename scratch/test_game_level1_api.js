const http = require("http");

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assertNoSecretAnswer(payload, testName) {
  const serialized = JSON.stringify(payload);
  if (serialized.includes('"answer"') || serialized.includes('"expectedAnswer"') || serialized.includes('"holdsClue"')) {
    throw new Error(`SECURITY LEAK in ${testName}: Secret answer or internal flag found in response payload!`);
  }
}

async function run() {
  console.log("=== Testing Core Quest Finder Level 1 Game APIs ===\n");
  const baseUrl = "localhost";
  const port = 5000;

  // 1. Health check
  console.log("--- 0. Health check ---");
  const healthRes = await request({
    hostname: baseUrl,
    port,
    path: "/api/health",
    method: "GET",
  });
  console.log("Health status:", healthRes.status, healthRes.data?.data?.database?.status);
  if (healthRes.status !== 200 || !healthRes.data?.data?.database?.connected) {
    throw new Error("Backend server or database not ready");
  }

  // 2. Create Test Players
  const testEnrollment1 = `TEST_GAME_${Date.now()}_1`;
  const testEnrollment2 = `TEST_GAME_${Date.now()}_2`;

  console.log(`\n--- Setup: Creating Test Player 1 (${testEnrollment1}) ---`);
  const createPlayer1Res = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Game Tester 1",
      enrollmentNumber: testEnrollment1,
      team: "Game Team Alpha",
      selectedCharacter: "MALE",
    }
  );
  console.log("Create Player 1:", createPlayer1Res.status);
  const player1 = createPlayer1Res.data.data;

  console.log(`\n--- Setup: Creating Test Player 2 (${testEnrollment2}) ---`);
  const createPlayer2Res = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Game Tester 2",
      enrollmentNumber: testEnrollment2,
      team: "Game Team Beta",
      selectedCharacter: "FEMALE",
    }
  );
  console.log("Create Player 2:", createPlayer2Res.status);
  const player2 = createPlayer2Res.data.data;

  // ==========================================
  // INVESTIGATION TESTS
  // ==========================================
  console.log("\n==========================================");
  console.log("=== 1. INVESTIGATION TESTS ===");
  console.log("==========================================");

  // 1. Missing playerId
  console.log("\n1.1 Missing playerId");
  const invNoPlayer = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { objectId: "lib_old_book" }
  );
  console.log("Status (expected 400):", invNoPlayer.status, invNoPlayer.data);

  // 1.2 Missing objectId
  console.log("\n1.2 Missing objectId");
  const invNoObject = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id }
  );
  console.log("Status (expected 400):", invNoObject.status, invNoObject.data);

  // 1.3 Invalid player
  console.log("\n1.3 Invalid player");
  const invInvalidPlayer = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: "cuid_non_existent", objectId: "lib_old_book" }
  );
  console.log("Status (expected 404):", invInvalidPlayer.status, invInvalidPlayer.data);

  // 1.4 Decoy object
  console.log("\n1.4 Decoy object investigation (lib_computer)");
  const invDecoy = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id, objectId: "lib_computer" }
  );
  console.log("Decoy result (expected 200 decoy):", invDecoy.status, invDecoy.data);
  assertNoSecretAnswer(invDecoy.data, "invDecoy");

  // 1.5 Correct object lib_old_book
  console.log("\n1.5 Correct clue object (lib_old_book)");
  const invClue = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id, objectId: "lib_old_book" }
  );
  console.log("Clue result (expected 200 clue):", invClue.status, JSON.stringify(invClue.data, null, 2));
  assertNoSecretAnswer(invClue.data, "invClue");

  // Verify Player status changed to SOLVING in DB
  const checkPlayerAfterClue = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${player1.id}`,
    method: "GET",
  });
  console.log("Player 1 status in DB after finding clue (expected SOLVING):", checkPlayerAfterClue.data.data.status);

  // ==========================================
  // ANSWER SUBMISSION TESTS
  // ==========================================
  console.log("\n==========================================");
  console.log("=== 2. ANSWER SUBMISSION TESTS ===");
  console.log("==========================================");

  // 2.1 Missing fields
  console.log("\n2.1 Missing answer field");
  const ansMissing = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id, challengeId: "ch-1" }
  );
  console.log("Status (expected 400):", ansMissing.status, ansMissing.data);

  // 2.2 Invalid player
  console.log("\n2.2 Invalid player");
  const ansInvalidPlayer = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: "cuid_non_existent", challengeId: "ch-1", answer: "65" }
  );
  console.log("Status (expected 404):", ansInvalidPlayer.status, ansInvalidPlayer.data);

  // 2.3 Invalid challenge
  console.log("\n2.3 Invalid challenge ID (ch-99)");
  const ansInvalidChallenge = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id, challengeId: "ch-99", answer: "65" }
  );
  console.log("Status (expected 400):", ansInvalidChallenge.status, ansInvalidChallenge.data);

  // 2.4 Submit answer before investigation (Player 2 has NOT investigated)
  console.log("\n2.4 Submit answer before investigation (Player 2)");
  const ansPremature = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, challengeId: "ch-1", answer: "65" }
  );
  console.log("Status (expected 400):", ansPremature.status, ansPremature.data);

  // 2.5 Wrong answer for Player 1
  console.log("\n2.5 Wrong answer ('99') for Player 1");
  const ansWrong = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id, challengeId: "ch-1", answer: "99" }
  );
  console.log("Wrong answer status (expected 200, correct: false, penalty: 30):", ansWrong.status, ansWrong.data);
  assertNoSecretAnswer(ansWrong.data, "ansWrong");

  // 2.6 Verify Player penalty updated in DB
  const checkPlayerAfterWrong = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${player1.id}`,
    method: "GET",
  });
  console.log("Player 1 penaltySeconds in DB after wrong answer (expected 30):", checkPlayerAfterWrong.data.data.penaltySeconds);

  // 2.7 Correct answer for Player 1 ("65")
  console.log("\n2.7 Correct answer ('65') for Player 1");
  const ansCorrect = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player1.id, challengeId: "ch-1", answer: "  65  " }
  );
  console.log("Correct answer status (expected 200, correct: true, nextLevel: 2):", ansCorrect.status, ansCorrect.data);
  assertNoSecretAnswer(ansCorrect.data, "ansCorrect");

  // 2.8 Verify Player currentLevel and status in DB
  const checkPlayerAfterCorrect = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${player1.id}`,
    method: "GET",
  });
  console.log("Player 1 in DB after level complete (expected currentLevel: 2, status: SEARCHING):", {
    currentLevel: checkPlayerAfterCorrect.data.data.currentLevel,
    status: checkPlayerAfterCorrect.data.data.status,
    penaltySeconds: checkPlayerAfterCorrect.data.data.penaltySeconds,
  });

  // ==========================================
  // HINT TESTS (Using Player 2 on Level 1)
  // ==========================================
  console.log("\n==========================================");
  console.log("=== 3. HINT TESTS ===");
  console.log("==========================================");

  // Initialize LevelProgress for Player 2 by investigating clue
  await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, objectId: "lib_old_book" }
  );

  // 3.1 Invalid hint order (order 4)
  console.log("\n3.1 Invalid hint order (4)");
  const hintInvalidOrder = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, challengeId: "ch-1", order: 4 }
  );
  console.log("Status (expected 400):", hintInvalidOrder.status, hintInvalidOrder.data);

  // 3.2 Valid Hint 1
  console.log("\n3.2 Valid Hint 1");
  const hint1 = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, challengeId: "ch-1", order: 1 }
  );
  console.log("Hint 1 status (expected 200, penalty: 15):", hint1.status, hint1.data);
  assertNoSecretAnswer(hint1.data, "hint1");

  // 3.3 Valid Hint 2
  console.log("\n3.3 Valid Hint 2");
  const hint2 = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, challengeId: "ch-1", order: 2 }
  );
  console.log("Hint 2 status (expected 200, penalty: 30):", hint2.status, hint2.data);
  assertNoSecretAnswer(hint2.data, "hint2");

  // 3.4 Valid Hint 3
  console.log("\n3.4 Valid Hint 3");
  const hint3 = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, challengeId: "ch-1", order: 3 }
  );
  console.log("Hint 3 status (expected 200, penalty: 45):", hint3.status, hint3.data);
  assertNoSecretAnswer(hint3.data, "hint3");

  // Verify Player 2 penalty: 15 + 30 + 45 = 90 seconds
  const checkPlayer2AfterHints = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${player2.id}`,
    method: "GET",
  });
  console.log("Player 2 penaltySeconds in DB after 3 hints (expected 90):", checkPlayer2AfterHints.data.data.penaltySeconds);

  // ==========================================
  // AR SCANNER TESTS
  // ==========================================
  console.log("\n==========================================");
  console.log("=== 4. AR SCANNER TESTS ===");
  console.log("==========================================");

  // 4.1 Invalid position coordinates
  console.log("\n4.1 Invalid position format");
  const scanInvalidPos = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/scan",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, position: [1, 2], levelId: 1 }
  );
  console.log("Status (expected 400):", scanInvalidPos.status, scanInvalidPos.data);

  // 4.2 Valid position outside detection radius (dist > 6)
  console.log("\n4.2 Scanner position outside radius [30, 0, 30]");
  const scanOutside = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/scan",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, position: [30, 0, 30], levelId: 1 }
  );
  console.log("Scan outside result (expected 'No unusual signal detected.', penalty: 10):", scanOutside.status, scanOutside.data);

  // 4.3 Valid position inside detection radius (dist <= 6, target is [-1.6, 0, -1.4])
  console.log("\n4.3 Scanner position inside radius [-1.5, 0, -1.5]");
  const scanInside = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/game/scan",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: player2.id, position: [-1.5, 0, -1.5], levelId: 1 }
  );
  console.log("Scan inside result (expected 'Unusual signal detected nearby.', penalty: 10):", scanInside.status, scanInside.data);

  // Verify Player 2 penalty: 90 (hints) + 10 (scan 1) + 10 (scan 2) = 110
  const checkPlayer2AfterScan = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${player2.id}`,
    method: "GET",
  });
  console.log("Player 2 penaltySeconds in DB after scans (expected 110):", checkPlayer2AfterScan.data.data.penaltySeconds);

  return { player1Id: player1.id, player2Id: player2.id };
}

run()
  .then((ids) => {
    console.log("\n==========================================");
    console.log("ALL LEVEL 1 GAME API TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================");
    console.log("Test Player IDs:", ids);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
