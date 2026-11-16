const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Use Android Studio's JDK when Windows still references an uninstalled Java.
if (process.platform === 'win32') {
  const java = process.env.JAVA_HOME;
  const bundled = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr');
  if ((!java || !fs.existsSync(path.join(java, 'bin', 'java.exe'))) && fs.existsSync(path.join(bundled, 'bin', 'java.exe'))) {
    process.env.JAVA_HOME = bundled;
  }
  if (process.env.JAVA_HOME) process.env.PATH = path.join(process.env.JAVA_HOME, 'bin') + path.delimiter + process.env.PATH;
}
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
if (sdk && fs.existsSync(sdk)) process.env.ANDROID_HOME = sdk;
const adb = sdk ? path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : 'adb';
for (const port of [3000, 8081, 9000]) {
  const result = spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('Hubungkan satu HP/emulator dengan status device pada adb devices.');
    process.exit(1);
  }
}
const result = spawnSync(process.execPath, [require.resolve('react-native/cli.js'), 'run-android', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
