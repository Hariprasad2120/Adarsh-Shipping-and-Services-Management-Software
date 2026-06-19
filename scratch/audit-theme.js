const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const ignoreDirs = ['.git', '.next', 'node_modules', 'dist', 'build', '.gemini'];
const targetExtensions = ['.tsx', '.ts', '.css', '.js', '.jsx'];

const riskyPatterns = [
  /class(Name)?=.*text-white/,
  /class(Name)?=.*text-black/,
  /class(Name)?=.*bg-white/,
  /class(Name)?=.*bg-black/,
  /class(Name)?=.*border-white/,
  /class(Name)?=.*border-black/,
  /class(Name)?=.*dark:text-white/,
  /class(Name)?=.*dark:text-black/,
  /class(Name)?=.*dark:bg-white/,
  /class(Name)?=.*dark:bg-black/,
  /class(Name)?=.*text-slate-100/,
  /class(Name)?=.*text-slate-900/,
  /class(Name)?=.*text-gray-100/,
  /class(Name)?=.*text-gray-900/,
];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(rootDir, fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (ignoreDirs.includes(file)) continue;
      scanDirectory(fullPath);
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (!targetExtensions.includes(ext)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const pattern of riskyPatterns) {
          if (pattern.test(line)) {
            console.log(`${relativePath}:${idx + 1}: ${line.trim()}`);
            break;
          }
        }
      });
    }
  }
}

console.log('Auditing codebase for risky color classes...');
scanDirectory(rootDir);
console.log('Audit complete.');
