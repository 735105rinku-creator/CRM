import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import express from "express";

import app from "../app.js";
import {
  uploadCompanyLogo, toPublicUploadUrl,
  uploadEmployeePhoto, toPublicEmployeePhotoUrl,
  uploadProfileImage, toPublicProfileImageUrl,
} from "../middleware/upload.middleware.js";

// Exercise the real upload storage, URL helpers and application static mount.
// Only this local test server has upload fixture routes; no database is used.
const harness = express();
const files = [];
const cases = [
  ["company-logos", uploadCompanyLogo, toPublicUploadUrl],
  ["employee-photos", uploadEmployeePhoto, toPublicEmployeePhotoUrl],
  ["profile-images", uploadProfileImage, toPublicProfileImageUrl],
];
for (const [folder, upload, publicUrl] of cases) {
  harness.post(`/fixture/${folder}`, upload.single("image"), (req, res) => {
    files.push(req.file.path);
    assert.equal(path.dirname(req.file.path), path.join(process.cwd(), "public", "uploads", folder));
    res.json({ url: publicUrl(req.file) });
  });
}
harness.use(app);

let server;
let baseUrl;
before(async () => {
  await new Promise((resolve) => {
    server = harness.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await Promise.all(files.map(file => unlink(file)));
});

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
for (const [folder] of cases) {
  test(`${folder}: uploaded bytes are publicly served using the serialized URL`, async () => {
    const form = new FormData();
    form.append("image", new Blob([png], { type: "image/png" }), "fixture.png");
    const uploaded = await fetch(`${baseUrl}/fixture/${folder}`, { method: "POST", body: form });
    assert.equal(uploaded.status, 200);
    const { url } = await uploaded.json();
    assert.ok(url.startsWith(`/uploads/${folder}/`));
    const response = await fetch(`${baseUrl}${url}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^image\/png/);
    assert.equal(response.headers.get("cross-origin-resource-policy"), "cross-origin");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
  });
}

test("a missing upload falls through to notFound even with a working static mount", async () => {
  const url = `/uploads/company-logos/missing-${randomUUID()}.png`;
  const response = await fetch(`${baseUrl}${url}`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.ok(body.message.includes(url));
});
