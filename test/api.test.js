import assert from "node:assert/strict";
import test from "node:test";
import { fmtDur, mediaUrl } from "../src/lib/api.js";

test("mediaUrl preserves absolute URLs and resolves stored paths", () => {
  assert.equal(mediaUrl("https://cdn.example/audio.jpg"), "https://cdn.example/audio.jpg");
  assert.equal(mediaUrl("/uploads/cover.jpg"), "http://localhost:3001/uploads/cover.jpg");
  assert.equal(mediaUrl(null), "");
});

test("fmtDur returns stable minute and second formatting", () => {
  assert.equal(fmtDur(0), "0:00");
  assert.equal(fmtDur(125), "2:05");
});
