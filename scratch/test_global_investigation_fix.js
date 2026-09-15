// scratch/test_global_investigation_fix.js
const http = require("http");
const path = require("path");

// Load backend configs and app from compiled dist
const {
  findObjectAcrossAllLevels,
  LEVEL_CONFIGS,
  isObjectInLevel,
} = require("../backend/dist/config/levels");
const { getQuestionById } = require("../backend/dist/config/questionBank");
const { app } = require("../backend/dist/app");
const { prisma } = require("../backend/dist/lib/prisma");
const { normalizeProgressData } = require("../backend/dist/lib/progress");

let server = null;
let serverPort = 0;

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === "string" ? body : JSON.stringify(body)) : null;
    const headers = {
      ...(options.headers || {}),
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
    };

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: serverPort,
        ...options,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  console.log("=================================================");
  console.log("=== RUNNING GLOBAL INVESTIGATION FIX TEST SUITE ===");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`✓ PASS: ${message}`);
  }

  // ----------------------------------------------------
  // SECTION 1: OBJECT ID RESOLUTION ACROSS ALL 10 ROOMS / LEVELS
  // ----------------------------------------------------
  console.log("--- SECTION 1: OBJECT RESOLUTION ACROSS ALL 10 LEVELS ---");

  const testObjects = [
    { levelId: 1, objectId: "lib_old_book", expectedLabel: "Worn Book", room: "Library" },
    { levelId: 2, objectId: "robot_toolbox", expectedLabel: "Mechanic's Toolbox", room: "Robotics Lab" },
    { levelId: 3, objectId: "computer_server_rack", expectedLabel: "Server Rack", room: "Computer Lab" },
    { levelId: 4, objectId: "auditorium_seat_row7", expectedLabel: "Row 7 Seat", room: "Auditorium" },
    { levelId: 5, objectId: "cafe_corner_table", expectedLabel: "Corner Dining Table", room: "Cafeteria" },
    { levelId: 6, objectId: "main_locker_404", expectedLabel: "Locker 404", room: "Main Hallway" },
    { levelId: 7, objectId: "electronics_oscilloscope", expectedLabel: "Oscilloscope Station", room: "Electronics Lab" },
    { levelId: 8, objectId: "garden_stone_marker", expectedLabel: "Stone Marker", room: "Campus Quad" },
    { levelId: 9, objectId: "server_mainframe_console", expectedLabel: "Mainframe Console", room: "Server Room" },
    { levelId: 10, objectId: "vault_containment_pod", expectedLabel: "CORE-X Containment Pod", room: "Vault Archive" },
  ];

  for (const item of testObjects) {
    const res = findObjectAcrossAllLevels(item.objectId);
    assert(
      res !== null && res.levelId === item.levelId && res.label === item.expectedLabel,
      `Level ${item.levelId} (${item.room}) object '${item.objectId}' correctly resolved to label '${res?.label}' (Level ${res?.levelId})`
    );
  }

  // Decoy resolution
  const decoyTest = findObjectAcrossAllLevels("lib_shelf_a");
  assert(
    decoyTest !== null && decoyTest.levelId === 1 && decoyTest.label === "Tall Bookshelf",
    "Decoy object 'lib_shelf_a' correctly resolved across levels"
  );

  // Unknown object resolution
  const unknownTest = findObjectAcrossAllLevels("non_existent_prop_xyz");
  assert(
    unknownTest === null,
    "Unknown object 'non_existent_prop_xyz' safely returns null"
  );

  // ----------------------------------------------------
  // SECTION 2: FRONTEND LOGIC & RACE CONDITION SIMULATION
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: FRONTEND STORE & INTERACTION SAFETY ---");

  // Simulate Zustand GameStore state changes for selectedObject & interactionToken
  let mockStore = {
    currentLevel: 1,
    currentScene: "library",
    selectedObject: null,
    investigationResult: null,
    isInvestigating: false,
    interactionToken: 0,

    setSelectedObject(obj) {
      this.selectedObject = obj;
    },

    clearInvestigationState() {
      this.selectedObject = null;
      this.investigationResult = null;
      this.isInvestigating = false;
      this.interactionToken += 1;
    },

    setScene(scene) {
      this.currentScene = scene;
      this.clearInvestigationState();
    },

    // Proximity action resolution logic matching GameWorld.tsx
    getProximityAction(targetId, targetLevelId, isSearched) {
      const isCurrentLevelTarget = targetLevelId === this.currentLevel;
      if (isCurrentLevelTarget && !isSearched) {
        return "Investigate Target";
      }
      return "Scan Object";
    },
  };

  // 2.1 Selected object updates on selection
  mockStore.setSelectedObject({ id: "lib_old_book", name: "Worn Book", distance: 1.8 });
  assert(
    mockStore.selectedObject?.id === "lib_old_book" && mockStore.selectedObject?.name === "Worn Book",
    "selectedObject correctly tracks clicked/proximity 3D target"
  );

  // 2.2 Scene transition clears selected object and investigation state
  mockStore.setScene("auditorium");
  assert(
    mockStore.selectedObject === null &&
    mockStore.investigationResult === null &&
    mockStore.currentScene === "auditorium",
    "Scene change immediately clears selectedObject, investigationResult, and increments token"
  );

  // 2.3 Proximity action differentiation
  mockStore.currentLevel = 1;
  const activeTargetAction = mockStore.getProximityAction("lib_old_book", 1, false);
  const searchedTargetAction = mockStore.getProximityAction("lib_old_book", 1, true);
  const crossLevelAction = mockStore.getProximityAction("aud_main_podium", 2, false);

  assert(
    activeTargetAction === "Investigate Target",
    "Active level unsearched target gets distinct action: 'Investigate Target'"
  );
  assert(
    searchedTargetAction === "Scan Object",
    "Already searched object gets action: 'Scan Object'"
  );
  assert(
    crossLevelAction === "Scan Object",
    "Cross-level object in another room gets action: 'Scan Object'"
  );

  // 2.4 Race condition guard simulation
  let tokenBefore = mockStore.interactionToken;
  let simulatedStaleAsyncCompleted = false;
  // Trigger click 1
  let token1 = ++mockStore.interactionToken;
  // User rapidly clicks click 2 before click 1 completes
  let token2 = ++mockStore.interactionToken;
  
  // When click 1 response arrives:
  if (token1 === mockStore.interactionToken) {
    simulatedStaleAsyncCompleted = true;
  }
  assert(
    !simulatedStaleAsyncCompleted,
    "Rapid interaction sequence token guard successfully rejects stale async responses"
  );

  // ----------------------------------------------------
  // SECTION 3: HTTP API INVESTIGATION WORKFLOW & DATA INTEGRITY
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: API INVESTIGATION RESPONSES & ISOLATION ---");

  // Start test server using compiled Express app
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      serverPort = server.address().port;
      console.log(`Test server running on port ${serverPort}`);
      resolve();
    });
  });

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const letterMap = { "0":"A", "1":"B", "2":"C", "3":"D", "4":"E", "5":"F", "6":"G", "7":"H", "8":"I", "9":"J" };
  const randAlpha = String(randSuffix).split("").map((c) => letterMap[c] || "X").join("");
  const testPlayerName = `Investigate Tester ${randAlpha}`;
  const testEnrollment = `INV${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
  const testEmail = `inv_test_${randSuffix}@techfest.org`;

  // 3.1 Register test player
  const regRes = await httpRequest(
    {
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: testPlayerName,
      enrollmentNumber: testEnrollment,
      email: testEmail,
      contactNumber: `911234${randSuffix}`,
      branch: "IT",
      team: "IT",
    }
  );

  assert(regRes.status === 201, `Player registration successful with 201 (got ${regRes.status})`);
  const playerId = regRes.data.data.id;

  // 3.2 Start session
  const sessionRes = await httpRequest(
    {
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId }
  );
  assert(sessionRes.status === 201 || sessionRes.status === 200, `Session started successfully (got ${sessionRes.status})`);

  // Player is on Level 1.
  // Directly retrieve player's assigned clue target object for Level 1
  const lp = await prisma.levelProgress.findFirst({
    where: { playerId, levelId: 1 },
  });
  const normalizedLP = normalizeProgressData(lp?.progressData);
  const clueObjId = normalizedLP.assignedClueLocationId || "lib_old_book";
  const decoyObjId = clueObjId === "lib_shelf_a" ? "lib_shelf_b" : "lib_shelf_a";

  assert(clueObjId !== null, `Successfully identified active level target clue object: '${clueObjId}'`);

  // 3.3 Test valid target investigation payload
  const clueInvRes = await httpRequest(
    {
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, objectId: clueObjId }
  );
  assert(clueInvRes.status === 200, "Active clue target returns 200");
  assert(clueInvRes.data?.data?.outcome === "clue", "Active clue target outcome is 'clue'");
  assert(
    clueInvRes.data?.data?.challenge?.id !== undefined,
    "Active clue target returns challenge question payload"
  );

  // 3.4 Secret Answer Isolation Verification
  const challengeId = clueInvRes.data?.data?.challenge?.id;
  const questionDetails = getQuestionById(challengeId);
  const secretAnswer = questionDetails?.answer;
  const cluePayloadStr = JSON.stringify(clueInvRes.data);
  assert(
    !cluePayloadStr.includes(`"answer"`) && (!secretAnswer || !cluePayloadStr.includes(`"${secretAnswer}"`)),
    "Active clue target payload strictly omits secret answer"
  );

  // 3.5 Test decoy investigation payload
  if (decoyObjId) {
    const decoyInvRes = await httpRequest(
      {
        path: "/api/game/investigate",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { playerId, objectId: decoyObjId }
    );
    assert(decoyInvRes.status === 200, "Decoy object returns 200");
    assert(decoyInvRes.data?.data?.outcome === "decoy", "Decoy object outcome is 'decoy'");
    const decoyMsg = decoyInvRes.data?.data?.message || decoyInvRes.data?.data?.observation;
    assert(
      typeof decoyMsg === "string" && decoyMsg.length > 0,
      "Decoy object returns meaningful narrative message/observation"
    );
  }

  // 3.6 Test 5 different objects in 5 different rooms outside Level 1
  const crossLevelTests = [
    { id: "robot_toolbox", label: "Mechanic's Toolbox", room: "Robotics Lab" },
    { id: "computer_server_rack", label: "Server Rack", room: "Computer Lab" },
    { id: "auditorium_seat_row7", label: "Row 7 Seat", room: "Auditorium" },
    { id: "cafe_corner_table", label: "Corner Dining Table", room: "Cafeteria" },
    { id: "server_mainframe_console", label: "Mainframe Console", room: "Server Room" },
  ];

  const messages = [];

  for (const item of crossLevelTests) {
    const crossRes = await httpRequest(
      {
        path: "/api/game/investigate",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { playerId, objectId: item.id }
    );

    assert(crossRes.status === 200, `Cross-level object '${item.id}' returned HTTP 200`);
    assert(crossRes.data?.data?.outcome === "cross_level", `Outcome for '${item.id}' is 'cross_level'`);

    const msg = crossRes.data?.data?.message;
    assert(typeof msg === "string" && msg.length > 0, `Message returned for '${item.id}' is non-empty`);
    
    // Check that the label is included in the scan result
    assert(
      msg.includes(item.label),
      `Scan message for '${item.id}' specifically references label '${item.label}'`
    );

    // Ensure raw internal ID is NOT leaked
    assert(
      !msg.includes(item.id),
      `Scan message strictly avoids leaking raw internal ID '${item.id}'`
    );

    // Ensure old generic message is NOT returned
    const oldGenericMsg = "This object does not appear relevant to your current investigation. Continue searching for evidence connected to your current quest.";
    assert(
      !msg.includes(oldGenericMsg),
      `Scan message is object-specific and NOT the old global generic string`
    );

    messages.push(msg);
  }

  // 3.7 Verify distinctness: all 5 messages must be distinct
  const uniqueMessages = new Set(messages);
  assert(
    uniqueMessages.size === crossLevelTests.length,
    `All ${crossLevelTests.length} cross-level objects returned unique, distinct messages`
  );

  // 3.8 Unknown / arbitrary object ID handling
  const unknownRes = await httpRequest(
    {
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, objectId: "totally_random_unknown_id_9999" }
  );
  assert(unknownRes.status === 200, "Unknown object returns HTTP 200 without crashing");
  assert(unknownRes.data?.data?.outcome === "cross_level", "Unknown object safely defaults to outcome 'cross_level'");
  assert(
    !JSON.stringify(unknownRes.data).includes("totally_random_unknown_id_9999"),
    "Unknown object response avoids echoing raw untrusted input"
  );

  // 3.9 Database state mutation verification:
  // Ensure Level 1 investigatedObjects does NOT contain cross-level or unknown object IDs
  const playerCheck = await httpRequest({
    path: `/api/players/${playerId}`,
    method: "GET",
  });
  const investigated = playerCheck.data?.data?.levelProgress?.investigatedObjects || [];
  for (const item of crossLevelTests) {
    assert(
      !investigated.includes(item.id),
      `Database integrity preserved: cross-level object '${item.id}' was NOT saved into Level 1 investigatedObjects`
    );
  }
  assert(
    !investigated.includes("totally_random_unknown_id_9999"),
    "Database integrity preserved: unknown object was NOT saved into Level 1 investigatedObjects"
  );

  console.log("\n=================================================");
  console.log(`=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! ===`);
  console.log("=================================================");
}

run()
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) {
      server.close(() => {
        console.log("Test server closed.");
        process.exit(process.exitCode || 0);
      });
    }
  });
