/**
 * scratch/test_question_bank_expansion.js
 *
 * Comprehensive validation suite for Question Bank Expansion (230 questions)
 * and Concurrent Question Assignment with Occupancy Avoidance.
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}, retries = 3) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if ((res.status >= 500 || res.status === 429) && retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return request(endpoint, options, retries - 1);
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return request(endpoint, options, retries - 1);
    }
    throw err;
  }
}

function assert(condition, message, extra = null) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`, extra ? JSON.stringify(extra, null, 2) : "");
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function registerTestPlayer(prefix) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const letterMap = { "0": "A", "1": "B", "2": "C", "3": "D", "4": "E", "5": "F", "6": "G", "7": "H", "8": "I", "9": "J" };
  const randAlpha = String(rand).split("").map((c) => letterMap[c] || "X").join("");
  const enrollmentNumber = `QBX${Date.now().toString().slice(-4)}${rand}`.slice(0, 11);

  const cleanPrefix = prefix.toLowerCase().replace(/\s+/g, "_");
  const regRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: `${prefix} ${randAlpha}`,
      enrollmentNumber,
      email: `${cleanPrefix}_${rand}@example.com`,
      contactNumber: "9876543210",
      branch: "CO",
    }),
  });
  assert(regRes.status === 201, `Player ${prefix} registered successfully`, regRes);
  const playerId = regRes.data.data.id;

  const sessionRes = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(sessionRes.ok, `Session started for ${prefix}`, sessionRes);

  return { playerId, sessionId: sessionRes.data.data.sessionId };
}

async function run() {
  console.log("================================================================================");
  console.log("  CORE QUEST FINDER: QUESTION BANK EXPANSION & CONCURRENT ASSIGNMENT SUITE     ");
  console.log("================================================================================\n");

  // ============================================================================
  // SECTION 1: ADMIN DIAGNOSTICS & QUESTION BANK INTEGRITY
  // ============================================================================
  console.log("--- SECTION 1: QUESTION BANK INTEGRITY & METRICS ---");

  // Admin login
  const loginRes = await request("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password: "Updates2K26" }),
  });
  assert(loginRes.status === 200 && loginRes.data?.data?.token, "Admin authenticated for diagnostics");
  const adminToken = loginRes.data.data.token;

  // Diagnostics
  const diagRes = await request("/admin/questions/diagnostics", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(diagRes.status === 200, "Diagnostics endpoint returned HTTP 200");
  const diag = diagRes.data.data;

  // 1. Total count is approximately 200–250
  assert(diag.totalQuestions >= 200 && diag.totalQuestions <= 250, `Total questions count (${diag.totalQuestions}) is within 200–250 range`);
  console.log(`  ℹ Total questions in bank: ${diag.totalQuestions}`);

  // 2. Bank validation passed
  assert(diag.valid === true, "Bank validation passed with zero errors");
  assert(diag.validationErrors.length === 0, "Zero validation errors");

  // 3. Every level contains 20–25 questions & correct difficulty tier
  const expectedPolicy = {
    1: "EASY", 2: "EASY",
    3: "MEDIUM", 4: "MEDIUM", 5: "MEDIUM",
    6: "HARD", 7: "HARD", 8: "HARD",
    9: "EXPERT", 10: "EXPERT",
  };

  const allQuestionIds = new Set();
  for (let lvl = 1; lvl <= 10; lvl++) {
    const lvlInfo = diag.levels[lvl];
    assert(!!lvlInfo, `Level ${lvl} summary exists`);
    assert(lvlInfo.count >= 20 && lvlInfo.count <= 25, `Level ${lvl} question count (${lvlInfo.count}) is between 20 and 25`);
    assert(lvlInfo.difficulty === expectedPolicy[lvl], `Level ${lvl} difficulty is ${expectedPolicy[lvl]} (got: ${lvlInfo.difficulty})`);

    for (const q of lvlInfo.questions) {
      assert(!allQuestionIds.has(q.id), `Question ID '${q.id}' is globally unique`);
      allQuestionIds.add(q.id);
    }
  }
  assert(allQuestionIds.size === diag.totalQuestions, `All ${diag.totalQuestions} question IDs are globally unique`);

  // ============================================================================
  // SECTION 2: CONCURRENT QUESTION ASSIGNMENT & OCCUPANCY AVOIDANCE
  // ============================================================================
  console.log("\n--- SECTION 2: CONCURRENT QUESTION ASSIGNMENT & OCCUPANCY AVOIDANCE ---");

  // Register 3 distinct active players at Level 1
  console.log("Registering 3 concurrent active operatives at Level 1...");
  const p1 = await registerTestPlayer("Operative One");
  const p2 = await registerTestPlayer("Operative Two");
  const p3 = await registerTestPlayer("Operative Three");

  // Operative 1 investigates clue target (lib_old_book) in Level 1
  const inv1 = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.playerId, objectId: "lib_old_book" }),
  });
  assert(inv1.status === 200, "Operative 1 investigated clue target");
  assert(inv1.data?.data?.outcome === "clue", "Outcome is clue", inv1.data);
  const q1Id = inv1.data.data.challenge.id;
  assert(q1Id.startsWith("ch-1"), `Operative 1 assigned Level 1 question: ${q1Id}`);
  assert(!inv1.data.data.challenge.answer, "Security: answer is NOT leaked to Operative 1");

  // Operative 2 investigates clue target while Operative 1 is actively on Level 1
  const inv2 = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: p2.playerId, objectId: "lib_old_book" }),
  });
  assert(inv2.status === 200, "Operative 2 investigated clue target");
  assert(inv2.data?.data?.outcome === "clue", "Outcome is clue", inv2.data);
  const q2Id = inv2.data.data.challenge.id;
  assert(q2Id.startsWith("ch-1"), `Operative 2 assigned Level 1 question: ${q2Id}`);
  assert(q2Id !== q1Id, `Concurrent occupancy avoided: Operative 2 received '${q2Id}' != Operative 1 '${q1Id}'`);

  // Operative 3 investigates clue target while Operatives 1 and 2 are actively on Level 1
  const inv3 = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: p3.playerId, objectId: "lib_old_book" }),
  });
  assert(inv3.status === 200, "Operative 3 investigated clue target");
  assert(inv3.data?.data?.outcome === "clue", "Outcome is clue", inv3.data);
  const q3Id = inv3.data.data.challenge.id;
  assert(q3Id.startsWith("ch-1"), `Operative 3 assigned Level 1 question: ${q3Id}`);
  assert(q3Id !== q1Id && q3Id !== q2Id, `Concurrent occupancy avoided: Operative 3 received distinct question '${q3Id}'`);

  // ============================================================================
  // SECTION 3: REFRESH / RECONNECT PERSISTENCE & IDEMPOTENCY
  // ============================================================================
  console.log("\n--- SECTION 3: REFRESH, RECONNECT, & IDEMPOTENCY ---");

  // Re-investigating target object must return the EXACT same assigned question
  const reInv1 = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.playerId, objectId: "lib_old_book" }),
  });
  assert(reInv1.status === 200, "Operative 1 re-investigated target object");
  assert(reInv1.data.data.challenge.id === q1Id, `Re-investigation preserved exact question: '${q1Id}'`);

  // Hydration via GET /api/players/:id preserves assignedQuestionId in session state
  const playerState = await request(`/players/${p1.playerId}`);
  assert(playerState.status === 200, "Operative 1 player state fetched");
  assert(playerState.data.data.status === "SOLVING", "Player status remains SOLVING");

  // Requesting hint on assigned question
  const hintRes = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.playerId, challengeId: q1Id, order: 1 }),
  });
  assert(hintRes.status === 200 && !!hintRes.data?.data?.text, `Hint 1 successfully retrieved for assigned question: '${hintRes.data?.data?.text}'`);

  // ============================================================================
  // SECTION 4: EXACT-QUESTION ANSWER VALIDATION
  // ============================================================================
  console.log("\n--- SECTION 4: EXACT-QUESTION ANSWER VALIDATION ---");

  // We know the questions and answers from the bank
  const { QUESTION_BANK, isAnswerCorrect } = require("../backend/dist/config/questionBank");
  const q1Def = QUESTION_BANK.find((q) => q.id === q1Id);
  const q2Def = QUESTION_BANK.find((q) => q.id === q2Id);
  assert(!!q1Def && !!q2Def, "Found definitions for assigned questions in question bank");

  // 1. Submitting Operative 2's answer to Operative 1's question must be REJECTED
  if (q1Def.answer !== q2Def.answer) {
    const wrongCrossRes = await request("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({ playerId: p1.playerId, challengeId: q1Id, answer: q2Def.answer }),
    });
    assert(wrongCrossRes.status === 200, "Submission request handled");
    assert(wrongCrossRes.data.data.correct === false, `Cross-question answer '${q2Def.answer}' strictly rejected for '${q1Id}'`);
    assert(wrongCrossRes.data.data.penaltySeconds === 30, "Wrong answer penalty applied (+30s)");
  }

  // 2. Client spoofing challengeId must be REJECTED with HTTP 400
  const spoofRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.playerId, challengeId: q2Id, answer: q2Def.answer }),
  });
  assert(spoofRes.status === 400, `Client spoofed challengeId '${q2Id}' rejected with HTTP 400 (expected '${q1Id}')`);

  // 3. Submitting the exact correct answer for Operative 1's question must SUCCEED
  const correctRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.playerId, challengeId: q1Id, answer: q1Def.answer }),
  });
  assert(correctRes.status === 200, "Correct answer submission returned HTTP 200");
  assert(correctRes.data.data.correct === true, `Operative 1 correct answer '${q1Def.answer}' accepted`);
  assert(correctRes.data.data.levelCompleted === true, "Level 1 marked completed");
  assert(correctRes.data.data.nextLevel === 2, "Authoritatively advanced to Level 2");

  // 4. Duplicate submission for completed level must remain IDEMPOTENT
  const dupRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.playerId, challengeId: q1Id, answer: q1Def.answer }),
  });
  assert(dupRes.status === 200 && dupRes.data.data.correct === true, "Duplicate submission returned correct: true");
  assert(dupRes.data.data.penaltySeconds === 0, "Zero additional penalty charged on duplicate submission");
  assert(dupRes.data.data.nextLevel === 2, "Level remains Level 2 (no skip)");

  // 5. Operative 2 submitting their own correct answer must SUCCEED
  const correct2Res = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId: p2.playerId, challengeId: q2Id, answer: q2Def.answer }),
  });
  assert(correct2Res.status === 200 && correct2Res.data.data.correct === true, `Operative 2 correct answer '${q2Def.answer}' accepted for '${q2Id}'`);
  assert(correct2Res.data.data.levelCompleted === true, "Operative 2 completed Level 1");

  console.log("\n================================================================================");
  console.log("  🎉 ALL QUESTION BANK EXPANSION & CONCURRENT ASSIGNMENT CHECKS PASSED 100%!   ");
  console.log("================================================================================\n");
}

run().catch((err) => {
  console.error("FATAL ERROR IN TEST EXECUTION:", err);
  process.exit(1);
});
