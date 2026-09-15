const http = require("http");

function httpRequest(urlStr, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on("error", reject);
    if (bodyData) {
      req.write(typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

// Emulate frontend normalizeApiUrl logic
function normalizeApiUrl(raw) {
  if (!raw || typeof raw !== "string" || raw.trim().length === 0) {
    return "http://localhost:5000/api";
  }
  let trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed.endsWith("/api")) {
    trimmed = `${trimmed}/api`;
  }
  return trimmed;
}

async function runVerification() {
  console.log("=================================================================");
  console.log("STEP 5: VERIFYING REGISTRATION & SESSION INITIALIZATION FLOW");
  console.log("=================================================================\n");

  // 1. Verify that POST /players without /api returns 404 (Endpoint not found)
  console.log("TEST 1: Calling POST /players (without /api prefix)...");
  const rawPostRes = await httpRequest("http://localhost:5000/players", { method: "POST" }, {});
  console.log(`  Status: ${rawPostRes.status}`);
  console.log(`  Body error: ${rawPostRes.body?.error}`);
  if (rawPostRes.status !== 404 || !rawPostRes.body?.error?.includes("Endpoint not found: POST /players")) {
    throw new Error("TEST 1 FAILED: Expected 404 Endpoint not found: POST /players");
  }
  console.log("  => TEST 1 PASSED: Unprefixed route correctly returns 404 as expected.\n");

  // 2. Verify URL normalization helper for all possible env var shapes
  console.log("TEST 2: Verifying normalizeApiUrl helper for all input shapes...");
  const cases = [
    { in: "https://core-quest-finder-backend.onrender.com", expected: "https://core-quest-finder-backend.onrender.com/api" },
    { in: "https://core-quest-finder-backend.onrender.com/", expected: "https://core-quest-finder-backend.onrender.com/api" },
    { in: "https://core-quest-finder-backend.onrender.com/api", expected: "https://core-quest-finder-backend.onrender.com/api" },
    { in: "https://core-quest-finder-backend.onrender.com/api/", expected: "https://core-quest-finder-backend.onrender.com/api" },
    { in: "http://localhost:5000", expected: "http://localhost:5000/api" },
    { in: "http://localhost:5000/api", expected: "http://localhost:5000/api" },
    { in: "", expected: "http://localhost:5000/api" },
    { in: undefined, expected: "http://localhost:5000/api" },
  ];
  for (const c of cases) {
    const result = normalizeApiUrl(c.in);
    if (result !== c.expected) {
      throw new Error(`TEST 2 FAILED: normalizeApiUrl(${c.in}) returned ${result}, expected ${c.expected}`);
    }
  }
  console.log("  => TEST 2 PASSED: normalizeApiUrl correctly guarantees /api for all variants.\n");

  // 3. Create a unique player via POST /api/players
  console.log("TEST 3: Registering a player via normalized URL (POST /api/players)...");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const uniqueEnrollment = `EN${Date.now().toString().slice(-5)}${rand}`.slice(0, 11);
  const playerPayload = {
    playerName: "Kavya Desai",
    enrollmentNumber: uniqueEnrollment,
    email: `kavya_${Date.now()}@example.com`,
    contactNumber: "9876543210",
    branch: "CO",
    team: "CO",
  };

  const regRes = await httpRequest("http://localhost:5000/api/players", { method: "POST" }, playerPayload);
  console.log(`  Status: ${regRes.status}`);
  console.log(`  Player ID: ${regRes.body?.data?.id}`);
  console.log(`  Player Name: ${regRes.body?.data?.playerName}`);
  console.log(`  Enrollment: ${regRes.body?.data?.enrollmentNumber}`);
  console.log(`  Status: ${regRes.body?.data?.status}`);
  console.log(`  Level: ${regRes.body?.data?.currentLevel}`);

  if (regRes.status !== 201 || !regRes.body?.data?.id) {
    throw new Error(`TEST 3 FAILED: Player registration failed with status ${regRes.status}`);
  }
  const createdPlayer = regRes.body.data;
  console.log("  => TEST 3 PASSED: Player created successfully with valid data.\n");

  // 4. Session initialization via POST /api/sessions/start
  console.log("TEST 4: Initializing game session via POST /api/sessions/start...");
  const sessRes = await httpRequest(
    "http://localhost:5000/api/sessions/start",
    { method: "POST" },
    { playerId: createdPlayer.id }
  );

  console.log(`  Status: ${sessRes.status}`);
  const sessData = sessRes.body?.data;
  console.log(`  Session ID: ${sessData?.sessionId}`);
  console.log(`  Start Time: ${sessData?.startTime} (type: ${typeof sessData?.startTime})`);
  console.log(`  Session Status: ${sessData?.status}`);
  console.log(`  Active Clue: ${sessData?.activeClue?.id} - "${sessData?.activeClue?.text?.slice(0, 40)}..."`);

  if (sessRes.status !== 201) {
    throw new Error(`TEST 4 FAILED: Session start returned HTTP ${sessRes.status}`);
  }
  if (!sessData?.sessionId) {
    throw new Error("TEST 4 FAILED: Missing sessionId");
  }
  if (typeof sessData?.startTime !== "number" || isNaN(sessData.startTime) || sessData.startTime <= 0) {
    throw new Error(`TEST 4 FAILED: Invalid or undefined startTime: ${sessData?.startTime}`);
  }
  if (!sessData?.activeClue?.id || !sessData?.activeClue?.text) {
    throw new Error("TEST 4 FAILED: Missing or incomplete activeClue in session response");
  }
  console.log("  => TEST 4 PASSED: Valid session initialized with valid startTime and activeClue.\n");

  // 5. Test idempotency: Calling startSession again for the same player must return the active session without creating duplicates
  console.log("TEST 5: Testing duplicate session prevention...");
  const secondSessRes = await httpRequest(
    "http://localhost:5000/api/sessions/start",
    { method: "POST" },
    { playerId: createdPlayer.id }
  );

  console.log(`  Status: ${secondSessRes.status}`);
  const secondSessData = secondSessRes.body?.data;
  console.log(`  Second Session ID: ${secondSessData?.sessionId}`);

  if (secondSessData?.sessionId !== sessData.sessionId) {
    throw new Error(
      `TEST 5 FAILED: Expected existing session ${sessData.sessionId}, got new session ${secondSessData?.sessionId}`
    );
  }
  console.log("  => TEST 5 PASSED: Existing active session reused, no duplicate created.\n");

  // 6. Test player recovery via GET /api/players/:id
  console.log("TEST 6: Testing player recovery via GET /api/players/:id...");
  const recovRes = await httpRequest(`http://localhost:5000/api/players/${createdPlayer.id}`);
  console.log(`  Status: ${recovRes.status}`);
  const recovData = recovRes.body?.data;
  console.log(`  Active Session ID in recovery: ${recovData?.activeSession?.id}`);
  console.log(`  StartedAt in recovery: ${recovData?.activeSession?.startedAt}`);
  console.log(`  Level Progress Level: ${recovData?.levelProgress?.level}`);
  console.log(`  Active Clue in recovery: ${recovData?.activeClue?.id}`);

  if (!recovData?.activeSession || recovData.activeSession.id !== sessData.sessionId) {
    throw new Error("TEST 6 FAILED: Player recovery did not return matching active session");
  }
  if (!recovData.activeSession.startedAt) {
    throw new Error("TEST 6 FAILED: Recovery activeSession has undefined startedAt");
  }
  console.log("  => TEST 6 PASSED: Player recovery correctly returns active session and clue.\n");

  console.log("=================================================================");
  console.log("ALL STEP 5 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================================");
}

runVerification().catch((err) => {
  console.error("FATAL ERROR IN STEP 5 VERIFICATION:", err);
  process.exit(1);
});
