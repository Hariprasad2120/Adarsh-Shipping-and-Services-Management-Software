import { compare } from "bcryptjs";

const hash = "$2b$12$cWlWi5KzPGv9p.fhIYn8LeD9.skCGmf3gbQbNh0OJAbAYpYHmN/LG";

async function main() {
  const tests = ["password", "admin123", "Admin123", "12345678"];
  for (const p of tests) {
    const ok = await compare(p, hash);
    console.log(`${p}: ${ok}`);
  }
}
main();
