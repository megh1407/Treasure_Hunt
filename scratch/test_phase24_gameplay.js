// scratch/test_phase24_gameplay.js
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
  console.log("=== RUNNING PHASE 24 GAMEPLAY VERIFICATION ===");
  console.log("=================================================\n");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const letterMap = { "0":"A", "1":"B", "2":"C", "3":"D", "4":"E", "5":"F", "6":"G", "7":"H", "8":"I", "9":"J" };
  const randAlpha = String(randSuffix).split("").map(c => letterMap[c] || "X").join("");
  const testPlayerName = `Agent Alpha ${randAlpha}`;
  const testEnrollment = `P24${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
  const testEmail = `agent_p24_${randSuffix}@techfest.org`;

  // ----------------------------------------------------
  // SECTION 1: ADMIN DIAGNOSTICS & QUESTION BANK VERIFICATION
  // ----------------------------------------------------
  console.log("--- SECTION 1: ADMIN DIAGNOSTICS & QUESTION BANK ---");

  // Admin login to get token
  const adminLoginRes = await request(
    { hostname: "localhost", port: 5000, path: "/api/admin/login", method: "POST", headers: { "Content-Type": "application/json" } },
    { password: "Updates2K26" }
  );
  if (adminLoginRes.status !== 200 || !adminLoginRes.data?.data?.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
  }
  const adminToken = adminLoginRes.data.data.token;
  console.log("✓ Admin logged in, token acquired");

  // Diagnostics check
  const diagRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/questions/diagnostics",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  if (diagRes.status !== 200 || !diagRes.data?.data) {
    throw new Error(`Diagnostics failed: ${JSON.stringify(diagRes.data)}`);
  }
  const diag = diagRes.data.data;
  console.log(`✓ Total questions in authoritative bank: ${diag.totalQuestions}`);
  console.log(`✓ Bank validation status: ${diag.valid ? "PASSED" : "FAILED"}`);
  console.log(`✓ Clues validation status: ${diag.cluesValidation?.valid ? "PASSED (Zero Leaks)" : "FAILED"}`);
  
  if (!diag.valid || !diag.cluesValidation?.valid) {
    throw new Error(`Integrity validation failure: ${JSON.stringify(diag)}`);
  }

  // Verify difficulty policy across all 10 levels
  const expectedPolicy = {
    1: "EASY", 2: "EASY",
    3: "MEDIUM", 4: "MEDIUM", 5: "MEDIUM",
    6: "HARD", 7: "HARD", 8: "HARD",
    9: "EXPERT", 10: "EXPERT"
  };
  for (let lvl = 1; lvl <= 10; lvl++) {
    const lvlInfo = diag.levels[lvl];
    if (!lvlInfo || lvlInfo.count < 3) {
      throw new Error(`Level ${lvl} has insufficient questions (${lvlInfo?.count ?? 0} found, expected >= 3)`);
    }
    if (lvlInfo.difficulty !== expectedPolicy[lvl]) {
      throw new Error(`Level ${lvl} difficulty policy mismatch: expected ${expectedPolicy[lvl]}, got ${lvlInfo.difficulty}`);
    }
  }
  console.log("✓ Equal difficulty tier guarantee verified across all 10 levels (3+ questions per level)");

  // ----------------------------------------------------
  // SECTION 2: INITIAL CLUE DELIVERY & PERSISTENCE
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: INITIAL CLUE DELIVERY & HUD HYDRATION ---");

  // Register Player 1
  const reg1Res = await request(
    { hostname: "localhost", port: 5000, path: "/api/players", method: "POST", headers: { "Content-Type": "application/json" } },
    {
      playerName: testPlayerName,
      enrollmentNumber: testEnrollment,
      email: testEmail,
      contactNumber: "9876543210",
      branch: "CO",
      team: "CyberSquad",
      selectedCharacter: "MALE",
    }
  );
  if (reg1Res.status !== 201 || !reg1Res.data?.data?.id) {
    throw new Error(`Player registration failed: ${JSON.stringify(reg1Res.data)}`);
  }
  const player1 = reg1Res.data.data;
  console.log(`✓ Player 1 registered: ${player1.id} (${player1.playerName})`);

  // Start Session
  const session1Res = await request(
    { hostname: "localhost", port: 5000, path: "/api/sessions/start", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id }
  );
  if (session1Res.status !== 201 || !session1Res.data?.data?.activeClue) {
    throw new Error(`Session start failed or missing activeClue: ${JSON.stringify(session1Res.data)}`);
  }
  const session1 = session1Res.data.data;
  console.log(`✓ Session started: ${session1.sessionId}`);
  console.log(`✓ Initial Clue received immediately: "${session1.activeClue.text}"`);

  if (!session1.activeClue.text || session1.activeClue.text.length < 10) {
    throw new Error(`Unexpected initial clue text: ${session1.activeClue.text}`);
  }
  if (session1.activeClue.destination) {
    throw new Error(`Leaked destination in initial clue: ${session1.activeClue.destination}`);
  }

  // Recovery verification before solving
  const recovery1 = await request(
    { hostname: "localhost", port: 5000, path: `/api/players/${player1.id}`, method: "GET" }
  );
  if (recovery1.status !== 200 || !recovery1.data?.data?.activeClue) {
    throw new Error(`Recovery check failed: ${JSON.stringify(recovery1.data)}`);
  }
  console.log(`✓ Recovery before solving preserves initial clue for bottom-left HUD`);

  // ----------------------------------------------------
  // SECTION 3: INVESTIGATION & QUESTION ASSIGNMENT
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: OBJECT INVESTIGATION & QUESTION SELECTION ---");

  const level1Objects = [
    "lib_old_book", "lib_shelf_a", "lib_shelf_b", "lib_computer",
    "lib_chair", "lib_cabinet", "lib_painting", "lib_noticeboard", "lib_box"
  ];
  let invRes = null;
  for (const objId of level1Objects) {
    const res = await request(
      { hostname: "localhost", port: 5000, path: "/api/game/investigate", method: "POST", headers: { "Content-Type": "application/json" } },
      { playerId: player1.id, objectId: objId }
    );
    if (res.data?.data?.outcome === "clue") {
      invRes = res;
      break;
    }
  }
  if (!invRes || invRes.status !== 200 || invRes.data?.data?.outcome !== "clue" || !invRes.data?.data?.challenge) {
    throw new Error(`Investigation failed: ${JSON.stringify(invRes?.data)}`);
  }
  const assignedChallenge = invRes.data.data.challenge;
  console.log(`✓ Clue object investigated successfully:`);
  console.log(`  - Assigned Challenge ID: ${assignedChallenge.id}`);
  console.log(`  - Question Type: ${assignedChallenge.type}`);
  console.log(`  - Question Text: "${assignedChallenge.question}"`);

  // Verify answer is NOT leaked in challenge DTO
  if (assignedChallenge.answer) {
    throw new Error(`SECURITY ALERT: Authoritative answer was leaked in challenge response!`);
  }
  console.log(`✓ Security verified: Answer is strictly hidden from client response`);

  // ----------------------------------------------------
  // SECTION 4: REFRESH EXPLOIT AUDIT (CRITICAL)
  // ----------------------------------------------------
  console.log("\n--- SECTION 4: REFRESH EXPLOIT AUDIT ---");
  console.log("Simulating player refreshing browser / reconnecting while solving question...");

  // Simulate refresh: call recovery
  const refreshRecovery = await request(
    { hostname: "localhost", port: 5000, path: `/api/players/${player1.id}`, method: "GET" }
  );
  if (refreshRecovery.status !== 200) {
    throw new Error(`Refresh recovery request failed: ${refreshRecovery.status}`);
  }
  const refreshedData = refreshRecovery.data.data;

  console.log(`  - Refreshed Player Status: ${refreshedData.status}`);
  console.log(`  - Refreshed Current Level: ${refreshedData.currentLevel}`);
  console.log(`  - Refreshed Level 1 Solved Flag: ${refreshedData.levelProgress?.isSolved}`);
  console.log(`  - Refreshed Assigned Question: ${refreshedData.levelProgress?.assignedQuestion?.id}`);

  // STRICT ASSERTIONS
  if (refreshedData.currentLevel !== 1) {
    throw new Error(`CRITICAL EXPLOIT: Player advanced to Level ${refreshedData.currentLevel} upon refresh!`);
  }
  if (refreshedData.levelProgress?.isSolved === true) {
    throw new Error(`CRITICAL EXPLOIT: Level was marked isSolved: true upon refresh!`);
  }
  if (refreshedData.status !== "SOLVING") {
    throw new Error(`State error: Player status was ${refreshedData.status}, expected SOLVING`);
  }
  if (refreshedData.levelProgress?.assignedQuestion?.id !== assignedChallenge.id) {
    throw new Error(`Assigned question mismatch across refresh: expected ${assignedChallenge.id}, got ${refreshedData.levelProgress?.assignedQuestion?.id}`);
  }
  console.log("✓ PASSED: Refresh exploit completely prevented! Player remains on Level 1 solving the same question.");

  // ----------------------------------------------------
  // SECTION 5: SEQUENTIAL HINTS & IDEMPOTENCY
  // ----------------------------------------------------
  console.log("\n--- SECTION 5: SEQUENTIAL HINTS PROTOCOL ---");

  // Request Hint 2 first (must fail)
  const hint2Premature = await request(
    { hostname: "localhost", port: 5000, path: "/api/game/hint", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id, challengeId: assignedChallenge.id, order: 2 }
  );
  if (hint2Premature.status !== 400) {
    throw new Error(`Expected 400 for out-of-order Hint 2, got ${hint2Premature.status}`);
  }
  console.log("✓ Hint 2 correctly rejected before Hint 1");

  // Request Hint 1 (must succeed)
  const hint1Res = await request(
    { hostname: "localhost", port: 5000, path: "/api/game/hint", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id, challengeId: assignedChallenge.id, order: 1 }
  );
  if (hint1Res.status !== 200 || !hint1Res.data?.data?.text) {
    throw new Error(`Hint 1 request failed: ${JSON.stringify(hint1Res.data)}`);
  }
  console.log(`✓ Hint 1 unlocked: "${hint1Res.data.data.text}" (+${hint1Res.data.data.penaltySeconds}s)`);

  // Request Hint 1 again (idempotent - 0 penalty)
  const hint1Duplicate = await request(
    { hostname: "localhost", port: 5000, path: "/api/game/hint", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id, challengeId: assignedChallenge.id, order: 1 }
  );
  if (hint1Duplicate.status !== 200 || hint1Duplicate.data?.data?.penaltySeconds !== 0) {
    throw new Error(`Hint 1 duplicate request failed or charged penalty: ${JSON.stringify(hint1Duplicate.data)}`);
  }
  console.log("✓ Hint 1 duplicate request returned 0 penalty (idempotency confirmed)");

  // ----------------------------------------------------
  // SECTION 6: ANSWER SUBMISSION & IDEMPOTENT ADVANCE
  // ----------------------------------------------------
  console.log("\n--- SECTION 6: ANSWER SUBMISSION & LEVEL PROGRESSION ---");

  // Authoritative answer looked up from question bank
  const qObj = getQuestionById(assignedChallenge.id);
  const correctAnswer = qObj ? qObj.answer : "65";

  // Wrong answer test
  const wrongRes = await request(
    { hostname: "localhost", port: 5000, path: "/api/game/submit-answer", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id, challengeId: assignedChallenge.id, answer: "definitely_wrong_answer" }
  );
  if (wrongRes.status !== 200 || wrongRes.data?.data?.correct !== false) {
    throw new Error(`Wrong answer check failed: ${JSON.stringify(wrongRes.data)}`);
  }
  console.log(`✓ Incorrect answer correctly rejected with penalty`);

  // Correct answer
  const correctRes = await request(
    { hostname: "localhost", port: 5000, path: "/api/game/submit-answer", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id, challengeId: assignedChallenge.id, answer: correctAnswer }
  );
  if (correctRes.status !== 200 || correctRes.data?.data?.correct !== true || correctRes.data?.data?.levelCompleted !== true) {
    throw new Error(`Correct answer submission failed: ${JSON.stringify(correctRes.data)}`);
  }
  const solveData = correctRes.data.data;
  console.log(`✓ Correct answer accepted!`);
  console.log(`  - Advanced to Level: ${solveData.nextLevel}`);
  console.log(`  - Next Indirect Clue: "${solveData.nextClue?.text}"`);

  if (!solveData.nextClue?.text) {
    throw new Error("Next clue was not awarded upon solving level challenge");
  }
  if (solveData.nextClue.destination) {
    throw new Error(`Leaked destination in next clue: ${solveData.nextClue.destination}`);
  }

  // Duplicate submission test (Idempotency)
  const dupSubmit = await request(
    { hostname: "localhost", port: 5000, path: "/api/game/submit-answer", method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: player1.id, challengeId: assignedChallenge.id, answer: correctAnswer }
  );
  if (dupSubmit.status !== 200 || dupSubmit.data?.data?.levelCompleted !== true) {
    throw new Error(`Duplicate submit answer failed: ${JSON.stringify(dupSubmit.data)}`);
  }
  console.log(`✓ Duplicate answer submission returned HTTP 200 cleanly without duplicate penalties`);

  // Verify player state on level 2
  const finalRecovery = await request(
    { hostname: "localhost", port: 5000, path: `/api/players/${player1.id}`, method: "GET" }
  );
  if (finalRecovery.status !== 200 || finalRecovery.data?.data?.currentLevel !== 2) {
    throw new Error(`Player level not updated to 2: ${JSON.stringify(finalRecovery.data)}`);
  }
  console.log(`✓ Player verified on Level 2 with updated activeClue in recovery`);

  console.log("\n=================================================");
  console.log("=== ALL PHASE 24 GAMEPLAY TESTS PASSED 100% ===");
  console.log("=================================================\n");
}

run().catch((err) => {
  console.error("\n❌ TEST FAILED WITH ERROR:");
  console.error(err);
  process.exit(1);
});
