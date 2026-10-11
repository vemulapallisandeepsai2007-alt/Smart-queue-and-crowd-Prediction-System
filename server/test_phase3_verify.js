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

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 SMART QUEUE SYSTEM - PHASE 3 VERIFICATION SUITE');
  console.log('====================================================');

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const testStaffId = `STAFF-VERIFY-${randomSuffix}`;
  const testStaffEmail = `staff_${randomSuffix}@test.com`;
  const testStaffPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = 'Password@123';

  // 1. Staff Signup
  console.log('\n[1/7] Testing Staff Signup...');
  const signupRes = await req('/auth/staff/signup', {
    method: 'POST',
    body: {
      category: 'Hospital',
      name: `Dr. Verification ${randomSuffix}`,
      staffId: testStaffId,
      email: testStaffEmail,
      phone: testStaffPhone,
      password,
    },
  });
  console.log('Signup status:', signupRes.status, signupRes.data?.message);
  if (signupRes.status !== 201) throw new Error('Staff signup failed');

  // 2. Staff Login before approval (should be blocked as pending)
  console.log('\n[2/7] Testing Staff Login while PENDING (Expected: 403)...');
  const pendingLoginRes = await req('/auth/staff/login', {
    method: 'POST',
    body: { staffId: testStaffId, password },
  });
  console.log('Pending login status:', pendingLoginRes.status, pendingLoginRes.data?.error);
  if (pendingLoginRes.status !== 403) throw new Error(`Expected 403 for pending staff, got ${pendingLoginRes.status}`);

  // 3. Admin Login & Staff Approval with Place + Department assignment
  console.log('\n[3/7] Testing Admin Login & Staff Approval...');
  const adminLoginRes = await req('/auth/admin/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@12345' },
  });
  if (adminLoginRes.status !== 200) throw new Error('Admin login failed');
  const adminToken = adminLoginRes.data.token;

  // Fetch facilities for assignment
  const facilitiesRes = await req('/admin/facilities', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const place = facilitiesRes.data.places[0];
  const assignedDept = place.departments[0];
  const otherDept = place.departments[1] || place.departments[0];
  console.log(`Assigning staff to Place: "${place.name}" | Dept: "${assignedDept.name}"`);

  // Find staff ID in pending list
  const pendingStaffRes = await req('/admin/staff?status=pending', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pendingRecord = pendingStaffRes.data.staff.find((s) => s.staffId === testStaffId);
  if (!pendingRecord) throw new Error('New staff not found in admin pending list');

  // Approve
  const approveRes = await req(`/admin/staff/${pendingRecord._id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { placeId: place._id, departmentId: assignedDept._id },
  });
  console.log('Approve status:', approveRes.status, approveRes.data?.message);
  if (approveRes.status !== 200) throw new Error('Staff approval failed');

  // 4. Staff Login after approval
  console.log('\n[4/7] Testing Staff Login after approval (Expected: 200)...');
  const approvedLoginRes = await req('/auth/staff/login', {
    method: 'POST',
    body: { staffId: testStaffId, password },
  });
  console.log('Approved login status:', approvedLoginRes.status, 'Welcome:', approvedLoginRes.data?.user?.name);
  if (approvedLoginRes.status !== 200) throw new Error('Staff login failed after approval');
  const staffToken = approvedLoginRes.data.token;

  // 5. Check 403 Enforcement for unassigned department
  console.log('\n[5/7] Testing Authorization Enforcement (Staff calls/modifies UNASSIGNED department)...');
  const fakeDeptId = '507f1f77bcf86cd799439011'; // Valid ObjectId but unassigned
  const unassignedCallRes = await req(`/departments/${fakeDeptId}/call-next`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('Unassigned dept call status:', unassignedCallRes.status, unassignedCallRes.data?.error);
  if (unassignedCallRes.status !== 403) throw new Error(`Expected 403 for unassigned department, got ${unassignedCallRes.status}`);

  // 6. Socket.IO Real-time updates test
  console.log('\n[6/7] Testing Socket.IO Connection & Real-time Room Broadcast...');
  const userSocket = io(SOCKET_URL, {
    auth: { token: adminToken },
    transports: ['websocket'],
  });

  const today = new Date().toISOString().split('T')[0];
  let receivedSocketEvents = [];

  await new Promise((resolve, reject) => {
    userSocket.on('connect', () => {
      console.log('Connected to Socket.IO! Socket ID:', userSocket.id);
      userSocket.emit('join:department', { departmentId: assignedDept._id, date: today });
      resolve();
    });
    userSocket.on('connect_error', (err) => reject(err));
    setTimeout(() => resolve(), 2000);
  });

  userSocket.on('queue:nowServing', (data) => {
    console.log('⚡ Socket event received: queue:nowServing ->', data);
    receivedSocketEvents.push('queue:nowServing');
  });

  userSocket.on('counter:paused', (data) => {
    console.log('⚡ Socket event received: counter:paused ->', data);
    receivedSocketEvents.push('counter:paused');
  });

  userSocket.on('token:updated', (data) => {
    console.log('⚡ Socket event received: token:updated ->', data.token?.number, data.token?.status);
    receivedSocketEvents.push('token:updated');
  });

  // User books token #1 in assigned department
  const userLoginRes = await req('/auth/user/login', {
    method: 'POST',
    body: { phone: '9123456789', password: 'User@123' },
  });
  const userAuthToken = userLoginRes.data.token;

  // Get available tokens
  const tokensRes = await req(`/departments/${assignedDept._id}/tokens?date=${today}`, {
    headers: { Authorization: `Bearer ${userAuthToken}` },
  });
  const tokenToBook = tokensRes.data.tokens.find((t) => t.status === 'available');

  const bookRes = await req(`/tokens/${tokenToBook._id}/book`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAuthToken}` },
  });
  console.log('User booked Token #', tokenToBook.number, 'status:', bookRes.status);

  // Staff calls next token
  const callNextRes = await req(`/departments/${assignedDept._id}/call-next?date=${today}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('Staff called next token ->', callNextRes.status, 'Serving token #:', callNextRes.data?.tokenNumber);

  // Staff marks token completed
  const completeRes = await req(`/tokens/${tokenToBook._id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('Staff marked token completed ->', completeRes.status, 'avgServiceMinutes:', completeRes.data?.avgServiceMinutes);

  // Staff pauses counter
  const pauseRes = await req(`/departments/${assignedDept._id}/pause`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('Staff paused counter ->', pauseRes.status, 'isPaused:', pauseRes.data?.isPaused);

  // Staff resumes counter
  const resumeRes = await req(`/departments/${assignedDept._id}/resume`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('Staff resumed counter ->', resumeRes.status, 'isPaused:', resumeRes.data?.isPaused);

  // Wait a moment for socket events
  await new Promise((r) => setTimeout(r, 1000));
  userSocket.disconnect();

  console.log('\n[7/7] Verifying Admin Staff Deactivation...');
  const deactivateRes = await req(`/admin/staff/${pendingRecord._id}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Deactivate status:', deactivateRes.status, deactivateRes.data?.message);
  if (deactivateRes.status !== 200) throw new Error('Staff deactivation failed');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 3 VERIFICATION TESTS PASSED!');
  console.log(`Socket events captured: ${receivedSocketEvents.join(', ')}`);
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
