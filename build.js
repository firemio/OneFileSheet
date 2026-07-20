// OneFileSheet ビルドスクリプト。可読ソース src/OneFileSheet.html から、
// 自己解凍型の配布ファイル OneFileSheet.html を生成する。
// アプリの実行時依存はゼロのまま。ビルドだけ devDependencies
// (terser / csso) を使う。初回に npm install が必要。
//
// 配布物はLLMのコンテキストを圧迫しないよう限界までサイズを削る:
//   1. アプリJSを terser で minify(マークアップの onclick から参照される
//      関数名は予約してリネームを禁止)、CSSを csso で minify
//   2. deflate 圧縮(パラメータ総当たりで最小を採用)
//   3. base125 で埋め込む(膨張 33%(base64) → 14.9%)。script 生テキストで
//      禁止すべきバイトは NUL・CR・"<" の3つだけなので、0x01..0x7F から
//      CR と "<" を除いた125値を数字として使える
// 起動時はブラウザ内蔵の DecompressionStream で展開する。
// sheet-data の JSON と AGENT NOTES は平文のまま残すため、
// AIエージェントからのデータ編集は従来どおり可能。
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");
const terser = require("terser");
const csso = require("csso");

// マークアップの onclick="..." から参照されるグローバル関数。
// リネームや未使用扱いでの削除(compress.toplevel)からも保護する
const RESERVED_GLOBALS = ["saveToSameFile", "reloadFromFile", "undo", "redo", "addRow", "addCol"];

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
const headMeta = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="google" content="notranslate">';

// マークアップはコメント・空行・インデントの除去のみ(構造は不変)
function stripMarkup(markupText) {
  if (markupText.includes("<!--")) fail("stripMarkup: comment found - update the stripper");
  return markupText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "")
    .join("\n");
}

// --- base125。HTMLの <script> 生テキストで本当に使えないバイトは
// NUL(0x00)・CR(0x0D: パーサーがLFへ正規化)・<(0x3C: 終了タグ検出)の
// 3つだけなので、0x01..0x7F からその2文字を除いた125値を数字に使う。
// 94バイト(752bit)を108桁(base125)に符号化すると膨張は 108/94 = 14.9%
// (base64: 33%, base85: 25%)。端数は Ascii85 と同じ規則:
// n バイトはゼロ埋めで符号化して先頭 m(n) 桁だけ出力し、復号側は
// 不足桁を最大値(124)で埋めて n バイトを採用する。
// m(n) は「125^(108-m) <= 256^(94-n)」を満たす最小の m(BigIntで厳密に計算)。
const CHUNK_B = 94;
const CHUNK_D = 108;
const P125 = [1n];
for (let i = 1; i <= CHUNK_D; i++) P125[i] = P125[i - 1] * 125n;
const P256 = [1n];
for (let i = 1; i <= CHUNK_B; i++) P256[i] = P256[i - 1] * 256n;
if (P256[CHUNK_B] > P125[CHUNK_D]) fail("chunk geometry invalid: 256^94 > 125^108");

const M_OF = [0];
for (let n = 1; n <= CHUNK_B; n++) {
  let m = M_OF[n - 1] || 1;
  while (P125[CHUNK_D - m] > P256[CHUNK_B - n]) m++;
  M_OF[n] = m;
}
const N_OF = {};
for (let n = 1; n <= CHUNK_B; n++) N_OF[M_OF[n]] = n;

// 数字(0..124)と文字コード(1..127, 13と60を飛ばす)の相互変換は算術で行い、
// ブートストラップ側と式を完全一致させる
function digitToCode(d) {
  let c = d + 1;
  if (c >= 13) c++;
  if (c >= 60) c++;
  return c;
}

function codeToDigit(c) {
  if (c < 1 || c > 127 || c === 13 || c === 60) return -1;
  return c - 1 - (c > 13 ? 1 : 0) - (c > 60 ? 1 : 0);
}

function encode125(buf) {
  const codes = [];
  for (let i = 0; i < buf.length; i += CHUNK_B) {
    const n = Math.min(CHUNK_B, buf.length - i);
    let v = 0n;
    for (let j = 0; j < CHUNK_B; j++) v = v * 256n + BigInt(j < n ? buf[i + j] : 0);
    const m = M_OF[n];
    const digits = new Array(CHUNK_D);
    for (let j = CHUNK_D - 1; j >= 0; j--) {
      digits[j] = Number(v % 125n);
      v /= 125n;
    }
    for (let j = 0; j < m; j++) codes.push(digitToCode(digits[j]));
  }
  return Buffer.from(codes).toString("latin1");
}

// 検証用の復号(ブートストラップと同一ロジック)
function decode125(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i += CHUNK_D) {
    const k = Math.min(CHUNK_D, str.length - i);
    const n = k === CHUNK_D ? CHUNK_B : N_OF[k];
    if (n === undefined) fail("decode125: invalid tail length " + k);
    let v = 0n;
    for (let j = 0; j < CHUNK_D; j++) {
      let d = 124;
      if (j < k) {
        d = codeToDigit(str.charCodeAt(i + j));
        if (d < 0) fail("decode125: char outside alphabet");
      }
      v = v * 125n + BigInt(d);
    }
    for (let j = 0; j < n; j++) bytes.push(Number((v / P256[CHUNK_B - 1 - j]) % 256n));
  }
  return Buffer.from(bytes);
}

