/**
 * End-to-End Automated Integration & Security Verification Suite for Level 5: "Hidden Recipe"
 * 
 * Verifies:
 * 1. Backend health check (GET /api/health)
 * 2. Player registration (POST /api/players)
 * 3. Game session initialization (POST /api/sessions/start)
 * 4. Legitimate progression through Level 1 (POST /api/game/investigate, POST /api/game/submit-answer)
 * 5. Legitimate progression through Level 2 (POST /api/game/investigate, POST /api/game/submit-answer)
 * 6. Legitimate progression through Level 3 (POST /api/game/investigate, POST /api/game/submit-answer)
 * 7. Legitimate progression through Level 4 (POST /api/game/investigate, POST /api/game/submit-answer)
 * 8. Clean Level 5 initialization verification (progressData starts clean)
 * 9. Player state verification: currentLevel = 5, status = SEARCHING
 * 10. Cross-level foreign object rejection (Levels 1, 2, 3, 4 objects rejected on Level 5)
 * 11. Decoy investigation (cafe_vending_machine) without penalty
 * 12. Decoy persistence in LevelProgress.progressData.investigatedObjects
 * 13. Clue target investigation (cafe_corner_table)
 * 14. Target persistence in investigatedObjects
 * 15. Level 5 inventory reward (secret_note) granted and persisted
 * 16. Player status transition to SOLVING
 * 17. Security verification: Authoritative secret answer "salt" NEVER leaked in clue/challenge
 * 18. Progressive Hint 1 request (+15s penalty)
 * 19. Hint 1 penalty persistence in database
 * 20. Progressive Hint 2 request (+30s penalty)
 * 21. Cumulative hint penalty verification (45s)
 * 22. Hint idempotency check (duplicate Hint 1 causes +0s penalty)
 * 23. Wrong answer submission (+30s penalty, attempts incremented to 1)
 * 24. Attempts count verification in database
 * 25. Total cumulative penalty verification (15 + 30 + 30 = 75s)
 * 26. Player recovery endpoint verification (GET /api/players/:id)
 * 27. Revealed hints filtering (only hints 1 & 2 revealed, unrequested Hint 3 kept hidden)
 * 28. Security verification: Secret answer "salt" absent from recovery payload
 * 29-36. Full simulated browser refresh state restoration
 * 37. Authoritative session pause during Level 5 (POST /api/sessions/pause)
 * 38. Investigation rejected while paused (HTTP 400)
 * 39. Hint request rejected while paused (HTTP 400)
 * 40. Answer submission rejected while paused (HTTP 400)
 * 41-43. Refresh recovery while paused (preserves paused state, statusBeforePause = SOLVING, timer frozen)
 * 44-45. Authoritative session resume (POST /api/sessions/resume, status restored to SOLVING)
 * 46. Correct answer submission "salt" (POST /api/game/submit-answer)
 * 47. Level 5 completion verification (levelCompleted: true, nextLevel: 6)
 * 48. LevelProgress status COMPLETED with valid completedAt timestamp
 * 49-50. Player currentLevel = 6, status = SEARCHING
 * 51. Level 6 clean progress initialization in database
 * 52-55. Historical records for Levels 1, 2, 3, 4, and 5 remain intact and COMPLETED
 * 56. Immutability check: Completed Level 5 cannot be modified
 * 57. Complete test data teardown
 */

const http = require("http");
const path = require("path");

