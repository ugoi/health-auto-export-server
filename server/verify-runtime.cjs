// Exact tree proof includes symlink targets and native add-on bytes.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const manifest = JSON.parse(fs.readFileSync('/opt/ste334-hae/runtime-artifacts.json'));
const root = '/usr/src/server';
const actual = {};
function walk(rel) {
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const name = path.join(rel, entry.name);
    if (entry.isDirectory()) walk(name);
    else if (entry.isSymbolicLink()) actual[name] = { symlink: fs.readlinkSync(path.join(root, name)) };
    else if (entry.isFile()) actual[name] = { sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex') };
  }
}
walk('');
if (Object.keys(actual).length !== Object.keys(manifest.files).length ||
    Object.keys(manifest.files).some(name => JSON.stringify(actual[name]) !== JSON.stringify(manifest.files[name]))) {
  throw new Error('Deployed application/dependency tree changed');
}
if (process.version !== 'v24.22.1' || process.versions.modules !== manifest.process.modules || process.versions.napi !== manifest.process.napi) {
  throw new Error('Unexpected Node version or native-module ABI');
}
const native = manifest.native.filter(name => name.includes('-musl/'));
for (const name of native) require(path.join(root, name));
console.log(JSON.stringify({ filesVerified: Object.keys(actual).length, node: process.version,
  modules: process.versions.modules, napi: process.versions.napi, nativeMuslModulesLoaded: native.length }));
