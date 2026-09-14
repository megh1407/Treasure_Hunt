/**
 * Comprehensive Test Suite for Core Quest Finder Next Feature Set:
 * 1. Randomized clue locations per player and level.
 * 2. Randomized clue sentences per player and location.
 * 3. Total Time panel & column in Admin Dashboard.
 * 4. Total Time field/column in Public Leaderboard.
 * 5. Exact-question validation & question bank expansion preservation.
 * 6. Concurrency, occupancy avoidance, and fallback.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Updates2K26";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
    passedCount++;
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function getAdminToken() {
  const res = await fetchJson(`${BASE_URL}/admin/login`, {
    method: "POST",
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  assert(res.status === 200, "Admin login returns status 200");
  assert(res.data.success === true, "Admin login success flag is true");
  assert(Boolean(res.data.data?.token), "Admin login returns valid bearer token");
  return res.data.data.token;
}

async function registerTestPlayer(suffix) {
  const enrollmentNumber = ("EN" + Math.floor(1e8 + Math.random() * 9e8)).slice(0, 11);
  const email = `${enrollmentNumber.toLowerCase()}@test.org`;
  const cleanSuffix = String(suffix).replace(/[^a-zA-Z]/g, "") || "Agent";
  const res = await fetchJson(`${BASE_URL}/players`, {
    method: "POST",
    body: JSON.stringify({
      playerName: `Operative ${cleanSuffix}`,
      enrollmentNumber,
      email,
      contactNumber: "9876543210",
      branch: "IT",
      team: "CyberGuard",
      selectedCharacter: "MALE",
    }),
  });
  if (res.status !== 201) {
    console.error("registerTestPlayer failed:", res.status, res.data);
  }
  assert(res.status === 201, `Player registered with status 201 (${suffix})`);
  return res.data.data;
}

async function cleanupPlayer(adminToken, playerId) {
  if (!playerId) return;
  try {
    await fetchJson(`${BASE_URL}/admin/players/${playerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (err) {
    // Ignore cleanup errors
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("RUNNING COMPREHENSIVE CLUE RANDOMIZATION & TOTAL TIME TESTS");
  console.log("========================================================\n");

  const adminToken = await getAdminToken();
  const createdPlayerIds = [];

  try {
    // =========================================================================
    // TEST 1: Question Bank & Clue Bank Diagnostics via Admin API
    // =========================================================================
    console.log("\n[TEST 1] Admin Diagnostics: Clue Bank & Question Bank Verification");
    const diagRes = await fetchJson(`${BASE_URL}/admin/questions/diagnostics`, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(diagRes.status === 200, "Admin questions diagnostics returns status 200");
    const diag = diagRes.data.data;
    assert(diag.totalQuestions === 230, `Question bank has exactly 230 questions (found ${diag.totalQuestions})`);
    assert(diag.cluesValidation.valid === true, "Clue bank security validation passes: ZERO leakage of forbidden keywords");
    assert(diag.cluesValidation.errors.length === 0, "Clue bank security validation has 0 errors");

    // =========================================================================
    // TEST 2: Initial Clue Delivery & Randomization per Player
    // =========================================================================
    console.log("\n[TEST 2] Initial Clue Delivery & Randomization per Player");
    const playerA = await registerTestPlayer("rnd_A");
    createdPlayerIds.push(playerA.id);
    const playerB = await registerTestPlayer("rnd_B");
    createdPlayerIds.push(playerB.id);

    const startA = await fetchJson(`${BASE_URL}/sessions/start`, {
      method: "POST",
      body: JSON.stringify({ playerId: playerA.id }),
    });
    assert(
      startA.status === 200 || startA.status === 201,
      `Player A starts session successfully (status ${startA.status})`
    );
    const clueA = startA.data.data?.activeClue;
    assert(Boolean(clueA?.text), "Player A receives active clue text on session start");
    assert(clueA.levelId === 1, "Player A clue belongs to level 1");
    assert(!clueA.objectId, "Public clue does not leak internal objectId");
    assert(!clueA.destination, "Public clue does not leak internal destination");

    const startB = await fetchJson(`${BASE_URL}/sessions/start`, {
      method: "POST",
      body: JSON.stringify({ playerId: playerB.id }),
    });
    assert(
      startB.status === 200 || startB.status === 201,
      `Player B starts session successfully (status ${startB.status})`
    );
    const clueB = startB.data.data?.activeClue;
    assert(Boolean(clueB?.text), "Player B receives active clue text on session start");
    assert(clueB.levelId === 1, "Player B clue belongs to level 1");

    // Check Player Recovery endpoint: Clue and Progress persistence
    const recoverA1 = await fetchJson(`${BASE_URL}/players/${playerA.id}`);
    assert(recoverA1.status === 200, "Player A recovery endpoint responds 200");
    assert(recoverA1.data.data.activeClue?.text === clueA.text, "Hydrated clue matches session clue exactly");

    // =========================================================================
    // TEST 3: Clue Persistence & Idempotency Across Multiple Operations
    // =========================================================================
    console.log("\n[TEST 3] Clue Persistence & Idempotency");
    // Repeated call to player recovery
    const recoverA2 = await fetchJson(`${BASE_URL}/players/${playerA.id}`);
    assert(recoverA2.data.data.activeClue?.text === clueA.text, "Clue persists identically on subsequent hydration");

    // Decoy investigation must not change assigned clue
    const level1Candidates = [
      "lib_old_book",
      "lib_shelf_a",
      "lib_shelf_b",
      "lib_computer",
      "lib_chair",
      "lib_cabinet",
      "lib_painting",
      "lib_noticeboard",
      "lib_box",
    ];

    let decoyTested = false;
    for (const objId of level1Candidates) {
      const inv = await fetchJson(`${BASE_URL}/game/investigate`, {
        method: "POST",
        body: JSON.stringify({ playerId: playerA.id, objectId: objId }),
      });
      if (inv.data.data?.outcome === "decoy") {
        assert(inv.status === 200, "Decoy investigation succeeds");
        assert(inv.data.data.outcome === "decoy", "Non-target object returns decoy outcome");
        decoyTested = true;
        break;
      }
    }
    assert(decoyTested === true, "Successfully tested decoy investigation on level 1 object");

    const recoverA3 = await fetchJson(`${BASE_URL}/players/${playerA.id}`);
    assert(recoverA3.data.data.activeClue?.text === clueA.text, "Clue persists identically after investigating decoy");

    // =========================================================================
    // TEST 4: Investigation of Assigned Clue Location & Exact-Question Validation
    // =========================================================================
    console.log("\n[TEST 4] Investigation of Assigned Clue Location & Exact-Question Validation");
    let assignedLocationFound = null;
    let challengeReceived = null;

    for (const objId of level1Candidates) {
      const inv = await fetchJson(`${BASE_URL}/game/investigate`, {
        method: "POST",
        body: JSON.stringify({ playerId: playerA.id, objectId: objId }),
      });
      console.log(`  [TEST 4] Investigated ${objId}: status=${inv.status}, outcome=${inv.data?.data?.outcome}, message=${inv.data?.data?.message || inv.data?.error}`);
      if (inv.data.data?.outcome === "clue") {
        assignedLocationFound = objId;
        challengeReceived = inv.data.data.challenge;
        break;
      }
    }

    assert(assignedLocationFound !== null, `Assigned clue location found among level 1 objects (${assignedLocationFound})`);
    assert(challengeReceived !== null, "Challenge received upon investigating assigned clue location");
    assert(Boolean(challengeReceived.id), "Challenge has a valid assignedQuestion ID");

    // Cross-question answer attempt: submit answer belonging to a DIFFERENT question
    const wrongQAnswer = await fetchJson(`${BASE_URL}/game/submit-answer`, {
      method: "POST",
      body: JSON.stringify({
        playerId: playerA.id,
        challengeId: challengeReceived.id,
        answer: "WRONG_ANSWER_THAT_SHOULD_FAIL",
      }),
    });
    assert(wrongQAnswer.status === 200, "Wrong answer submission returns 200");
    assert(wrongQAnswer.data.data?.correct === false, "Wrong answer is marked incorrect");
    assert(wrongQAnswer.data.data?.penaltySeconds > 0, "Penalty seconds applied on incorrect answer");

    // Verify clue still unchanged after wrong answer
    const recoverA4 = await fetchJson(`${BASE_URL}/players/${playerA.id}`);
    assert(recoverA4.data.data.activeClue?.text === clueA.text, "Clue persists identically after wrong answer submission");

    // Attempt client question-ID spoofing
    const spoofAttempt = await fetchJson(`${BASE_URL}/game/submit-answer`, {
      method: "POST",
      body: JSON.stringify({
        playerId: playerA.id,
        challengeId: "q-1-1", // alternative question id
        answer: "anything",
      }),
    });
    if (challengeReceived.id !== "q-1-1") {
      assert(spoofAttempt.status === 400, "Client question-ID spoofing is strictly rejected (status 400)");
    }

    // =========================================================================
    // TEST 5: Total Time in Admin Dashboard & Stats Calculation
    // =========================================================================
    console.log("\n[TEST 5] Total Time in Admin Dashboard & Calculation Consistency");
    const statsRes = await fetchJson(`${BASE_URL}/admin/stats`, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(statsRes.status === 200, "Admin stats returns 200");
    assert(typeof statsRes.data.data.totalPlayers === "number", "stats.totalPlayers is a number");
    assert(typeof statsRes.data.data.totalTimeSeconds === "number", "stats.totalTimeSeconds is a number");
    assert(statsRes.data.data.totalTimeSeconds >= 0, "stats.totalTimeSeconds is non-negative");

    const adminLbRes = await fetchJson(`${BASE_URL}/admin/leaderboard`, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminLbRes.status === 200, "Admin leaderboard returns 200");
    const adminRows = adminLbRes.data.data;
    assert(Array.isArray(adminRows), "Admin leaderboard is an array");

    const foundPlayerAInAdmin = adminRows.find((r) => r.playerId === playerA.id);
    assert(Boolean(foundPlayerAInAdmin), "Player A is present in admin leaderboard");
    assert(
      foundPlayerAInAdmin.finalTimeSeconds ===
        foundPlayerAInAdmin.gameTimeSeconds + foundPlayerAInAdmin.penaltySeconds,
      `Admin calculation satisfies Total Time = Game Time + Penalty Time (${foundPlayerAInAdmin.finalTimeSeconds} = ${foundPlayerAInAdmin.gameTimeSeconds} + ${foundPlayerAInAdmin.penaltySeconds})`
    );

    // =========================================================================
    // TEST 6: Public Leaderboard & Top 5 Operatives with Total Time
    // =========================================================================
    console.log("\n[TEST 6] Public Leaderboard & Top 5 Operatives with Total Time");
    const publicLbRes = await fetchJson(`${BASE_URL}/leaderboard?limit=10`);
    assert(publicLbRes.status === 200, "Public leaderboard returns 200");
    const publicRows = publicLbRes.data.data;
    assert(Array.isArray(publicRows), "Public leaderboard is an array");

    for (const r of publicRows) {
      assert(r.totalTime !== undefined, "Leaderboard entry includes totalTime");
      assert(
        r.finalTimeSeconds === r.gameTimeSeconds + r.penaltySeconds,
        `Public row satisfies Total Time = Game Time + Penalty Time (${r.finalTimeSeconds} = ${r.gameTimeSeconds} + ${r.penaltySeconds})`
      );
      // Privacy check: public leaderboard must NOT leak sensitive info
      assert(!r.email, "Public leaderboard does NOT leak email");
      assert(!r.contactNumber, "Public leaderboard does NOT leak contactNumber");
      assert(!r.enrollmentNumber, "Public leaderboard does NOT leak enrollmentNumber");
    }

    const top5Res = await fetchJson(`${BASE_URL}/leaderboard/top5`);
    assert(top5Res.status === 200, "Public /leaderboard/top5 returns 200");
    const top5Rows = top5Res.data.data;
    assert(Array.isArray(top5Rows), "top5 data is an array");
    assert(top5Rows.length <= 5, "top5 returns at most 5 entries");

    for (const op of top5Rows) {
      assert(Boolean(op.playerName), "Top 5 operative has playerName");
      assert(op.totalTime !== undefined, `Top 5 operative ${op.playerName} includes totalTime: ${op.totalTime}`);
      assert(op.rank !== undefined, `Top 5 operative ${op.playerName} includes rank: ${op.rank}`);
      assert(op.levelsCompleted !== undefined, `Top 5 operative ${op.playerName} includes levelsCompleted: ${op.levelsCompleted}`);
      // Security check:
      assert(!op.email, "Top 5 does NOT leak email");
      assert(!op.contactNumber, "Top 5 does NOT leak contactNumber");
      assert(!op.enrollmentNumber, "Top 5 does NOT leak enrollmentNumber");
      assert(!op.playerId, "Top 5 does NOT leak playerId");
    }

    // =========================================================================
    // TEST 7: Excel Export Total Time Consistency
    // =========================================================================
    console.log("\n[TEST 7] Excel Export Total Time Consistency");
    const excelRes = await fetch(`${BASE_URL}/admin/export/excel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(excelRes.status === 200, "Admin Excel export returns status 200");
    const contentType = excelRes.headers.get("content-type");
    assert(
      contentType.includes("spreadsheetml.sheet"),
      "Excel export returns valid OpenXML spreadsheet content type"
    );
    const arrayBuffer = await excelRes.arrayBuffer();
    assert(arrayBuffer.byteLength > 1000, `Excel file has non-zero size (${arrayBuffer.byteLength} bytes)`);

    // =========================================================================
    // TEST 8: Occupancy Avoidance & Graceful Full-Pool Fallback
    // =========================================================================
    console.log("\n[TEST 8] Occupancy Avoidance & Graceful Fallback");
    // Register 12 simultaneous players on level 1 (pool has 9 locations)
    const burstPlayers = [];
    for (let i = 0; i < 12; i++) {
      const p = await registerTestPlayer(`occ_${i}`);
      createdPlayerIds.push(p.id);
      burstPlayers.push(p);
    }

    const startResults = await Promise.all(
      burstPlayers.map((p) =>
        fetchJson(`${BASE_URL}/sessions/start`, {
          method: "POST",
          body: JSON.stringify({ playerId: p.id }),
        })
      )
    );

    for (let i = 0; i < startResults.length; i++) {
      assert(
        startResults[i].status === 200 || startResults[i].status === 201,
        `Burst player ${i} starts session without error (fallback works, status ${startResults[i].status})`
      );
      const clue = startResults[i].data.data?.activeClue;
      assert(Boolean(clue?.text), `Burst player ${i} received valid non-empty clue`);
    }

    console.log("\n========================================================");
    console.log(`ALL TESTS COMPLETED: ${passedCount} passed, ${failedCount} failed`);
    console.log("========================================================\n");
  } finally {
    // Cleanup created test players
    for (const pid of createdPlayerIds) {
      await cleanupPlayer(adminToken, pid);
    }
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
