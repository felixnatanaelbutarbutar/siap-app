const { io } = require('socket.io-client');
// using global fetch

async function runTest() {
  console.log('=== TEST WEBSOCKET ===');
  
  // 1. Login Admin
  const adminLogin = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nik: '00001', password: 'admin123' })
  }).then(r => r.json());
  
  const adminToken = adminLogin.data.token;
  console.log('[Admin] Logged in');

  // 2. Login Staff (Satpam)
  const staffLogin = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nik: '11001', password: 'staff123' })
  }).then(r => r.json());

  const staffToken = staffLogin.data.token;
  console.log('[Staff] Logged in');

  // 3. Admin Connect Socket
  const adminSocket = io('http://localhost:3000', {
    auth: { token: adminToken }
  });

  adminSocket.on('connect', () => console.log('[Admin] Socket connected'));
  adminSocket.on('location:snapshot', (data) => console.log('[Admin] Received snapshot:', data));
  adminSocket.on('location:updated', (data) => console.log('[Admin] Location updated:', data));
  adminSocket.on('absensi:new', (data) => console.log('[Admin] Absensi baru:', data));

  // 4. Staff Connect Socket
  const staffSocket = io('http://localhost:3000', {
    auth: { token: staffToken }
  });

  staffSocket.on('connect', () => {
    console.log('[Staff] Socket connected');
    
    // 5. Staff Emit Location
    setTimeout(() => {
      console.log('[Staff] Emit location...');
      staffSocket.emit('location:update', { lat: -6.2, lng: 106.8, akurasi: 10 });
    }, 1000);
  });

  // 6. Test REST API to trigger Absensi Event (Mulai Istirahat)
  setTimeout(async () => {
    console.log('\n[Staff] Trigger REST API Absensi Mulai Istirahat...');
    await fetch('http://localhost:3000/absensi/mulai-istirahat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ lat: -6.2, lng: 106.8 })
    });
  }, 2000);

  // Stop script after 4 seconds
  setTimeout(() => {
    adminSocket.disconnect();
    staffSocket.disconnect();
    console.log('=== TEST SELESAI ===');
    process.exit(0);
  }, 4000);
}

runTest().catch(console.error);
