import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';

const input = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
input.question('Owner password (input is not stored): ', (password) => {
  input.close();
  process.stderr.write('\n');
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(String(password), salt, 64).toString('hex');
  process.stdout.write(`scrypt$${salt}$${digest}\n`);
});
