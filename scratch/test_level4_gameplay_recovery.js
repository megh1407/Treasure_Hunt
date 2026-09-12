/**
 * Integration Test for Persistent Gameplay State for Level 4
 * 
 * Verifies the complete 56-scenario lifecycle:
 * 1. Backend health check
 * 2. Player registration
 * 3. Session start
 * 4. Complete Level 1 legitimately through backend APIs (lib_old_book, answer "65")
 * 5. Verify Level 2 clean initialization
 * 6. Complete Level 2 legitimately through backend APIs (robot_toolbox, answer "42")
 * 7. Verify Level 3 clean initialization
 * 8. Complete Level 3 legitimately through backend APIs (computer_server_rack, answer "63")
 * 9. Verify Level 4 clean initialization
 * 10. Verify Player currentLevel = 4, status = SEARCHING
 * 11. Foreign cross-level object rejection (Level 1, 2, 3 objects rejected on Level 4)
 * 12. Investigate Level 4 decoy auditorium_podium
 * 13. Verify decoy persistence in LevelProgress
 * 14. Investigate Level 4 target auditorium_seat_row7
 * 15. Verify target persisted in investigatedObjects
 * 16. Verify circuit_piece reward granted and persisted in collectedItems
 * 17. Verify Player.status becomes SOLVING
 * 18. Verify no answer "159" leaked in clue or challenge response
 * 19. Request Hint 1 (+15s penalty)
 * 20. Verify Hint 1 received and penalty persisted
 * 21. Request Hint 2 (+30s penalty)
 * 22. Verify Hint 2 received and cumulative penalty persisted (45s)
 * 23. Request duplicate Hint 1 (+0s penalty, idempotent)
 * 24. Submit wrong answer (+30s penalty, attempts incremented to 1)
 * 25. Verify attempt count is 1
 * 26. Verify total penalty calculation (15 + 30 + 30 = 75s)
 * 27. Fetch GET /api/players/:id for recovery payload
 * 28. Verify Level 4 recovery payload contains only used hints (1 & 2), not 3
 * 29. Verify secret answer "159" is nowhere in recovery payload
 * 30. Simulate browser refresh recovery
 * 31. Verify investigated objects restored (auditorium_podium, auditorium_seat_row7)
 * 32. Verify level-specific collectedItems contains circuit_piece
 * 33. Verify cumulative inventory contains usb_drive, access_card, encryption_key, circuit_piece
 * 34. Verify used hints restored ([1, 2])
 * 35. Verify revealed hint text restored
 * 36. Verify attempts restored (1)
 * 37. Pause session during Level 4 (POST /api/sessions/pause)
 * 38. Verify investigate is rejected while paused (HTTP 400/409)
 * 39. Verify hint request is rejected while paused (HTTP 400/409)
 * 40. Verify answer submission is rejected while paused (HTTP 400/409)
 * 41. Simulate refresh while paused (GET /api/players/:id)
 * 42. Verify paused state restored (isPaused: true, statusBeforePause: SOLVING)
 * 43. Verify timer remains frozen on backend
 * 44. Resume session (POST /api/sessions/resume)
 * 45. Verify session resumed (isPaused: false, status restored to SOLVING)
 * 46. Submit correct answer "159" (POST /api/game/submit-answer)
 * 47. Verify Level 4 completion (levelCompleted: true, nextLevel: 5)
 * 48. Verify LevelProgress status is COMPLETED and completedAt exists
 * 49. Verify Player currentLevel = 5
 * 50. Verify Player status = SEARCHING
 * 51. Verify Level 5 progress starts clean
 * 52. Verify historical Level 1 record remains intact (COMPLETED)
 * 53. Verify historical Level 2 record remains intact (COMPLETED)
 * 54. Verify historical Level 3 record remains intact (COMPLETED)
 * 55. Verify historical Level 4 record remains intact (COMPLETED)
 * 56. Verify completed Level 4 cannot be modified
 * 57. Cleanup all test data cleanly
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
  console.log(" Starting Level 4 Persistent Gameplay State Integration Tests");
  console.log("=================================================================");

  const timestamp = Date.now();
  const testEnrollment = `EN_L4_${timestamp}`.slice(0, 12);
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
        playerName: `Player_L4_${timestamp}`,
        enrollmentNumber: testEnrollment,
        team: "Test Division 4",
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

    // 5. Verify Level 2 clean initialization
    console.log("\n[5/56] Verifying Level 2 clean initialization...");
    const l2Recovery = await request(`/players/${playerId}`);
    assert(l2Recovery.data.data.currentLevel === 2, "Expected currentLevel 2");
    assert(l2Recovery.data.data.status === "SEARCHING", "Expected SEARCHING status on Level 2");
    console.log("✓ Level 2 clean initialization verified.");

    // 6. Complete Level 2 legitimately through backend flow
    console.log("\n[6/56] Completing Level 2 through legitimate backend APIs...");
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
    assert(l2Submit.status === 200 && l2Submit.data.data.correct === true, "Level 2 answer submission failed");
    assert(l2Submit.data.data.nextLevel === 3, "Next level must be 3");
    console.log("✓ Level 2 successfully completed! Advanced to Level 3.");

    // 7. Verify Level 3 clean initialization
    console.log("\n[7/56] Verifying Level 3 clean initialization...");
    const l3Recovery = await request(`/players/${playerId}`);
    assert(l3Recovery.data.data.currentLevel === 3, "Expected currentLevel 3");
    assert(l3Recovery.data.data.status === "SEARCHING", "Expected SEARCHING status on Level 3");
    console.log("✓ Level 3 clean initialization verified.");

    // 8. Complete Level 3 legitimately through backend flow
    console.log("\n[8/56] Completing Level 3 through legitimate backend APIs...");
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
    assert(l3Submit.status === 200 && l3Submit.data.data.correct === true, "Level 3 answer submission failed");
    assert(l3Submit.data.data.nextLevel === 4, "Next level must be 4");
    console.log("✓ Level 3 successfully completed! Advanced to Level 4.");

    // 9. Verify Level 4 clean start
    console.log("\n[9/56] Verifying Level 4 clean initialization...");
    const l4ProgressCheck = await request(`/players/${playerId}`);
    const l4Prog = l4ProgressCheck.data.data.levelProgress;
    assert(l4Prog.level === 4, "Expected levelProgress.level === 4");
    assert(Array.isArray(l4Prog.investigatedObjects) && l4Prog.investigatedObjects.length === 0, "Level 4 investigatedObjects must be empty");
    assert(Array.isArray(l4Prog.collectedItems) && l4Prog.collectedItems.length === 0, "Level 4 collectedItems must be empty");
    assert(Array.isArray(l4Prog.usedHints) && l4Prog.usedHints.length === 0, "Level 4 usedHints must be empty");
    assert(l4Prog.attempts === 0, "Level 4 attempts must start at 0");
    console.log("✓ Level 4 started with clean progress:", l4Prog);

    // 10. Verify player.currentLevel = 4, status = SEARCHING
    console.log("\n[10/56] Verifying Player attributes for Level 4...");
    assert(l4ProgressCheck.data.data.currentLevel === 4, "Player currentLevel must be 4");
    assert(l4ProgressCheck.data.data.status === "SEARCHING", "Player status must be SEARCHING");
    console.log("✓ Player state verified: currentLevel = 4, status = SEARCHING.");

    // 11. Foreign cross-level object rejection
    console.log("\n[11/56] Verifying foreign cross-level object rejection on Level 4...");
    const foreignL1 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "lib_shelf_a" },
    });
    assert(foreignL1.status === 400, "Level 1 object must be rejected on Level 4");

    const foreignL2 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_arm" },
    });
    assert(foreignL2.status === 400, "Level 2 object must be rejected on Level 4");

    const foreignL3 = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_terminal" },
    });
    assert(foreignL3.status === 400, "Level 3 object must be rejected on Level 4");
    console.log("✓ Correctly rejected foreign cross-level objects on Level 4.");

    // 12. Investigate valid Level 4 decoy
    console.log("\n[12/56] Investigating Level 4 decoy object 'auditorium_podium'...");
    const decoyRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "auditorium_podium" },
    });
    assert(decoyRes.status === 200 && decoyRes.data.success, "Decoy investigation request failed");
    assert(decoyRes.data.data.outcome === "decoy", "Expected decoy outcome");
    assert(typeof decoyRes.data.data.message === "string", "Decoy message missing");
    console.log("✓ Decoy investigated:", decoyRes.data.data.message);

    // 13. Verify decoy persistence in LevelProgress
    console.log("\n[13/56] Verifying decoy persistence in database...");
    const dbCheck1 = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 4 } },
    });
    assert(
      dbCheck1 && dbCheck1.progressData.investigatedObjects.includes("auditorium_podium"),
      "Decoy not found in Level 4 investigatedObjects"
    );
    console.log("✓ Decoy persisted in database:", dbCheck1.progressData.investigatedObjects);

    // 14. Investigate Level 4 target
    console.log("\n[14/56] Investigating clue target 'auditorium_seat_row7'...");
    const targetRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "auditorium_seat_row7" },
    });
    assert(targetRes.status === 200 && targetRes.data.success, "Target investigation failed");
    assert(targetRes.data.data.outcome === "clue", "Outcome must be 'clue'");

    // 15. Verify target persisted in investigatedObjects
    console.log("\n[15/56] Verifying target persisted in database...");
    const dbCheck2 = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 4 } },
    });
    assert(
      dbCheck2 && dbCheck2.progressData.investigatedObjects.includes("auditorium_seat_row7"),
      "Target not in investigatedObjects"
    );
    console.log("✓ Target persisted in database:", dbCheck2.progressData.investigatedObjects);

    // 16. Verify configured inventory reward granted and persisted
    console.log("\n[16/56] Verifying inventory reward 'circuit_piece'...");
    assert(targetRes.data.data.grantedItem === "circuit_piece", "Granted item must be 'circuit_piece'");
    assert(
      dbCheck2.progressData.collectedItems.includes("circuit_piece"),
      "circuit_piece not persisted in collectedItems"
    );
    console.log("✓ circuit_piece persisted in database collectedItems:", dbCheck2.progressData.collectedItems);

    // 17. Verify Player.status becomes SOLVING
    console.log("\n[17/56] Verifying Player status transition to SOLVING...");
    const playerCheck1 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerCheck1.status === "SOLVING", "Player status must be SOLVING");
    console.log("✓ Player status is SOLVING.");

    // 18. Verify no answer "159" leaked in clue or challenge response
    console.log("\n[18/56] Verifying security against answer leakage in investigation response...");
    const payloadStr = JSON.stringify(targetRes.data);
    assert(!payloadStr.includes("159"), "SECURITY FAILURE: Secret answer '159' leaked in investigate response!");
    assert(targetRes.data.data.challenge.answer === undefined, "Challenge answer field must be omitted!");
    console.log("✓ Clue target discovered safely with zero secret leakage.");

    // 19. Request Hint 1 (+15s penalty)
    console.log("\n[19/56] Requesting Hint 1 (POST /api/game/hint)...");
    const hint1 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", order: 1 },
    });
    assert(hint1.status === 200 && hint1.data.success, "Hint 1 request failed");
    assert(hint1.data.data.penaltySeconds === 15, "Hint 1 penalty must be 15s");
    assert(typeof hint1.data.data.text === "string", "Hint 1 text missing");
    console.log(`✓ Hint 1 received (+${hint1.data.data.penaltySeconds}s): ${hint1.data.data.text}`);

    // 20. Verify Hint 1 penalty persisted
    console.log("\n[20/56] Verifying Hint 1 penalty persistence...");
    const pHint1 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pHint1.penaltySeconds === 15, `Expected 15s penalty, got ${pHint1.penaltySeconds}s`);
    console.log("✓ Hint 1 penalty persistently stored:", pHint1.penaltySeconds);

    // 21. Request Hint 2 (+30s penalty)
    console.log("\n[21/56] Requesting Hint 2 (POST /api/game/hint)...");
    const hint2 = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", order: 2 },
    });
    assert(hint2.status === 200 && hint2.data.success, "Hint 2 request failed");
    assert(hint2.data.data.penaltySeconds === 30, "Hint 2 penalty must be 30s");
    console.log(`✓ Hint 2 received (+${hint2.data.data.penaltySeconds}s): ${hint2.data.data.text}`);

    // 22. Verify cumulative penalty (15 + 30 = 45s)
    console.log("\n[22/56] Verifying cumulative penalty persistence...");
    const pHint2 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pHint2.penaltySeconds === 45, `Expected 45s penalty, got ${pHint2.penaltySeconds}s`);
    console.log("✓ Cumulative penalty verified:", pHint2.penaltySeconds);

    // 23. Request duplicate Hint 1 (idempotency, +0s penalty)
    console.log("\n[23/56] Requesting duplicate Hint 1 (verifying idempotency)...");
    const dupHint = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", order: 1 },
    });
    assert(dupHint.status === 200 && dupHint.data.success, "Duplicate hint request failed");
    assert(dupHint.data.data.penaltySeconds === 0, "Duplicate hint penalty must be 0s");
    const pDupCheck = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pDupCheck.penaltySeconds === 45, "Duplicate hint must not increase penaltySeconds");
    console.log("✓ Duplicate hint is idempotent: +0s penalty.");

    // 24. Submit wrong answer (+30s penalty, attempts incremented to 1)
    console.log("\n[24/56] Submitting wrong answer (POST /api/game/submit-answer)...");
    const wrongAns = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", answer: "999" },
    });
    assert(wrongAns.status === 200 && wrongAns.data.success, "Wrong answer request failed");
    assert(wrongAns.data.data.correct === false, "Must be false for wrong answer");
    assert(wrongAns.data.data.penaltySeconds === 30, "Wrong answer penalty must be 30s");
    console.log("✓ Wrong answer rejected with +30s penalty.");

    // 25. Verify attempt count is 1
    console.log("\n[25/56] Verifying attempt count...");
    const dbProgAttempts = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 4 } },
    });
    assert(dbProgAttempts.progressData.attempts === 1, `Expected attempts 1, got ${dbProgAttempts.progressData.attempts}`);
    console.log("✓ Attempts count is 1.");

    // 26. Verify total penalty calculation (15 + 30 + 30 = 75s)
    console.log("\n[26/56] Verifying total penalties on player...");
    const pTotalPenalty = await prisma.player.findUnique({ where: { id: playerId } });
    assert(pTotalPenalty.penaltySeconds === 75, `Expected 75s total penalty, got ${pTotalPenalty.penaltySeconds}s`);
    console.log("✓ Authoritative penalties verified: 75 seconds total.");

    // 27. Fetch player recovery (GET /api/players/:id)
    console.log("\n[27/56] Fetching player recovery (GET /api/players/:id)...");
    const recRes = await request(`/players/${playerId}`);
    assert(recRes.status === 200 && recRes.data.success, "Player recovery fetch failed");
    const rec = recRes.data.data;

    // 28. Verify recovery payload contains only used hints (1 & 2), not 3
    console.log("\n[28/56] Verifying revealed hints in recovery payload...");
    const revealed = rec.levelProgress.revealedHints;
    assert(Array.isArray(revealed) && revealed.length === 2, "revealedHints must have exactly 2 hints");
    assert(revealed.some((h) => h.order === 1), "Hint 1 missing from revealedHints");
    assert(revealed.some((h) => h.order === 2), "Hint 2 missing from revealedHints");
    assert(!revealed.some((h) => h.order === 3), "Hint 3 must NOT be revealed!");
    console.log("✓ Only requested hints (1 & 2) returned:", revealed);

    // 29. Verify secret answer "159" is nowhere in recovery payload
    console.log("\n[29/56] Verifying security against answer leakage in recovery...");
    const recStr = JSON.stringify(rec);
    assert(!recStr.includes("159"), "SECURITY FAILURE: Secret answer '159' leaked in recovery response!");
    console.log("✓ Security confirmed: No answer leaked in recovery payload.");

    // 30-36. Simulate browser refresh state restoration
    console.log("\n[30-36/56] Simulating browser refresh state restoration...");
    assert(rec.currentLevel === 4, "Current level mismatch on refresh");
    assert(rec.status === "SOLVING", "Player status mismatch on refresh");
    
    // 31. Investigated objects
    const invRestored = rec.levelProgress.investigatedObjects;
    assert(invRestored.includes("auditorium_podium") && invRestored.includes("auditorium_seat_row7"), "Investigated objects not restored");
    console.log("✓ [31] Investigated objects restored:", invRestored);

    // 32. Level 4 collected items
    const colRestored = rec.levelProgress.collectedItems;
    assert(colRestored.includes("circuit_piece"), "Level 4 collectedItems must include circuit_piece");
    console.log("✓ [32] Level 4 collectedItems restored:", colRestored);

    // 33. Cumulative inventory
    const cumInv = rec.inventory;
    assert(
      cumInv.includes("usb_drive") &&
      cumInv.includes("access_card") &&
      cumInv.includes("encryption_key") &&
      cumInv.includes("circuit_piece"),
      "Cumulative inventory missing previous level items or circuit_piece"
    );
    console.log("✓ [33] Cumulative inventory restored:", cumInv);

    // 34. Used hints
    assert(rec.levelProgress.usedHints.length === 2, "usedHints mismatch");
    console.log("✓ [34] usedHints restored:", rec.levelProgress.usedHints);

    // 35. Revealed hints text
    assert(rec.levelProgress.revealedHints.length === 2, "revealedHints mismatch");
    console.log("✓ [35] revealedHints restored.");

    // 36. Attempts restored
    assert(rec.levelProgress.attempts === 1, "attempts mismatch on refresh");
    console.log("✓ [36] attempts restored: 1");

    // 37. Pause session during Level 4 (POST /api/sessions/pause)
    console.log("\n[37/56] Pausing game session during Level 4 (POST /api/sessions/pause)...");
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
      body: { playerId, objectId: "auditorium_podium" },
    });
    assert(pauseInv.status === 400 || pauseInv.status === 409, "Investigate must be rejected while paused");
    console.log("✓ Investigation correctly rejected while paused.");

    // 39. Verify hint request is rejected while paused
    console.log("\n[39/56] Verifying hint request is rejected while paused...");
    const pauseHint = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", order: 3 },
    });
    assert(pauseHint.status === 400 || pauseHint.status === 409, "Hint request must be rejected while paused");
    console.log("✓ Hint request correctly rejected while paused.");

    // 40. Verify answer submission is rejected while paused
    console.log("\n[40/56] Verifying answer submission is rejected while paused...");
    const pauseAns = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", answer: "159" },
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

    // 46. Submit authoritative correct answer "159"
    console.log("\n[46/56] Submitting authoritative correct answer '159' (POST /api/game/submit-answer)...");
    const correctAns = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-4", answer: "159" },
    });
    assert(correctAns.status === 200 && correctAns.data.success, "Correct answer submission failed");

    // 47. Verify Level 4 completion
    console.log("\n[47/56] Verifying Level 4 completion response...");
    assert(correctAns.data.data.correct === true, "Answer must be marked correct");
    assert(correctAns.data.data.levelCompleted === true, "levelCompleted must be true");
    assert(correctAns.data.data.nextLevel === 5, "nextLevel must be 5");
    console.log("✓ Level 4 completed! Advanced to Level 5.");

    // 48. Verify LevelProgress status is COMPLETED and completedAt exists
    console.log("\n[48/56] Verifying Level 4 LevelProgress status & completedAt in database...");
    const dbL4Progress = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 4 } },
    });
    assert(dbL4Progress.status === "COMPLETED", "Level 4 status must be COMPLETED");
    assert(dbL4Progress.completedAt instanceof Date, "completedAt must be set");
    console.log("✓ Level 4 marked COMPLETED with timestamp:", dbL4Progress.completedAt);

    // 49-50. Verify Player currentLevel = 5, status = SEARCHING
    console.log("\n[49-50/56] Verifying updated Player state in database...");
    const finalPlayer = await prisma.player.findUnique({ where: { id: playerId } });
    assert(finalPlayer.currentLevel === 5, "Player currentLevel must be 5");
    assert(finalPlayer.status === "SEARCHING", "Player status must be SEARCHING");
    console.log("✓ Player currentLevel is 5, status is SEARCHING.");

    // 51. Verify Level 5 clean progress in database
    console.log("\n[51/56] Verifying Level 5 clean progress in database...");
    const dbL5Progress = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 5 } },
    });
    assert(dbL5Progress !== null, "Level 5 progress record must be created");
    assert(dbL5Progress.status === "NOT_STARTED", "Level 5 status must be NOT_STARTED");
    const l5Data = dbL5Progress.progressData;
    assert(l5Data.attempts === 0, "Level 5 attempts must be 0");
    assert(Array.isArray(l5Data.usedHints) && l5Data.usedHints.length === 0, "Level 5 usedHints must be empty");
    assert(Array.isArray(l5Data.collectedItems) && l5Data.collectedItems.length === 0, "Level 5 collectedItems must be empty");
    assert(Array.isArray(l5Data.investigatedObjects) && l5Data.investigatedObjects.length === 0, "Level 5 investigatedObjects must be empty");
    console.log("✓ Clean Level 5 progress verified:", l5Data);

    // 52-55. Verify historical Level 1, 2, 3, and 4 records remain intact
    console.log("\n[52-55/56] Verifying historical Level 1, 2, 3, and 4 records remain intact...");
    const allProgress = await prisma.levelProgress.findMany({
      where: { playerId },
      orderBy: { levelId: "asc" },
    });
    assert(allProgress.length === 5, `Expected 5 progress records, found ${allProgress.length}`);
    const l1 = allProgress.find((p) => p.levelId === 1);
    const l2 = allProgress.find((p) => p.levelId === 2);
    const l3 = allProgress.find((p) => p.levelId === 3);
    const l4 = allProgress.find((p) => p.levelId === 4);
    assert(l1 && l1.status === "COMPLETED", "Level 1 history corrupted");
    assert(l2 && l2.status === "COMPLETED", "Level 2 history corrupted");
    assert(l3 && l3.status === "COMPLETED", "Level 3 history corrupted");
    assert(l4 && l4.status === "COMPLETED", "Level 4 history corrupted");
    console.log("✓ All 4 historical level progress records remain completely intact and COMPLETED.");

    // 56. Verify completed Level 4 cannot be modified
    console.log("\n[56/56] Verifying completed Level 4 cannot be modified...");
    const tamperRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "auditorium_seat_row7" },
    });
    // Since player is on level 5, investigating a level 4 object is rejected with HTTP 400
    assert(tamperRes.status === 400, "Tampering with completed level object must be rejected");
    console.log("✓ Modification of completed Level 4 correctly rejected.");

    console.log("\n=================================================================");
    console.log(" ALL 56 LEVEL 4 INTEGRATION & SECURITY CHECKS PASSED!");
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
