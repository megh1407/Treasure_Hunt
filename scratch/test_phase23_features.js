// scratch/test_phase23_features.js
const http = require("http");
const { getQuestionById } = require("../backend/dist/config/questionBank");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
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
  console.log("=================================================");
  console.log("=== RUNNING PHASE 23 AUTOMATED TEST SUITE ===");
  console.log("=================================================\n");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const letterMap = { "0":"A", "1":"B", "2":"C", "3":"D", "4":"E", "5":"F", "6":"G", "7":"H", "8":"I", "9":"J" };
  const randAlpha = String(randSuffix).split("").map(c => letterMap[c] || "X").join("");
  const testPlayerName = `Agent Phase Two Three ${randAlpha}`;
  const testEnrollment = `P23${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
  const testEmail = `agent_${randSuffix}@techfest.org`;

  // ----------------------------------------------------
  // SECTION 1: ADMIN AUTH & SEARCH ENDPOINT
  // ----------------------------------------------------
  console.log("--- SECTION 1: ADMIN SEARCH VERIFICATION ---");

  // 1.1 Unauthenticated search attempt
  console.log("\n[1.1] GET /api/admin/search without token...");
  const unauthSearch = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/search?q=test",
    method: "GET",
  });
  console.log("Status:", unauthSearch.status);
  if (unauthSearch.status !== 401) {
    throw new Error(`[1.1 Failed] Expected 401 for unauthenticated search, got ${unauthSearch.status}`);
  }
  console.log("✓ [1.1 Passed] Unauthenticated search correctly rejected with 401");

  // 1.2 Admin login
  console.log("\n[1.2] Logging into admin to obtain token...");
  const loginRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { password: "Updates2K26" }
  );
  const adminToken = loginRes.data?.data?.token || loginRes.data?.token;
  if (loginRes.status !== 200 || !adminToken) {
    throw new Error(`[1.2 Failed] Admin login failed: ${JSON.stringify(loginRes.data)}`);
  }
  console.log("✓ [1.2 Passed] Admin authenticated successfully");

  // 1.3 Register a dedicated player for search testing
  console.log("\n[1.3] Registering unique test player...");
  const regRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: testPlayerName,
      enrollmentNumber: testEnrollment,
      email: testEmail,
      contactNumber: `987650${randSuffix}`,
      branch: "IT",
      team: "IT",
    }
  );
  if (regRes.status !== 201) {
    throw new Error(`[1.3 Failed] Player registration failed: ${JSON.stringify(regRes.data)}`);
  }
  const playerId = regRes.data.data.id;
  console.log(`✓ [1.3 Passed] Created player ID: ${playerId} (${testPlayerName}, ${testEnrollment})`);

  // Start session for player
  await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId }
  );

  // 1.4 Search by exact name
  console.log("\n[1.4] Search by exact player name...");
  const exactNameSearch = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/admin/search?q=${encodeURIComponent(testPlayerName)}`,
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log("Status:", exactNameSearch.status, "Found:", exactNameSearch.data?.data?.length);
  if (exactNameSearch.status !== 200 || !exactNameSearch.data?.data?.some(p => p.playerId === playerId)) {
    throw new Error(`[1.4 Failed] Expected to find player by exact name`);
  }
  console.log("✓ [1.4 Passed] Found player by exact name");

  // 1.5 Search by partial name (case-insensitive)
  console.log("\n[1.5] Search by lowercase partial name...");
  const partialSearch = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/admin/search?q=${encodeURIComponent(testPlayerName.toLowerCase().slice(0, 8))}`,
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (partialSearch.status !== 200 || !partialSearch.data?.data?.some(p => p.playerId === playerId)) {
    throw new Error(`[1.5 Failed] Case-insensitive partial name search failed`);
  }
  console.log("✓ [1.5 Passed] Found player by case-insensitive partial name");

  // 1.6 Search by enrollment number
  console.log("\n[1.6] Search by enrollment number...");
  const enrollSearch = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/admin/search?q=${encodeURIComponent(testEnrollment)}`,
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (enrollSearch.status !== 200 || !enrollSearch.data?.data?.some(p => p.playerId === playerId)) {
    throw new Error(`[1.6 Failed] Enrollment search failed`);
  }
  console.log("✓ [1.6 Passed] Found player by enrollment number");

  // 1.7 Empty query returns empty array
  console.log("\n[1.7] Empty query test...");
  const emptySearch = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/search?q=",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (emptySearch.status !== 200 || !Array.isArray(emptySearch.data?.data) || emptySearch.data.data.length !== 0) {
    throw new Error(`[1.7 Failed] Expected empty array for empty query, got ${JSON.stringify(emptySearch.data)}`);
  }
  console.log("✓ [1.7 Passed] Empty query safely returned empty array");

  // 1.8 Special characters and length limit
  console.log("\n[1.8] Special characters and long query test...");
  const specialSearch = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/search?q=%25%27%22_test",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (specialSearch.status !== 200 || !Array.isArray(specialSearch.data?.data)) {
    throw new Error(`[1.8 Failed] Special characters query failed with status ${specialSearch.status}`);
  }
  console.log("✓ [1.8 Passed] Special characters handled safely without SQL/database errors");

  // ----------------------------------------------------
  // SECTION 2: SEQUENTIAL HINTS & CONCURRENCY
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: SEQUENTIAL HINTS & IDEMPOTENCY ---");

  // Player investigates level 1 assigned target object to open challenge
  console.log("\n[2.1] Investigating Level 1 assigned target object...");
  const level1Objects = [
    "lib_old_book", "lib_shelf_a", "lib_shelf_b", "lib_computer",
    "lib_chair", "lib_cabinet", "lib_painting", "lib_noticeboard", "lib_box"
  ];
  let invTarget = null;
  for (const objId of level1Objects) {
    const res = await request(
      {
        hostname: "localhost",
        port: 5000,
        path: "/api/game/investigate",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { playerId, objectId: objId }
    );
    if (res.data?.data?.outcome === "clue") {
      invTarget = res;
      break;
    }
  }
  if (!invTarget || invTarget.status !== 200 || invTarget.data.data?.outcome !== "clue") {
    throw new Error(`[2.1 Failed] Target investigation failed: ${JSON.stringify(invTarget?.data)}`);
  }
  const ch1Id = invTarget.data.data.challenge.id;
  console.log(`✓ [2.1 Passed] Challenge unlocked: ${ch1Id}`);

  // 2.2 Attempt Hint 2 BEFORE Hint 1 -> MUST BE REJECTED (HTTP 400)
  console.log("\n[2.2] Requesting Hint 2 before Hint 1...");
  const hint2Before1 = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 2 }
  );
  console.log("Status:", hint2Before1.status, "Error:", hint2Before1.data?.error);
  if (hint2Before1.status !== 400 || !hint2Before1.data?.error?.includes("Hint 1 must be unlocked")) {
    throw new Error(`[2.2 Failed] Expected 400 with prerequisite message, got ${hint2Before1.status}`);
  }
  console.log("✓ [2.2 Passed] Hint 2 before Hint 1 strictly rejected with 400");

  // 2.3 Attempt Hint 3 BEFORE Hint 1 -> MUST BE REJECTED (HTTP 400)
  console.log("\n[2.3] Requesting Hint 3 before Hint 1...");
  const hint3Before1 = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 3 }
  );
  console.log("Status:", hint3Before1.status, "Error:", hint3Before1.data?.error);
  if (hint3Before1.status !== 400) {
    throw new Error(`[2.3 Failed] Expected 400 for Hint 3 before Hint 1, got ${hint3Before1.status}`);
  }
  console.log("✓ [2.3 Passed] Hint 3 before Hint 1 strictly rejected with 400");

  // 2.4 Request Hint 1 -> SUCCEEDS (+15s penalty)
  console.log("\n[2.4] Requesting Hint 1 legitimately...");
  const hint1Res = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 1 }
  );
  console.log("Status:", hint1Res.status, "Penalty:", hint1Res.data?.data?.penaltySeconds);
  if (hint1Res.status !== 200 || hint1Res.data?.data?.penaltySeconds !== 15) {
    throw new Error(`[2.4 Failed] Expected 200 with 15s penalty, got ${JSON.stringify(hint1Res.data)}`);
  }
  console.log("✓ [2.4 Passed] Hint 1 unlocked with +15s penalty");

  // 2.5 Request Hint 3 BEFORE Hint 2 -> MUST BE REJECTED (HTTP 400)
  console.log("\n[2.5] Requesting Hint 3 before Hint 2 (after Hint 1)...");
  const hint3Before2 = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 3 }
  );
  console.log("Status:", hint3Before2.status, "Error:", hint3Before2.data?.error);
  if (hint3Before2.status !== 400 || !hint3Before2.data?.error?.includes("Hint 2 must be unlocked")) {
    throw new Error(`[2.5 Failed] Expected 400 with prerequisite message, got ${hint3Before2.status}`);
  }
  console.log("✓ [2.5 Passed] Hint 3 before Hint 2 strictly rejected with 400");

  // 2.6 IDEMPOTENCY CHECK: Request Hint 1 AGAIN -> SUCCEEDS (+0s additional penalty)
  console.log("\n[2.6] Re-requesting already unlocked Hint 1 (Idempotency test)...");
  const hint1Replay = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 1 }
  );
  console.log("Status:", hint1Replay.status, "Penalty:", hint1Replay.data?.data?.penaltySeconds);
  if (hint1Replay.status !== 200 || hint1Replay.data?.data?.penaltySeconds !== 0) {
    throw new Error(`[2.6 Failed] Expected 200 with 0s penalty on replay, got ${JSON.stringify(hint1Replay.data)}`);
  }
  console.log("✓ [2.6 Passed] Hint 1 replay is idempotent with 0s additional penalty");

  // 2.7 Request Hint 2 -> SUCCEEDS (+30s penalty)
  console.log("\n[2.7] Requesting Hint 2 legitimately...");
  const hint2Res = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 2 }
  );
  console.log("Status:", hint2Res.status, "Penalty:", hint2Res.data?.data?.penaltySeconds);
  if (hint2Res.status !== 200 || hint2Res.data?.data?.penaltySeconds !== 30) {
    throw new Error(`[2.7 Failed] Expected 200 with 30s penalty, got ${JSON.stringify(hint2Res.data)}`);
  }
  console.log("✓ [2.7 Passed] Hint 2 unlocked with +30s penalty");

  // 2.8 Request Hint 3 -> SUCCEEDS (+45s penalty)
  console.log("\n[2.8] Requesting Hint 3 legitimately...");
  const hint3Res = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/hint",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, order: 3 }
  );
  console.log("Status:", hint3Res.status, "Penalty:", hint3Res.data?.data?.penaltySeconds);
  if (hint3Res.status !== 200 || hint3Res.data?.data?.penaltySeconds !== 45) {
    throw new Error(`[2.8 Failed] Expected 200 with 45s penalty, got ${JSON.stringify(hint3Res.data)}`);
  }
  console.log("✓ [2.8 Passed] Hint 3 unlocked with +45s penalty");

  // 2.9 Concurrent race condition test
  console.log("\n[2.9] Testing concurrency: simultaneous Hint 2 requests on fresh player...");
  const randSuffix2 = Math.floor(1000 + Math.random() * 9000);
  const randAlpha2 = String(randSuffix2).split("").map(c => letterMap[c] || "X").join("");
  console.log("Registering player 2 for race test...");
  const p2Reg = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: `Concurrent Agent ${randAlpha2}`,
      enrollmentNumber: `RAC${Date.now().toString().slice(-4)}${randSuffix2}`.slice(0, 11),
      email: `rac_${randSuffix2}@campus.edu`,
      contactNumber: `987650${randSuffix2}`,
      branch: "CO",
      team: "CO",
    }
  );
  const p2Id = p2Reg.data.data.id;
  console.log(`Player 2 registered: ${p2Id}. Starting session...`);
  await request({ hostname: "localhost", port: 5000, path: "/api/sessions/start", method: "POST", headers: { "Content-Type": "application/json" } }, { playerId: p2Id });
  console.log("Session started. Investigating object to unlock challenge...");
  let p2ChallengeId = "ch-1";
  for (const objId of level1Objects) {
    const res = await request({ hostname: "localhost", port: 5000, path: "/api/game/investigate", method: "POST", headers: { "Content-Type": "application/json" } }, { playerId: p2Id, objectId: objId });
    if (res.data?.data?.outcome === "clue") {
      p2ChallengeId = res.data.data.challenge.id;
      break;
    }
  }
  console.log(`Firing 2 simultaneous Hint 2 requests for challenge ${p2ChallengeId}...`);

  const [race1, race2] = await Promise.all([
    request({ hostname: "localhost", port: 5000, path: "/api/game/hint", method: "POST", headers: { "Content-Type": "application/json" } }, { playerId: p2Id, challengeId: p2ChallengeId, order: 2 }),
    request({ hostname: "localhost", port: 5000, path: "/api/game/hint", method: "POST", headers: { "Content-Type": "application/json" } }, { playerId: p2Id, challengeId: p2ChallengeId, order: 2 }),
  ]);
  console.log(`Race results: request 1 = ${race1.status}, request 2 = ${race2.status}`);
  if (race1.status !== 400 || race2.status !== 400) {
    throw new Error(`[2.9 Failed] Both concurrent Hint 2 requests before Hint 1 must be rejected with 400`);
  }
  console.log("✓ [2.9 Passed] Concurrent requests cannot bypass sequential hint order");

  // ----------------------------------------------------
  // SECTION 3: DESTINATION PRIVACY VERIFICATION
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: DESTINATION PRIVACY VERIFICATION ---");

  // 3.1 Solve Level 1 challenge and inspect nextClue response
  const qObj = getQuestionById(ch1Id);
  const l1Ans = qObj ? qObj.answer : "65";
  console.log(`\n[3.1] Submitting correct answer for Level 1 (${ch1Id} -> '${l1Ans}')...`);
  const solveRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: ch1Id, answer: l1Ans }
  );
  console.log("Status:", solveRes.status, "Level completed:", solveRes.data?.data?.levelCompleted);
  if (solveRes.status !== 200 || !solveRes.data?.data?.levelCompleted) {
    throw new Error(`[3.1 Failed] Solve Level 1 failed: ${JSON.stringify(solveRes.data)}`);
  }

  const nextClue = solveRes.data.data.nextClue;
  console.log("Next Clue payload:", JSON.stringify(nextClue));

  if (!nextClue || !nextClue.text) {
    throw new Error(`[3.1 Failed] nextClue text must be present`);
  }
  if (nextClue.destination !== undefined) {
    throw new Error(`[3.1 Failed] CRITICAL LEAK: nextClue.destination is present ('${nextClue.destination}')! It must be omitted.`);
  }
  console.log("✓ [3.1 Passed] nextClue text is present AND destination is completely omitted!");

  // 3.2 Inspect getPlayer recovery response for destination leaks
  console.log("\n[3.2] Checking getPlayer recovery endpoint for destination leaks...");
  const recoveryRes = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/players/${playerId}`,
    method: "GET",
  });
  const recoveryString = JSON.stringify(recoveryRes.data);
  if (recoveryString.includes('"destination"')) {
    throw new Error(`[3.2 Failed] Destination field detected in recovery response: ${recoveryString}`);
  }
  console.log("✓ [3.2 Passed] Player recovery payload contains no destination leaks");

  // ----------------------------------------------------
  // SECTION 4: CROSS-LEVEL OBJECT INVESTIGATION
  // ----------------------------------------------------
  console.log("\n--- SECTION 4: CROSS-LEVEL OBJECT INVESTIGATION ---");

  // Player is now on Level 2!
  // Investigating a Level 1 object (lib_old_book) while on Level 2
  console.log("\n[4.1] Level 2 player investigates Level 1 object (lib_old_book)...");
  const crossLevelRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, objectId: "lib_old_book" }
  );
  console.log("Status:", crossLevelRes.status, "Outcome:", crossLevelRes.data?.data?.outcome);
  console.log("Message:", crossLevelRes.data?.data?.message);

  if (crossLevelRes.status !== 200) {
    throw new Error(`[4.1 Failed] Expected HTTP 200 for cross-level object, got ${crossLevelRes.status}`);
  }
  if (crossLevelRes.data?.data?.outcome !== "cross_level") {
    throw new Error(`[4.1 Failed] Expected outcome 'cross_level', got '${crossLevelRes.data?.data?.outcome}'`);
  }

  // Ensure no internal details leaked
  const crossString = JSON.stringify(crossLevelRes.data);
  if (crossString.includes("lib_old_book") || crossString.includes("does not belong")) {
    throw new Error(`[4.1 Failed] Internal object ID or developer error leaked: ${crossString}`);
  }
  console.log("✓ [4.1 Passed] Cross-level object returns 200 with sanitized immersive message");

  // 4.2 Database state mutation check: LevelProgress investigatedObjects must NOT contain lib_old_book
  console.log("\n[4.2] Verifying database state: Level 2 progress was NOT mutated by cross-level investigation...");
  const playerCheck = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/players/${playerId}`,
    method: "GET",
  });
  const lvl2Investigated = playerCheck.data?.data?.levelProgress?.investigatedObjects || [];
  console.log("Level 2 investigated objects:", lvl2Investigated);
  if (lvl2Investigated.includes("lib_old_book")) {
    throw new Error(`[4.2 Failed] lib_old_book was incorrectly recorded in investigatedObjects for Level 2!`);
  }
  console.log("✓ [4.2 Passed] Zero state mutation in database for cross-level investigation");

  // 4.3 Future level object investigation (e.g. cafe_corner_table from Level 5)
  console.log("\n[4.3] Level 2 player investigates future level object (cafe_corner_table from Level 5)...");
  const futureObjectRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, objectId: "cafe_corner_table" }
  );
  if (futureObjectRes.status !== 200 || futureObjectRes.data?.data?.outcome !== "cross_level") {
    throw new Error(`[4.3 Failed] Future-level object did not return 200 cross_level: ${JSON.stringify(futureObjectRes.data)}`);
  }
  console.log("✓ [4.3 Passed] Future level object safely returns 200 cross_level with immersive message");

  console.log("\n=================================================");
  console.log("=== ALL PHASE 23 AUTOMATED TESTS PASSED! ===");
  console.log("=================================================");
}

run().catch((err) => {
  console.error("\n❌ PHASE 23 TEST FAILED:", err);
  process.exit(1);
});
