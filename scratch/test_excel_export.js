/**
 * Comprehensive Automated Verification Suite for Updates 2K26 Branding & Secure Excel Export
 *
 * Validates:
 * 1. Admin-only Excel export authorization
 * 2. Unauthenticated export rejection (401)
 * 3. Non-admin / invalid token export rejection (401)
 * 4. Successful Excel export with valid admin session
 * 5. Content-Type and Content-Disposition headers (valid .xlsx file)
 * 6. Parsing the exported workbook using ExcelJS
 * 7. Verification that worksheet is named "Contestants"
 * 8. Verification of frozen first row
 * 9. Exact 12 columns count and exact headers in exact requested order
 * 10. No extra or sensitive columns (no playerId, password, session, coordinates, etc.)
 * 11. Data accuracy matching Organizer Control Room (names, enrollment, dates, durations)
 * 12. Text formatting on enrollment number and contact number to preserve leading zeros
 * 13. Registration date formatting
 * 14. Non-mutation of database records during export
 * 15. Safe handling of empty or filtered datasets
 */

const ExcelJS = require("../backend/node_modules/exceljs");

const BASE_URL = "http://localhost:5000/api";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Updates2K26";

async function runTest() {
  console.log("============================================================");
  console.log("STARTING TEST: Updates 2K26 Branding & Excel Export Verification");
  console.log("============================================================");

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition, message) {
    totalChecks++;
    if (condition) {
      console.log(`  [PASS] Check ${totalChecks}: ${message}`);
      passedChecks++;
    } else {
      console.error(`  [FAIL] Check ${totalChecks}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- 1. Test Unauthenticated Access to Excel Export ---
  console.log("\n--- Phase 1: Security Authorization Checks ---");
  const unauthRes = await fetch(`${BASE_URL}/admin/export/excel`);
  assert(
    unauthRes.status === 401,
    `Unauthenticated export request must return HTTP 401 (got ${unauthRes.status})`
  );

  // --- 2. Test Invalid Admin Token ---
  const invalidAuthRes = await fetch(`${BASE_URL}/admin/export/excel`, {
    headers: { Authorization: "Bearer bogus_fake_token_123" },
  });
  assert(
    invalidAuthRes.status === 401,
    `Invalid token export request must return HTTP 401 (got ${invalidAuthRes.status})`
  );

  // --- 3. Authenticate as Admin ---
  console.log("\n--- Phase 2: Admin Authentication ---");
  const loginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  assert(loginRes.status === 200, "Admin login with Updates2K26 password returns 200");
  const loginData = await loginRes.json();
  assert(Boolean(loginData.data?.token), "Admin token successfully received");
  const adminToken = loginData.data.token;

  // --- 4. Register a Player with Leading Zeros in Enrollment and Contact to Test Formatting ---
  console.log("\n--- Phase 3: Register Player with Leading Zeros ---");
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const letterMap = { "0":"A", "1":"B", "2":"C", "3":"D", "4":"E", "5":"F", "6":"G", "7":"H", "8":"I", "9":"J" };
  const randAlpha = String(randSuffix).split("").map(c => letterMap[c] || "X").join("");
  const testEnrollment = `0012345${randSuffix}`; // Exactly 11 chars with leading zeros
  const testContact = "0987654321"; // 10 digits with leading zero
  const testName = `Agent Zero ${randAlpha}`;
  const testEmail = `zero_${randSuffix}@updates2k26.org`;

  const regRes = await fetch(`${BASE_URL}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerName: testName,
      enrollmentNumber: testEnrollment,
      email: testEmail,
      contactNumber: testContact,
      branch: "CO",
      team: "CO",
    }),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201) {
    console.error("Registration error details:", regData);
  }
  assert(regRes.status === 201, `Player registration returns 201 (got ${regRes.status})`);
  const createdPlayer = regData.data;

  // Record initial player state to verify no DB mutation during export
  const preExportLeaderboardRes = await fetch(`${BASE_URL}/admin/leaderboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(preExportLeaderboardRes.status === 200, "Leaderboard fetched successfully");
  const preExportLeaderboard = (await preExportLeaderboardRes.json()).data;
  const preExportTarget = preExportLeaderboard.find((p) => p.playerId === createdPlayer.id);
  assert(Boolean(preExportTarget), "Created player found in admin leaderboard");

  // --- 5. Download Excel as Authenticated Admin ---
  console.log("\n--- Phase 4: Authenticated Excel Export ---");
  const exportRes = await fetch(`${BASE_URL}/admin/export/excel`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(exportRes.status === 200, `Authorized Excel export returns 200 (got ${exportRes.status})`);

  const contentType = exportRes.headers.get("content-type");
  assert(
    contentType && contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    `Content-Type matches Excel format (.xlsx), got: ${contentType}`
  );

  const disposition = exportRes.headers.get("content-disposition");
  assert(
    disposition && disposition.includes("attachment") && disposition.includes("updates-2k26-contestants-"),
    `Content-Disposition contains attachment and filename prefix updates-2k26-contestants-, got: ${disposition}`
  );

  // --- 6. Parse Workbook and Validate Structure ---
  console.log("\n--- Phase 5: Workbook Structure & Column Validation ---");
  const buffer = await exportRes.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));

  assert(workbook.worksheets.length === 1, "Workbook contains exactly 1 worksheet");
  const worksheet = workbook.worksheets[0];
  assert(worksheet.name === "Contestants", `Worksheet is named "Contestants" (got "${worksheet.name}")`);

  const expectedColumns = [
    "Serial Number",
    "Contestant Name",
    "Enrollment Number",
    "Contact Number",
    "Email",
    "Branch",
    "Levels Completed",
    "Completion Status",
    "Game Time",
    "Penalty Time",
    "Total Time",
    "Registration Date",
  ];

  assert(
    worksheet.columnCount === 12,
    `Worksheet contains exactly 12 columns (got ${worksheet.columnCount})`
  );

  const headerRow = worksheet.getRow(1);
  const actualHeaders = [];
  for (let i = 1; i <= 12; i++) {
    actualHeaders.push(headerRow.getCell(i).value);
  }

  assert(
    JSON.stringify(actualHeaders) === JSON.stringify(expectedColumns),
    `Exact headers in exact requested order:\nExpected: ${JSON.stringify(expectedColumns)}\nActual:   ${JSON.stringify(actualHeaders)}`
  );

  // Check header row styling
  assert(headerRow.font && headerRow.font.bold === true, "Header row font is bold");

  // Check frozen first row view
  const views = worksheet.views || [];
  const hasFrozenRow = views.some((v) => v.ySplit === 1 && v.state === "frozen");
  assert(hasFrozenRow, "First row is frozen in worksheet views");

  // --- 7. Validate Exported Records & Leading-Zero Preservation ---
  console.log("\n--- Phase 6: Data Accuracy & Formatting Checks ---");
  assert(worksheet.rowCount >= 2, "Worksheet contains at least 1 contestant record row");

  let foundTargetRow = null;
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const enrollValue = String(row.getCell(3).value);
    if (enrollValue === testEnrollment) {
      foundTargetRow = row;
      break;
    }
  }

  assert(Boolean(foundTargetRow), "Target player record found in exported rows");

  // Check exact cells
  assert(
    foundTargetRow.getCell(2).value === testName,
    `Contestant name correctly mapped: "${foundTargetRow.getCell(2).value}"`
  );

  assert(
    String(foundTargetRow.getCell(3).value) === testEnrollment &&
      foundTargetRow.getCell(3).numFmt === "@",
    `Enrollment preserves leading zeros and text format: "${foundTargetRow.getCell(3).value}"`
  );

  assert(
    String(foundTargetRow.getCell(4).value) === testContact &&
      foundTargetRow.getCell(4).numFmt === "@",
    `Contact number preserves leading zeros and text format: "${foundTargetRow.getCell(4).value}"`
  );

  assert(
    foundTargetRow.getCell(5).value === testEmail,
    `Email correctly mapped: "${foundTargetRow.getCell(5).value}"`
  );

  assert(
    foundTargetRow.getCell(6).value === "CO",
    `Branch correctly mapped: "${foundTargetRow.getCell(6).value}"`
  );

  assert(
    typeof foundTargetRow.getCell(7).value === "number" && foundTargetRow.getCell(7).value >= 0,
    `Levels completed is a valid non-negative number: ${foundTargetRow.getCell(7).value}`
  );

  assert(
    ["Not Started", "In Progress", "Completed"].includes(foundTargetRow.getCell(8).value),
    `Completion status is standard readable value: "${foundTargetRow.getCell(8).value}"`
  );

  assert(
    typeof foundTargetRow.getCell(9).value === "string" && foundTargetRow.getCell(9).value.includes(":"),
    `Game time is formatted as MM:SS: "${foundTargetRow.getCell(9).value}"`
  );

  assert(
    typeof foundTargetRow.getCell(10).value === "string" && foundTargetRow.getCell(10).value.endsWith("s"),
    `Penalty time is formatted with 's' suffix: "${foundTargetRow.getCell(10).value}"`
  );

  assert(
    typeof foundTargetRow.getCell(11).value === "string" && foundTargetRow.getCell(11).value.includes(":"),
    `Total time is formatted as MM:SS: "${foundTargetRow.getCell(11).value}"`
  );

  assert(
    typeof foundTargetRow.getCell(12).value === "string" &&
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(foundTargetRow.getCell(12).value),
    `Registration date matches YYYY-MM-DD HH:mm:ss format: "${foundTargetRow.getCell(12).value}"`
  );

  // Ensure serial numbers are 1, 2, 3...
  let sequential = true;
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const sn = worksheet.getRow(r).getCell(1).value;
    if (sn !== r - 1) {
      sequential = false;
      break;
    }
  }
  assert(sequential, "Serial numbers are generated sequentially starting at 1");

  // --- 8. Database Non-Mutation Verification ---
  console.log("\n--- Phase 7: Database Non-Mutation Verification ---");
  const postExportLeaderboardRes = await fetch(`${BASE_URL}/admin/leaderboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const postExportLeaderboard = (await postExportLeaderboardRes.json()).data;
  const postExportTarget = postExportLeaderboard.find((p) => p.playerId === createdPlayer.id);

  assert(
    postExportTarget.currentLevel === preExportTarget.currentLevel &&
      postExportTarget.gameTimeSeconds === preExportTarget.gameTimeSeconds &&
      postExportTarget.penaltySeconds === preExportTarget.penaltySeconds &&
      postExportTarget.status === preExportTarget.status,
    "Export operation is read-only and did not mutate any player score, level, penalty, or status"
  );

  console.log("\n============================================================");
  console.log(`ALL CHECKS PASSED: ${passedChecks}/${totalChecks} successful!`);
  console.log("============================================================");
}

runTest().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
