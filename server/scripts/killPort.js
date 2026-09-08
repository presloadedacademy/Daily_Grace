import { execSync } from 'child_process';

try {
  const output = execSync('netstat -ano | findstr :5000', { encoding: 'utf8' });
  const lines = output.split('\n').filter(l => l.includes('LISTENING') || l.includes('5000'));
  console.log('Connections on 5000:\n', lines.join('\n'));

  const pids = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && !isNaN(parseInt(pid, 10)) && pid !== '0') {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    console.log(`Killing PID ${pid}...`);
    try {
      execSync(`taskkill /F /PID ${pid}`);
      console.log(`Killed PID ${pid}`);
    } catch (e) {
      console.log(`Could not kill PID ${pid}:`, e.message);
    }
  }
} catch (err) {
  console.log('No processes listening on 5000.');
}
