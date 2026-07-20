// OneFileSheet ビルドスクリプト(依存ゼロ・ネットワーク不使用)。
// 可読ソース src/OneFileSheet.html から、自己解凍型の配布ファイル
// OneFileSheet.html を生成する。CSS/本文マークアップ/アプリJSを
// deflate 圧縮して base64 で埋め込み、起動時にブラウザ内蔵の
// DecompressionStream で展開する。sheet-data の JSON と AGENT NOTES は
// 平文のまま残すため、AIエージェントからのデータ編集は従来どおり可能。
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src", "OneFileSheet.html");
const OUT = path.join(ROOT, "OneFileSheet.html");
const SPLIT = "\x00@@\x00";
const SHEET_DATA_RE = /<script\b[^>]*\bid=["']sheet-data["'][^>]*>([\s\S]*?)<\/script>/;

const src = fs.readFileSync(SRC, "utf8");

function fail(message) {
  console.error("BUILD FAILED: " + message);
  process.exit(1);
}

// --- ソースから部品を抽出する
const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) fail("style block not found");
const css = styleMatch[1];

const bodyStart = src.indexOf("<body>");
const notesStart = src.indexOf("<!--", bodyStart);
if (bodyStart === -1 || notesStart === -1) fail("body / AGENT NOTES not found");
const markup = src.slice(bodyStart + "<body>".length, notesStart).trim();

const dataMatch = src.match(SHEET_DATA_RE);
if (!dataMatch) fail("sheet-data block not found in src");
const sheetJson = dataMatch[1].trim();
JSON.parse(sheetJson);

const appOpen = '<script id="app-code">';
const appStart = src.indexOf(appOpen);
if (appStart === -1) fail("app-code block not found");
const jsStart = appStart + appOpen.length;
const jsEnd = src.indexOf("</scr" + "ipt>", jsStart);
const appJs = src.slice(jsStart, jsEnd);

const titleMatch = src.match(/<title>([\s\S]*?)<\/title>/);
const headMeta = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">';

// --- ペイロードを圧縮する(内容は無変換なので挙動リスクなし)
const payload = css + SPLIT + markup + SPLIT + appJs;
const packed = zlib.deflateRawSync(Buffer.from(payload, "utf8"), { level: 9 }).toString("base64");

// --- 配布ファイル用の簡潔な AGENT NOTES
const notes = [
  "<!--",
  "AGENT NOTES: The spreadsheet data lives in the script element with id",
  '"sheet-data" below - a JSON document { title, theme, lang, activeSheet,',
  "sheets: [ { name, data } ] } where each data is a 2D array of strings and",
  "data[0] is the header row. Edit ONLY that JSON. Keep the opening tag",
  "unchanged, keep JSON.stringify(doc, null, 2) formatting, and write \"<\" in",
  "cell values as \\u003c. The rest of this file is the packed app runtime;",
  "the readable source lives at src/OneFileSheet.html in the repository.",
  "-->",
].join("\n");

// --- 起動時に展開するブートストラップ
const bootstrap = [
  "(async () => {",
  '  if (!window.DecompressionStream) { document.body.textContent = "This browser is not supported."; return; }',
  '  const packedEl = document.getElementById("app-pack");',
  "  const selfEl = document.currentScript;",
  '  window.__PACKED_HTML__ = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;',
  "  const bytes = Uint8Array.from(atob(packedEl.textContent.trim()), c => c.charCodeAt(0));",
  '  const text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();',
  '  const parts = text.split("\\x00@@\\x00");',
  "  packedEl.remove();",
  "  selfEl.remove();",
  '  const style = document.createElement("style");',
  "  style.textContent = parts[0];",
  "  document.head.appendChild(style);",
  '  document.body.insertAdjacentHTML("afterbegin", parts[1]);',
  '  const script = document.createElement("script");',
  '  script.id = "app-code";',
  "  script.textContent = parts[2];",
  "  document.body.appendChild(script);",
  "})();",
].join("\n");

const out = [
  "<!DOCTYPE html>",
  '<html lang="ja"><head>' + headMeta + "<title>" + (titleMatch ? titleMatch[1] : "OneFileSheet") + "</title></head>",
  "<body>",
  notes,
  '<script id="sheet-data" type="application/json">',
  sheetJson,
  "</scr" + "ipt>",
  '<script id="app-pack" type="text/plain">' + packed + "</scr" + "ipt>",
  "<scr" + "ipt>",
  bootstrap,
  "</scr" + "ipt>",
  "</body></html>",
  "",
].join("\n");

// --- 生成物の安全性検証
const closers = out.split("</scr" + "ipt>").length - 1;
if (closers !== 3) fail("expected 3 closing script tags, got " + closers);
const openers = out.split("<scr" + "ipt").length - 1;
if (openers !== 3) fail("expected 3 opening script tags, got " + openers);

const globalMatches = [...out.matchAll(new RegExp(SHEET_DATA_RE.source, "g"))];
if (globalMatches.length !== 1) fail("sheet-data regex must match exactly once in output");
if (globalMatches[0][1].trim() !== sheetJson) fail("sheet-data content corrupted in output");

// 保存シミュレーション: 敵対的データで置換しても構造が壊れないこと
const evil = { title: "</scr" + "ipt>$&", theme: "auto", lang: "auto", activeSheet: 0, sheets: [{ name: "s", data: [["<x>", "$'"]] }] };
const evilJson = JSON.stringify(evil, null, 2).replace(/</g, "\\u003c");
const saved = out.replace(SHEET_DATA_RE, () => '<script id="sheet-data" type="application/json">' + "\n" + evilJson + "\n" + "</scr" + "ipt>");
if (saved.split("</scr" + "ipt>").length - 1 !== 3) fail("hostile save breaks script structure");
const savedMatch = saved.match(SHEET_DATA_RE);
if (JSON.stringify(JSON.parse(savedMatch[1].trim())) !== JSON.stringify(evil)) fail("hostile save round-trip mismatch");

// 圧縮ペイロードの完全復元とアプリJSの構文チェック
const restored = zlib.inflateRawSync(Buffer.from(packed, "base64")).toString("utf8");
if (restored !== payload) fail("payload does not round-trip");
const restoredJs = restored.split(SPLIT)[2];
if (restoredJs !== appJs) fail("app js corrupted in payload");
const tmpJs = path.join(ROOT, "src", ".build-check.js");
fs.writeFileSync(tmpJs, restoredJs);
try {
  execFileSync(process.execPath, ["--check", tmpJs], { stdio: "pipe" });
} catch (error) {
  fail("app js failed node --check: " + error.stderr);
} finally {
  fs.unlinkSync(tmpJs);
}

fs.writeFileSync(OUT, out);
const srcSize = Buffer.byteLength(src);
const outSize = Buffer.byteLength(out);
console.log("src:  " + srcSize.toLocaleString() + " bytes (" + path.relative(ROOT, SRC) + ")");
console.log("out:  " + outSize.toLocaleString() + " bytes (" + path.relative(ROOT, OUT) + ")");
console.log("ratio: " + (100 * outSize / srcSize).toFixed(1) + "%");
console.log("BUILD OK");
