// scratch/test_phase22_registration.js
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
  console.log("=== RUNNING PHASE 22 REGISTRATION VALIDATION TESTS ===");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const validEnrollment = `EN${Date.now().toString().slice(-5)}${rand}`.slice(0, 11);
  const validContact = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Test 1: Valid registration with all fields
  console.log("\n[Test 1] Valid player registration...");
  const validRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Aarav Sharma",
      enrollmentNumber: validEnrollment,
      email: `aarav_${rand}@example.com`,
      contactNumber: validContact,
      branch: "CO",
    }
  );

  console.log("Status:", validRes.status);
  console.log("Player ID:", validRes.data?.data?.id);
  console.log("Branch:", validRes.data?.data?.branch);
  console.log("Contact:", validRes.data?.data?.contactNumber);

  if (
    validRes.status !== 201 ||
    !validRes.data?.data?.id ||
    validRes.data?.data?.branch !== "CO"
  ) {
    throw new Error(`Test 1 Failed: Expected 201 created, got ${validRes.status}`);
  }
  console.log("✓ Test 1 Passed!");

  // Test 2: Invalid Name (contains numbers)
  console.log("\n[Test 2] Rejection of name with numbers...");
  const invalidNameRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Aarav 123",
      enrollmentNumber: `EN123456780`,
      email: "test@example.com",
      contactNumber: "9876543210",
      branch: "IT",
    }
  );
  console.log("Status:", invalidNameRes.status, invalidNameRes.data?.message);
  if (invalidNameRes.status !== 400) throw new Error("Test 2 Failed: Did not reject invalid name");
  console.log("✓ Test 2 Passed!");

  // Test 3: Invalid Enrollment (not 11 chars)
  console.log("\n[Test 3] Rejection of enrollment not exactly 11 chars...");
  const invalidEnrollRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Valid Name",
      enrollmentNumber: "SHORT",
      email: "test@example.com",
      contactNumber: "9876543210",
      branch: "IT",
    }
  );
  console.log("Status:", invalidEnrollRes.status, invalidEnrollRes.data?.message);
  if (invalidEnrollRes.status !== 400) throw new Error("Test 3 Failed: Did not reject short enrollment");
  console.log("✓ Test 3 Passed!");

  // Test 4: Invalid Contact Number (not 10 digits)
  console.log("\n[Test 4] Rejection of invalid contact number...");
  const invalidContactRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Valid Name",
      enrollmentNumber: "EN123456781",
      email: "test@example.com",
      contactNumber: "+919876543210", // punctuation / > 10 chars
      branch: "IT",
    }
  );
  console.log("Status:", invalidContactRes.status, invalidContactRes.data?.message);
  if (invalidContactRes.status !== 400) throw new Error("Test 4 Failed: Did not reject invalid contact");
  console.log("✓ Test 4 Passed!");

  // Test 5: Invalid Branch (not one of the 9 allowed)
  console.log("\n[Test 5] Rejection of invalid branch...");
  const invalidBranchRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Valid Name",
      enrollmentNumber: "EN123456782",
      email: "test@example.com",
      contactNumber: "9876543210",
      branch: "AERONAUTICAL", // invalid branch
    }
  );
  console.log("Status:", invalidBranchRes.status, invalidBranchRes.data?.message);
  if (invalidBranchRes.status !== 400) throw new Error("Test 5 Failed: Did not reject invalid branch");
  console.log("✓ Test 5 Passed!");

  // Test 6: Duplicate enrollment rejection
  console.log("\n[Test 6] Rejection of duplicate enrollment number...");
  const dupRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Duplicate Person",
      enrollmentNumber: validEnrollment,
      email: "other@example.com",
      contactNumber: "9876543211",
      branch: "IT",
    }
  );
  console.log("Status:", dupRes.status, dupRes.data?.message);
  if (dupRes.status !== 409) throw new Error("Test 6 Failed: Did not return 409 for duplicate");
  console.log("✓ Test 6 Passed!");

  console.log("\n>>> ALL REGISTRATION VALIDATION TESTS PASSED SUCCESSFULLY! <<<");
  return validRes.data?.data?.id;
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
