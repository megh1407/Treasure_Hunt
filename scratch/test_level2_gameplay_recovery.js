/**
 * Integration Test for Persistent Gameplay State for Level 2
 * 
 * Verifies the complete 38-scenario lifecycle:
 * 1. Backend health check
 * 2. Player registration
 * 3. Session start
 * 4. Complete Level 1 through legitimate backend APIs
 * 5. Verify Level 2 clean initialization
 * 6. Investigate a Level 2 decoy (robot_arm)
 * 7. Verify decoy persistence in LevelProgress
 * 8. Investigate Level 2 clue target (robot_toolbox)
 * 9. Verify Level 2 clue discovery (no answer leak, status SOLVING)
 * 10. Verify access_card persistence in collectedItems
 * 11. Request Hint 1 (+15s penalty)
 * 12. Request Hint 2 (+30s penalty)
 * 13. Verify duplicate hint request is idempotent (+0s penalty)
 * 14. Submit an incorrect answer (+30s penalty)
 * 15. Verify attempts increment
 * 16. Verify expected penalties (15 + 30 + 30 = 75s)
 * 17. Fetch player recovery (GET /api/players/:id)
 * 18. Verify only used hints are revealed (no future hints)
 * 19. Verify no authoritative answer leaks anywhere in payload
 * 20. Simulate browser refresh recovery
 * 21. Verify investigated objects restore
 * 22. Verify inventory restores (level-specific access_card, cumulative usb_drive & access_card)
 * 23. Verify used hints restore
 * 24. Verify attempts restore
 * 25. Pause the session (POST /api/sessions/pause)
 * 26. Verify investigation is rejected while paused (HTTP 400)
 * 27. Verify hint request is rejected while paused (HTTP 400)
 * 28. Verify answer submission is rejected while paused (HTTP 400)
 * 29. Simulate refresh while paused
 * 30. Verify paused state and frozen timer restore
 * 31. Resume session (POST /api/sessions/resume)
 * 32. Submit correct Level 2 answer "42" (POST /api/game/submit-answer)
 * 33. Verify Level 2 completion
 * 34. Verify advancement to Level 3
 * 35. Verify Level 3 clean initialization
 * 36. Verify Level 1 and Level 2 historical records remain intact
 * 37. Verify completed Level 2 cannot be modified through normal gameplay requests
 * 38. Cleanup all test data
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

async function runLevel2RecoveryTests() {
  console.log("=================================================================");
  console.log(" Starting Level 2 Persistent Gameplay State Integration Tests");
  console.log("=================================================================");

  const timestamp = Date.now();
  const testEnrollment = `L2_REC_${timestamp}`;
  let playerId = null;
  let activeSessionId = null;

  try {
    // 1. Health check
    console.log("\n[1/38] Checking backend health (GET /api/health)...");
    const health = await request("/health");
    assert(health.status === 200 && health.data.success, "Backend health check failed");
    console.log("✓ Backend is healthy. Database:", health.data.data.database.status);

    // 2. Register test player
    console.log("\n[2/38] Registering test player (POST /api/players)...");
    const regRes = await request("/players", {
      method: "POST",
      body: {
        playerName: `Player_L2_${timestamp}`,
        enrollmentNumber: testEnrollment,
        team: "Test Division",
      },
    });
    assert(regRes.status === 201 && regRes.data.success, "Player registration failed");
    playerId = regRes.data.data.id;
    console.log("✓ Player registered:", { id: playerId, currentLevel: regRes.data.data.currentLevel });

    // 3. Start session
    console.log("\n[3/38] Starting game session (POST /api/sessions/start)...");
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
    console.log("\n[4/38] Completing Level 1 through legitimate backend APIs...");
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
    console.log("\n[5/38] Verifying Level 2 clean initialization...");
    const l2InitRecovery = await request(`/players/${playerId}`);
    assert(l2InitRecovery.status === 200 && l2InitRecovery.data.success, "Level 2 recovery failed");
    const l2InitData = l2InitRecovery.data.data;
    assert(l2InitData.player.currentLevel === 2, "Player level must be 2");
    assert(l2InitData.player.status === "SEARCHING", `Player status must be SEARCHING, got ${l2InitData.player.status}`);
    assert(l2InitData.levelProgress.level === 2, "levelProgress level must be 2");
    assert(l2InitData.levelProgress.investigatedObjects.length === 0, "Level 2 investigatedObjects must be empty");
    assert(l2InitData.levelProgress.collectedItems.length === 0, "Level 2 collectedItems must be empty");
    assert(l2InitData.levelProgress.usedHints.length === 0, "Level 2 usedHints must be empty");
    assert(l2InitData.levelProgress.attempts === 0, "Level 2 attempts must be 0");
    console.log("✓ Level 2 started with clean progress:", l2InitData.levelProgress);

    // 6. Investigate a Level 2 decoy (robot_arm)
    console.log("\n[6/38] Investigating Level 2 decoy object 'robot_arm'...");
    const decoyRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_arm" },
    });
    assert(decoyRes.status === 200 && decoyRes.data.success, "Decoy investigation failed");
    assert(decoyRes.data.data.outcome === "decoy", "Outcome must be decoy");
    assert(decoyRes.data.data.objectId === "robot_arm", "ObjectId must match");
    console.log("✓ Decoy response verified:", decoyRes.data.data.message);

    // 7. Verify decoy persistence in LevelProgress
    console.log("\n[7/38] Verifying decoy persistence in LevelProgress...");
    const l2ProgressDb = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 2 } },
    });
    assert(l2ProgressDb !== null, "Level 2 progress record must exist");
    assert(l2ProgressDb.progressData.investigatedObjects.includes("robot_arm"), "robot_arm must be in investigatedObjects");
    console.log("✓ Decoy successfully persisted in Level 2 progressData.");

    // 8. Investigate Level 2 clue target (robot_toolbox)
    console.log("\n[8/38] Investigating Level 2 clue target 'robot_toolbox'...");
    const clueRes = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_toolbox" },
    });
    assert(clueRes.status === 200 && clueRes.data.success, "Clue investigation failed");
    assert(clueRes.data.data.outcome === "clue", "Outcome must be clue");
    assert(clueRes.data.data.objectId === "robot_toolbox", "ObjectId must be robot_toolbox");
    assert(clueRes.data.data.grantedItem === "access_card", "Granted item must be access_card");
    console.log("✓ Clue target discovered:", {
      objectId: clueRes.data.data.objectId,
      clue: clueRes.data.data.clue,
      challenge: clueRes.data.data.challenge,
      grantedItem: clueRes.data.data.grantedItem,
    });

    // 9. Verify Level 2 clue discovery (security & status)
    console.log("\n[9/38] Verifying clue discovery security and player status SOLVING...");
    assert(clueRes.data.data.challenge.answer === undefined, "Security violation: Answer must not be returned!");
    assert(clueRes.data.data.challenge.id === "ch-2", "Challenge ID must be ch-2");
    assert(clueRes.data.data.challenge.type === "binary", "Challenge type must be binary");
    const playerAfterClue = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerAfterClue.status === "SOLVING", `Player status must be SOLVING, got ${playerAfterClue.status}`);
    console.log("✓ Clue payload is secure (no answer leak) and Player status is SOLVING.");

    // 10. Verify access_card persistence in collectedItems
    console.log("\n[10/38] Verifying access_card persistence in Level 2 progressData...");
    const l2ProgressDbAfterClue = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 2 } },
    });
    assert(
      l2ProgressDbAfterClue.progressData.collectedItems.includes("access_card"),
      "access_card must be in Level 2 collectedItems"
    );
    assert(
      !l2ProgressDbAfterClue.progressData.collectedItems.includes("usb_drive"),
      "usb_drive must NOT be duplicated into Level 2 progressData!"
    );
    console.log("✓ Level 2 collectedItems verified:", l2ProgressDbAfterClue.progressData.collectedItems);

    // 11. Request Hint 1
    console.log("\n[11/38] Requesting Hint 1 (POST /api/game/hint)...");
    const hint1Res = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", order: 1 },
    });
    assert(hint1Res.status === 200 && hint1Res.data.success, "Hint 1 request failed");
    assert(hint1Res.data.data.order === 1, "Hint order must be 1");
    assert(hint1Res.data.data.penaltySeconds === 15, "Hint 1 penalty must be 15s");
    assert(typeof hint1Res.data.data.text === "string" && hint1Res.data.data.text.length > 0, "Hint text missing");
    console.log("✓ Hint 1 received (+15s):", hint1Res.data.data.text);

    // 12. Request Hint 2
    console.log("\n[12/38] Requesting Hint 2 (POST /api/game/hint)...");
    const hint2Res = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", order: 2 },
    });
    assert(hint2Res.status === 200 && hint2Res.data.success, "Hint 2 request failed");
    assert(hint2Res.data.data.order === 2, "Hint order must be 2");
    assert(hint2Res.data.data.penaltySeconds === 30, "Hint 2 penalty must be 30s");
    console.log("✓ Hint 2 received (+30s):", hint2Res.data.data.text);

    // 13. Verify duplicate hint request is idempotent
    console.log("\n[13/38] Verifying duplicate hint request idempotency (re-requesting Hint 1)...");
    const dupHintRes = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", order: 1 },
    });
    assert(dupHintRes.status === 200 && dupHintRes.data.success, "Duplicate hint request failed");
    assert(dupHintRes.data.data.penaltySeconds === 0, "Duplicate hint penalty must be 0 (no double charging)");
    assert(dupHintRes.data.data.text === hint1Res.data.data.text, "Duplicate hint text mismatch");
    console.log("✓ Duplicate hint request is idempotent: 0s extra penalty applied.");

    // 14. Submit an incorrect answer
    console.log("\n[14/38] Submitting incorrect answer '999' (POST /api/game/submit-answer)...");
    const wrongAnsRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", answer: "999" },
    });
    assert(wrongAnsRes.status === 200 && wrongAnsRes.data.success, "Submit answer request failed");
    assert(wrongAnsRes.data.data.correct === false, "Answer must be marked incorrect");
    assert(wrongAnsRes.data.data.levelCompleted === false, "Level must not be completed");
    assert(wrongAnsRes.data.data.penaltySeconds === 30, "Wrong answer penalty must be 30s");
    console.log("✓ Wrong answer rejected (+30s penalty):", wrongAnsRes.data.data.message);

    // 15. Verify attempts increment
    console.log("\n[15/38] Verifying attempts incremented in database...");
    const l2ProgressAfterWrong = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 2 } },
    });
    assert(l2ProgressAfterWrong.progressData.attempts === 1, `Expected 1 attempt, got ${l2ProgressAfterWrong.progressData.attempts}`);
    console.log("✓ Attempts count verified: 1.");

    // 16. Verify expected penalties
    console.log("\n[16/38] Verifying expected penalties (15s + 30s + 30s = 75s)...");
    const playerPenalties = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerPenalties.penaltySeconds === 75, `Expected 75s penalty, got ${playerPenalties.penaltySeconds}s`);
    assert(l2ProgressAfterWrong.penaltySeconds === 75, `Expected 75s on levelProgress, got ${l2ProgressAfterWrong.penaltySeconds}s`);
    console.log("✓ Penalties verified exactly: 75s total.");

    // 17. Fetch player recovery (GET /api/players/:id)
    console.log("\n[17/38] Fetching player recovery (GET /api/players/:id)...");
    const recoveryRes = await request(`/players/${playerId}`);
    assert(recoveryRes.status === 200 && recoveryRes.data.success, "Recovery fetch failed");
    const recoveryData = recoveryRes.data.data;
    console.log("✓ Recovery payload received.");

    // 18. Verify only used hints are revealed
    console.log("\n[18/38] Verifying only used hints are revealed (orders 1 and 2)...");
    const revealed = recoveryData.levelProgress.revealedHints;
    assert(Array.isArray(revealed) && revealed.length === 2, `Expected 2 revealed hints, got ${revealed?.length}`);
    const revealedOrders = revealed.map((r) => r.order);
    assert(revealedOrders.includes(1) && revealedOrders.includes(2), "Revealed hints must contain 1 and 2");
    assert(!revealedOrders.includes(3), "Security violation: Unused Hint 3 must NOT be revealed!");
    console.log("✓ Revealed hints verified:", revealed);

    // 19. Verify no authoritative answer leaks anywhere in recovery payload
    console.log("\n[19/38] Verifying no authoritative answer '42' is leaked in payload...");
    const payloadString = JSON.stringify(recoveryData);
    assert(!payloadString.includes('"answer":"42"'), "Security violation: Answer leaked in recovery payload!");
    assert(!payloadString.includes('"answer":42'), "Security violation: Answer leaked in recovery payload!");
    console.log("✓ Security confirmed: Authoritative answer is nowhere in recovery payload.");

    // 20. Simulate browser refresh recovery
    console.log("\n[20/38] Simulating browser refresh recovery...");
    const simulatedStore = {
      player: recoveryData.player,
      activeSessionId: recoveryData.activeSession?.id,
      currentLevel: recoveryData.player.currentLevel,
      status: recoveryData.player.status,
      investigated: recoveryData.levelProgress.investigatedObjects,
      levelCollected: recoveryData.levelProgress.collectedItems,
      cumulativeInventory: recoveryData.inventory || recoveryData.player.inventory,
      usedHints: recoveryData.levelProgress.usedHints,
      revealedHints: recoveryData.levelProgress.revealedHints,
      attempts: recoveryData.levelProgress.attempts,
      penaltySeconds: recoveryData.player.penaltySeconds,
    };
    console.log("✓ Simulated store populated from recovery API.");

    // 21. Verify investigated objects restore
    console.log("\n[21/38] Verifying investigated objects restored...");
    assert(simulatedStore.investigated.includes("robot_arm"), "robot_arm missing from restored investigated");
    assert(simulatedStore.investigated.includes("robot_toolbox"), "robot_toolbox missing from restored investigated");
    console.log("✓ Investigated objects restored:", simulatedStore.investigated);

    // 22. Verify inventory restores (level-specific access_card, cumulative usb_drive & access_card)
    console.log("\n[22/38] Verifying inventory restoration...");
    assert(simulatedStore.levelCollected.includes("access_card"), "Level 2 must have access_card");
    assert(!simulatedStore.levelCollected.includes("usb_drive"), "Level 2 levelProgress must not have usb_drive");
    assert(simulatedStore.cumulativeInventory.includes("usb_drive"), "Cumulative inventory must have usb_drive");
    assert(simulatedStore.cumulativeInventory.includes("access_card"), "Cumulative inventory must have access_card");
    console.log("✓ Inventory semantics verified: Level 2 progress has access_card, cumulative has [usb_drive, access_card].");

    // 23. Verify hints restore
    console.log("\n[23/38] Verifying used hints restore...");
    assert(JSON.stringify(simulatedStore.usedHints) === JSON.stringify([1, 2]), "Used hints mismatch");
    console.log("✓ Used hints restored:", simulatedStore.usedHints);

    // 24. Verify attempts restore
    console.log("\n[24/38] Verifying attempts restore...");
    assert(simulatedStore.attempts === 1, `Expected 1 attempt, got ${simulatedStore.attempts}`);
    console.log("✓ Attempts count restored: 1.");

    // 25. Pause the session (POST /api/sessions/pause)
    console.log("\n[25/38] Pausing session (POST /api/sessions/pause)...");
    const pauseRes = await request("/sessions/pause", {
      method: "POST",
      body: { playerId, sessionId: activeSessionId },
    });
    assert(pauseRes.status === 200 && pauseRes.data.success, "Pause session failed");
    assert(pauseRes.data.data.isPaused === true, "Session must be paused");
    console.log("✓ Session paused successfully at:", pauseRes.data.data.pausedAt);

    // 26. Verify investigation is rejected while paused (HTTP 400)
    console.log("\n[26/38] Verifying investigation is rejected while paused...");
    const pauseInvestigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_workbench" },
    });
    assert(pauseInvestigate.status === 400 && !pauseInvestigate.data.success, "Investigation while paused must return 400");
    console.log("✓ Investigation correctly rejected while paused:", pauseInvestigate.data.error);

    // 27. Verify hint request is rejected while paused (HTTP 400)
    console.log("\n[27/38] Verifying hint request is rejected while paused...");
    const pauseHint = await request("/game/hint", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", order: 3 },
    });
    assert(pauseHint.status === 400 && !pauseHint.data.success, "Hint request while paused must return 400");
    console.log("✓ Hint request correctly rejected while paused:", pauseHint.data.error);

    // 28. Verify answer submission is rejected while paused (HTTP 400)
    console.log("\n[28/38] Verifying answer submission is rejected while paused...");
    const pauseAnswer = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", answer: "42" },
    });
    assert(pauseAnswer.status === 400 && !pauseAnswer.data.success, "Answer submission while paused must return 400");
    console.log("✓ Answer submission correctly rejected while paused:", pauseAnswer.data.error);

    // 29. Simulate refresh while paused
    console.log("\n[29/38] Simulating refresh while paused...");
    const pausedRecovery = await request(`/players/${playerId}`);
    assert(pausedRecovery.status === 200 && pausedRecovery.data.success, "Recovery fetch while paused failed");
    const pausedRecData = pausedRecovery.data.data;
    console.log("✓ Paused recovery data fetched.");

    // 30. Verify paused state and frozen timer restore
    console.log("\n[30/38] Verifying paused state restores...");
    assert(pausedRecData.activeSession.isPaused === true, "activeSession.isPaused must be true");
    assert(pausedRecData.activeSession.pausedAt !== null, "pausedAt must not be null");
    assert(pausedRecData.activeSession.statusBeforePause === "SOLVING", `statusBeforePause must be SOLVING, got ${pausedRecData.activeSession.statusBeforePause}`);
    console.log("✓ Paused state and statusBeforePause verified:", {
      isPaused: pausedRecData.activeSession.isPaused,
      pausedAt: pausedRecData.activeSession.pausedAt,
      statusBeforePause: pausedRecData.activeSession.statusBeforePause,
    });

    // 31. Resume session (POST /api/sessions/resume)
    console.log("\n[31/38] Resuming session (POST /api/sessions/resume)...");
    const resumeRes = await request("/sessions/resume", {
      method: "POST",
      body: { playerId, sessionId: activeSessionId },
    });
    assert(resumeRes.status === 200 && resumeRes.data.success, "Resume session failed");
    assert(resumeRes.data.data.isPaused === false, "Session isPaused must be false");
    console.log("✓ Session resumed successfully:", {
      isPaused: resumeRes.data.data.isPaused,
      status: resumeRes.data.data.status,
      totalPausedSeconds: resumeRes.data.data.totalPausedSeconds,
    });

    // 32. Submit correct Level 2 answer "42"
    console.log("\n[32/38] Submitting correct Level 2 answer '42' (POST /api/game/submit-answer)...");
    const correctAnsRes = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", answer: "42" },
    });
    assert(correctAnsRes.status === 200 && correctAnsRes.data.success, "Correct answer submission failed");
    assert(correctAnsRes.data.data.correct === true, "Answer must be accepted as correct");
    assert(correctAnsRes.data.data.levelCompleted === true, "Level must be marked completed");
    assert(correctAnsRes.data.data.nextLevel === 3, `nextLevel must be 3, got ${correctAnsRes.data.data.nextLevel}`);
    console.log("✓ Correct answer accepted! Level 2 completed. Advanced to Level 3.");

    // 33. Verify Level 2 completion in database
    console.log("\n[33/38] Verifying Level 2 completion in database...");
    const l2CompletedDb = await prisma.levelProgress.findUnique({
      where: { playerId_levelId: { playerId, levelId: 2 } },
    });
    assert(l2CompletedDb.status === "COMPLETED", "Level 2 status must be COMPLETED");
    assert(l2CompletedDb.completedAt !== null, "completedAt must be set");
    console.log("✓ Level 2 database record status is COMPLETED with completedAt:", l2CompletedDb.completedAt);

    // 34. Verify advancement to Level 3
    console.log("\n[34/38] Verifying player advancement to Level 3...");
    const playerL3 = await prisma.player.findUnique({ where: { id: playerId } });
    assert(playerL3.currentLevel === 3, `Player currentLevel must be 3, got ${playerL3.currentLevel}`);
    assert(playerL3.status === "SEARCHING", `Player status must be SEARCHING, got ${playerL3.status}`);
    console.log("✓ Player verified at Level 3 with status SEARCHING.");

    // 35. Verify Level 3 clean initialization
    console.log("\n[35/38] Verifying Level 3 clean initialization...");
    const l3Recovery = await request(`/players/${playerId}`);
    assert(l3Recovery.status === 200 && l3Recovery.data.success, "Level 3 recovery failed");
    const l3Data = l3Recovery.data.data.levelProgress;
    assert(l3Data.level === 3, `LevelProgress level must be 3, got ${l3Data.level}`);
    assert(l3Data.investigatedObjects.length === 0, "Level 3 investigatedObjects must be clean/empty");
    assert(l3Data.collectedItems.length === 0, "Level 3 collectedItems must be clean/empty");
    assert(l3Data.usedHints.length === 0, "Level 3 usedHints must be clean/empty");
    assert(l3Data.attempts === 0, "Level 3 attempts must be 0");
    console.log("✓ Level 3 clean progress verified:", l3Data);

    // 36. Verify Level 1 and Level 2 historical records remain intact
    console.log("\n[36/38] Verifying historical Level 1 and Level 2 records in database...");
    const allPlayerProgress = await prisma.levelProgress.findMany({
      where: { playerId },
      orderBy: { levelId: "asc" },
    });
    assert(allPlayerProgress.length === 3, `Expected 3 progress records (L1, L2, L3), got ${allPlayerProgress.length}`);
    const l1Record = allPlayerProgress.find((p) => p.levelId === 1);
    const l2Record = allPlayerProgress.find((p) => p.levelId === 2);
    assert(l1Record.status === "COMPLETED", "Historical Level 1 must be COMPLETED");
    assert(l1Record.progressData.collectedItems.includes("usb_drive"), "Historical Level 1 must have usb_drive");
    assert(l2Record.status === "COMPLETED", "Historical Level 2 must be COMPLETED");
    assert(l2Record.progressData.collectedItems.includes("access_card"), "Historical Level 2 must have access_card");
    console.log("✓ Historical records integrity verified for Level 1 and Level 2.");

    // 37. Verify completed Level 2 cannot be modified through normal gameplay requests
    console.log("\n[37/38] Verifying completed Level 2 cannot be modified through normal gameplay requests...");
    // Attempting to submit answer for ch-2 while at Level 3 must be rejected
    const modifyL2Answer = await request("/game/submit-answer", {
      method: "POST",
      body: { playerId, challengeId: "ch-2", answer: "42" },
    });
    assert(modifyL2Answer.status === 400 && !modifyL2Answer.data.success, "Submitting answer for completed level must return 400");

    // Attempting to investigate a Level 2 object while at Level 3 must be rejected
    const modifyL2Investigate = await request("/game/investigate", {
      method: "POST",
      body: { playerId, objectId: "robot_toolbox" },
    });
    assert(modifyL2Investigate.status === 400 && !modifyL2Investigate.data.success, "Investigating completed level object must return 400");
    console.log("✓ Immutability of completed level progress verified.");

    console.log("\n=================================================================");
    console.log(" ALL 37 LEVEL 2 GAMEPLAY AND RECOVERY VERIFICATION CHECKS PASSED!");
    console.log("=================================================================");
  } finally {
    // 38. Cleanup all test data
    console.log("\n[38/38] Cleaning up all test data...");
    if (playerId) {
      await prisma.levelProgress.deleteMany({ where: { playerId } });
      await prisma.gameSession.deleteMany({ where: { playerId } });
      await prisma.player.deleteMany({ where: { id: playerId } });
      console.log(`✓ Cleaned up player ${playerId} and all related records`);
    }
    await prisma.$disconnect();
    console.log("✓ Database disconnected cleanly.");
  }
}

runLevel2RecoveryTests()
  .then(() => {
    console.log("\n🎉 LEVEL 2 TEST SUITE COMPLETE: 100% SUCCESS");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ LEVEL 2 TEST SUITE FAILED:", err);
    process.exit(1);
  });
