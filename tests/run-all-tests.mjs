#!/usr/bin/env node

/**
 * Enterprise Test Runner for Excalidraw Developer Platform
 * Runs all unit and integration test suites using Node.js native test runner.
 */

import { run } from "node:test";
import { spec } from "node:test/reporters";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
    path.join(__dirname, "unit/common-schemas.test.mjs"),
    path.join(__dirname, "unit/auth-crypto.test.mjs"),
    path.join(__dirname, "unit/canvas-math.test.mjs"),
    path.join(__dirname, "unit/flow-simulation.test.mjs"),
    path.join(__dirname, "unit/system-design-templates.test.mjs"),
    path.join(__dirname, "unit/ws-protocol.test.mjs"),
];

console.log("\n=======================================================");
console.log("🚀 Excali Engineering Test Suite: Production Readiness");
console.log("=======================================================\n");

const testStream = run({
    files: testFiles,
    concurrency: true,
});

testStream
    .compose(new spec())
    .pipe(process.stdout);

testStream.on("error", (err) => {
    console.error("Test execution failed with error:", err);
    process.exit(1);
});
