// scratch/test_branch_dropdown_options.js
const http = require("http");
const { VALID_BRANCHES: BACKEND_BRANCHES } = require("../backend/dist/types");
const { app } = require("../backend/dist/app");
const { prisma } = require("../backend/dist/lib/prisma");
const fs = require("fs");
const path = require("path");

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
  console.log("=== RUNNING BRANCH DROPDOWN OPTIONS TEST SUITE ===");
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
  // SECTION 1: VALID_BRANCHES CONSTANTS & EXACT DISPLAY LABELS
  // ----------------------------------------------------
  console.log("--- SECTION 1: VALID_BRANCHES INTEGRITY ---");

  const expectedBranches = [
    "CO",
    "CIVIL",
    "EC",
    "Electrical",
    "IC",
    "IT",
    "Mech",
    "Chemical",
    "MCA",
    "AI",
    "Others",
  ];

  // 1.1 Backend VALID_BRANCHES
  assert(
    Array.isArray(BACKEND_BRANCHES) && BACKEND_BRANCHES.length === 11,
    `Backend VALID_BRANCHES has exactly 11 options (got ${BACKEND_BRANCHES.length})`
  );

  for (let i = 0; i < expectedBranches.length; i++) {
    assert(
      BACKEND_BRANCHES[i] === expectedBranches[i],
      `Backend branch at index ${i} is exactly '${expectedBranches[i]}'`
    );
  }

  // 1.2 Frontend VALID_BRANCHES in frontend/src/services/types.ts
  const frontendTypesContent = fs.readFileSync(
    path.join(__dirname, "../frontend/src/services/types.ts"),
    "utf-8"
  );
  assert(
    frontendTypesContent.includes('"AI"') && frontendTypesContent.includes('"Others"'),
    "Frontend services/types.ts includes exact strings 'AI' and 'Others'"
  );

  for (const b of expectedBranches) {
    assert(
      frontendTypesContent.includes(`"${b}"`),
      `Frontend services/types.ts preserves branch option "${b}"`
    );
  }

  // 1.3 Registration form dropdown in frontend/src/routes/register.tsx
  const registerFormContent = fs.readFileSync(
    path.join(__dirname, "../frontend/src/routes/register.tsx"),
    "utf-8"
  );
  assert(
    registerFormContent.includes("VALID_BRANCHES.map((b) => ("),
    "register.tsx dynamically renders options from VALID_BRANCHES"
  );
  assert(
    registerFormContent.includes("!VALID_BRANCHES.includes(form.branch as Branch)"),
    "register.tsx validates branch against VALID_BRANCHES"
  );

  // ----------------------------------------------------
  // SECTION 2: BACKEND API VALIDATION & PERSISTENCE
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: API REGISTRATION & PERSISTENCE ---");

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

  // 2.1 Register with branch 'AI'
  const aiEnrollment = `BAI${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
  const aiRes = await httpRequest(
    {
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: `Agent AI ${randAlpha}`,
      enrollmentNumber: aiEnrollment,
      email: `agent_ai_${randSuffix}@techfest.org`,
      contactNumber: `911222${randSuffix}`,
      branch: "AI",
      team: "AI",
    }
  );

  assert(aiRes.status === 201, `Player with branch 'AI' successfully registered (HTTP 201)`);
  assert(aiRes.data?.data?.branch === "AI", `Registration response returns branch 'AI'`);
  const aiPlayerId = aiRes.data.data.id;

  // Verify persistence in DB
  const aiDbPlayer = await prisma.player.findUnique({ where: { id: aiPlayerId } });
  assert(aiDbPlayer?.branch === "AI", `Database persists branch 'AI' correctly`);

  // 2.2 Register with branch 'Others'
  const othersEnrollment = `BOT${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
  const othersRes = await httpRequest(
    {
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: `Agent Others ${randAlpha}`,
      enrollmentNumber: othersEnrollment,
      email: `agent_others_${randSuffix}@techfest.org`,
      contactNumber: `911333${randSuffix}`,
      branch: "Others",
      team: "Others",
    }
  );

  assert(othersRes.status === 201, `Player with branch 'Others' successfully registered (HTTP 201)`);
  assert(othersRes.data?.data?.branch === "Others", `Registration response returns branch 'Others'`);
  const othersPlayerId = othersRes.data.data.id;

  // Verify persistence in DB
  const othersDbPlayer = await prisma.player.findUnique({ where: { id: othersPlayerId } });
  assert(othersDbPlayer?.branch === "Others", `Database persists branch 'Others' correctly`);

  // 2.3 Verify existing branches still work (e.g., 'CO')
  const coEnrollment = `BCO${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
  const coRes = await httpRequest(
    {
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: `Agent CO ${randAlpha}`,
      enrollmentNumber: coEnrollment,
      email: `agent_co_${randSuffix}@techfest.org`,
      contactNumber: `911444${randSuffix}`,
      branch: "CO",
      team: "CO",
    }
  );
  assert(coRes.status === 201, `Existing branch 'CO' successfully registered (HTTP 201)`);
  assert(coRes.data?.data?.branch === "CO", `Registration response returns branch 'CO'`);

  // 2.4 Rejection of invalid branch
  const invalidRes = await httpRequest(
    {
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: `Agent Invalid ${randAlpha}`,
      enrollmentNumber: `BIN${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11),
      email: `agent_invalid_${randSuffix}@techfest.org`,
      contactNumber: `911555${randSuffix}`,
      branch: "AERONAUTICAL",
      team: "AERONAUTICAL",
    }
  );
  assert(invalidRes.status === 400, `Invalid branch 'AERONAUTICAL' rejected with HTTP 400`);
  assert(
    invalidRes.data?.error?.includes("AI") && invalidRes.data?.error?.includes("Others"),
    `Error message includes 'AI' and 'Others' in allowed branches list`
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
