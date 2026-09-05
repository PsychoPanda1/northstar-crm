import { createHmac } from 'node:crypto';
import { createInterface } from 'node:readline';

const secret = String(process.env.NORTHSTAR_SESSION_SECRET || '');
if (secret.length < 32) {
  console.error('Set NORTHSTAR_SESSION_SECRET to a strong value of at least 32 characters first.');
  process.exit(1);
}

const input = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
input.question('Owner password (input is not stored): ', (password) => {
  input.close();
  process.stderr.write('\n');
  process.stdout.write(createHmac('sha256', secret).update(password).digest('hex') + '\n');
});
