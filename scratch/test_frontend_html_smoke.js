// scratch/test_frontend_html_smoke.js
const http = require("http");

function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5173${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, html: data }));
    }).on("error", reject);
  });
}

async function run() {
  console.log("=== VERIFYING FRONTEND ROUTES SERVED BY VITE ===");

  // 1. Landing page
  const home = await fetch("/");
  console.log("GET / status:", home.status);
  if (home.status !== 200) throw new Error("Home page returned non-200");
  if (home.html.includes('href="/admin"') || home.html.includes("Control Room")) {
    throw new Error("Landing page contains link to /admin or Control Room!");
  }
  console.log("✓ Landing page does NOT contain /admin or Control Room links.");

  // 2. Leaderboard page
  const lb = await fetch("/leaderboard");
  console.log("GET /leaderboard status:", lb.status);
  if (lb.status !== 200) throw new Error("Leaderboard page returned non-200");
  if (lb.html.includes('href="/admin"') || lb.html.includes("Control Room")) {
    throw new Error("Leaderboard page contains link to /admin or Control Room!");
  }
  console.log("✓ Player Dashboard does NOT contain /admin or Control Room links.");

  // 3. Admin page
  const admin = await fetch("/admin");
  console.log("GET /admin status:", admin.status);
  if (admin.status !== 200) throw new Error("Admin page returned non-200");
  console.log("✓ Admin route is accessible at /admin.");

  // 4. Register page
  const reg = await fetch("/register");
  console.log("GET /register status:", reg.status);
  if (reg.status !== 200) throw new Error("Register page returned non-200");
  console.log("✓ Register route is accessible at /register.");

  console.log("\n>>> ALL FRONTEND ROUTE CHECKS PASSED! <<<");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