// base125 の実装自体をファズ検証(決定的な擬似乱数で、複数チャンク+全端数長をカバー)
{
  let seed = 0x12345678;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 16) & 255;
  for (let len = 0; len <= 2 * CHUNK_B + 3; len++) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) buf[i] = rnd();
    if (!decode125(encode125(buf)).equals(buf)) fail("base125 fuzz round-trip failed at len " + len);
  }
  const edge = Buffer.alloc(CHUNK_B, 255);
  if (!decode125(encode125(edge)).equals(edge)) fail("base125 all-0xFF chunk failed");
}

(async () => {
  // --- minify(挙動の検証はビルド末尾の復元チェック+ブラウザでのスモークで行う)
  const terserOut = await terser.minify(appJs, {
    ecma: 2020,
    compress: { passes: 3, toplevel: true, top_retain: RESERVED_GLOBALS },
    mangle: { toplevel: true, reserved: RESERVED_GLOBALS },
    format: { comments: false },
  });
  const minJs = terserOut.code;
  if (!minJs) fail("terser produced no output");
  for (const name of RESERVED_GLOBALS) {
    if (!minJs.includes(name)) fail("terser dropped reserved global: " + name);
  }
  const minCss = csso.minify(css).css;
  const minMarkup = stripMarkup(markup);

  // --- ペイロードを圧縮する(パラメータ総当たりで最小を採用)
  const payload = minCss + SPLIT + minMarkup + SPLIT + minJs;
  const payloadBuf = Buffer.from(payload, "utf8");
  let compressed = null;
  for (const strategy of [zlib.constants.Z_DEFAULT_STRATEGY, zlib.constants.Z_FILTERED]) {
    for (let memLevel = 8; memLevel <= 9; memLevel++) {
      const c = zlib.deflateRawSync(payloadBuf, { level: 9, memLevel: memLevel, strategy: strategy });
      if (!compressed || c.length < compressed.length) compressed = c;
    }
  }

  const packed = encode125(compressed);
  if (packed.includes("<") || packed.includes("\r") || packed.includes("\0")) fail("packed data contains forbidden chars");

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

  // --- 起動時に展開するブートストラップ(平文で載るため簡潔に保つ)
  const bootstrap = [
    "(async () => {",
    '  if (!window.DecompressionStream) { document.body.textContent = "This browser is not supported."; return; }',
    '  const el = document.getElementById("app-pack");',
    "  const sc = document.currentScript;",
    '  window.__PACKED_HTML__ = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;',
    // trim 禁止: 改行やタブも base125 の数字として使われる
    "  const s = el.textContent;",
    "  const NB = 94, ND = 108;",
    "  const P125 = [1n]; for (let i = 1; i <= ND; i++) P125[i] = P125[i - 1] * 125n;",
    "  const P256 = [1n]; for (let i = 1; i <= NB; i++) P256[i] = P256[i - 1] * 256n;",
    "  const M = [0]; for (let n = 1; n <= NB; n++) { let m = M[n - 1] || 1; while (P125[ND - m] > P256[NB - n]) m++; M[n] = m; }",
    "  const N = {}; for (let n = 1; n <= NB; n++) N[M[n]] = n;",
    "  const bytes = [];",
    "  for (let i = 0; i < s.length; i += ND) {",
    "    const k = Math.min(ND, s.length - i);",
    "    const n = k === ND ? NB : N[k];",
    "    let v = 0n;",
    "    for (let j = 0; j < ND; j++) {",
    "      let d = 124;",
    "      if (j < k) { const c = s.charCodeAt(i + j); d = c - 1 - (c > 13 ? 1 : 0) - (c > 60 ? 1 : 0); }",
    "      v = v * 125n + BigInt(d);",
    "    }",
    "    for (let j = 0; j < n; j++) bytes.push(Number((v / P256[NB - 1 - j]) % 256n));",
    "  }",
    '  const text = await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();',
    '  const parts = text.split("\\x00@@\\x00");',
    "  el.remove();",
    "  sc.remove();",
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
    '<html lang="ja" translate="no"><head>' + headMeta + "<title>" + (titleMatch ? titleMatch[1] : "OneFileSheet") + "</title></head>",
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
  const decoded = decode125(packed);
  if (!decoded.equals(compressed)) fail("base125 does not round-trip on the payload");
  const restored = zlib.inflateRawSync(decoded).toString("utf8");
  if (restored !== payload) fail("payload does not round-trip");
  const restoredJs = restored.split(SPLIT)[2];
  if (restoredJs !== minJs) fail("app js corrupted in payload");
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
  console.log("payload: css " + Buffer.byteLength(minCss).toLocaleString() +
    " + markup " + Buffer.byteLength(minMarkup).toLocaleString() +
    " + js " + Buffer.byteLength(minJs).toLocaleString() +
    " -> deflate " + compressed.length.toLocaleString() +
    " -> base125 " + packed.length.toLocaleString());
  console.log("src:  " + srcSize.toLocaleString() + " bytes (" + path.relative(ROOT, SRC) + ")");
  console.log("out:  " + outSize.toLocaleString() + " bytes (" + path.relative(ROOT, OUT) + ")");
  console.log("ratio: " + (100 * outSize / srcSize).toFixed(1) + "%");
  console.log("BUILD OK");
})().catch(error => fail(error && error.stack ? error.stack : String(error)));
