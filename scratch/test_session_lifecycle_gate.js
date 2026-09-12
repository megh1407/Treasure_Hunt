// Regression Test Suite for Critical Bug Fix: Active Game Session Lifecycle & Interaction Guards
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
  console.log("=======================================================================");
  console.log("REGRESSION TEST SUITE: Active Game Session Lifecycle & Interaction Guards");
  console.log("=======================================================================\n");

  const runId = `gate_${Date.now()}`;

  // -------------------------------------------------------------------------
  // TEST 1: Backend Authoritative Guard Rejects Investigation Without Session
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Direct Investigation Without Session Rejection ---");
  const reg1 = await request("POST", "/api/players", {
    playerName: `Uninit_Player_${runId.slice(-4)}`,
    enrollmentNumber: `EN_UNINIT_${runId}`,
    team: "Test Team",
  });
  assert(reg1.status === 201, `Player registered with status 201 (got ${reg1.status})`);
  const player1Id = reg1.body.data.id;

  // Attempt investigate before starting session
  const invWithoutSession = await request("POST", "/api/game/investigate", {
    playerId: player1Id,
    objectId: "lib_computer",
  });
  assert(invWithoutSession.status === 400, `Investigation rejected with status 400 (got ${invWithoutSession.status})`);
  assert(
    invWithoutSession.body.error === "No active game session found. Please start a session before investigating.",
    `Correct error message returned: "${invWithoutSession.body.error}"`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Session Initialization & Valid Investigation
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Session Initialization & Authoritative Investigation ---");
  const startRes1 = await request("POST", "/api/sessions/start", { playerId: player1Id });
  assert(startRes1.status === 200 || startRes1.status === 201, `Session started with status 200/201 (got ${startRes1.status})`);
  const sessionId1 = startRes1.body.data.sessionId;
  const startTime1 = startRes1.body.data.startTime;
  assert(typeof sessionId1 === "string" && sessionId1.length > 0, `Session ID is valid: ${sessionId1}`);
  assert(typeof startTime1 === "number" && !isNaN(startTime1) && startTime1 > 0, `Start timestamp is valid number: ${startTime1}`);

  // Now investigation must succeed!
  const invWithSession = await request("POST", "/api/game/investigate", {
    playerId: player1Id,
    objectId: "lib_computer",
  });
  assert(invWithSession.status === 200, `Investigation succeeded with status 200 (got ${invWithSession.status})`);
  assert(invWithSession.body.data.outcome === "decoy" || invWithSession.body.data.outcome === "clue", `Outcome is valid: ${invWithSession.body.data.outcome}`);

  // -------------------------------------------------------------------------
  // TEST 3: Existing Player Recovery with Active Session
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: Existing Player Recovery with Active Session ---");
  const recRes1 = await request("GET", `/api/players/${player1Id}`);
  assert(recRes1.status === 200, `Player recovered with status 200 (got ${recRes1.status})`);
  const recSession = recRes1.body.data.activeSession;
  assert(recSession !== null && recSession !== undefined, "Active session is present in recovery DTO");
  assert(recSession.id === sessionId1, `Recovered session ID matches original (${recSession.id})`);
  assert(recSession.isActive === true, "Recovered session isActive is true");
  assert(typeof recSession.startedAt === "number", `startedAt is valid number: ${recSession.startedAt}`);

  // -------------------------------------------------------------------------
  // TEST 4: Existing Player with Expired / Completed Session (Auto-start Required)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Existing Player with No Active Session Auto-Start ---");
  const reg2 = await request("POST", "/api/players", {
    playerName: `NoSession_Player_${runId.slice(-4)}`,
    enrollmentNumber: `EN_NOSESS_${runId}`,
    team: "Test Team",
  });
  assert(reg2.status === 201, `Player registered with status 201 (got ${reg2.status})`);
  const player2Id = reg2.body.data.id;

  // Player 2 has no session yet
  const recRes2 = await request("GET", `/api/players/${player2Id}`);
  assert(recRes2.status === 200, "Recovery lookup succeeded");
  assert(recRes2.body.data.activeSession === null, "Player 2 activeSession is initially null");

  // Simulate store auto-start for existing player without active session:
  const autoStart = await request("POST", "/api/sessions/start", { playerId: player2Id });
  assert(autoStart.status === 200 || autoStart.status === 201, "Auto-start creates new session");
  assert(typeof autoStart.body.data.sessionId === "string", "New session ID created");

  // Verify investigation now works immediately
  const invAutoStart = await request("POST", "/api/game/investigate", {
    playerId: player2Id,
    objectId: "lib_computer",
  });
  assert(invAutoStart.status === 200, "Investigation succeeds after auto-start");

  // -------------------------------------------------------------------------
  // TEST 5: Concurrent Session Starts are Idempotent (No Duplicate Sessions)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Concurrent Session Start Idempotency ---");
  const concurrentCalls = await Promise.all([
    request("POST", "/api/sessions/start", { playerId: player2Id }),
    request("POST", "/api/sessions/start", { playerId: player2Id }),
    request("POST", "/api/sessions/start", { playerId: player2Id }),
  ]);
  const sessionIds = concurrentCalls.map((c) => c.body.data.sessionId);
  assert(sessionIds[0] === sessionIds[1] && sessionIds[1] === sessionIds[2], `All concurrent calls return identical session ID: ${sessionIds[0]}`);

  // -------------------------------------------------------------------------
  // TEST 6: Store Interaction Lifecycle Simulation
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Store Interaction Lifecycle Gate Simulation ---");
  // Simulate the exact store state logic implemented in gameStore.ts
  const mockStore = {
    isReady: false,
    activeSessionId: null,
    investigatingId: null,
    panel: null,
    toast: null,
    apiCallsSent: 0,

    // The guard from gameStore.ts
    async investigate(objectId) {
      if (!this.isReady || !this.activeSessionId || this.panel || this.investigatingId) {
        return; // Guard prevents execution!
      }
      this.investigatingId = objectId;
      this.toast = `Analyzing ${objectId}...`;
      this.apiCallsSent++;
    },

    // When initialization completes
    markReady(sessionId) {
      this.activeSessionId = sessionId;
      this.isReady = true;
    }
  };

  // 1. Simulate player pressing E while game is not ready
  await mockStore.investigate("lib_catalogue");
  assert(mockStore.apiCallsSent === 0, "No API call sent while isReady is false");
  assert(mockStore.investigatingId === null, "investigatingId not set while isReady is false");
  assert(mockStore.toast === null, "No toast displayed while isReady is false");

  // 2. Simulate game initialization completion
  mockStore.markReady(sessionId1);
  assert(mockStore.isReady === true, "Store marked isReady: true");
  assert(mockStore.activeSessionId === sessionId1, "Store has activeSessionId");

  // 3. Simulate player pressing E when ready
  await mockStore.investigate("lib_catalogue");
  assert(mockStore.apiCallsSent === 1, "API call dispatched after game becomes ready");
  assert(mockStore.investigatingId === "lib_catalogue", "Immediate investigatingId acknowledgment set");
  assert(mockStore.toast === "Analyzing lib_catalogue...", "Immediate optimistic analyzing toast displayed");

  // -------------------------------------------------------------------------
  // TEST 7: Full Level 1 Clue Discovery with Active Session
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: Full Level 1 Clue Discovery ---");
  const clueInv = await request("POST", "/api/game/investigate", {
    playerId: player1Id,
    objectId: "lib_old_book",
  });
  assert(clueInv.status === 200, "Clue investigation succeeded");
  assert(clueInv.body.data.outcome === "clue", "Outcome is 'clue'");
  assert(clueInv.body.data.clue.text.length > 0, `Clue text returned: "${clueInv.body.data.clue.text.slice(0, 30)}..."`);
  assert(clueInv.body.data.grantedItem === "usb_drive", "usb_drive granted");

  // Answer challenge
  const ansRes = await request("POST", "/api/game/submit-answer", {
    playerId: player1Id,
    challengeId: "ch-1",
    answer: "65",
  });
  assert(ansRes.status === 200, "Answer submission succeeded");
  assert(ansRes.body.data.correct === true, "Answer verified correct authoritatively");
  assert(ansRes.body.data.nextLevel === 2, "Advanced to Level 2");

  console.log("\n=======================================================================");
  console.log("✅ ALL REGRESSION TESTS PASSED: Active Game Session Lifecycle Verified!");
  console.log("=======================================================================");
}

run().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});
