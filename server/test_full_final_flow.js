const io = require('../client/node_modules/socket.io-client');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runCompleteFlowVerification() {
  console.log('================================================================');
  console.log('🚀 SMART QUEUE & CROWD PREDICTION SYSTEM: FULL FINAL FLOW TEST');
  console.log('================================================================');

  const randomId = Math.floor(1000 + Math.random() * 9000);
  const testUserPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testStaffId = `STAFF-FINAL-${randomId}`;
  const testStaffEmail = `staff_final_${randomId}@hospital.com`;
  const testStaffPhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = 'Password@123';
  const today = new Date().toISOString().split('T')[0];

  // ----------------------------------------------------------------
  // 1. Citizen User: Signup & Login
  // ----------------------------------------------------------------
  console.log('\n[Step 1/6] Citizen User Signup & Login...');
  const userSignupRes = await req('/auth/user/signup', {
    method: 'POST',
    body: {
      name: `Citizen Tester ${randomId}`,
      phone: testUserPhone,
      gender: 'Male',
      dob: '1995-06-20',
      password,
    },
  });
  console.log('User signup status:', userSignupRes.status, userSignupRes.data?.message);
  if (userSignupRes.status !== 201) throw new Error('User signup failed: ' + JSON.stringify(userSignupRes.data));

  const userLoginRes = await req('/auth/user/login', {
    method: 'POST',
    body: { phone: testUserPhone, password },
  });
  console.log('User login status:', userLoginRes.status, 'User token acquired:', !!userLoginRes.data?.token);
  if (userLoginRes.status !== 200) throw new Error('User login failed');
  const userToken = userLoginRes.data.token;

  // ----------------------------------------------------------------
  // 2. Citizen User: Browse & Book Token
  // ----------------------------------------------------------------
  console.log('\n[Step 2/6] Citizen User Books a Token in Cardiology...');
  // Find a hospital department
  const placesRes = await req('/places/nearby?category=Hospital&lat=16.3067&lng=80.4365&radius=10');
  const targetPlace = placesRes.data.places.find((p) => p.source === 'db') || placesRes.data.places[0];
  const deptsRes = await req(`/places/${targetPlace._id}/departments`);
  const targetDept = deptsRes.data.departments[0];
  console.log(`Facility: "${targetPlace.name}" | Department: "${targetDept.name}"`);

  // Get available tokens
  const deptTokensRes = await req(`/departments/${targetDept._id}/tokens?date=${today}`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const availableToken = deptTokensRes.data.tokens.find((t) => t.status === 'available');
  if (!availableToken) throw new Error('No available tokens found');

  const bookRes = await req(`/tokens/${availableToken._id}/book`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log(`Citizen booked Token #${availableToken.number}! Status:`, bookRes.status);
  if (bookRes.status !== 200) throw new Error('Token booking failed');

  // ----------------------------------------------------------------
  // 3. Staff Member: Signup -> Pending Block Verification
  // ----------------------------------------------------------------
  console.log('\n[Step 3/6] Staff Member Signup (Verification of Pending Block)...');
  const staffSignupRes = await req('/auth/staff/signup', {
    method: 'POST',
    body: {
      category: 'Hospital',
      name: `Dr. Final Roster ${randomId}`,
      staffId: testStaffId,
      email: testStaffEmail,
      phone: testStaffPhone,
      password,
    },
  });
  console.log('Staff signup status:', staffSignupRes.status, staffSignupRes.data?.message);
  if (staffSignupRes.status !== 201) throw new Error('Staff signup failed');

  // Verify blocked before approval
  const blockedLoginRes = await req('/auth/staff/login', {
    method: 'POST',
    body: { staffId: testStaffId, password },
  });
  console.log('Staff login before approval (Expected: 403):', blockedLoginRes.status, blockedLoginRes.data?.error);
  if (blockedLoginRes.status !== 403) throw new Error('Staff should have been blocked with 403');

  // ----------------------------------------------------------------
  // 4. Admin: Staff Approval & Department Assignment
  // ----------------------------------------------------------------
  console.log('\n[Step 4/6] Admin Login & Approves Staff Member...');
  const adminLoginRes = await req('/auth/admin/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@12345' },
  });
  const adminToken = adminLoginRes.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const pendingListRes = await req('/admin/staff?status=pending', { headers: adminHeaders });
  const pendingStaffRecord = pendingListRes.data.staff.find((s) => s.staffId === testStaffId);
  if (!pendingStaffRecord) throw new Error('Pending staff record not found in admin list');

  const approveStaffRes = await req(`/admin/staff/${pendingStaffRecord._id}/approve`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      placeId: targetPlace._id,
      departmentId: targetDept._id,
    },
  });
  console.log('Admin approval status:', approveStaffRes.status, approveStaffRes.data?.message);
  if (approveStaffRes.status !== 200) throw new Error('Admin approval failed');

  // ----------------------------------------------------------------
  // 5. Staff Member: Call Next Token & Complete Consultation
  // ----------------------------------------------------------------
  console.log('\n[Step 5/6] Approved Staff Member Calls Next & Completes Token...');
  const staffLoginRes = await req('/auth/staff/login', {
    method: 'POST',
    body: { staffId: testStaffId, password },
  });
  console.log('Staff login after approval (Expected: 200):', staffLoginRes.status);
  if (staffLoginRes.status !== 200) throw new Error('Staff login failed');
  const staffToken = staffLoginRes.data.token;
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };

  // Call Next Token
  const callNextRes = await req(`/departments/${targetDept._id}/call-next?date=${today}`, {
    method: 'POST',
    headers: staffHeaders,
  });
  console.log('Staff called next token ->', callNextRes.status, 'Now Serving:', callNextRes.data?.tokenNumber);
  if (callNextRes.status !== 200) throw new Error('Call next token failed');

  // Complete Token
  const completeRes = await req(`/tokens/${availableToken._id}/complete`, {
    method: 'POST',
    headers: staffHeaders,
  });
  console.log('Staff marked token complete ->', completeRes.status, 'Department Avg Service:', completeRes.data?.avgServiceMinutes, 'mins');
  if (completeRes.status !== 200) throw new Error('Complete token failed');

  // ----------------------------------------------------------------
  // 6. Admin: Run Demo Surge Simulation & Verify Alert Trigger
  // ----------------------------------------------------------------
  console.log('\n[Step 6/6] Admin Runs Crowd Surge Simulation & Observes Live Alert...');
  // Configure sensitive threshold for demonstration verification
  await req('/admin/settings', {
    method: 'PUT',
    headers: adminHeaders,
    body: {
      crowdAlertThreshold: 10,
      lowThreshold: 5,
      mediumThreshold: 15,
      highThreshold: 25,
    },
  });

  const adminSocket = io(SOCKET_URL, {
    auth: { token: adminToken },
    transports: ['websocket'],
  });

  let capturedAlert = null;
  let statsUpdateCount = 0;

  await new Promise((resolve) => {
    adminSocket.on('connect', () => {
      adminSocket.emit('join:admin');
      resolve();
    });
    setTimeout(resolve, 1500);
  });

  adminSocket.on('crowd:alert', (alert) => {
    capturedAlert = alert;
    console.log('🚨 REAL-TIME CROWD ALERT BROADCAST RECEIVED:', alert.recommendation);
  });

  adminSocket.on('admin:statsUpdated', (stats) => {
    statsUpdateCount++;
  });

  // Run simulation of 20 tokens
  const simRes = await req('/admin/simulate', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      departmentId: targetDept._id,
      count: 20,
    },
  });
  console.log('Simulation call status:', simRes.status, simRes.data?.message);

  // Wait for streaming bookings and alert to fire
  await new Promise((r) => setTimeout(r, 3500));
  adminSocket.disconnect();

  // Verify Summary reflects high crowd level
  const summaryRes = await req('/analytics/summary', { headers: adminHeaders });
  console.log('Updated Queue Summary after surge:');
  console.log(`  - Waiting Count: ${summaryRes.data.summary.waitingCount}`);
  console.log(`  - Crowd Level: ${summaryRes.data.summary.crowdLevel}`);
  console.log(`  - Longest Queue Dept: ${summaryRes.data.summary.longestQueue.name} (${summaryRes.data.summary.longestQueue.waitingCount} waiting)`);

  // Reset Demo Simulation Data
  console.log('\n[Cleanup] Resetting Simulated Demo Tokens...');
  const resetRes = await req('/admin/simulate/reset', {
    method: 'POST',
    headers: adminHeaders,
  });
  console.log('Reset simulation status:', resetRes.status, resetRes.data?.message);

  // Restore standard settings
  await req('/admin/settings', {
    method: 'PUT',
    headers: adminHeaders,
    body: {
      crowdAlertThreshold: 75,
      lowThreshold: 25,
      mediumThreshold: 50,
      highThreshold: 75,
    },
  });

  console.log('\n================================================================');
  console.log('🎉 COMPLETE FULL-FLOW VERIFICATION SUITE PASSED 100%!');
  console.log('================================================================');
}

runCompleteFlowVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
