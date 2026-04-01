#!/usr/bin/env node
/**
 * Quick endpoint checks for staging / local verification.
 * Usage: node scripts/verify-staging.mjs
 * Env: BASE_URL (default http://127.0.0.1:3000)
 */
const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function check(path, label) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    console.log(`${label}: HTTP ${res.status}`);
    if (json && typeof json === "object") {
      console.log(JSON.stringify(json, null, 2).slice(0, 800));
    }
  } catch (e) {
    console.error(`${label}: FAILED`, e?.message ?? e);
  }
}

async function main() {
  console.log(`Base URL: ${base}\n`);
  await check("/api/health", "GET /api/health");
  console.log("");
  await check("/api/ready", "GET /api/ready");
  console.log("");
  try {
    const pageRes = await fetch(`${base}/`);
    console.log(`GET / (marketing): HTTP ${pageRes.status}`);
  } catch (e) {
    console.error(`GET / (marketing): unreachable (${e?.cause?.code ?? e?.message ?? e})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
