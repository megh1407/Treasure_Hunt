// scratch/test_phase22_flow.js
const http = require("http");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    });
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log("=== RUNNING PHASE 22 GAMEPLAY FLOW TESTS ===");

  const rand = Math.floor(1000 + Math.random() * 9000);
  const enrollment = `FLW${Date.now().toString().slice(-4)}${rand}`.slice(0, 11);

  // 1. Register player
  console.log("\n[Step 1] Registering operative...");
  const regRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Flow Operative",
      enrollmentNumber: enrollment,
      email: `flow_${rand}@example.com`,
      contactNumber: "9876501234",
      branch: "CO",
    }
  );
  const playerId = regRes.data?.data?.id;
  if (!playerId) throw new Error("Registration failed");
  console.log("Player registered:", playerId, enrollment);

  // 2. Start session
  console.log("\n[Step 2] Starting game session...");
  const startRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/sessions/start",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId }
  );
  const sessionId = startRes.data?.data?.sessionId;
  if (!sessionId) throw new Error("Session start failed");
  console.log("Session started:", sessionId);

  // 3. Investigate target object (lib_old_book)
  console.log("\n[Step 3] Investigating target object 'lib_old_book'...");
  const invRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/investigate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, objectId: "lib_old_book" }
  );
  console.log("Interact status:", invRes.status, invRes.data);
  const interaction = invRes.data?.data;
  console.log("Outcome:", interaction?.outcome);
  console.log("Has challenge?", Boolean(interaction?.challenge));
  console.log("Challenge question:", interaction?.challenge?.question);
  console.log("Clue revealed in interaction?", Boolean(interaction?.clue));

  if (!interaction?.challenge) {
    throw new Error("Step 3 Failed: Challenge was not provided upon investigating target object");
  }
  if (interaction?.clue) {
    throw new Error("Step 3 Failed: Clue was prematurely revealed before answering challenge!");
  }
  console.log("✓ Step 3 Passed: Target investigation presents challenge question, clue is hidden!");

  // 4. Submit incorrect answer
  console.log("\n[Step 4] Submitting incorrect answer...");
  const wrongRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: "ch-1", answer: "999" }
  );
  console.log("Wrong answer status:", wrongRes.status, "Correct:", wrongRes.data?.data?.correct);
  if (wrongRes.data?.data?.correct !== false) {
    throw new Error("Step 4 Failed: Incorrect answer was marked correct");
  }
  console.log("✓ Step 4 Passed: Penalty applied for wrong answer!");

  // 5. Submit correct answer
  console.log("\n[Step 5] Submitting correct answer ('65')...");
  const rightRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/game/submit-answer",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { playerId, challengeId: "ch-1", answer: "65" }
  );
  console.log("Correct answer status:", rightRes.status, "Correct:", rightRes.data?.data?.correct);
  console.log("Next clue revealed?", Boolean(rightRes.data?.data?.nextClue));
  console.log("Next clue text:", rightRes.data?.data?.nextClue?.text);
  console.log("Next level:", rightRes.data?.data?.nextLevel);

  if (rightRes.data?.data?.correct !== true || !rightRes.data?.data?.nextClue) {
    throw new Error("Step 5 Failed: Correct answer did not reveal next clue!");
  }
  console.log("✓ Step 5 Passed: Question answered -> Next clue decrypted and revealed!");

  console.log("\n>>> ALL PHASE 22 GAMEPLAY FLOW TESTS PASSED SUCCESSFULLY! <<<");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
