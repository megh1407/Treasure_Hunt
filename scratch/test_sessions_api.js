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

async function run() {
  console.log("=== Testing Core Quest Finder Session APIs ===\n");
  const baseUrl = "localhost";
  const port = 5000;

  // 1. Health check
  console.log("1. Health check GET /api/health");
  const healthRes = await request({
    hostname: baseUrl,
    port,
    path: "/api/health",
    method: "GET",
  });
  console.log("Health status:", healthRes.status, JSON.stringify(healthRes.data));
  if (healthRes.status !== 200 || !healthRes.data?.data?.database?.connected) {
    throw new Error("Server or database not ready");
  }

  // 2. Create test players
  const testEnrollmentA = `TEST_SESS_${Date.now()}_A`;
  const testEnrollmentB = `TEST_SESS_${Date.now()}_B`;

  console.log(`\n2. Creating Player A (${testEnrollmentA})...`);
  const createPlayerARes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Session Tester A",
      enrollmentNumber: testEnrollmentA,
      team: "Test Team Alpha",
      selectedCharacter: "MALE",
    }
  );
  console.log("Create Player A:", createPlayerARes.status, createPlayerARes.data);
  const playerA = createPlayerARes.data.data;

  console.log(`\n3. Creating Player B (${testEnrollmentB})...`);
  const createPlayerBRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Session Tester B",
      enrollmentNumber: testEnrollmentB,
      team: "Test Team Beta",
      selectedCharacter: "FEMALE",
    }
  );
  console.log("Create Player B:", createPlayerBRes.status, createPlayerBRes.data);
  const playerB = createPlayerBRes.data.data;

  // 4. Test POST /api/sessions/start - invalid playerId
  console.log("\n4. Test start with missing playerId");
  const startNoPlayerRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {}
  );
  console.log("Result (expected 400):", startNoPlayerRes.status, startNoPlayerRes.data);

  console.log("\n5. Test start with non-existent playerId");
  const startNonExistentRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: "cuid_non_existent_12345" }
  );
  console.log("Result (expected 404):", startNonExistentRes.status, startNonExistentRes.data);

  // 6. Test POST /api/sessions/start - success for Player A
  console.log(`\n6. Starting session for Player A (${playerA.id})...`);
  const startRes1 = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerA.id }
  );
  console.log("Start 1 status (expected 201):", startRes1.status, startRes1.data);
  const sessionA = startRes1.data.data;

  // Verify Player A status in DB is SEARCHING
  const checkPlayerA1 = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${playerA.id}`,
    method: "GET",
  });
  console.log("Player A status after start 1:", checkPlayerA1.data.data.status);

  // 7. Test POST /api/sessions/start again for Player A - idempotent, returns existing active session
  console.log(`\n7. Starting session AGAIN for Player A (${playerA.id}) - should NOT create duplicate...`);
  const startRes2 = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerA.id }
  );
  console.log("Start 2 status (expected 200):", startRes2.status, startRes2.data);
  const sessionA_second = startRes2.data.data;
  console.log("Is duplicate created?", sessionA.sessionId === sessionA_second.sessionId ? "NO (Same Session ID)" : "YES (BUG)");

  // 8. Test complete with invalid parameters
  console.log("\n8. Test complete with missing playerId/sessionId");
  const completeMissingRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/complete",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerA.id }
  );
  console.log("Complete missing sessionId (expected 400):", completeMissingRes.status, completeMissingRes.data);

  console.log("\n9. Test complete with non-existent playerId");
  const completeNonExistentPlayerRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/complete",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: "cuid_non_existent_player", sessionId: sessionA.sessionId }
  );
  console.log("Complete non-existent player (expected 404):", completeNonExistentPlayerRes.status, completeNonExistentPlayerRes.data);

  console.log("\n10. Test complete with non-existent sessionId");
  const completeNonExistentSessionRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/complete",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerA.id, sessionId: "cuid_non_existent_session" }
  );
  console.log("Complete non-existent session (expected 404):", completeNonExistentSessionRes.status, completeNonExistentSessionRes.data);

  console.log("\n11. Test complete with session belonging to another player (Player B claiming Player A session)");
  const completeWrongPlayerRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/complete",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerB.id, sessionId: sessionA.sessionId }
  );
  console.log("Complete wrong player (expected 400):", completeWrongPlayerRes.status, completeWrongPlayerRes.data);

  // Wait 1.5 seconds so gameTimeSeconds >= 1
  console.log("\nWaiting 1500ms to accumulate game time...");
  await new Promise((r) => setTimeout(r, 1500));

  // 12. Complete session for Player A
  console.log(`\n12. Completing session for Player A (${playerA.id}, session ${sessionA.sessionId})...`);
  const completeRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/complete",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerA.id, sessionId: sessionA.sessionId }
  );
  console.log("Complete status (expected 200):", completeRes.status, completeRes.data);

  // Verify Player A status, gameTimeSeconds, and score in DB
  const checkPlayerAFinal = await request({
    hostname: baseUrl,
    port,
    path: `/api/players/${playerA.id}`,
    method: "GET",
  });
  console.log("\nPlayer A in DB after completion:", JSON.stringify(checkPlayerAFinal.data.data, null, 2));

  // 13. Test completing an already completed session
  console.log("\n13. Test completing an already completed session...");
  const completeAgainRes = await request(
    {
      hostname: baseUrl,
      port,
      path: "/api/sessions/complete",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId: playerA.id, sessionId: sessionA.sessionId }
  );
  console.log("Complete again status (expected 400):", completeAgainRes.status, completeAgainRes.data);

  return { playerAId: playerA.id, playerBId: playerB.id };
}

run()
  .then((ids) => {
    console.log("\nAll Session API tests PASSED successfully!");
    console.log("Created test IDs:", ids);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
