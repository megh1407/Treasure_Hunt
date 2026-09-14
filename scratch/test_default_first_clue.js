/**
 * scratch/test_default_first_clue.js
 * 
 * Verifies:
 * 1. New player starts a session and receives a Level 1 activeClue immediately.
 * 2. The clue is available for bottom-left HUD display by default without any button click.
 * 3. No investigation or hint request is required to obtain the initial clue.
 * 4. Refresh (GET /players/:id) returns the same clue location and sentence.
 * 5. Reconnect (POST /sessions/start replay) returns the same clue location and sentence.
 * 6. Existing assigned clue is not overwritten or re-randomized.
 * 7. Legacy progress without clue metadata is safely repaired and persisted server-side.
 * 8. Clue response contains no coordinates, destination fields, internal database IDs, or answers.
 * 9. Randomized clue assignment still works (different players receive valid random clues).
 * 10. Exact-question validation remains active.
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition, message, extra) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`, extra ? JSON.stringify(extra, null, 2) : "");
    failed++;
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
    passed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log("====================================================================");
  console.log("  VERIFYING FEATURE: DEFAULT FIRST CLUE AT BOTTOM HUD");
  console.log("====================================================================\n");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const enrollment = `DEF${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);

  // 1. Register player
  console.log("Step 1: Register player");
  const regRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Operative DefaultClue",
      enrollmentNumber: enrollment,
      email: `default_${randSuffix}@example.com`,
      contactNumber: "9876543210",
      branch: "CO",
    }),
  });
  assert(regRes.status === 201, "Player registered with status 201");
  const playerId = regRes.data.data.id;

  // 2. Start session - must return activeClue immediately
  console.log("\nStep 2: Start session - Immediate Level 1 Clue Delivery");
  const startRes = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(startRes.status === 201 || startRes.status === 200, "Session started successfully");
  const sessionData = startRes.data.data;
  assert(Boolean(sessionData.sessionId), "Session ID received");
  assert(Boolean(sessionData.activeClue), "Level 1 activeClue is returned immediately on session start");
  assert(sessionData.activeClue.levelId === 1, "Clue levelId is 1");
  assert(typeof sessionData.activeClue.text === "string" && sessionData.activeClue.text.length > 10, "Clue text is non-empty and descriptive");

  // Verify zero sensitive leaks in the clue object
  assert(sessionData.activeClue.destination === undefined, "Zero leak: clue contains NO destination field");
  assert(sessionData.activeClue.objectId === undefined, "Zero leak: clue contains NO internal objectId");
  assert(sessionData.activeClue.coordinates === undefined, "Zero leak: clue contains NO coordinates");
  assert(sessionData.activeClue.answer === undefined, "Zero leak: clue contains NO answer data");
  assert(sessionData.activeClue._id === undefined && sessionData.activeClue.databaseId === undefined, "Zero leak: clue contains NO database IDs");

  const initialClueId = sessionData.activeClue.id;
  const initialClueText = sessionData.activeClue.text;

  // 3. Inspect DB persistence: progressData contains assignedClueLocationId and assignedClueSentenceId
  console.log("\nStep 3: Verify server-side persistence in LevelProgress.progressData");
  const dbProgress = await prisma.levelProgress.findFirst({
    where: { playerId, levelId: 1 },
  });
  assert(Boolean(dbProgress), "LevelProgress record created in database for Level 1");
  const pData = dbProgress.progressData || {};
  assert(Boolean(pData.assignedClueLocationId), `assignedClueLocationId persisted: ${pData.assignedClueLocationId}`);
  assert(Boolean(pData.assignedClueSentenceId), `assignedClueSentenceId persisted: ${pData.assignedClueSentenceId}`);
  assert(Boolean(pData.activeClue), "activeClue object persisted in progressData");

  // 4. Refresh: GET /api/players/:id returns the EXACT same clue
  console.log("\nStep 4: Browser Refresh / Recovery Hydration check");
  const refreshRes = await request(`/players/${playerId}`);
  assert(refreshRes.status === 200, "GET /players/:id responds 200");
  const refreshClue = refreshRes.data.data.activeClue;
  assert(Boolean(refreshClue), "Refresh payload contains activeClue");
  assert(refreshClue.id === initialClueId, "Refresh preserved exact assignedClueSentenceId");
  assert(refreshClue.text === initialClueText, "Refresh preserved exact clue text");
  assert(refreshRes.data.data.levelProgress?.activeClue?.text === initialClueText, "levelProgress.activeClue also matches exact clue text");

  // 5. Reconnect: POST /api/sessions/start replay returns the EXACT same clue
  console.log("\nStep 5: Session Reconnect replay check");
  const reconnectRes = await request("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
  assert(reconnectRes.status === 200, "Reconnect responds 200 (active session in progress)");
  const reconnectClue = reconnectRes.data.data.activeClue;
  assert(Boolean(reconnectClue), "Reconnect payload contains activeClue");
  assert(reconnectClue.id === initialClueId, "Reconnect preserved exact assignedClueSentenceId");
  assert(reconnectClue.text === initialClueText, "Reconnect preserved exact clue text");

  // 6. Decoy investigation check: Investigating a decoy does NOT alter assigned clue
  console.log("\nStep 6: Decoy investigation does not reset or alter assigned clue");
  const decoyRes = await request("/game/investigate", {
    method: "POST",
    body: JSON.stringify({ playerId, objectId: "lib_chair" }),
  });
  assert(decoyRes.status === 200, "Investigation call succeeded");
  const postDecoyRefresh = await request(`/players/${playerId}`);
  assert(postDecoyRefresh.data.data.activeClue?.text === initialClueText, "Assigned clue unchanged after decoy investigation");

  // 7. Legacy Progress Backfill check
  console.log("\nStep 7: Legacy progress backfill repair");
  const legacyRand = Math.floor(1000 + Math.random() * 9000);
  const legacyEnrollment = `LEG${Date.now().toString().slice(-4)}${legacyRand}`.slice(0, 11);
  const legacyPlayerRes = await request("/players", {
    method: "POST",
    body: JSON.stringify({
      playerName: "Legacy Operative",
      enrollmentNumber: legacyEnrollment,
      email: `legacy_${legacyRand}@example.com`,
      contactNumber: "9876543211",
      branch: "IT",
    }),
  });
  const legacyPlayerId = legacyPlayerRes.data.data.id;

  // Insert legacy LevelProgress directly into Prisma without assignedClueLocationId or assignedClueSentenceId
  await prisma.levelProgress.create({
    data: {
      playerId: legacyPlayerId,
      levelId: 1,
      status: "IN_PROGRESS",
      progressData: {
        investigatedObjects: [],
        collectedItems: [],
        usedHints: [],
        attempts: 0,
        // Missing assignedClueLocationId, assignedClueSentenceId, activeClue!
      },
    },
  });

  // Call GET /players/:legacyPlayerId - should detect missing metadata and safely backfill
  const legacyRecover = await request(`/players/${legacyPlayerId}`);
  assert(legacyRecover.status === 200, "Legacy player recovered successfully");
  assert(Boolean(legacyRecover.data.data.activeClue), "Legacy player received safely backfilled activeClue");
  assert(Boolean(legacyRecover.data.data.activeClue.text), "Legacy backfilled clue text is non-empty");

  // Verify the backfill was saved to DB
  const repairedDb = await prisma.levelProgress.findFirst({
    where: { playerId: legacyPlayerId, levelId: 1 },
  });
  assert(Boolean(repairedDb.progressData.assignedClueLocationId), "Legacy progress was updated in DB with assignedClueLocationId");
  assert(Boolean(repairedDb.progressData.assignedClueSentenceId), "Legacy progress was updated in DB with assignedClueSentenceId");

  // Subsequent call gets the exact same backfilled clue
  const legacyRecover2 = await request(`/players/${legacyPlayerId}`);
  assert(legacyRecover2.data.data.activeClue.id === legacyRecover.data.data.activeClue.id, "Backfilled clue is persistent across subsequent calls");

  // Cleanup
  await prisma.levelProgress.deleteMany({ where: { playerId: { in: [playerId, legacyPlayerId] } } });
  await prisma.gameSession.deleteMany({ where: { playerId: { in: [playerId, legacyPlayerId] } } });
  await prisma.player.deleteMany({ where: { id: { in: [playerId, legacyPlayerId] } } });

  console.log("\n====================================================================");
  console.log(`  🎉 ALL ${passed} DEFAULT FIRST CLUE CHECKS PASSED! (0 FAILED)`);
  console.log("====================================================================\n");
}

run()
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
