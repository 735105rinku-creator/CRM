import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("Logistics repositories exclude only explicitly deleted records", () => {
  const directory = path.join(process.cwd(), "src/repositories");
  const files = fs.readdirSync(directory).filter((name) => /^logistics.*\.repository\.js$/i.test(name));
  for (const file of files) {
    const source = fs.readFileSync(path.join(directory, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(source, /isActive\s*:\s*true/, `${file} hides legacy records without isActive`);
  }
});
