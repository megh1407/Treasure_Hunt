// scratch/test_phase22_admin_security.js
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
  console.log("=== RUNNING PHASE 22 ADMIN SECURITY & MANAGEMENT TESTS ===");

  // 1. Rejection of invalid admin password
  console.log("\n[Test 1] Login with incorrect password...");
  const badLogin = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { password: "WrongPassword999" }
  );
  console.log("Status:", badLogin.status);
  if (badLogin.status !== 401) throw new Error(`Test 1 Failed: Expected 401, got ${badLogin.status}`);
  console.log("✓ Test 1 Passed!");

  // 2. Successful login with master password
  console.log("\n[Test 2] Login with correct master password (Updates2K26)...");
  const goodLogin = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { password: "Updates2K26" }
  );
  console.log("Status:", goodLogin.status);
  const token = goodLogin.data?.data?.token || goodLogin.data?.token;
  if (goodLogin.status !== 200 || !token) {
    throw new Error(`Test 2 Failed: Expected 200 and token, got ${goodLogin.status}`);
  }
  console.log("Admin token received:", token.slice(0, 10) + "...");
  console.log("✓ Test 2 Passed!");

  // 3. Stats endpoint without token
  console.log("\n[Test 3] Access stats without token...");
  const noTokenStats = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/stats",
    method: "GET",
  });
  console.log("Status:", noTokenStats.status);
  if (noTokenStats.status !== 401) throw new Error("Test 3 Failed: Expected 401 for missing token");
  console.log("✓ Test 3 Passed!");

  // 4. Stats endpoint with forged token
  console.log("\n[Test 4] Access stats with forged token...");
  const fakeTokenStats = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/stats",
    method: "GET",
    headers: { Authorization: "Bearer forged_fake_token_123" },
  });
  console.log("Status:", fakeTokenStats.status);
  if (fakeTokenStats.status !== 401) throw new Error("Test 4 Failed: Expected 401 for forged token");
  console.log("✓ Test 4 Passed!");

  // 5. Stats endpoint with valid token
  console.log("\n[Test 5] Access stats with valid token...");
  const validStats = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/stats",
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", validStats.status, validStats.data?.data);
  if (validStats.status !== 200 || typeof validStats.data?.data?.totalPlayers !== "number") {
    throw new Error("Test 5 Failed: Expected 200 and stats payload");
  }
  console.log("✓ Test 5 Passed!");

  // 6. Admin Leaderboard endpoint with valid token
  console.log("\n[Test 6] Access admin leaderboard with valid token...");
  const adminLb = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/leaderboard",
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", adminLb.status, "Entries:", adminLb.data?.data?.length);
  if (adminLb.status !== 200 || !Array.isArray(adminLb.data?.data)) {
    throw new Error("Test 6 Failed: Expected 200 and leaderboard array");
  }
  console.log("✓ Test 6 Passed!");

  // 7. Register a temporary player to test deletion
  console.log("\n[Test 7] Create temporary player to test admin deletion...");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const tempEnrollment = `DEL${Date.now().toString().slice(-4)}${rand}`.slice(0, 11);
  const regRes = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/players",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      playerName: "Delete Test Operative",
      enrollmentNumber: tempEnrollment,
      email: `delete_${rand}@example.com`,
      contactNumber: "9123456780",
      branch: "IT",
    }
  );
  const tempPlayerId = regRes.data?.data?.id;
  if (!tempPlayerId) throw new Error("Test 7 Failed: Could not create temp player");
  console.log("Created temp player:", tempPlayerId, tempEnrollment);
  console.log("✓ Test 7 Passed!");

  // 8. Delete player without token -> 401
  console.log("\n[Test 8] Attempt player deletion without token...");
  const unauthDel = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/admin/players/${tempPlayerId}`,
    method: "DELETE",
  });
  console.log("Status:", unauthDel.status);
  if (unauthDel.status !== 401) throw new Error("Test 8 Failed: Expected 401");
  console.log("✓ Test 8 Passed!");

  // 9. Delete player with valid token -> 200 OK
  console.log("\n[Test 9] Delete player with valid token...");
  const authDel = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/admin/players/${tempPlayerId}`,
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", authDel.status, authDel.data);
  if (authDel.status !== 200) throw new Error("Test 9 Failed: Expected 200");
  
  // Verify player no longer exists
  const getPlayer = await request({
    hostname: "localhost",
    port: 5000,
    path: `/api/players/${tempPlayerId}`,
    method: "GET",
  });
  console.log("Verify deleted player lookup status:", getPlayer.status);
  if (getPlayer.status !== 404) throw new Error("Test 9 Failed: Player still exists after deletion");
  console.log("✓ Test 9 Passed!");

  // 10. Admin Logout
  console.log("\n[Test 10] Admin logout...");
  const logoutRes = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/logout",
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", logoutRes.status);
  if (logoutRes.status !== 200) throw new Error("Test 10 Failed: Expected 200 for logout");
  console.log("✓ Test 10 Passed!");

  // 11. Subsequent access with logged-out token -> 401
  console.log("\n[Test 11] Verify logged-out token is invalidated...");
  const postLogoutStats = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/admin/stats",
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", postLogoutStats.status);
  if (postLogoutStats.status !== 401) throw new Error("Test 11 Failed: Logged-out token was still accepted");
  console.log("✓ Test 11 Passed!");

  // 12. Public Top 5 endpoint security check
  console.log("\n[Test 12] Verify public /api/leaderboard/top5 privacy...");
  const top5Res = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/leaderboard/top5",
    method: "GET",
  });
  console.log("Status:", top5Res.status, "Top5:", top5Res.data);
  if (top5Res.status !== 200 || !Array.isArray(top5Res.data?.data)) {
    throw new Error("Test 12 Failed: Expected 200 and data array");
  }
  for (const p of top5Res.data.data) {
    if (p.email || p.contactNumber || p.enrollmentNumber) {
      throw new Error("Test 12 Failed: Private player data leaked in public top5 endpoint!");
    }
  }
  console.log("✓ Test 12 Passed: Top 5 endpoint exposes ONLY player names!");

  console.log("\n>>> ALL ADMIN SECURITY & MANAGEMENT TESTS PASSED SUCCESSFULLY! <<<");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
