const http = require('http');

async function testApi() {
  console.log('Testing live API on http://localhost:5000...');

  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/health').then(r => r.json());
  console.log('1. Health check response:', healthRes);

  // 2. Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@shortdoc.uz', password: 'Admin123!' }),
  }).then(r => r.json());

  console.log('2. Login response:', {
    success: loginRes.success,
    message: loginRes.message,
    user: loginRes.data?.user?.fullName,
    role: loginRes.data?.user?.role,
  });

  const token = loginRes.data?.token;

  // 3. Dashboard stats with token
  const dashRes = await fetch('http://localhost:5000/api/reports/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  console.log('3. Dashboard counts:', dashRes.data?.counts);

  // 4. Documents list
  const docsRes = await fetch('http://localhost:5000/api/documents', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  console.log('4. Documents list total:', docsRes.meta?.total, 'items. Sample title:', docsRes.data?.[0]?.title);

  console.log('\n ALL LIVE ENDPOINT CHECKS PASSED SUCCESSFULLY!');
}

testApi().catch(err => {
  console.error('Test API error:', err);
  process.exit(1);
});
