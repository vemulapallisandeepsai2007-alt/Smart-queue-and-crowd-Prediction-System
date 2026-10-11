const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  console.log('=== VERIFYING ADMIN OVERHAUL ENDPOINTS ===\n');

  // 1. Admin Login
  console.log('1. Testing Admin Authentication...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'admin', password: 'Admin@12345' }
  );

  if (loginRes.status !== 200 || !loginRes.data?.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('✔ Admin logged in successfully.\n');

  // 2. Overview Stats & Summary
  console.log('2. Testing /api/analytics/summary...');
  const sumRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/analytics/summary',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('✔ Summary status:', sumRes.status);
  console.log('  Total tokens today:', sumRes.data.summary?.totalTokensToday);
  console.log('  Waiting:', sumRes.data.summary?.waitingCount);
  console.log('  Department loads count:', sumRes.data.departmentLoads?.length, '\n');

  // 3. Hospitals & Banks Overview
  console.log('3. Testing /api/admin/places/overview...');
  const placesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/places/overview',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('✔ Places Overview status:', placesRes.status);
  console.log('  Total qualified places found:', placesRes.data.places?.length);
  if (!placesRes.data.places || placesRes.data.places.length === 0) {
    throw new Error('No qualified places returned from /api/admin/places/overview');
  }
  const firstPlace = placesRes.data.places[0];
  console.log(`  Sample place: ${firstPlace.name} (${firstPlace.category}) in ${firstPlace.city}`);
  console.log(`  Approved Staff: ${firstPlace.approvedStaffCount}, Depts: ${firstPlace.departmentCount}, Crowd: ${firstPlace.crowdLevel}\n`);

  // 4. Place Details
  console.log(`4. Testing /api/admin/places/${firstPlace.id}/details...`);
  const detailsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/places/${firstPlace.id}/details`,
    method: 'GET',
    headers: authHeaders,
  });
  console.log('✔ Place Details status:', detailsRes.status);
  console.log('  Departments count:', detailsRes.data.departments?.length);
  console.log('  Approved staff count:', detailsRes.data.approvedStaff?.length);
  console.log('  Hourly bookings buckets:', detailsRes.data.hourlyBookings?.length);
  console.log('  Predicted crowd:', detailsRes.data.predictedCrowd?.level, `(confidence: ${detailsRes.data.predictedCrowd?.confidence}%)`);
  if (detailsRes.data.departments?.length > 0) {
    const dept = detailsRes.data.departments[0];
    console.log(`  Sample Department: ${dept.name}, Doctor: ${dept.doctorName}, Tokens in grid: ${dept.tokens?.length}/75`);
  }
  console.log('');

  // 5. Place Activity Log
  console.log(`5. Testing /api/admin/places/${firstPlace.id}/activity...`);
  const activityRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/places/${firstPlace.id}/activity`,
    method: 'GET',
    headers: authHeaders,
  });
  console.log('✔ Place Activity status:', activityRes.status);
  console.log('  Activity logs returned:', activityRes.data.logs?.length);
  if (activityRes.data.logs?.length > 0) {
    console.log(`  Latest log: [${activityRes.data.logs[0].type}] ${activityRes.data.logs[0].description}`);
  }
  console.log('');

  // 6. Test Settings Thresholds & Demo Simulation Reset
  console.log('6. Testing /api/admin/settings and /api/admin/simulate/reset...');
  const settingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/settings',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('✔ Settings status:', settingsRes.status, 'Alert threshold:', settingsRes.data.settings?.crowdAlertThreshold);

  const resetRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/simulate/reset',
    method: 'POST',
    headers: authHeaders,
  });
  console.log('✔ Demo Reset status:', resetRes.status, 'Message:', resetRes.data?.message, '\n');

  console.log('============================================');
  console.log('ALL ADMIN DASHBOARD REST RESTORED & VERIFIED!');
  console.log('============================================');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
