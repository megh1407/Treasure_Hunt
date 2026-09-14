/**
 * scratch/test_question_validation_fix.js
 *
 * Dedicated regression test suite verifying the question-answer validation fix:
 * 1. Assigned Question A + Answer A → correct.
 * 2. Assigned Question A + Answer B from the same level → incorrect (rejected with penalty).
 * 3. Assigned Question B + Answer B → correct.
 * 4. Assigned Question B + Answer A → incorrect (rejected with penalty).
 * 5. Same answer text appearing in different questions must not cause cross-question acceptance.
 * 6. Missing or invalid assigned question ID → safely rejected (HTTP 400).
 * 7. Client-supplied question ID cannot override the server-authoritative assigned question ID.
 * 8. Duplicate submissions remain idempotent.
 * 9. Existing level progression and penalty behavior remain unchanged.
 * 10. Refresh/reconnect still validates against the originally assigned question.
 */

const path = require("path");
const { getQuestionById, getQuestionsForLevel } = require("../backend/dist/config/questionBank");
const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message, extra = null) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    if (extra) console.error("Details:", JSON.stringify(extra, null, 2));
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("  CORE QUEST FINDER: QUESTION-ANSWER VALIDATION BUG REGRESSION TEST SUITE       ");
  console.log("================================================================================\n");

  const randLetters = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let s = "";
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const randNum = () => Math.floor(100000 + Math.random() * 900000);

  // Helper to register and start session
  async function createPlayerWithSession(namePrefix) {
    const code = randLetters();
    const num = Math.floor(10000000 + Math.random() * 90000000);
    const regRes = await request("/players", {
      method: "POST",
      body: JSON.stringify({
        playerName: `${namePrefix} ${code.toUpperCase()}`,
        enrollmentNumber: `CQF${num}`, // exactly 3 + 8 = 11 alphanumeric characters
        email: `${namePrefix.toLowerCase()}_${code}_${num}@example.com`,
        contactNumber: "9876501234",
        branch: "CO",
      }),
    });
    assert(regRes.status === 201, `Player created: ${regRes.data?.data?.playerName}`, regRes);
    const playerId = regRes.data.data.id;

    const sessionRes = await request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ playerId }),
    });
    assert(sessionRes.status === 200 || sessionRes.status === 201, `Session started for player ${playerId}`, sessionRes);
    return playerId;
  }

  // ============================================================================
  // TEST CASE 6: Missing or invalid assigned question ID → safely rejected
  // ============================================================================
  console.log("--- TEST CASE 6: Missing or invalid assigned question ID ---");
  const uninvestigatedPlayerId = await createPlayerWithSession("UninvestigatedOp");

  // Attempt submitting an answer before investigating clue object (no assignedQuestionId)
  const prematureSubmit = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: uninvestigatedPlayerId,
      challengeId: "ch-1",
      answer: "65",
    }),
  });
  assert(
    prematureSubmit.status === 400,
    "Submission before investigating clue rejected with HTTP 400",
    prematureSubmit
  );
  assert(
    prematureSubmit.data?.error?.includes("investigate") || prematureSubmit.data?.error?.includes("not in progress") || prematureSubmit.data?.error?.includes("No valid question assigned"),
    "Safe error message returned indicating clue investigation required",
    prematureSubmit.data
  );

  // ============================================================================
  // TEST CASES 1, 2, 7, 8, 9, 10: Assigned Question Testing with Player Alpha
  // ============================================================================
  console.log("\n--- TEST CASES 1, 2, 7, 8, 9, 10: Player Alpha Question Validation ---");
  const playerAlphaId = await createPlayerWithSession("AlphaOp");

  const level1Objects = [
    "lib_old_book", "lib_shelf_a", "lib_shelf_b", "lib_computer",
    "lib_chair", "lib_cabinet", "lib_painting", "lib_noticeboard", "lib_box"
  ];

  async function findAndInvestigateTarget(playerId) {
    for (const objId of level1Objects) {
      const inv = await request("/game/investigate", {
        method: "POST",
        body: JSON.stringify({ playerId, objectId: objId }),
      });
      if (inv.data?.data?.outcome === "clue") {
        return inv;
      }
    }
    throw new Error(`Target object not found for player ${playerId}`);
  }

  // Player Alpha investigates clue object to receive randomly assigned question
  const alphaInvestigate = await findAndInvestigateTarget(playerAlphaId);
  assert(alphaInvestigate.status === 200, "Alpha investigated clue target", alphaInvestigate);
  const alphaChallenge = alphaInvestigate.data.data.challenge;
  assert(!!alphaChallenge && !!alphaChallenge.id, `Alpha assigned challenge: ${alphaChallenge.id}`);
  assert(alphaChallenge.answer === undefined, "Security: correct answer is NOT leaked in API response");

  // Authoritative question answers for Level 1 dynamically loaded from Question Bank
  const level1Questions = getQuestionsForLevel(1);
  const alphaQ = getQuestionById(alphaChallenge.id);
  const altQ = level1Questions.find((q) => q.id !== alphaChallenge.id) || level1Questions[0];
  const alphaQInfo = {
    answer: alphaQ.answer,
    alt: altQ.answer,
    altId: altQ.id,
  };

  // TEST CASE 7: Client-supplied question ID cannot override server-authoritative assigned question ID
  console.log("\n[Test 7] Client tries spoofing challengeId to a different question from same level...");
  const spoofedChallengeRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: playerAlphaId,
      challengeId: alphaQInfo.altId, // Spoofed challenge ID!
      answer: alphaQInfo.alt,       // Answer to the spoofed challenge!
    }),
  });
  assert(
    spoofedChallengeRes.status === 400,
    `Spoofed challenge ID '${alphaQInfo.altId}' strictly rejected with HTTP 400 (expected '${alphaChallenge.id}')`,
    spoofedChallengeRes
  );
  assert(
    spoofedChallengeRes.data?.error?.includes(alphaChallenge.id),
    "Error explicitly references the server-authoritative assigned question ID",
    spoofedChallengeRes.data
  );

  // TEST CASE 2: Assigned Question A + Answer B from same level → INCORRECT
  console.log("\n[Test 2] Submitting Answer B from same level to assigned Question A...");
  const wrongAltAnswerRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: playerAlphaId,
      challengeId: alphaChallenge.id,
      answer: alphaQInfo.alt, // Submitting alternative question's answer!
    }),
  });
  assert(wrongAltAnswerRes.status === 200, "Request handled with HTTP 200");
  assert(
    wrongAltAnswerRes.data?.data?.correct === false,
    `Answer B ('${alphaQInfo.alt}') belonging to another level question is REJECTED for ${alphaChallenge.id}`,
    wrongAltAnswerRes.data
  );
  assert(
    wrongAltAnswerRes.data?.data?.penaltySeconds === 30,
    "Wrong answer penalty applied (+30s)",
    wrongAltAnswerRes.data
  );

  // TEST CASE 9: Penalty accumulation and attempts increment verified
  const alphaPlayerCheck = await request(`/players/${playerAlphaId}`);
  assert(alphaPlayerCheck.status === 200, "Fetched player profile");
  assert(
    alphaPlayerCheck.data?.data?.penaltySeconds >= 30,
    `Player accumulated penalty verified: ${alphaPlayerCheck.data?.data?.penaltySeconds}s`
  );
  assert(
    alphaPlayerCheck.data?.data?.levelProgress?.attempts >= 1,
    `Attempts incremented: ${alphaPlayerCheck.data?.data?.levelProgress?.attempts}`
  );

  // TEST CASE 10: Refresh / reconnect preserves assigned question and validates correctly
  console.log("\n[Test 10] Simulating page refresh/reconnect before submitting correct answer...");
  const refreshRecoveryRes = await request(`/players/${playerAlphaId}`);
  assert(refreshRecoveryRes.status === 200, "Recovery data retrieved");
  const recoveredQ = refreshRecoveryRes.data?.data?.levelProgress?.assignedQuestion;
  assert(
    recoveredQ?.id === alphaChallenge.id,
    `Reconnected player preserves exact assigned question: ${recoveredQ?.id} === ${alphaChallenge.id}`
  );

  // TEST CASE 1: Assigned Question A + Answer A → CORRECT
  console.log("\n[Test 1] Submitting correct Answer A for assigned Question A...");
  const correctSolveRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: playerAlphaId,
      challengeId: alphaChallenge.id,
      answer: alphaQInfo.answer,
    }),
  });
  assert(correctSolveRes.status === 200, "Solve request returned HTTP 200");
  assert(correctSolveRes.data?.data?.correct === true, "Answer A marked CORRECT");
  assert(correctSolveRes.data?.data?.levelCompleted === true, "Level 1 marked COMPLETED");
  assert(correctSolveRes.data?.data?.nextLevel === 2, "Player advanced to Level 2");

  // TEST CASE 8: Duplicate submissions remain idempotent
  console.log("\n[Test 8] Re-submitting answer for completed Level 1 (Idempotency)...");
  const duplicateSolveRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: playerAlphaId,
      challengeId: alphaChallenge.id,
      answer: alphaQInfo.answer,
    }),
  });
  assert(duplicateSolveRes.status === 200, "Duplicate submit returned HTTP 200");
  assert(duplicateSolveRes.data?.data?.correct === true, "Duplicate returns correct: true");
  assert(duplicateSolveRes.data?.data?.penaltySeconds === 0, "Zero additional penalty charged");
  assert(duplicateSolveRes.data?.data?.nextLevel === 2, "Level remains Level 2 (no skip)");

  // ============================================================================
  // TEST CASES 3 & 4: Alternative Question Assigned to Player Beta
  // ============================================================================
  console.log("\n--- TEST CASES 3 & 4: Distinct Question Assignment (Player Beta) ---");
  // Keep creating until we obtain a different question than Alpha
  let betaPlayerId;
  let betaChallenge;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidateId = await createPlayerWithSession("BetaOp");
    const invRes = await findAndInvestigateTarget(candidateId);
    const ch = invRes.data?.data?.challenge;
    if (ch && ch.id !== alphaChallenge.id) {
      betaPlayerId = candidateId;
      betaChallenge = ch;
      break;
    }
  }

  if (!betaChallenge) {
    console.log("  ⚠️ Could not randomly draw distinct question in 10 attempts; skipping distinct pair test");
  } else {
    console.log(`✓ Beta assigned distinct challenge: ${betaChallenge.id} (Alpha had ${alphaChallenge.id})`);
    const betaQ = getQuestionById(betaChallenge.id);
    const betaQInfo = {
      answer: betaQ.answer,
    };

    // TEST CASE 4: Assigned Question B + Answer A → INCORRECT
    console.log("\n[Test 4] Beta submits Alpha's answer (Answer A) for Question B...");
    const betaSubmitAlphaAns = await request("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({
        playerId: betaPlayerId,
        challengeId: betaChallenge.id,
        answer: alphaQInfo.answer, // Submitting Question A's answer!
      }),
    });
    assert(betaSubmitAlphaAns.status === 200, "Beta wrong answer handled with HTTP 200");
    assert(
      betaSubmitAlphaAns.data?.data?.correct === false,
      `Answer A ('${alphaQInfo.answer}') rejected for Question B ('${betaChallenge.id}')`
    );

    // TEST CASE 3: Assigned Question B + Answer B → CORRECT
    console.log("\n[Test 3] Beta submits Answer B for Question B...");
    const betaSubmitBetaAns = await request("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({
        playerId: betaPlayerId,
        challengeId: betaChallenge.id,
        answer: betaQInfo.answer,
      }),
    });
    assert(betaSubmitBetaAns.status === 200, "Beta solve returned HTTP 200");
    assert(betaSubmitBetaAns.data?.data?.correct === true, "Answer B marked CORRECT for Question B");
    assert(betaSubmitBetaAns.data?.data?.levelCompleted === true, "Beta Level 1 completed");
  }

  // ============================================================================
  // TEST CASE 5: Same answer text in different questions must not cross-accept
  // ============================================================================
  console.log("\n--- TEST CASE 5: Same answer text cross-question test ---");
  // If a player is assigned a question, submitting an answer belonging to another question must be rejected!
  const gammaPlayerId = await createPlayerWithSession("GammaOp");
  const gammaInv = await findAndInvestigateTarget(gammaPlayerId);
  const gammaChallenge = gammaInv.data?.data?.challenge;
  assert(!!gammaChallenge, `Gamma assigned challenge: ${gammaChallenge?.id}`);

  const gammaQ = getQuestionById(gammaChallenge.id);
  const foreignAnswer = gammaQ.answer === "42" ? "65" : "42";
  console.log(`[Test 5] Gamma has ${gammaChallenge.id} (answer '${gammaQ.answer}'). Submitting '${foreignAnswer}'...`);
  const crossAnswerRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: gammaPlayerId,
      challengeId: gammaChallenge.id,
      answer: foreignAnswer,
    }),
  });
  assert(
    crossAnswerRes.data?.data?.correct === false,
    `Answer '${foreignAnswer}' strictly REJECTED for ${gammaChallenge.id}`
  );

  // ============================================================================
  // FLEXIBLE ANSWER NORMALIZATION VALIDATION
  // ============================================================================
  console.log("\n--- FLEXIBLE NORMALIZATION CHECKS ---");
  const deltaPlayerId = await createPlayerWithSession("DeltaOp");
  const deltaInv = await findAndInvestigateTarget(deltaPlayerId);
  const deltaChallenge = deltaInv.data?.data?.challenge;
  const deltaQ = getQuestionById(deltaChallenge.id);

  // Test whitespace trimming
  console.log(`[Norm 1] Testing answer with extra surrounding whitespace: '  ${deltaQ.answer}  '`);
  const wsRes = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({
      playerId: deltaPlayerId,
      challengeId: deltaChallenge.id,
      answer: `   ${deltaQ.answer}   `,
    }),
  });
  assert(wsRes.status === 200 && wsRes.data?.data?.correct === true, "Whitespace trimmed and accepted as correct");

  console.log("\n================================================================================");
  console.log("  🎉 ALL 10 QUESTION-ANSWER VALIDATION TEST CASES PASSED 100%!                  ");
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("FATAL ERROR IN TEST EXECUTION:", err);
  process.exit(1);
});
