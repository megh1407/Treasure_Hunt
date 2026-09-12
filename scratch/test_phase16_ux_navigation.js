// Phase 16 Verification Suite: UX, Navigation, Room Access & Spawn Coordinates
const http = require("http");

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://localhost:5000");
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (payload) {
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function run() {
  console.log("===============================================================");
  console.log("PHASE 16 TEST SUITE: UX, Navigation & Architecture Verification");
  console.log("===============================================================\n");

  const runId = `p16_${Date.now()}`;

  // 1. Verify Player Registration & Session Start
  console.log("--- TEST 1: Register Player & Start Active Session ---");
  const regRes = await request("POST", "/api/players", {
    playerName: `Agent_${runId}`,
    enrollmentNumber: `USN_${runId}`,
    team: "ALPHA_TEAM",
    email: `${runId}@test.local`,
    selectedCharacter: "MALE",
  });
  assert(regRes.status === 201, `Player registered with status 201 (got ${regRes.status})`);
  const playerId = regRes.body.data.id;

  const startRes = await request("POST", "/api/sessions/start", { playerId });
  assert(startRes.status === 201, `Game session started with status 201 (got ${startRes.status})`);
  const sessionId = startRes.body.data.sessionId;
  assert(sessionId, "Received valid sessionId");

  // 2. Verify Hint Retrieval During Searching Phase
  console.log("\n--- TEST 2: Hint Accessible During Searching / Solving Phase ---");
  const hintRes = await request("POST", "/api/game/hint", {
    playerId,
    challengeId: "ch-1",
    order: 1,
  });
  assert(hintRes.status === 200, `Hint 1 requested succeeded (status ${hintRes.status})`);
  assert(hintRes.body.data.penaltySeconds === 15, `Hint added penalty: +${hintRes.body.data.penaltySeconds}s`);
  assert(hintRes.body.data.text && hintRes.body.data.text.length > 0, "Received revealed hint text");
  console.log(`Hint 1 text: "${hintRes.body.data.text}"`);

  // Idempotent hint re-request
  const hintReRes = await request("POST", "/api/game/hint", {
    playerId,
    challengeId: "ch-1",
    order: 1,
  });
  assert(hintReRes.status === 200, "Re-requesting same hint succeeds");
  assert(hintReRes.body.data.penaltySeconds === 0, "Re-requesting already unlocked hint charges 0 penalty");

  // 3. Verify Investigation and Clue Discovery
  console.log("\n--- TEST 3: Investigation Flow ---");
  const invRes = await request("POST", "/api/game/investigate", {
    playerId,
    objectId: "lib_old_book",
  });
  assert(invRes.status === 200, `Investigate target object succeeded (status ${invRes.status})`);
  assert(invRes.body.data.outcome === "clue", "Clue discovered on target object");
  assert(invRes.body.data.grantedItem === "usb_drive", "Granted item usb_drive");

  // 4. Verify Session Persistence when Exiting to Main Menu (Safe Exit Simulation)
  console.log("\n--- TEST 4: Safe Exit to Menu & Recovery Verification ---");
  const recoveryRes = await request("GET", `/api/players/${playerId}`);
  assert(recoveryRes.status === 200, "Player recovery succeeds after safe exit to menu");
  assert(recoveryRes.body.data.currentLevel === 1, "Player remains at Level 1");
  assert(recoveryRes.body.data.levelProgress.usedHints.includes(1), "Revealed hint order 1 is persisted");
  assert(recoveryRes.body.data.levelProgress.collectedItems.includes("usb_drive"), "USB drive item is persisted");
  assert(recoveryRes.body.data.activeSession !== null, "Active session is preserved and intact");

  // 5. Verify Level 1 Completion and Clean Next-Level Initialization
  console.log("\n--- TEST 5: Complete Level 1 & Prepare Level 2 Destination ---");
  const answerRes = await request("POST", "/api/game/submit-answer", {
    playerId,
    challengeId: "ch-1",
    answer: "65",
  });
  assert(answerRes.status === 200 && answerRes.body.data.correct === true, "Level 1 answered correctly");
  assert(answerRes.body.data.nextLevel === 2, "Progressed to Level 2");

  const lvl2Recovery = await request("GET", `/api/players/${playerId}`);
  assert(lvl2Recovery.body.data.currentLevel === 2, "Recovery confirms player is now at Level 2");
  assert(lvl2Recovery.body.data.inventory.includes("usb_drive"), "USB drive persists across level boundary");

  // Verify Level 2 Robotics Lab Investigation
  const robDecoyRes = await request("POST", "/api/game/investigate", {
    playerId,
    objectId: "robot_workbench",
  });
  assert(robDecoyRes.status === 200, "Investigate decoy workbench in Robotics Lab returns 200");
  assert(robDecoyRes.body.data.outcome === "decoy", "Workbench is verified as a decoy");

  const robTargetRes = await request("POST", "/api/game/investigate", {
    playerId,
    objectId: "robot_toolbox",
  });
  assert(robTargetRes.status === 200, "Investigate robot_toolbox in Robotics Lab returns 200");
  assert(robTargetRes.body.data.outcome === "clue", "Target toolbox discovered clue for Level 2");

  console.log("\n===============================================================");
  console.log("🎉 ALL PHASE 16 UX, PERSISTENCE & NAVIGATION TESTS PASSED!");
  console.log("===============================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
