/**
 * scratch/test_full_game_l1_to_l10.js
 * 
 * Comprehensive end-to-end multi-level regression suite testing the entire
 * Level 1 -> Level 10 progression, backend validation, decoy/target interactions,
 * hint penalties, wrong answer penalties, mid-game pause safety, refresh recovery,
 * cumulative inventory accumulation, and final quest completion.
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}, retries = 4) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if ((res.status >= 500 || res.status === 429) && retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return request(endpoint, options, retries - 1);
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return request(endpoint, options, retries - 1);
    }
    throw err;
  }
}

function assert(condition, message, extra = null) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`, extra ? JSON.stringify(extra, null, 2) : '');
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

const { getQuestionById } = require("../backend/dist/config/questionBank");
const ANSWERS_BY_CHALLENGE = {
  // Legacy fallback answers
  "ch-1": "65",
  "ch-1-2": "96",
  "ch-1-3": "42",
  "ch-2": "42",
  "ch-2-2": "52",
  "ch-2-3": "30",
  "ch-3": "63",
  "ch-3-2": "74",
  "ch-3-3": "92",
  "ch-4": "159",
  "ch-4-2": "149",
  "ch-4-3": "153",
  "ch-5": "salt",
  "ch-5-2": "pepper",
  "ch-5-3": "sugar",
  "ch-6": "64",
  "ch-6-2": "128",
  "ch-6-3": "96",
  "ch-7": "90",
  "ch-7-2": "80",
  "ch-7-3": "100",
  "ch-8": "127",
  "ch-8-2": "156",
  "ch-8-3": "44",
  "ch-9": "443",
  "ch-9-2": "22",
  "ch-9-3": "254",
  "ch-10": "keyboard",
  "ch-10-2": "mouse",
  "ch-10-3": "cpu",
};

function getAnswerForChallenge(challengeId, fallback) {
  const q = getQuestionById(challengeId);
  if (q && q.answer) return q.answer;
  if (ANSWERS_BY_CHALLENGE[challengeId]) return ANSWERS_BY_CHALLENGE[challengeId];
  return fallback;
}

async function runTest() {
  console.log("================================================================================");
  console.log("  CORE QUEST FINDER: COMPLETE LEVEL 1 -> LEVEL 10 PROGRESSION & RECOVERY SUITE  ");
  console.log("================================================================================\n");

  const rand = Math.floor(1000 + Math.random() * 9000);
  const enrollmentNumber = `CQF${Date.now().toString().slice(-4)}${rand}`.slice(0, 11);

  // 1. Register player
  console.log("Step 1: Register isolated test operative");
  const regRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Operative Apex",
      enrollmentNumber,
      email: `apex_${rand}@example.com`,
      contactNumber: "9876501234",
      branch: "CO",
    }),
  });
  assert(regRes.status === 201, "Player registered successfully", regRes);
  const playerId = regRes.data.data.id;
  assert(regRes.data.data.currentLevel === 1, "Player starts at Level 1");
  assert(regRes.data.data.status === "NOT_STARTED", "Player initial status is NOT_STARTED");

  // 2. Start session
  console.log("\nStep 2: Start game session");
  const sessionRes = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(sessionRes.ok && sessionRes.data.success, "Session started successfully");
  const sessionId = sessionRes.data.data.sessionId;
  assert(!!sessionId, "Received activeSessionId");

  // 3. Level 1 - The Silent Archive (Library)
  console.log("\nStep 3: Level 1 - The Silent Archive (Library)");
  const l1Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "lib_shelf_a" }),
  });
  assert(l1Decoy.data.data.outcome === "decoy", "L1 decoy investigated");

  // Cross-level investigation rejection test
  const crossLevelTest = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "robot_toolbox" }),
  });
  assert(crossLevelTest.status === 200 && crossLevelTest.data?.data?.outcome === "cross_level", "Cross-level object investigation returns 200 with cross_level outcome");

  const l1Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "lib_old_book" }),
  });
  assert(l1Target.data.data.outcome === "clue", "L1 target found");
  assert(l1Target.data.data.grantedItem === "usb_drive", "L1 granted usb_drive");
  const ch1Id = l1Target.data.data.challenge.id;
  assert(ch1Id.startsWith("ch-1"), "L1 challenge received");
  assert(l1Target.data.data.challenge.answer === undefined, "Security: answer is NOT exposed in response");

  const l1Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch1Id, answer: getAnswerForChallenge(ch1Id, "65") }),
  });
  assert(l1Solve.data.data.correct === true, "L1 answer correct");
  assert(l1Solve.data.data.levelCompleted === true, "L1 completed");
  assert(l1Solve.data.data.nextLevel === 2, "Authoritatively advances to Level 2");

  // 4. Level 2 - Servo Silence (Robotics Lab)
  console.log("\nStep 4: Level 2 - Servo Silence (Robotics Lab)");
  const l2Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "robot_workbench" }),
  });
  assert(l2Decoy.data.data.outcome === "decoy", "L2 decoy investigated");

  const l2Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "robot_toolbox" }),
  });
  assert(l2Target.data.data.outcome === "clue", "L2 target found");
  assert(l2Target.data.data.grantedItem === "access_card", "L2 granted access_card");
  const ch2Id = l2Target.data.data.challenge.id;
  assert(ch2Id.startsWith("ch-2"), "L2 challenge received");

  const l2Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch2Id, answer: getAnswerForChallenge(ch2Id, "42") }),
  });
  assert(l2Solve.data.data.correct === true, "L2 answer correct");
  assert(l2Solve.data.data.nextLevel === 3, "Authoritatively advances to Level 3");

  // 5. Level 3 - Cold Boot (Computer Lab)
  console.log("\nStep 5: Level 3 - Cold Boot (Computer Lab)");
  const l3Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "computer_server_rack" }),
  });
  assert(l3Target.data.data.outcome === "clue", "L3 target found");
  assert(l3Target.data.data.grantedItem === "encryption_key", "L3 granted encryption_key");
  const ch3Id = l3Target.data.data.challenge.id;
  assert(ch3Id.startsWith("ch-3"), "L3 challenge received");

  // Pause test on Level 3
  const pauseRes = await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(pauseRes.data.data.isPaused === true, "Session paused on Level 3");

  const blockedAction = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch3Id, answer: getAnswerForChallenge(ch3Id, "63") }),
  });
  assert(blockedAction.status === 400, "Answer submission blocked while paused");

  const resumeRes = await request("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(resumeRes.data.data.isPaused === false, "Session resumed on Level 3");

  const l3Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch3Id, answer: getAnswerForChallenge(ch3Id, "63") }),
  });
  assert(l3Solve.data.data.correct === true, "L3 answer correct");
  assert(l3Solve.data.data.nextLevel === 4, "Authoritatively advances to Level 4");

  // 6. Level 4 - Row Seven (Auditorium)
  console.log("\nStep 6: Level 4 - Row Seven (Auditorium)");
  const l4Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "auditorium_seat_row7" }),
  });
  assert(l4Target.data.data.outcome === "clue", "L4 target found");
  assert(l4Target.data.data.grantedItem === "circuit_piece", "L4 granted circuit_piece");
  const ch4Id = l4Target.data.data.challenge.id;
  assert(ch4Id.startsWith("ch-4"), "L4 challenge received");

  const l4Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch4Id, answer: getAnswerForChallenge(ch4Id, "159") }),
  });
  assert(l4Solve.ok && l4Solve.data?.data?.correct === true, "L4 answer correct", l4Solve);
  assert(l4Solve.data.data.nextLevel === 5, "Authoritatively advances to Level 5");

  // 7. Level 5 - Hidden Recipe (Cafeteria)
  console.log("\nStep 7: Level 5 - Hidden Recipe (Cafeteria)");
  const l5Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "cafe_corner_table" }),
  });
  assert(l5Target.data.data.outcome === "clue", "L5 target found");
  assert(l5Target.data.data.grantedItem === "secret_note", "L5 granted secret_note");
  const ch5Id = l5Target.data.data.challenge.id;
  assert(ch5Id.startsWith("ch-5"), "L5 challenge received");

  const l5Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch5Id, answer: getAnswerForChallenge(ch5Id, "salt") }),
  });
  assert(l5Solve.ok && l5Solve.data?.data?.correct === true, "L5 answer correct", l5Solve);
  assert(l5Solve.data?.data?.nextLevel === 6, "Authoritatively advances to Level 6");

  // 8. Level 6 - Locker 404 (Main Academic Building)
  console.log("\nStep 8: Level 6 - Locker 404 (Main Academic Building)");
  const l6Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "main_trophy_case" }),
  });
  assert(l6Decoy.data?.data?.outcome === "decoy", "L6 decoy investigated");

  const l6Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "main_locker_404" }),
  });
  assert(l6Target.data?.data?.outcome === "clue", "L6 target found");
  assert(l6Target.data?.data?.grantedItem === "blue_key", "L6 granted blue_key");
  const ch6Id = l6Target.data?.data?.challenge?.id;
  assert(ch6Id.startsWith("ch-6"), "L6 challenge received");

  // Hint test
  const l6Hint = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch6Id, order: 1 }),
  });
  assert(l6Hint.data?.data?.penaltySeconds === 15, "L6 hint 1 penalty applied (15s)");

  // Wrong answer penalty test
  const l6Wrong = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch6Id, answer: "incorrect_64" }),
  });
  assert(l6Wrong.data?.data?.correct === false, "L6 wrong answer recognized");
  assert(l6Wrong.data?.data?.penaltySeconds === 30, "L6 wrong answer penalty applied (30s)");

  // Correct answer
  const l6Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch6Id, answer: getAnswerForChallenge(ch6Id, "64") }),
  });
  assert(l6Solve.ok && l6Solve.data?.data?.correct === true, "L6 answer correct", l6Solve);
  assert(l6Solve.data?.data?.nextLevel === 7, "Authoritatively advances to Level 7");

  // 9. Level 7 - Broken Trace (Electronics Lab)
  console.log("\nStep 9: Level 7 - Broken Trace (Electronics Lab)");
  const l7Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "electronics_soldering_station" }),
  });
  assert(l7Decoy.data.data.outcome === "decoy", "L7 decoy investigated");

  const l7Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "electronics_oscilloscope" }),
  });
  assert(l7Target.data.data.outcome === "clue", "L7 target found");
  assert(l7Target.data.data.grantedItem === "logic_probe", "L7 granted logic_probe");
  const ch7Id = l7Target.data.data.challenge.id;
  assert(ch7Id.startsWith("ch-7"), "L7 challenge received");

  const l7Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch7Id, answer: getAnswerForChallenge(ch7Id, "90") }),
  });
  assert(l7Solve.ok && l7Solve.data?.data?.correct === true, "L7 answer correct", l7Solve);
  assert(l7Solve.data?.data?.nextLevel === 8, "Authoritatively advances to Level 8");

  // 10. Refresh Recovery verification at Level 8
  console.log("\nStep 10: Refresh Recovery Check at Level 8");
  const rec8 = await request(`/players/${playerId}`);
  assert(rec8.status === 200, "Recovery data retrieved");
  const p8 = rec8.data.data;
  assert(p8.currentLevel === 8, "Recovery reflects Level 8");
  assert(p8.inventory.length === 7, `Cumulative inventory contains 7 items: ${p8.inventory.join(", ")}`);
  assert(p8.inventory.includes("blue_key"), "Contains blue_key from L6");
  assert(p8.inventory.includes("logic_probe"), "Contains logic_probe from L7");

  // 11. Level 8 - Buried Marker (Garden Pavilion)
  console.log("\nStep 11: Level 8 - Buried Marker (Garden Pavilion)");
  const l8Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "garden_stone_marker" }),
  });
  assert(l8Target.data.data.outcome === "clue", "L8 target found");
  assert(l8Target.data.data.grantedItem === "survey_marker", "L8 granted survey_marker");
  const ch8Id = l8Target.data.data.challenge.id;
  assert(ch8Id.startsWith("ch-8"), "L8 challenge received");

  const l8Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch8Id, answer: getAnswerForChallenge(ch8Id, "127") }),
  });
  assert(l8Solve.ok && l8Solve.data?.data?.correct === true, "L8 answer correct", l8Solve);
  assert(l8Solve.data?.data?.nextLevel === 9, "Authoritatively advances to Level 9");

  // 12. Level 9 - Root Access (Server Room)
  console.log("\nStep 12: Level 9 - Root Access (Server Room)");
  const l9Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "server_mainframe_console" }),
  });
  assert(l9Target.data.data.outcome === "clue", "L9 target found");
  assert(l9Target.data.data.grantedItem === "admin_override", "L9 granted admin_override");
  const ch9Id = l9Target.data.data.challenge.id;
  assert(ch9Id.startsWith("ch-9"), "L9 challenge received");

  const l9Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch9Id, answer: getAnswerForChallenge(ch9Id, "443") }),
  });
  assert(l9Solve.ok && l9Solve.data?.data?.correct === true, "L9 answer correct", l9Solve);
  assert(l9Solve.data.data.nextLevel === 10, "Authoritatively advances to Level 10 (Final Quest)");

  // 13. Level 10 - CORE-X (Innovation Vault - The Final Quest)
  console.log("\nStep 13: Level 10 - CORE-X (Innovation Vault)");
  const l10Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "vault_security_terminal" }),
  });
  assert(l10Decoy.data?.data?.outcome === "decoy", "L10 decoy investigated", l10Decoy);

  const l10Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "vault_containment_pod" }),
  });
  assert(l10Target.data?.data?.outcome === "clue", "L10 target found", l10Target);
  assert(l10Target.data.data.grantedItem === "core_x_prototype", "L10 granted core_x_prototype");
  const ch10Id = l10Target.data.data.challenge.id;
  assert(ch10Id.startsWith("ch-10"), "L10 challenge received");

  // Pre-solve recovery check to verify all 10 cumulative inventory items
  const preSolveRecovery = await request(`/players/${playerId}`);
  const all10Items = preSolveRecovery.data?.data?.inventory || [];
  assert(all10Items.length === 10, `Cumulative inventory contains all 10 items: ${all10Items.join(", ")}`, preSolveRecovery);
  assert(all10Items.includes("core_x_prototype"), "Contains core_x_prototype");

  // Solve Level 10
  console.log("\nStep 14: Solve Level 10 Final Quest");
  const l10Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch10Id, answer: getAnswerForChallenge(ch10Id, "keyboard") }),
  });
  assert(l10Solve.ok && l10Solve.data?.data?.correct === true, "L10 answer correct", l10Solve);
  assert(l10Solve.data.data.levelCompleted === true, "L10 marked completed");
  assert(l10Solve.data.data.nextLevel === null, "nextLevel is null (final quest finished)");

  // Complete game session
  console.log("\nStep 15: Finalize Session & Verify Leaderboard");
  const compRes = await request("/sessions/complete", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(compRes.status === 200, "Session finalized successfully");
  assert(compRes.data.data.status === "COMPLETED", "Player status is COMPLETED");

  // Verify completed player cannot replay/submit
  const blockedAfterCompletion = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: ch10Id, answer: getAnswerForChallenge(ch10Id, "keyboard") }),
  });
  assert(blockedAfterCompletion.status === 400, "Answer submission rejected after completion");

  // Verify leaderboard includes completed player with "Vault Cleared"
  const lbRes = await request("/leaderboard");
  assert(lbRes.status === 200, "Leaderboard fetched");
  const entries = lbRes.data.data;
  const ourEntry = entries.find((e) => e.playerId === playerId);
  assert(!!ourEntry, "Player found on the leaderboard");
  assert(ourEntry.location === "Vault Cleared", `Leaderboard location displays 'Vault Cleared' (got: ${ourEntry?.location})`);

  console.log("\n================================================================================");
  console.log("  🎉 ALL 15 LEVELS 1-10 FULL GAME PROGRESSION & RECOVERY CHECKS PASSED!");
  console.log("================================================================================\n");
}

runTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
