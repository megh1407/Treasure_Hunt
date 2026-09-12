/**
 * scratch/test_pause_resume.js
 * Comprehensive validation of Phase 9 Backend-Authoritative Pause & Resume System.
 */

const BASE_URL = "http://localhost:5000/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, ...json };
}

async function runTests() {
  console.log("====================================================");
  console.log(" RUNNING PHASE 9 PAUSE & RESUME AUTHORITATIVE TESTS ");
  console.log("====================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test Suite 1: Normal Pause & Duplicate Pause ---
  console.log("\n--- TEST 1 & 2: Normal Pause and Duplicate Pause (Idempotent) ---");
  const p1Res = await api("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "PauseTester1",
      enrollmentNumber: `PAUSE_01_${Date.now()}`,
      team: "TimeBenders",
    }),
  });
  const p1 = p1Res.data;
  assert(p1 && p1.id, "Player 1 created successfully");

  const s1Res = await api("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id }),
  });
  const s1 = s1Res.data;
  assert(s1 && s1.sessionId, "Session 1 started successfully");

  // Pause session
  const pause1 = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s1.sessionId }),
  });
  assert(pause1.success === true, "Pause API returned success: true");
  assert(pause1.data.isPaused === true, "Session is marked isPaused: true");
  assert(pause1.data.pausedAt !== null, "Session has valid pausedAt timestamp");
  assert(pause1.data.status === "PAUSED", "Player status returned as PAUSED");
  const firstPausedAt = pause1.data.pausedAt;

  // Duplicate pause
  await sleep(500);
  const pauseDup = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s1.sessionId }),
  });
  assert(pauseDup.success === true, "Duplicate pause returned success: true (idempotent)");
  assert(
    new Date(pauseDup.data.pausedAt).getTime() === new Date(firstPausedAt).getTime(),
    "Duplicate pause did NOT change pausedAt timestamp"
  );

  // --- Test Suite 2: Resume & Duplicate Resume ---
  console.log("\n--- TEST 3 & 4: Resume and Duplicate Resume (Idempotent) ---");
  await sleep(1500); // Wait 1.5 seconds while paused

  const resume1 = await api("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s1.sessionId }),
  });
  assert(resume1.success === true, "Resume API returned success: true");
  assert(resume1.data.isPaused === false, "Session is marked isPaused: false");
  assert(resume1.data.pausedAt === null, "Session pausedAt reset to null");
  assert(resume1.data.totalPausedSeconds >= 1, `totalPausedSeconds accumulated authoritatively: ${resume1.data.totalPausedSeconds}s`);
  assert(resume1.data.status === "SEARCHING", `Player status restored to SEARCHING (was: ${resume1.data.status})`);

  // Duplicate resume
  const resumeDup = await api("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s1.sessionId }),
  });
  assert(resumeDup.success === true, "Duplicate resume returned success: true (idempotent)");
  assert(
    resumeDup.data.totalPausedSeconds === resume1.data.totalPausedSeconds,
    "Duplicate resume did NOT increase totalPausedSeconds"
  );

  // --- Test Suite 3: Refresh Recovery While Paused ---
  console.log("\n--- TEST 5 & 6: Refresh Recovery While Paused & Resume After Refresh ---");
  // Pause again
  const pause2 = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s1.sessionId }),
  });
  assert(pause2.data.isPaused === true, "Paused session again before simulated refresh");
  const pausedAtBeforeRefresh = pause2.data.pausedAt;
  const totalPausedBeforeRefresh = pause2.data.totalPausedSeconds;

  await sleep(1500); // Wait while paused

  // Simulate refresh: GET /api/players/:id
  const recRes = await api(`/players/${p1.id}`, { method: "GET" });
  assert(recRes.success === true, "Player recovery API returned success");
  const activeSessionRec = recRes.data.activeSession;
  assert(activeSessionRec !== null, "Active session exists in recovery payload");
  assert(activeSessionRec.isPaused === true, "Recovered activeSession has isPaused: true");
  assert(activeSessionRec.pausedAt !== null, "Recovered activeSession has pausedAt");
  assert(
    new Date(activeSessionRec.pausedAt).getTime() === new Date(pausedAtBeforeRefresh).getTime(),
    "Recovered pausedAt matches exact pausedAt timestamp"
  );
  assert(
    activeSessionRec.totalPausedSeconds === totalPausedBeforeRefresh,
    "Recovered totalPausedSeconds matches before-refresh value"
  );
  assert(
    recRes.data.status === "PAUSED",
    "Player status in recovery is PAUSED"
  );

  // Resume after refresh
  const resumeAfterRec = await api("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s1.sessionId }),
  });
  assert(resumeAfterRec.success === true, "Resumed recovered session successfully");
  assert(resumeAfterRec.data.isPaused === false, "Session is unpaused");
  assert(
    resumeAfterRec.data.totalPausedSeconds >= totalPausedBeforeRefresh + 1,
    `Pause duration during simulated refresh was authoritatively counted (total: ${resumeAfterRec.data.totalPausedSeconds}s)`
  );

  // --- Test Suite 4: Preserve SOLVING Status ---
  console.log("\n--- TEST 7: Preserve SOLVING Status Across Pause & Resume ---");
  const p2Res = await api("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "SolvingTester",
      enrollmentNumber: `SOLVE_01_${Date.now()}`,
      team: "ClueHunters",
    }),
  });
  const p2 = p2Res.data;
  const s2Res = await api("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId: p2.id }),
  });
  const s2 = s2Res.data;

  // Investigate clue object -> status becomes SOLVING
  const invRes = await api("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId: p2.id, objectId: "lib_old_book" }),
  });
  assert(invRes.success === true && invRes.data.outcome === "clue", "Investigated clue object successfully");

  // Check player status is SOLVING
  const p2BeforePause = await api(`/players/${p2.id}`, { method: "GET" });
  assert(p2BeforePause.data.status === "SOLVING", `Player status is SOLVING before pause: ${p2BeforePause.data.status}`);

  // Pause while SOLVING
  const pauseSolve = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p2.id, sessionId: s2.sessionId }),
  });
  assert(pauseSolve.data.isPaused === true, "Session paused while in SOLVING state");
  assert(pauseSolve.data.status === "PAUSED", "Player status transitioned to PAUSED");

  // Verify recovery remembers statusBeforePause
  const p2Rec = await api(`/players/${p2.id}`, { method: "GET" });
  assert(p2Rec.data.activeSession.statusBeforePause === "SOLVING", "statusBeforePause correctly preserved as SOLVING in DB");

  // Resume -> verify restored to SOLVING
  const resumeSolve = await api("/sessions/resume", {
    method: "POST",
    body: JSON.stringify({ playerId: p2.id, sessionId: s2.sessionId }),
  });
  assert(resumeSolve.data.status === "SOLVING", `Player status restored back to SOLVING on resume: ${resumeSolve.data.status}`);

  const p2AfterResume = await api(`/players/${p2.id}`, { method: "GET" });
  assert(p2AfterResume.data.status === "SOLVING", `Player status in DB is SOLVING: ${p2AfterResume.data.status}`);

  // --- Test Suite 5: Complete While Paused ---
  console.log("\n--- TEST 8: Complete Session While Paused ---");
  const p3Res = await api("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "PausedCompleter",
      enrollmentNumber: `PCOMP_${Date.now()}`,
      team: "EdgeCases",
    }),
  });
  const p3 = p3Res.data;
  const s3Res = await api("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId: p3.id }),
  });
  const s3 = s3Res.data;

  await sleep(1000); // 1s active

  // Pause session
  const pauseComp = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p3.id, sessionId: s3.sessionId }),
  });
  assert(pauseComp.data.isPaused === true, "Session paused before complete");

  await sleep(2000); // 2s paused

  // Complete session while still paused
  const compRes = await api("/sessions/complete", {
    method: "POST",
    body: JSON.stringify({ playerId: p3.id, sessionId: s3.sessionId }),
  });
  assert(compRes.success === true, "Session completed successfully while paused");
  assert(compRes.data.status === "COMPLETED", "Player status transitioned to COMPLETED");
  const activeExpected = Math.max(
    0,
    Math.floor((new Date(pauseComp.data.pausedAt).getTime() - s3.startTime) / 1000)
  );
  assert(
    Math.abs(compRes.data.gameTimeSeconds - activeExpected) <= 1,
    `Paused duration was subtracted from final game time (gameTime: ${compRes.data.gameTimeSeconds}s, expected active: ${activeExpected}s)`
  );

  // Verify session in DB is inactive and unpaused
  const p3Final = await api(`/players/${p3.id}`, { method: "GET" });
  assert(p3Final.data.activeSession === null, "Active session cleared after completion");
  assert(p3Final.data.status === "COMPLETED", "Player final status is COMPLETED");

  // --- Test Suite 6: Ownership & Invariant Checks ---
  console.log("\n--- TEST 9: Ownership & Active Invariant Checks ---");
  // Cannot pause inactive session
  const pauseInactive = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p3.id, sessionId: s3.sessionId }),
  });
  assert(pauseInactive.ok === false, "Cannot pause inactive session (400 returned)");

  // Cannot pause someone else's session
  const pauseHijack = await api("/sessions/pause", {
    method: "POST",
    body: JSON.stringify({ playerId: p1.id, sessionId: s2.sessionId }),
  });
  assert(pauseHijack.ok === false, "Cannot pause session belonging to different player (403 returned)");

  console.log("\n====================================================");
  console.log(` TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED `);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