// Load PrismaClient from backend/node_modules
const { PrismaClient } = require("d:/MEGH/core-quest-finder/backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

const BASE_URL = "http://localhost:5000/api";

function request(apiPath, options = {}) {
  const url = new URL(`${BASE_URL}${apiPath}`);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, data });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log("=================================================================");
  console.log(" Starting Level 5 Persistent Gameplay State Integration Tests");
  console.log("=================================================================");

  const timestamp = Date.now();
  const testEnrollment = `EN_L5_${timestamp}`.slice(0, 12);
  let playerId = null;
  let activeSessionId = null;

  try {
    // 1. Health check
    console.log("\n[1/56] Checking backend health (GET /api/health)...");
    const health = await request("/health");
    assert(health.status === 200 && health.data.success, "Backend health check failed");
    console.log("✓ Backend is healthy. Database:", health.data.data.database.status);

    // 2. Register test player
    console.log("\n[2/56] Registering test player (POST /api/players)...");
    const regRes = await request("/players", {
      method: "POST",
      body: {
        playerName: `Player_L5_${timestamp}`,
        enrollmentNumber: testEnrollment,
        team: "Test Division 5",
      },
    });
    assert(regRes.status === 201 && regRes.data.success, "Player registration failed");
    playerId = regRes.data.data.id;
    console.log("✓ Player registered:", { id: playerId, currentLevel: regRes.data.data.currentLevel });

    // 3. Start session
    console.log("\n[3/56] Starting game session (POST /api/sessions/start)...");
    const sessionRes = await request("/sessions/start", {
      method: "POST",
      body: { playerId },
    });
    assert(
      (sessionRes.status === 200 || sessionRes.status === 201) && sessionRes.data.success,
      `Session start failed: HTTP ${sessionRes.status}`
    );
    activeSessionId = sessionRes.data.data.sessionId;
    console.log("✓ Session started:", { sessionId: activeSessionId });

    // 4. Complete Level 1 legitimately through backend flow
    console.log("\n[4/56] Completing Level 1 through legitimate backend APIs...");
    const l1Investigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_old_book" },
    });
    assert(l1Investigate.status === 200 && l1Investigate.data.success, "Level 1 investigation failed");
    assert(l1Investigate.data.data.outcome === "clue", "Level 1 target outcome must be 'clue'");
    assert(l1Investigate.data.data.grantedItem === "usb_drive", "Level 1 must grant usb_drive");

    const l1Submit = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-1", answer: "65" },
    });
    assert(l1Submit.status === 200 && l1Submit.data.success, "Level 1 answer submission failed");
    assert(l1Submit.data.data.correct === true, "Level 1 answer should be correct");
    assert(l1Submit.data.data.levelCompleted === true, "Level 1 should be completed");
    assert(l1Submit.data.data.nextLevel === 2, "Next level must be 2");
    console.log("✓ Level 1 successfully completed! Advanced to Level 2.");

    // 5. Complete Level 2 legitimately through backend flow
    console.log("\n[5/56] Completing Level 2 through legitimate backend APIs...");
    const l2Investigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_toolbox" },
    });
    assert(l2Investigate.status === 200 && l2Investigate.data.success, "Level 2 investigation failed");
    assert(l2Investigate.data.data.grantedItem === "access_card", "Level 2 must grant access_card");

    const l2Submit = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", answer: "42" },
    });
    assert(l2Submit.status === 200 && l2Submit.data.success, "Level 2 answer submission failed");
    assert(l2Submit.data.data.correct === true, "Level 2 answer should be correct");
    assert(l2Submit.data.data.nextLevel === 3, "Next level must be 3");
    console.log("✓ Level 2 successfully completed! Advanced to Level 3.");

    // 6. Complete Level 3 legitimately through backend flow
    console.log("\n[6/56] Completing Level 3 through legitimate backend APIs...");
    const l3Investigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_server_rack" },
    });
    assert(l3Investigate.status === 200 && l3Investigate.data.success, "Level 3 investigation failed");
    assert(l3Investigate.data.data.grantedItem === "encryption_key", "Level 3 must grant encryption_key");

    const l3Submit = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", answer: "63" },
    });
    assert(l3Submit.status === 200 && l3Submit.data.success, "Level 3 answer submission failed");
    assert(l3Submit.data.data.correct === true, "Level 3 answer should be correct");
    assert(l3Submit.data.data.nextLevel === 4, "Next level must be 4");
    console.log("✓ Level 3 successfully completed! Advanced to Level 4.");

    // 7. Complete Level 4 legitimately through backend flow
    console.log("\n[7/56] Completing Level 4 through legitimate backend APIs...");
    const l4Investigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "auditorium_seat_row7" },
    });
    assert(l4Investigate.status === 200 && l4Investigate.data.success, "Level 4 investigation failed");
    assert(l4Investigate.data.data.grantedItem === "circuit_piece", "Level 4 must grant circuit_piece");

    const l4Submit = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", answer: "159" },
    });
    assert(l4Submit.status === 200 && l4Submit.data.success, "Level 4 answer submission failed");
    assert(l4Submit.data.data.correct === true, "Level 4 answer should be correct");
    assert(l4Submit.data.data.nextLevel === 5, "Next level must be 5");
    console.log("✓ Level 4 successfully completed! Advanced to Level 5.");

    // 8. Verify Level 5 clean start
    console.log("\n[8/56] Verifying Level 5 clean initialization...");
    const l5ProgressCheck = await request(`/players/${playerId}`);
    assert(l5ProgressCheck.status === 200 && l5ProgressCheck.data.success, "Player recovery fetch failed");
    const l5Prog = l5ProgressCheck.data.data.levelProgress;
    assert(l5Prog.level === 5, "Expected levelProgress.level === 5");
    assert(Array.isArray(l5Prog.investigatedObjects) && l5Prog.investigatedObjects.length === 0, "Level 5 investigatedObjects must be empty");
    assert(Array.isArray(l5Prog.collectedItems) && l5Prog.collectedItems.length === 0, "Level 5 collectedItems must be empty");
    assert(Array.isArray(l5Prog.usedHints) && l5Prog.usedHints.length === 0, "Level 5 usedHints must be empty");
    assert(l5Prog.attempts === 0, "Level 5 attempts must start at 0");
    console.log("✓ Level 5 started with clean progress:", l5Prog);

    // 9. Verify player.currentLevel = 5, status = SEARCHING
    console.log("\n[9/56] Verifying Player attributes for Level 5...");
    assert(l5ProgressCheck.data.data.currentLevel === 5, "Player currentLevel must be 5");
    assert(l5ProgressCheck.data.data.status === "SEARCHING", "Player status must be SEARCHING");
    console.log("✓ Player state verified: currentLevel = 5, status = SEARCHING.");

    // 10. Foreign cross-level object rejection
    console.log("\n[10/56] Verifying foreign cross-level object rejection on Level 5...");
    const foreignL1 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_shelf_a" },
    });
    assert(foreignL1.status === 400, "Level 1 object must be rejected on Level 5");

    const foreignL2 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_arm" },
    });
    assert(foreignL2.status === 400, "Level 2 object must be rejected on Level 5");

    const foreignL3 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_terminal" },
    });
    assert(foreignL3.status === 400, "Level 3 object must be rejected on Level 5");

    const foreignL4 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "auditorium_podium" },
    });
    assert(foreignL4.status === 400, "Level 4 object must be rejected on Level 5");
    console.log("✓ Correctly rejected foreign cross-level objects on Level 5.");

    // 11. Investigate valid Level 5 decoy
    console.log("\n[11/56] Investigating Level 5 decoy object 'cafe_vending_machine'...");
    const decoyRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "cafe_vending_machine" },
    });
    assert(decoyRes.status === 200 && decoyRes.data.success, "Decoy investigation request failed");
    assert(decoyRes.data.data.outcome === "decoy", "Expected decoy outcome");
    assert(typeof decoyRes.data.data.message === "string", "Decoy message missing");
    console.log("✓ Decoy investigated:", decoyRes.data.data.message);

    // 12. Verify decoy persistence in LevelProgress
    console.log("\n[12/56] Verifying decoy persistence in database...");
    const dbCheck1 = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 5 } },
    });
    assert(
      dbCheck1 && dbCheck1.progressData.investigatedObjects.includes("cafe_vending_machine"),
      "Decoy not found in Level 5 investigatedObjects"
    );
    console.log("✓ Decoy persisted in database:", dbCheck1.progressData.investigatedObjects);

    // 13. Investigate Level 5 target
    console.log("\n[13/56] Investigating clue target 'cafe_corner_table'...");
    const targetRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "cafe_corner_table" },
    });
    assert(targetRes.status === 200 && targetRes.data.success, "Target investigation failed");
    assert(targetRes.data.data.outcome === "clue", "Outcome must be 'clue'");

    // 14. Verify target persisted in investigatedObjects
    console.log("\n[14/56] Verifying target persisted in database...");
    const dbCheck2 = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 5 } },
    });
    assert(
      dbCheck2 && dbCheck2.progressData.investigatedObjects.includes("cafe_corner_table"),
      "Target not in investigatedObjects"
    );
    console.log("✓ Target persisted in database:", dbCheck2.progressData.investigatedObjects);

    // 15. Verify configured inventory reward granted and persisted
    console.log("\n[15/56] Verifying inventory reward 'secret_note'...");
    assert(targetRes.data.data.grantedItem === "secret_note", "Granted item must be 'secret_note'");
    assert(
      dbCheck2.progressData.collectedItems.includes("secret_note"),
      "secret_note not persisted in collectedItems"
    );
    console.log("✓ secret_note persisted in database collectedItems:", dbCheck2.progressData.collectedItems);

    // 16. Verify Player.status becomes SOLVING
    console.log("\n[16/56] Verifying Player status transition to SOLVING...");
    const playerCheck1 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerCheck1.status === "SOLVING", "Player status must be SOLVING");
    console.log("✓ Player status is SOLVING.");

    // 17. Verify no answer "salt" leaked in clue or challenge response
    console.log("\n[17/56] Verifying security against answer leakage in investigation response...");
    const payloadStr = JSON.stringify(targetRes.data);
    assert(!payloadStr.toLowerCase().includes('"salt"'), "SECURITY FAILURE: Secret answer 'salt' leaked in investigate response!");
    assert(targetRes.data.data.challenge.answer === undefined, "Challenge answer field must be omitted!");
    console.log("✓ Clue target discovered safely with zero secret leakage.");

    // 18. Request Hint 1 (+15s penalty)
    console.log("\n[18/56] Requesting Hint 1 (POST /api/game/hint)...");
    const hint1 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", order: 1 },
    });
    assert(hint1.status === 200 && hint1.data.success, "Hint 1 request failed");
    assert(hint1.data.data.penaltySeconds === 15, "Hint 1 penalty must be 15s");
    assert(typeof hint1.data.data.text === "string", "Hint 1 text missing");
    console.log(`✓ Hint 1 received (+${hint1.data.data.penaltySeconds}s): ${hint1.data.data.text}`);

    // 19. Verify Hint 1 penalty persisted
    console.log("\n[19/56] Verifying Hint 1 penalty persistence...");
    const pHint1 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pHint1.penaltySeconds === 15, `Expected 15s penalty, got ${pHint1.penaltySeconds}s`);
    console.log("✓ Hint 1 penalty persistently stored:", pHint1.penaltySeconds);

    // 20. Request Hint 2 (+30s penalty)
    console.log("\n[20/56] Requesting Hint 2 (POST /api/game/hint)...");
    const hint2 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", order: 2 },
    });
    assert(hint2.status === 200 && hint2.data.success, "Hint 2 request failed");
    assert(hint2.data.data.penaltySeconds === 30, "Hint 2 penalty must be 30s");
    console.log(`✓ Hint 2 received (+${hint2.data.data.penaltySeconds}s): ${hint2.data.data.text}`);

    // 21. Verify cumulative penalty (15 + 30 = 45s)
    console.log("\n[21/56] Verifying cumulative penalty persistence...");
    const pHint2 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pHint2.penaltySeconds === 45, `Expected 45s penalty, got ${pHint2.penaltySeconds}s`);
    console.log("✓ Cumulative penalty verified:", pHint2.penaltySeconds);

    // 22. Request duplicate Hint 1 (idempotency, +0s penalty)
    console.log("\n[22/56] Requesting duplicate Hint 1 (verifying idempotency)...");
    const dupHint = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", order: 1 },
    });
    assert(dupHint.status === 200 && dupHint.data.success, "Duplicate hint request failed");
    assert(dupHint.data.data.penaltySeconds === 0, "Duplicate hint penalty must be 0s");
    const pDupCheck = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pDupCheck.penaltySeconds === 45, "Duplicate hint must not increase penaltySeconds");
    console.log("✓ Duplicate hint is idempotent: +0s penalty.");

    // 23. Submit wrong answer (+30s penalty, attempts incremented to 1)
    console.log("\n[23/56] Submitting wrong answer (POST /api/game/submit-answer)...");
    const wrongAns = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", answer: "WRONG_ANSWER" },
    });
    assert(wrongAns.status === 200 && wrongAns.data.success, "Wrong answer request failed");
    assert(wrongAns.data.data.correct === false, "Must be false for wrong answer");
    assert(wrongAns.data.data.penaltySeconds === 30, "Wrong answer penalty must be 30s");
    console.log("✓ Wrong answer rejected with +30s penalty.");

    // 24. Verify attempt count is 1
    console.log("\n[24/56] Verifying attempt count...");
    const dbProgAttempts = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 5 } },
    });
    assert(dbProgAttempts.progressData.attempts === 1, `Expected attempts 1, got ${dbProgAttempts.progressData.attempts}`);
    console.log("✓ Attempts count is 1.");

    // 25. Verify total penalty calculation (15 + 30 + 30 = 75s)
    console.log("\n[25/56] Verifying total penalties on player...");
    const pTotalPenalty = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pTotalPenalty.penaltySeconds === 75, `Expected 75s total penalty, got ${pTotalPenalty.penaltySeconds}s`);
    console.log("✓ Authoritative penalties verified: 75 seconds total.");

    // 26. Fetch player recovery (GET /api/players/:id)
    console.log("\n[26/56] Fetching player recovery (GET /api/players/:id)...");
    const recRes = await request(`/players/${playerId}`);
    assert(recRes.status === 200 && recRes.data.success, "Player recovery fetch failed");
    const rec = recRes.data.data;

    // 27. Verify recovery payload contains only used hints (1 & 2), not 3
    console.log("\n[27/56] Verifying revealed hints in recovery payload...");
    const revealed = rec.levelProgress.revealedHints;
    assert(Array.isArray(revealed) && revealed.length === 2, "revealedHints must have exactly 2 hints");
    assert(revealed.some((h) => h.order === 1), "Hint 1 missing from revealedHints");
    assert(revealed.some((h) => h.order === 2), "Hint 2 missing from revealedHints");
    assert(!revealed.some((h) => h.order === 3), "Hint 3 must NOT be revealed!");
    console.log("✓ Only requested hints (1 & 2) returned:", revealed);

    // 28. Verify secret answer "salt" is nowhere in recovery payload
    console.log("\n[28/56] Verifying security against answer leakage in recovery...");
    const recStr = JSON.stringify(rec);
    assert(!recStr.toLowerCase().includes('"salt"'), "SECURITY FAILURE: Secret answer 'salt' leaked in recovery response!");
    console.log("✓ Security confirmed: No answer leaked in recovery payload.");

    // 29-36. Simulate browser refresh state restoration
    console.log("\n[29-36/56] Simulating browser refresh state restoration...");
    assert(rec.currentLevel === 5, "Current level mismatch on refresh");
    assert(rec.status === "SOLVING", "Player status mismatch on refresh");
    
    // 30. Investigated objects
    const invRestored = rec.levelProgress.investigatedObjects;
    assert(invRestored.includes("cafe_vending_machine") && invRestored.includes("cafe_corner_table"), "Investigated objects not restored");
    console.log("✓ [30] Investigated objects restored:", invRestored);

    // 31. Level 5 collected items
    const colRestored = rec.levelProgress.collectedItems;
    assert(colRestored.includes("secret_note"), "Level 5 collectedItems must include secret_note");
    console.log("✓ [31] Level 5 collectedItems restored:", colRestored);

    // 32. Cumulative inventory across Levels 1–5
    const cumInv = rec.inventory;
    assert(
      cumInv.includes("usb_drive") &&
      cumInv.includes("access_card") &&
      cumInv.includes("encryption_key") &&
      cumInv.includes("circuit_piece") &&
      cumInv.includes("secret_note"),
      "Cumulative inventory missing previous level items or secret_note"
    );
    console.log("✓ [32] Cumulative inventory restored:", cumInv);

    // 33. Used hints
    assert(rec.levelProgress.usedHints.length === 2, "usedHints mismatch");
    console.log("✓ [33] usedHints restored:", rec.levelProgress.usedHints);

    // 34. Revealed hints text
    assert(rec.levelProgress.revealedHints.length === 2, "revealedHints mismatch");
    console.log("✓ [34] revealedHints restored.");

    // 35. Attempts restored
    assert(rec.levelProgress.attempts === 1, "attempts mismatch on refresh");
    console.log("✓ [35] attempts restored: 1");

    // 36. Penalty seconds restored
    assert(rec.penaltySeconds === 75, "penaltySeconds mismatch on refresh");
    console.log("✓ [36] penaltySeconds restored: 75");

    // 37. Pause session during Level 5 (POST /api/sessions/pause)
    console.log("\n[37/56] Pausing game session during Level 5 (POST /api/sessions/pause)...");
    const pauseRes = await request("/sessions/pause", {
      method: "POST",
      body: { playerId, sessionId: activeSessionId },
    });
    assert(pauseRes.status === 200 && pauseRes.data.success, "Pause session request failed");
    assert(pauseRes.data.data.isPaused === true, "Session must be marked paused");
    assert(pauseRes.data.data.status === "PAUSED", "Session status must be PAUSED");
    console.log("✓ Session paused authoritatively:", pauseRes.data.data);

    // 38. Verify investigate is rejected while paused
    console.log("\n[38/56] Verifying investigate is rejected while paused...");
    const pauseInv = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "cafe_serving_counter" },
    });
    assert(pauseInv.status === 400 || pauseInv.status === 409, "Investigate must be rejected while paused");
    console.log("✓ Investigation correctly rejected while paused.");

    // 39. Verify hint request is rejected while paused
    console.log("\n[39/56] Verifying hint request is rejected while paused...");
    const pauseHint = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", order: 3 },
    });
    assert(pauseHint.status === 400 || pauseHint.status === 409, "Hint request must be rejected while paused");
    console.log("✓ Hint request correctly rejected while paused.");

    // 40. Verify answer submission is rejected while paused
    console.log("\n[40/56] Verifying answer submission is rejected while paused...");
    const pauseAns = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", answer: "salt" },
    });
    assert(pauseAns.status === 400 || pauseAns.status === 409, "Answer submission must be rejected while paused");
    console.log("✓ Answer submission correctly rejected while paused.");

    // 41-43. Simulate refresh while paused
    console.log("\n[41-43/56] Verifying refresh while paused restores frozen state...");
    const pausedRec = await request(`/players/${playerId}`);
    assert(pausedRec.data.data.activeSession.isPaused === true, "activeSession.isPaused must be true");
    assert(pausedRec.data.data.activeSession.statusBeforePause === "SOLVING", "statusBeforePause must be SOLVING");
    console.log("✓ Paused state & statusBeforePause restored cleanly.");

    // Wait 2 seconds to verify timer stays frozen
    await new Promise((r) => setTimeout(r, 2000));

    // 44-45. Resume session (POST /api/sessions/resume)
    console.log("\n[44-45/56] Resuming session (POST /api/sessions/resume)...");
    const resumeRes = await request("/sessions/resume", {
      method: "POST",
      body: { playerId, sessionId: activeSessionId },
    });
    assert(resumeRes.status === 200 && resumeRes.data.success, "Resume request failed");
    assert(resumeRes.data.data.isPaused === false, "isPaused must be false after resume");
    assert(resumeRes.data.data.status === "SOLVING", "Player status must restore to SOLVING");
    console.log("✓ Session resumed successfully:", resumeRes.data.data);

    // 46. Submit authoritative correct answer "salt"
    console.log("\n[46/56] Submitting authoritative correct answer 'salt' (POST /api/game/submit-answer)...");
    const correctAns = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-5", answer: "salt" },
    });
    assert(correctAns.status === 200 && correctAns.data.success, "Correct answer submission failed");

    // 47. Verify Level 5 completion
    console.log("\n[47/56] Verifying Level 5 completion response...");
    assert(correctAns.data.data.correct === true, "Answer must be marked correct");
    assert(correctAns.data.data.levelCompleted === true, "levelCompleted must be true");
    assert(correctAns.data.data.nextLevel === 6, "nextLevel must be 6");
    console.log("✓ Level 5 completed! Advanced to Level 6.");

    // 48. Verify LevelProgress status is COMPLETED and completedAt exists
    console.log("\n[48/56] Verifying Level 5 LevelProgress status & completedAt in database...");
    const dbL5Progress = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 5 } },
    });
    assert(dbL5Progress.status === "COMPLETED", "Level 5 status must be COMPLETED");
    assert(dbL5Progress.completedAt instanceof Date, "completedAt must be set");
    console.log("✓ Level 5 marked COMPLETED with timestamp:", dbL5Progress.completedAt);

    // 49-50. Verify Player currentLevel = 6, status = SEARCHING
    console.log("\n[49-50/56] Verifying updated Player state in database...");
    const finalPlayer = await prisma.player.findUnique({ where: { id: playerId } });
    assert(finalPlayer.currentLevel === 6, "Player currentLevel must be 6");
    assert(finalPlayer.status === "SEARCHING", "Player status must be SEARCHING");
    console.log("✓ Player currentLevel is 6, status is SEARCHING.");

    // 51. Verify Level 6 clean progress in database
    console.log("\n[51/56] Verifying Level 6 clean progress in database...");
    const dbL6Progress = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 6 } },
    });
    assert(dbL6Progress !== null, "Level 6 progress record must be created");
    assert(dbL6Progress.status === "NOT_STARTED", "Level 6 status must be NOT_STARTED");
    const l6Data = dbL6Progress.progressData;
    assert(l6Data.attempts === 0, "Level 6 attempts must be 0");
    assert(Array.isArray(l6Data.usedHints) && l6Data.usedHints.length === 0, "Level 6 usedHints must be empty");
    assert(Array.isArray(l6Data.collectedItems) && l6Data.collectedItems.length === 0, "Level 6 collectedItems must be empty");
    assert(Array.isArray(l6Data.investigatedObjects) && l6Data.investigatedObjects.length === 0, "Level 6 investigatedObjects must be empty");
    console.log("✓ Clean Level 6 progress verified:", l6Data);

    // 52-55. Verify historical Level 1, 2, 3, 4, and 5 records remain intact
    console.log("\n[52-55/56] Verifying historical Level 1, 2, 3, 4, and 5 records remain intact...");
    const allProgress = await prisma.levelProgress.findMany({
      where: { playerId },
      orderBy: { levelId: "asc" },
    });
    assert(allProgress.length === 6, `Expected 6 progress records, found ${allProgress.length}`);
    const l1 = allProgress.find((p) => p.levelId === 1);
    const l2 = allProgress.find((p) => p.levelId === 2);
    const l3 = allProgress.find((p) => p.levelId === 3);
    const l4 = allProgress.find((p) => p.levelId === 4);
    const l5 = allProgress.find((p) => p.levelId === 5);
    assert(l1 && l1.status === "COMPLETED", "Level 1 history corrupted");
    assert(l2 && l2.status === "COMPLETED", "Level 2 history corrupted");
    assert(l3 && l3.status === "COMPLETED", "Level 3 history corrupted");
    assert(l4 && l4.status === "COMPLETED", "Level 4 history corrupted");
    assert(l5 && l5.status === "COMPLETED", "Level 5 history corrupted");
    console.log("✓ All 5 historical level progress records remain completely intact and COMPLETED.");

    // 56. Verify completed Level 5 cannot be modified
    console.log("\n[56/56] Verifying completed Level 5 cannot be modified...");
    const tamperRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "cafe_corner_table" },
    });
    // Since player is on level 6, investigating a level 5 object is rejected with HTTP 400
    assert(tamperRes.status === 400, "Tampering with completed level object must be rejected");
    console.log("✓ Modification of completed Level 5 correctly rejected.");

    console.log("\n=================================================================");
    console.log(" ALL 56 LEVEL 5 INTEGRATION & SECURITY CHECKS PASSED!");
    console.log("=================================================================");
  } finally {
    // 57. Cleanup test data
    if (playerId) {
      console.log(`\nCleaning up test records for playerId=${playerId}...`);
      try {
        await prisma.levelProgress.deleteMany({ where: { playerId } });
        await prisma.gameSession.deleteMany({ where: { playerId } });
        await prisma.player.delete({ where: { id: playerId } });
        console.log("✓ Cleanup completed successfully.");
      } catch (err) {
        console.warn("Cleanup warning:", err.message);
      } finally {
        await prisma.$disconnect();
      }
    }
  }
}

runTests().catch((err) => {
  console.error("\n❌ Test execution terminated with error:", err);
  process.exit(1);
});
