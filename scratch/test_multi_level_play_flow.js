/**
 * scratch/test_multi_level_play_flow.js
 * 
 * End-to-end multi-level game flow test verifying complete progression
 * across Level 1 -> Level 2 -> Level 3 -> Level 4 -> Level 5.
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}, retries = 2) {
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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTest() {
  console.log("================================================================");
  console.log("  PHASE 15: MULTI-LEVEL PLAYABLE FLOW INTEGRATION TEST (L1 -> L5)");
  console.log("================================================================\n");

  const rand = Math.floor(1000 + Math.random() * 9000);
  const enrollmentNumber = `MLP${Date.now().toString().slice(-4)}${rand}`.slice(0, 11);

  // 1. Register player
  console.log("Step 1: Register isolated test player");
  const regRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "MultiLevel Operative",
      enrollmentNumber,
      email: `mlp_${rand}@example.com`,
      contactNumber: "9876501234",
      branch: "CO",
    }),
  });
  assert(regRes.status === 201, "Player registered successfully");
  const playerId = regRes.data.data.id;
  assert(regRes.data.data.currentLevel === 1, "Player starts at Level 1");

  // 2. Start session
  console.log("\nStep 2: Start game session");
  const sessionRes = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(
    (sessionRes.status === 200 || sessionRes.status === 201) && sessionRes.data.success,
    "Session started successfully"
  );
  const sessionId = sessionRes.data.data.sessionId;
  assert(!!sessionId, "Received activeSessionId");

  // 3. Level 1 Gameplay
  console.log("\nStep 3: Level 1 - The Silent Archive (Library)");
  const l1Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "lib_shelf_a" }),
  });
  assert(l1Decoy.data.data.outcome === "decoy", "L1 decoy investigated");

  const l1Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "lib_old_book" }),
  });
  assert(l1Target.data.data.outcome === "clue", "L1 target found");
  assert(l1Target.data.data.grantedItem === "usb_drive", "L1 granted usb_drive");
  assert(l1Target.data.data.challenge.id === "ch-1", "L1 challenge ch-1 received");

  const l1Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-1", answer: "65" }),
  });
  assert(l1Solve.data.data.correct === true, "L1 answer correct");
  assert(l1Solve.data.data.levelCompleted === true, "L1 completed");
  assert(l1Solve.data.data.nextLevel === 2, "Advances to nextLevel: 2");

  // 4. Level 2 Gameplay
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
  assert(l2Target.data.data.challenge.id === "ch-2", "L2 challenge ch-2 received");

  const l2Hint = await request("/game/hint", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", order: 1 }),
  });
  assert(l2Hint.data.data.penaltySeconds === 15, "L2 hint 1 penalty applied");

  const l2Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-2", answer: "42" }),
  });
  assert(l2Solve.data.data.correct === true, "L2 answer correct");
  assert(l2Solve.data.data.nextLevel === 3, "Advances to nextLevel: 3");

  // 5. Level 3 Gameplay
  console.log("\nStep 5: Level 3 - Cold Boot (Computer Lab)");
  const l3Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "computer_workstation" }),
  });
  assert(l3Decoy.data.data.outcome === "decoy", "L3 decoy investigated");

  const l3Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "computer_server_rack" }),
  });
  assert(l3Target.data.data.outcome === "clue", "L3 target found");
  assert(l3Target.data.data.grantedItem === "encryption_key", "L3 granted encryption_key");

  // Pause test on Level 3
  const pauseRes = await request("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(pauseRes.data.data.isPaused === true, "Session paused on Level 3");

  // Verify gameplay blocked while paused
  const blockedAction = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-3", answer: "63" }),
  });
  assert(blockedAction.status === 400, "Answer submission blocked while paused");

  // Resume
  const resumeRes = await request("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId, sessionId }),
  });
  assert(resumeRes.data.data.isPaused === false, "Session resumed on Level 3");

  const l3Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-3", answer: "63" }),
  });
  assert(l3Solve.data.data.correct === true, "L3 answer correct");
  assert(l3Solve.data.data.nextLevel === 4, "Advances to nextLevel: 4");

  // 6. Level 4 Gameplay
  console.log("\nStep 6: Level 4 - Row Seven (Auditorium)");
  const l4Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "auditorium_podium" }),
  });
  assert(l4Decoy.data.data.outcome === "decoy", "L4 decoy investigated");

  const l4Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "auditorium_seat_row7" }),
  });
  assert(l4Target.data.data.outcome === "clue", "L4 target found");
  assert(l4Target.data.data.grantedItem === "circuit_piece", "L4 granted circuit_piece");

  const l4Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-4", answer: "159" }),
  });
  assert(l4Solve.data.data.correct === true, "L4 answer correct");
  assert(l4Solve.data.data.nextLevel === 5, "Advances to nextLevel: 5");

  // 7. Level 5 Gameplay
  console.log("\nStep 7: Level 5 - Hidden Recipe (Cafeteria)");
  const l5Decoy = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "cafe_vending_machine" }),
  });
  assert(l5Decoy.data.data.outcome === "decoy", "L5 decoy investigated");

  const l5Target = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "cafe_corner_table" }),
  });
  assert(l5Target.data.data.outcome === "clue", "L5 target found");
  assert(l5Target.data.data.grantedItem === "secret_note", "L5 granted secret_note");

  // 8. Refresh Recovery Verification on Level 5
  console.log("\nStep 8: Refresh Recovery verification (GET /api/players/:id)");
  const refreshRes = await request(`/players/${playerId}`);
  assert(refreshRes.status === 200, "Player data fetched");
  const pData = refreshRes.data.data;
  assert(pData.currentLevel === 5, "currentLevel is 5 upon recovery");
  assert(pData.status === "SOLVING", "status is SOLVING upon recovery");
  assert(pData.inventory.length === 5, `Inventory accumulated 5 items: ${pData.inventory.join(", ")}`);
  assert(pData.inventory.includes("usb_drive"), "Inventory contains usb_drive (L1)");
  assert(pData.inventory.includes("access_card"), "Inventory contains access_card (L2)");
  assert(pData.inventory.includes("encryption_key"), "Inventory contains encryption_key (L3)");
  assert(pData.inventory.includes("circuit_piece"), "Inventory contains circuit_piece (L4)");
  assert(pData.inventory.includes("secret_note"), "Inventory contains secret_note (L5)");

  // 9. Complete Level 5
  console.log("\nStep 9: Complete Level 5");
  const l5Solve = await request("/game/submit-answer", {
    method: "POST",
    body: JSON.stringify({ playerId, challengeId: "ch-5", answer: "salt" }),
  });
  assert(l5Solve.data.data.correct === true, "L5 answer correct");
  assert(l5Solve.data.data.nextLevel === 6, "Advances to nextLevel: 6");

  // 10. Verify single session continuity
  console.log("\nStep 10: Verify single session persisted throughout entire L1-L5 hunt");
  const playerFinal = await request(`/players/${playerId}`);
  assert(playerFinal.data.data.currentLevel === 6, "Player is now at Level 6");
  assert(playerFinal.data.data.inventory.length === 5, "All 5 items retained in final inventory");

  console.log("\n================================================================");
  console.log("  🎉 ALL PHASE 15 MULTI-LEVEL PLAYABLE FLOW CHECKS PASSED!");
  console.log("================================================================\n");
}

runTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
