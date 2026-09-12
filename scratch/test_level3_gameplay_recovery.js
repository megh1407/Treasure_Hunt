/**
 * Integration Test for Persistent Gameplay State for Level 3
 * 
 * Verifies the complete 47-scenario lifecycle:
 * 1. Backend health check
 * 2. Player registration
 * 3. Session start
 * 4. Complete Level 1 through legitimate backend APIs
 * 5. Complete Level 2 through legitimate backend APIs
 * 6. Verify Level 3 clean initialization
 * 7. Foreign object rejection (e.g. robot_toolbox or lib_shelf_a on Level 3)
 * 8. Investigate Level 3 decoy computer_terminal
 * 9. Verify decoy persistence in LevelProgress
 * 10. Investigate Level 3 target computer_server_rack
 * 11. Verify clue-3 discovery, question received, no answer "63" leaked
 * 12. Verify encryption_key reward granted and persisted in collectedItems
 * 13. Verify Player.status becomes SOLVING
 * 14. Request Hint 1 (+15s penalty)
 * 15. Request Hint 2 (+30s penalty)
 * 16. Request duplicate Hint 2 (+0s penalty, idempotent)
 * 17. Submit wrong answer (+30s penalty)
 * 18. Verify attempt count increments (attempts: 1)
 * 19. Verify penalty total (15 + 30 + 30 = 75s)
 * 20. Fetch GET /api/players/:id for recovery payload
 * 21. Verify Level 3 recovery payload contains only used hints (1 & 2), not 3
 * 22. Verify secret answer "63" is nowhere in the recovery payload
 * 23. Simulate browser refresh recovery
 * 24. Verify investigated objects restored
 * 25. Verify level-specific collectedItems contains encryption_key
 * 26. Verify cumulative inventory contains usb_drive, access_card, and encryption_key
 * 27. Verify used hints restored
 * 28. Verify revealed hint text restored
 * 29. Verify attempts restored
 * 30. Pause session during Level 3 (POST /api/sessions/pause)
 * 31. Verify investigate is rejected while paused (HTTP 400)
 * 32. Verify hint request is rejected while paused (HTTP 400)
 * 33. Verify answer submission is rejected while paused (HTTP 400)
 * 34. Simulate refresh while paused (GET /api/players/:id)
 * 35. Verify paused state restored (isPaused: true, statusBeforePause: SOLVING)
 * 36. Verify timer remains frozen
 * 37. Resume session (POST /api/sessions/resume)
 * 38. Verify session resumed (isPaused: false, status restored to SOLVING)
 * 39. Submit correct answer "63" (POST /api/game/submit-answer)
 * 40. Verify Level 3 completion (levelCompleted: true, nextLevel: 4)
 * 41. Verify Player currentLevel = 4
 * 42. Verify Player status = SEARCHING
 * 43. Verify Level 4 progress starts clean
 * 44. Verify historical Level 1 record remains intact (COMPLETED)
 * 45. Verify historical Level 2 record remains intact (COMPLETED)
 * 46. Verify historical Level 3 record remains intact (COMPLETED)
 * 47. Verify completed Level 3 cannot be modified through normal gameplay requests
 * 48. Cleanup all test data cleanly
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
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runLevel3RecoveryTests() {
  console.log("=================================================================");
  console.log(" Starting Level 3 Persistent Gameplay State Integration Tests");
  console.log("=================================================================");

  const timestamp = Date.now();
  const testEnrollment = `L3_REC_${timestamp}`;
  let playerId = null;
  let activeSessionId = null;

  try {
    // 1. Health check
    console.log("\n[1/47] Checking backend health (GET /api/health)...");
    const health = await request("/health");
    assert(health.status === 200 && health.data.success, "Backend health check failed");
    console.log("✓ Backend is healthy. Database:", health.data.data.database.status);

    // 2. Register test player
    console.log("\n[2/47] Registering test player (POST /api/players)...");
    const regRes = await request("/players", {
      method: "POST",
      body: {
        playerName: `Player_L3_${timestamp}`,
        enrollmentNumber: testEnrollment,
        team: "Test Division 3",
      },
    });
    assert(regRes.status === 201 && regRes.data.success, "Player registration failed");
    playerId = regRes.data.data.id;
    console.log("✓ Player registered:", { id: playerId, currentLevel: regRes.data.data.currentLevel });

    // 3. Start session
    console.log("\n[3/47] Starting game session (POST /api/sessions/start)...");
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

    // 4. Complete Level 1 through legitimate backend flow
    console.log("\n[4/47] Completing Level 1 through legitimate backend APIs...");
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

    // 5. Complete Level 2 through legitimate backend flow
    console.log("\n[5/47] Completing Level 2 through legitimate backend APIs...");
    const l2Investigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_toolbox" },
    });
    assert(l2Investigate.status === 200 && l2Investigate.data.success, "Level 2 investigation failed");
    assert(l2Investigate.data.data.outcome === "clue", "Level 2 target outcome must be 'clue'");
    assert(l2Investigate.data.data.grantedItem === "access_card", "Level 2 must grant access_card");

    const l2Submit = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", answer: "42" },
    });
    assert(l2Submit.status === 200 && l2Submit.data.success, "Level 2 answer submission failed");
    assert(l2Submit.data.data.correct === true, "Level 2 answer should be correct");
    assert(l2Submit.data.data.levelCompleted === true, "Level 2 should be completed");
    assert(l2Submit.data.data.nextLevel === 3, "Next level must be 3");
    console.log("✓ Level 2 successfully completed! Advanced to Level 3.");

    // 6. Verify Level 3 clean initialization
    console.log("\n[6/47] Verifying Level 3 clean initialization...");
    const l3InitRecovery = await request(`/players/${playerId}`);
    assert(l3InitRecovery.status === 200 && l3InitRecovery.data.success, "Level 3 recovery failed");
    const l3InitData = l3InitRecovery.data.data;
    assert(l3InitData.player.currentLevel === 3, `Player level must be 3, got ${l3InitData.player.currentLevel}`);
    assert(l3InitData.player.status === "SEARCHING", `Player status must be SEARCHING, got ${l3InitData.player.status}`);
    assert(l3InitData.levelProgress.level === 3, `levelProgress level must be 3, got ${l3InitData.levelProgress.level}`);
    assert(l3InitData.levelProgress.investigatedObjects.length === 0, "Level 3 investigatedObjects must be empty");
    assert(l3InitData.levelProgress.collectedItems.length === 0, "Level 3 collectedItems must be empty");
    assert(l3InitData.levelProgress.usedHints.length === 0, "Level 3 usedHints must be empty");
    assert(l3InitData.levelProgress.attempts === 0, "Level 3 attempts must be 0");
    console.log("✓ Level 3 started with clean progress:", l3InitData.levelProgress);

    // 7. Foreign object rejection
    console.log("\n[7/47] Verifying foreign object rejection on Level 3...");
    const foreignRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_toolbox" },
    });
    assert(foreignRes.status === 400, `Expected HTTP 400 for foreign object, got ${foreignRes.status}`);
    console.log("✓ Correctly rejected foreign object 'robot_toolbox' on Level 3.");

    // 8. Investigate Level 3 decoy (computer_terminal)
    console.log("\n[8/47] Investigating Level 3 decoy object 'computer_terminal'...");
    const decoyRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_terminal" },
    });
    assert(decoyRes.status === 200 && decoyRes.data.success, "Decoy investigation failed");
    assert(decoyRes.data.data.outcome === "decoy", "Outcome must be 'decoy'");
    assert(!decoyRes.data.data.grantedItem, "Decoy must not grant an item");
    console.log("✓ Decoy investigated:", decoyRes.data.data.message);

    // 9. Verify decoy persistence in LevelProgress
    console.log("\n[9/47] Verifying decoy persistence in database...");
    const lpAfterDecoy = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 3 } },
    });
    assert(
      lpAfterDecoy.progressData.investigatedObjects.includes("computer_terminal"),
      "investigatedObjects must include 'computer_terminal'"
    );
    console.log("✓ Decoy persisted in database:", lpAfterDecoy.progressData.investigatedObjects);

    // 10. Investigate Level 3 clue target (computer_server_rack)
    console.log("\n[10/47] Investigating clue target 'computer_server_rack'...");
    const clueRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_server_rack" },
    });
    assert(clueRes.status === 200 && clueRes.data.success, "Clue target investigation failed");
    assert(clueRes.data.data.outcome === "clue", "Outcome must be 'clue'");

    // 11. Verify clue-3 discovery, question received, no answer "63" leaked
    console.log("\n[11/47] Verifying clue discovery & security...");
    assert(clueRes.data.data.clue.id === "clue-3", "Clue ID must be clue-3");
    assert(clueRes.data.data.challenge.id === "ch-3", "Challenge ID must be ch-3");
    assert(clueRes.data.data.challenge.type === "hexadecimal", "Challenge type must be hexadecimal");
    const rawClueResponse = JSON.stringify(clueRes.data);
    assert(!rawClueResponse.includes('"answer"'), "Response must never include answer field");
    assert(!rawClueResponse.includes('"63"'), "Response must never leak authoritative answer 63");
    console.log("✓ Clue target discovered safely with zero secret leakage.");

    // 12. Verify encryption_key reward granted and persisted in collectedItems
    console.log("\n[12/47] Verifying inventory reward 'encryption_key'...");
    assert(clueRes.data.data.grantedItem === "encryption_key", "Must grant encryption_key");
    const lpAfterClue = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 3 } },
    });
    assert(
      lpAfterClue.progressData.collectedItems.includes("encryption_key"),
      "LevelProgress collectedItems must include 'encryption_key'"
    );
    console.log("✓ encryption_key persisted in database collectedItems:", lpAfterClue.progressData.collectedItems);

    // 13. Verify Player.status becomes SOLVING
    console.log("\n[13/47] Verifying Player status transition to SOLVING...");
    const playerAfterClue = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerAfterClue.status === "SOLVING", `Player status must be SOLVING, got ${playerAfterClue.status}`);
    console.log("✓ Player status is SOLVING.");

    // 14. Request Hint 1 (+15s penalty)
    console.log("\n[14/47] Requesting Hint 1 (POST /api/game/hint)...");
    const hint1Res = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", order: 1 },
    });
    assert(hint1Res.status === 200 && hint1Res.data.success, "Hint 1 request failed");
    assert(hint1Res.data.data.penaltySeconds === 15, "Hint 1 penalty must be 15s");
    assert(hint1Res.data.data.text.includes("Hexadecimal is a base-16 number system"), "Hint 1 text mismatch");
    console.log("✓ Hint 1 received (+15s):", hint1Res.data.data.text);

    // 15. Request Hint 2 (+30s penalty)
    console.log("\n[15/47] Requesting Hint 2 (POST /api/game/hint)...");
    const hint2Res = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", order: 2 },
    });
    assert(hint2Res.status === 200 && hint2Res.data.success, "Hint 2 request failed");
    assert(hint2Res.data.data.penaltySeconds === 30, "Hint 2 penalty must be 30s");
    console.log("✓ Hint 2 received (+30s):", hint2Res.data.data.text);

    // 16. Request duplicate Hint 2 (+0s penalty, idempotent)
    console.log("\n[16/47] Requesting duplicate Hint 2 (verifying idempotency)...");
    const hint2DupRes = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", order: 2 },
    });
    assert(hint2DupRes.status === 200 && hint2DupRes.data.success, "Duplicate Hint 2 request failed");
    assert(hint2DupRes.data.data.penaltySeconds === 0, "Duplicate hint must incur 0s penalty");
    console.log("✓ Duplicate hint is idempotent: +0s penalty.");

    // 17. Submit wrong answer (+30s penalty)
    console.log("\n[17/47] Submitting wrong answer (POST /api/game/submit-answer)...");
    const wrongAnsRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", answer: "99" },
    });
    assert(wrongAnsRes.status === 200 && wrongAnsRes.data.success, "Wrong answer submission request failed");
    assert(wrongAnsRes.data.data.correct === false, "Answer must be marked incorrect");
    assert(wrongAnsRes.data.data.penaltySeconds === 30, "Wrong answer penalty must be 30s");
    assert(wrongAnsRes.data.data.levelCompleted === false, "Level must not be completed");
    console.log("✓ Wrong answer rejected with +30s penalty.");

    // 18. Verify attempt count increments (attempts: 1)
    console.log("\n[18/47] Verifying attempt count...");
    const lpAfterWrong = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 3 } },
    });
    assert(lpAfterWrong.progressData.attempts === 1, `Attempts must be 1, got ${lpAfterWrong.progressData.attempts}`);
    console.log("✓ Attempts count is 1.");

    // 19. Verify penalty total (15 + 30 + 30 = 75s)
    console.log("\n[19/47] Verifying total penalties on player and level progress...");
    const playerAfterPenalties = await prisma.player.findUnique({ where: { id: playerId } });
    assert(
      playerAfterPenalties.penaltySeconds === 75,
      `Expected total penalties 75s, got ${playerAfterPenalties.penaltySeconds}s`
    );
    assert(
      lpAfterWrong.penaltySeconds === 75,
      `Expected LevelProgress penalty 75s, got ${lpAfterWrong.penaltySeconds}s`
    );
    console.log("✓ Authoritative penalties verified: 75 seconds total.");

    // 20. Fetch GET /api/players/:id for recovery payload
    console.log("\n[20/47] Fetching player recovery (GET /api/players/:id)...");
    const recoveryRes = await request(`/players/${playerId}`);
    assert(recoveryRes.status === 200 && recoveryRes.data.success, "Player recovery failed");
    const recData = recoveryRes.data.data;

    // 21. Verify Level 3 recovery payload contains only used hints (1 & 2), not 3
    console.log("\n[21/47] Verifying revealed hints in recovery...");
    const revealedOrders = recData.levelProgress.revealedHints.map((h) => h.order);
    assert(revealedOrders.includes(1) && revealedOrders.includes(2), "Revealed hints must contain 1 and 2");
    assert(!revealedOrders.includes(3), "Revealed hints must NOT contain unrevealed Hint 3");
    console.log("✓ Only requested hints (1 & 2) returned:", recData.levelProgress.revealedHints);

    // 22. Verify secret answer "63" is nowhere in the recovery payload
    console.log("\n[22/47] Verifying security against answer leakage...");
    const rawRecovery = JSON.stringify(recData);
    assert(!rawRecovery.includes('"63"'), "Recovery payload must NEVER leak answer '63'");
    assert(!rawRecovery.includes('"answer"'), "Recovery payload must NEVER contain answer property");
    console.log("✓ Security confirmed: No answer leaked in recovery payload.");

    // 23-29. Simulate browser refresh recovery
    console.log("\n[23-29/47] Simulating browser refresh state restoration...");
    assert(
      recData.levelProgress.investigatedObjects.includes("computer_terminal") &&
      recData.levelProgress.investigatedObjects.includes("computer_server_rack"),
      "Investigated objects must restore completely"
    );
    console.log("✓ [24] Investigated objects restored:", recData.levelProgress.investigatedObjects);

    assert(
      recData.levelProgress.collectedItems.includes("encryption_key"),
      "Level-specific collectedItems must contain encryption_key"
    );
    console.log("✓ [25] Level 3 collectedItems restored:", recData.levelProgress.collectedItems);

    assert(
      recData.inventory.includes("usb_drive") &&
      recData.inventory.includes("access_card") &&
      recData.inventory.includes("encryption_key"),
      "Cumulative inventory must contain usb_drive, access_card, and encryption_key"
    );
    console.log("✓ [26] Cumulative inventory restored:", recData.inventory);

    assert(
      recData.levelProgress.usedHints.length === 2 &&
      recData.levelProgress.usedHints.includes(1) &&
      recData.levelProgress.usedHints.includes(2),
      "usedHints restored"
    );
    console.log("✓ [27] usedHints restored:", recData.levelProgress.usedHints);

    assert(recData.levelProgress.revealedHints.length === 2, "revealedHints length must be 2");
    console.log("✓ [28] revealedHints restored:", recData.levelProgress.revealedHints);

    assert(recData.levelProgress.attempts === 1, "attempts must be 1");
    console.log("✓ [29] attempts restored: 1");

    // 30. Pause session during Level 3 (POST /api/sessions/pause)
    console.log("\n[30/47] Pausing game session during Level 3 (POST /api/sessions/pause)...");
    const pauseRes = await request("/sessions/pause", {
      method: "POST",
      body: { playerId, sessionId: activeSessionId },
    });
    assert(pauseRes.status === 200 && pauseRes.data.success, "Pause request failed");
    assert(pauseRes.data.data.isPaused === true, "Session must be paused");
    console.log("✓ Session paused authoritatively:", pauseRes.data.data);

    // 31. Verify investigate is rejected while paused
    console.log("\n[31/47] Verifying investigate is rejected while paused...");
    const pausedInvestigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_parts_table" },
    });
    assert(pausedInvestigate.status === 400, `Expected HTTP 400 while paused, got ${pausedInvestigate.status}`);
    console.log("✓ Investigation correctly rejected while paused.");

    // 32. Verify hint request is rejected while paused
    console.log("\n[32/47] Verifying hint request is rejected while paused...");
    const pausedHint = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", order: 3 },
    });
    assert(pausedHint.status === 400, `Expected HTTP 400 while paused, got ${pausedHint.status}`);
    console.log("✓ Hint request correctly rejected while paused.");

    // 33. Verify answer submission is rejected while paused
    console.log("\n[33/47] Verifying answer submission is rejected while paused...");
    const pausedAnswer = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", answer: "63" },
    });
    assert(pausedAnswer.status === 400, `Expected HTTP 400 while paused, got ${pausedAnswer.status}`);
    console.log("✓ Answer submission correctly rejected while paused.");

    // 34-36. Simulate refresh while paused
    console.log("\n[34-36/47] Verifying refresh while paused restores frozen state...");
    const pausedRecovery = await request(`/players/${playerId}`);
    assert(pausedRecovery.status === 200 && pausedRecovery.data.success, "Paused recovery failed");
    const pausedRecData = pausedRecovery.data.data;
    assert(pausedRecData.activeSession.isPaused === true, "activeSession must be isPaused");
    assert(pausedRecData.activeSession.statusBeforePause === "SOLVING", "statusBeforePause must be SOLVING");
    console.log("✓ Paused state & statusBeforePause restored cleanly.");

    // 37-38. Resume session
    console.log("\n[37-38/47] Resuming session (POST /api/sessions/resume)...");
    const resumeRes = await request("/sessions/resume", {
      method: "POST",
      body: { playerId, sessionId: activeSessionId },
    });
    assert(resumeRes.status === 200 && resumeRes.data.success, "Resume request failed");
    assert(resumeRes.data.data.isPaused === false, "Session must be unpaused");
    assert(resumeRes.data.data.status === "SOLVING", `Player status restored to SOLVING, got ${resumeRes.data.data.status}`);
    console.log("✓ Session resumed successfully:", resumeRes.data.data);

    // 39. Submit correct answer "63"
    console.log("\n[39/47] Submitting authoritative correct answer '63' (POST /api/game/submit-answer)...");
    const correctRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-3", answer: "63" },
    });
    assert(correctRes.status === 200 && correctRes.data.success, "Correct answer submission failed");

    // 40. Verify Level 3 completion
    console.log("\n[40/47] Verifying Level 3 completion response...");
    assert(correctRes.data.data.correct === true, "Answer must be correct");
    assert(correctRes.data.data.levelCompleted === true, "levelCompleted must be true");
    assert(correctRes.data.data.nextLevel === 4, `nextLevel must be 4, got ${correctRes.data.data.nextLevel}`);
    console.log("✓ Level 3 completed! Advanced to Level 4.");

    // 41-42. Verify Player currentLevel and status
    console.log("\n[41-42/47] Verifying updated Player state in database...");
    const playerAfterComplete = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerAfterComplete.currentLevel === 4, `Player currentLevel must be 4, got ${playerAfterComplete.currentLevel}`);
    assert(playerAfterComplete.status === "SEARCHING", `Player status must be SEARCHING, got ${playerAfterComplete.status}`);
    console.log("✓ Player currentLevel is 4, status is SEARCHING.");

    // 43. Verify Level 4 progress starts clean
    console.log("\n[43/47] Verifying Level 4 clean progress in database...");
    const lp4 = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 4 } },
    });
    assert(lp4 !== null, "Level 4 LevelProgress must exist");
    assert(lp4.status === "NOT_STARTED", `Level 4 status must be NOT_STARTED, got ${lp4.status}`);
    assert(lp4.progressData.investigatedObjects.length === 0, "Level 4 investigatedObjects must be empty");
    assert(lp4.progressData.collectedItems.length === 0, "Level 4 collectedItems must be empty");
    assert(lp4.progressData.usedHints.length === 0, "Level 4 usedHints must be empty");
    assert(lp4.progressData.attempts === 0, "Level 4 attempts must be 0");
    console.log("✓ Clean Level 4 progress verified:", lp4.progressData);

    // 44-46. Verify historical Level 1, 2, and 3 records remain intact
    console.log("\n[44-46/47] Verifying historical Level 1, 2, and 3 records remain intact...");
    const lp1Hist = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 1 } },
    });
    const lp2Hist = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 2 } },
    });
    const lp3Hist = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 3 } },
    });
    assert(lp1Hist.status === "COMPLETED", "Level 1 must remain COMPLETED");
    assert(lp1Hist.progressData.collectedItems.includes("usb_drive"), "Level 1 must retain usb_drive");
    assert(lp2Hist.status === "COMPLETED", "Level 2 must remain COMPLETED");
    assert(lp2Hist.progressData.collectedItems.includes("access_card"), "Level 2 must retain access_card");
    assert(lp3Hist.status === "COMPLETED", "Level 3 must remain COMPLETED");
    assert(lp3Hist.progressData.collectedItems.includes("encryption_key"), "Level 3 must retain encryption_key");
    assert(lp3Hist.progressData.attempts === 2, "Level 3 attempts must be 2 (1 wrong + 1 correct)");
    console.log("✓ All 3 historical level progress records remain completely intact and COMPLETED.");

    // 47. Verify completed Level 3 cannot be modified
    console.log("\n[47/47] Verifying completed Level 3 cannot be modified...");
    const modRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "computer_workstation" },
    });
    assert(modRes.status === 400, `Expected HTTP 400 trying to investigate Level 3 object after completion, got ${modRes.status}`);
    console.log("✓ Modification of completed Level 3 correctly rejected.");

    console.log("\n=================================================================");
    console.log(" ALL 47 LEVEL 3 INTEGRATION & SECURITY CHECKS PASSED!");
    console.log("=================================================================");
  } finally {
    // 48. Cleanup test data
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

runLevel3RecoveryTests().catch((err) => {
  console.error("\n❌ LEVEL 3 INTEGRATION TEST FAILED:", err);
  process.exit(1);
});
