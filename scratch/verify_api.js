const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== Starting Full Automated Verification Suite ===\n');
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  async function api(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // 1. User Signup Validation (Age + DOB Auto-calc & Validation)
  console.log('[1] Testing User Signup & Age/DOB Validation...');
  const testPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  
  // Mismatched Age & DOB
  const mismatchRes = await api('/auth/user/signup', 'POST', {
    name: 'Mismatch User',
    phone: testPhone,
    password: 'Password@123',
    dob: '2000-01-01',
    age: 45, // In 2026, age is 26
    gender: 'Male',
    address: 'Guntur'
  });
  assert(mismatchRes.status === 400, `Mismatched age rejected with 400 (got ${mismatchRes.status}: ${mismatchRes.data?.message})`);

  // Invalid Age Range (> 120)
  const invalidAgeRes = await api('/auth/user/signup', 'POST', {
    name: 'Invalid Age User',
    phone: testPhone,
    password: 'Password@123',
    dob: '1850-01-01',
    age: 176,
    gender: 'Male'
  });
  assert(invalidAgeRes.status === 400, `Age > 120 rejected with 400 (got ${invalidAgeRes.status})`);

  // Valid Signup with Age matching DOB (DOB: 1995-06-15 -> Age 31)
  const validDob = '1995-06-15';
  const expectedAge = 31;
  const signupRes = await api('/auth/user/signup', 'POST', {
    name: 'Priya Sharma',
    phone: testPhone,
    password: 'Password@123',
    dob: validDob,
    age: expectedAge,
    gender: 'Female',
    address: 'Brodipet, Guntur'
  });
  assert(signupRes.status === 201 && signupRes.data?.user?.age === 31, 'Valid user signup succeeded with age=31');
  const userToken = signupRes.data?.token;

  // Test /api/auth/me returns age
  const meRes = await api('/auth/me', 'GET', null, userToken);
  assert(meRes.data?.user?.age === 31, `/api/auth/me returns age=31 (got ${meRes.data?.user?.age})`);

  // 2. Staff Logins: Hospital 1 (Ramesh Hospitals) vs Facility 2 (SBI Bank)
  console.log('\n[2] Logging in staff...');
  const s1Res = await api('/auth/staff/login', 'POST', {
    staffId: 'STAFF-HOSP-01',
    password: 'Staff@123'
  });
  assert(s1Res.status === 200, 'Staff 1 (Ramesh Hospitals: STAFF-HOSP-01) login succeeded');
  const staffHosp1Token = s1Res.data?.token;
  const hosp1StaffObj = s1Res.data?.staff;

  const s2Res = await api('/auth/staff/login', 'POST', {
    staffId: 'STAFF-BANK-02',
    password: 'Staff@123'
  });
  assert(s2Res.status === 200, `Staff 2 (SBI Bank: STAFF-BANK-02) login succeeded`);
  const staffHosp2Token = s2Res.data?.token;

  // 3. Token Booking & Patient Snapshot
  console.log('\n[3] Testing Token Booking and Patient Snapshot...');
  const hosp1DeptId = hosp1StaffObj.department?._id || hosp1StaffObj.department;

  const deptTokensRes = await api(`/departments/${hosp1DeptId}/tokens`, 'GET', null, userToken);
  // Find available token in Afternoon or Evening slot
  const availableToken = deptTokensRes.data?.allTokens?.find(
    t => t.status === 'available' && (t.slot === 'Afternoon' || t.slot === 'Evening')
  );
  assert(Boolean(availableToken), `Found available token #${availableToken?.number} in ${availableToken?.slot} slot`);

  const bookRes = await api(`/tokens/${availableToken._id}/book`, 'POST', {}, userToken);
  assert(bookRes.status === 200, `Token #${availableToken.number} booked successfully`);
  const bookedTokenId = availableToken._id;

  // 4. Staff 1 (Same Facility) calls GET /api/tokens/:id/details
  console.log('\n[4] Testing GET /api/tokens/:id/details (Same Facility vs Different Facility)...');
  const detailsRes = await api(`/tokens/${bookedTokenId}/details`, 'GET', null, staffHosp1Token);
  assert(detailsRes.status === 200, 'Same hospital staff gets 200 from /details');
  assert(detailsRes.data?.patient?.name === 'Priya Sharma', `Patient name matches: ${detailsRes.data?.patient?.name}`);
  assert(detailsRes.data?.patient?.age === 31, `Patient age matches: ${detailsRes.data?.patient?.age}`);
  assert(detailsRes.data?.patient?.gender === 'Female', `Patient gender matches: ${detailsRes.data?.patient?.gender}`);
  assert(detailsRes.data?.patient?.phone === testPhone, `Patient phone matches: ${detailsRes.data?.patient?.phone}`);
  assert(detailsRes.data?.walkIn === false, 'walkIn flag is false for online booked token');
  assert(detailsRes.data?.tokenNumber === availableToken.number, `Token number matches: #${detailsRes.data?.tokenNumber}`);

  // Staff 2 (Different Facility) calls GET /api/tokens/:id/details -> MUST GET 403 Forbidden!
  const diffPlaceRes = await api(`/tokens/${bookedTokenId}/details`, 'GET', null, staffHosp2Token);
  assert(diffPlaceRes.status === 403, `Different facility staff correctly denied with 403 Forbidden (got ${diffPlaceRes.status}: ${diffPlaceRes.data?.message})`);

  // 5. Privacy: Regular User vs Staff on GET /api/departments/:id/tokens
  console.log('\n[5] Testing Privacy and Leaks on GET /api/departments/:id/tokens...');
  const otherUserPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const otherUserRes = await api('/auth/user/signup', 'POST', {
    name: 'Other Citizen',
    phone: otherUserPhone,
    password: 'Password@123',
    dob: '1990-01-01',
    age: 36,
    gender: 'Male'
  });
  const otherUserToken = otherUserRes.data?.token;

  const publicDeptRes = await api(`/departments/${hosp1DeptId}/tokens`, 'GET', null, otherUserToken);
  const bookedTokenInPublic = publicDeptRes.data?.allTokens?.find(t => t._id === bookedTokenId);
  assert(bookedTokenInPublic !== undefined, 'Booked token found in department list');
  assert(!bookedTokenInPublic.patient, 'Other user receives NO patient snapshot');
  assert(!bookedTokenInPublic.patientName, 'Other user receives NO patientName');
  assert(!bookedTokenInPublic.patientAge, 'Other user receives NO patientAge');
  assert(!bookedTokenInPublic.user, 'Other user receives NO user object');

  // Staff 1 calls GET /api/departments/:id/tokens -> receives short patientName and patientAge, NO phone
  const staffDeptRes = await api(`/departments/${hosp1DeptId}/tokens`, 'GET', null, staffHosp1Token);
  const bookedTokenInStaffGrid = staffDeptRes.data?.allTokens?.find(t => t._id === bookedTokenId);
  assert(bookedTokenInStaffGrid.patientName === 'Priya Sharma', `Staff grid tile includes short patientName: ${bookedTokenInStaffGrid.patientName}`);
  assert(bookedTokenInStaffGrid.patientAge === 31, `Staff grid tile includes patientAge: ${bookedTokenInStaffGrid.patientAge}`);
  assert(!bookedTokenInStaffGrid.patient?.phone, 'Staff grid list does NOT include phone number');

  // 6. Walk-in Token Booking & Validation
  console.log('\n[6] Testing Walk-in Token Booking with Age Validation...');
  // Find another available token for walk-in in Afternoon or Evening
  const availWalkInToken = deptTokensRes.data?.allTokens?.find(
    t => t.status === 'available' && t._id !== bookedTokenId && (t.slot === 'Afternoon' || t.slot === 'Evening')
  );
  assert(Boolean(availWalkInToken), `Found available token #${availWalkInToken?.number} for walk-in`);

  // Test invalid age (> 120)
  const invalidWalkInRes = await api(`/tokens/${availWalkInToken._id}/walkin`, 'POST', {
    patientName: 'Walkin Test',
    phone: '9876543210',
    age: 150,
    gender: 'Male'
  }, staffHosp1Token);
  assert(invalidWalkInRes.status === 400, `Walk-in with age 150 rejected with 400 (got ${invalidWalkInRes.status})`);

  // Valid Walk-in
  const validWalkInRes = await api(`/tokens/${availWalkInToken._id}/walkin`, 'POST', {
    patientName: 'Rao Walkin',
    phone: '9876543210',
    age: 62,
    gender: 'Male'
  }, staffHosp1Token);
  assert(validWalkInRes.status === 200, `Walk-in token #${validWalkInRes.data?.token?.number} created successfully`);
  const walkInTokenId = validWalkInRes.data?.token?._id;

  // Check Walk-in details via /details
  if (walkInTokenId) {
    const walkInDetails = await api(`/tokens/${walkInTokenId}/details`, 'GET', null, staffHosp1Token);
    assert(walkInDetails.data?.walkIn === true, 'walkIn flag is true for walk-in token');
    assert(walkInDetails.data?.patient?.name === 'Rao Walkin', `Walk-in patient name matches: ${walkInDetails.data?.patient?.name}`);
    assert(walkInDetails.data?.patient?.age === 62, `Walk-in patient age matches: ${walkInDetails.data?.patient?.age}`);
    assert(walkInDetails.data?.patient?.phone === '9876543210', `Walk-in patient phone matches: ${walkInDetails.data?.patient?.phone}`);
  }

  // 7. User "My Tokens"
  console.log('\n[7] Testing My Tokens for Priya Sharma...');
  const myTokensRes = await api('/my/tokens', 'GET', null, userToken);
  const myBooked = myTokensRes.data?.tokens?.find(t => t._id === bookedTokenId);
  assert(Boolean(myBooked), 'My Tokens includes booked token');
  assert(myBooked?.patient?.name === 'Priya Sharma', `My Tokens shows user name: ${myBooked?.patient?.name}`);
  assert(myBooked?.patient?.age === 31, `My Tokens shows user age: ${myBooked?.patient?.age}`);
  assert(myBooked?.patient?.phone === testPhone, `My Tokens shows user phone: ${myBooked?.patient?.phone}`);

  console.log(`\n==============================================`);
  console.log(`Verification Complete: ${failures} failure(s)`);
  console.log(`==============================================\n`);
  process.exit(failures > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
