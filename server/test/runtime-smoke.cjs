const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const crypto = require('node:crypto');
const manifest = JSON.parse(fs.readFileSync('/opt/ste334-hae/runtime-artifacts.json'));
// A rebuild with the retained compiler must reproduce all deployed JS bytes.
for (const [name, value] of Object.entries(manifest.files)) {
  if (name.startsWith('dist/')) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'), value.sha256, name);
}
const child = spawn(process.execPath, ['dist/app.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
child.stdout.on('data', value => { logs += value; });
child.stderr.on('data', value => { logs += value; });
(async () => {
  try {
    const until = Date.now() + 30000;
    let health;
    while (Date.now() < until) {
      if (child.exitCode !== null) throw new Error('Fixture server exited before readiness');
      try {
        const r = await fetch('http://127.0.0.1:3001/health');
        if (r.status === 200) { health = await r.json(); break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.equal(health?.status, 'ok');
    assert.equal(health?.mongo, 'connected');
    assert.deepEqual(await (await fetch('http://127.0.0.1:3001/')).json(), { message: 'Hello world!' });
    assert.equal((await fetch('http://127.0.0.1:3001/api/metrics')).status, 401);
    assert.equal((await fetch('http://127.0.0.1:3001/api/data', { method: 'POST', body: '{}' })).status, 401);
    console.log(JSON.stringify({ runtimeSmoke: 'PASS', health, unauthenticatedRead: 401, unauthenticatedWrite: 401, compiledDistUnchanged: true }));
  } catch (error) {
    console.error(error);
    console.error(logs); // Fixture has synthetic credentials/data only.
    process.exitCode = 1;
  } finally {
    child.kill('SIGINT');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    timer.unref();
  }
})();
