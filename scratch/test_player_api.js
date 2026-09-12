const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- Step 8: Testing Player API against Supabase PostgreSQL ---');

  // 1. Create temporary player
  const createPayload = {
    playerName: 'TEST_QA_PLAYER',
    enrollmentNumber: 'TEST_ENROLL_9999',
    team: 'QA_TEST_TEAM',
    selectedCharacter: 'MALE',
    email: 'test_qa_9999@example.com',
  };

  console.log('1. POST /api/players:');
  const createRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/players',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, createPayload);
  console.log('Status:', createRes.status);
  console.log('Response:', JSON.stringify(createRes.data, null, 2));

  const playerId = createRes.data?.data?.id;
  if (!playerId) {
    console.error('Failed to obtain playerId!');
    return;
  }

  // 2. GET /api/players
  console.log('\n2. GET /api/players:');
  const listRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/players',
    method: 'GET',
  });
  console.log('Status:', listRes.status);
  console.log('Count:', listRes.data?.data?.length);
  const found = listRes.data?.data?.find(p => p.id === playerId);
  console.log('Found created test player in list:', Boolean(found));

  // 3. GET /api/players/:id
  console.log(`\n3. GET /api/players/${playerId}:`);
  const getRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/players/${playerId}`,
    method: 'GET',
  });
  console.log('Status:', getRes.status);
  console.log('Player retrieved:', getRes.data?.data?.playerName, getRes.data?.data?.enrollmentNumber);

  // --- Step 9: Test Error Handling ---
  console.log('\n--- Step 9: Testing Error Handling ---');

  // 4. Duplicate enrollment number
  console.log('\n4. POST /api/players (duplicate enrollmentNumber):');
  const dupEnrollRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/players',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    playerName: 'ANOTHER_PLAYER',
    enrollmentNumber: 'TEST_ENROLL_9999',
    team: 'ANOTHER_TEAM',
  });
  console.log('Status:', dupEnrollRes.status, '(Expected 409)');
  console.log('Error:', dupEnrollRes.data?.error);

  // 5. Duplicate email
  console.log('\n5. POST /api/players (duplicate email):');
  const dupEmailRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/players',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    playerName: 'ANOTHER_PLAYER',
    enrollmentNumber: 'DIFFERENT_ENROLL_8888',
    team: 'ANOTHER_TEAM',
    email: 'test_qa_9999@example.com',
  });
  console.log('Status:', dupEmailRes.status, '(Expected 409)');
  console.log('Error:', dupEmailRes.data?.error);

  // 6. Invalid player ID
  console.log('\n6. GET /api/players/non-existent-id:');
  const notFoundRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/players/non-existent-cuid-12345',
    method: 'GET',
  });
  console.log('Status:', notFoundRes.status, '(Expected 404)');
  console.log('Error:', notFoundRes.data?.error);

  // 7. Unknown route
  console.log('\n7. GET /api/unknown-route:');
  const unknownRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/unknown-route',
    method: 'GET',
  });
  console.log('Status:', unknownRes.status, '(Expected 404)');
  console.log('Error:', unknownRes.data?.error);
}

runTests().catch(console.error);
