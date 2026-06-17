// build.mjs - szyfruje plaintext poziomów z src/ w zaszyfrowane N.html w katalogu głównym.
//
// Użycie:
//   GATE_PASSWORD="twoje-haslo" npm run build      # zbuduj zaszyfrowane 1.html..7.html
//   GATE_PASSWORD="twoje-haslo" npm test           # tylko testy (nie nadpisuje plików)
//
// Wymaga Node >= 20 (Web Crypto przez node:crypto). Hasło NIGDY nie trafia do repo -
// podajesz je przez zmienną środowiskową, a do repo commitujesz tylko zaszyfrowane pliki.

import { webcrypto as crypto } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const LEVELS = ['1', '2', '3', '4', '5', '6', '7'];

const ITER = 150000;                                  // PBKDF2 - patrz spec (płynność reloadów 6/7)
const MAGIC = Uint8Array.from([0x53, 0x47, 0x01, 0x00]); // "SG" + wersja formatu 1.0
const TEST_ONLY = process.argv.includes('--test-only');

const PASSWORD = process.env.GATE_PASSWORD;
if (!PASSWORD) {
  console.error('BŁĄD: brak zmiennej GATE_PASSWORD. Uruchom np.:');
  console.error('  GATE_PASSWORD="twoje-haslo" npm run build');
  process.exit(1);
}

const utf8 = (s) => new TextEncoder().encode(s);

async function deriveKey(password, salt, usages) {
  const base = await crypto.subtle.importKey(
    'raw', utf8(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, usages);
}

async function encryptLevel(plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(PASSWORD, salt, ['encrypt']);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(plaintext)));

  // format osadzenia: MAGIC(4) || salt(16) || iv(12) || ciphertext+tag
  const blob = new Uint8Array(4 + 16 + 12 + ct.length);
  blob.set(MAGIC, 0);
  blob.set(salt, 4);
  blob.set(iv, 20);
  blob.set(ct, 32);
  return Buffer.from(blob).toString('base64');
}

// Odszyfrowanie tą samą drogą co przeglądarka - do testów round-trip.
async function decryptLevel(b64, password) {
  const blob = new Uint8Array(Buffer.from(b64, 'base64'));
  if (!(blob[0] === 0x53 && blob[1] === 0x47 && blob[2] === 0x01 && blob[3] === 0x00)) {
    throw new Error('zły MAGIC / wersja formatu');
  }
  const salt = blob.slice(4, 20);
  const iv = blob.slice(20, 32);
  const ct = blob.slice(32);
  const key = await deriveKey(password, salt, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// Skorupa deszyfrująca (runtime stub) - jawny HTML+JS doklejany do każdego N.html.
// Zawiera TYLKO szyfrogram; po podaniu hasła odszyfrowuje i wstrzykuje treść poziomu.
function shell(payloadB64, levelNo) {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poziom ${levelNo} - zablokowany</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="kicker">vibecoding // brama</div>
    <h1>Poziom ${levelNo} jest zaszyfrowany</h1>
    <p class="lead">Treść tego poziomu jest zaszyfrowana (AES-GCM) i nie ma jej w tej stronie -
    jest tu tylko szyfrogram. Podaj <b>hasło z zajęć</b>, żeby ją odszyfrować. Bez hasła nie da się
    jej wyciągnąć ani z konsoli, ani przez pobranie adresu narzędziem AI - bo tu jej po prostu nie ma.</p>
  </header>

  <div class="card" id="brama">
    <form id="formularz" class="actions" style="gap:10px;flex-wrap:wrap">
      <input id="haslo" type="password" autocomplete="off" autofocus
        placeholder="hasło z zajęć"
        style="flex:1;min-width:220px;padding:11px 13px;border-radius:9px;border:1px solid var(--line);background:#0b1220;color:inherit;font-size:15px">
      <button class="primary" id="otworz" type="submit">Odszyfruj poziom</button>
      <span class="status" id="status">Czeka na hasło...</span>
    </form>
  </div>

  <footer class="foot"><a href="index.html">&larr; wszystkie poziomy</a></footer>
</div>

<script>
(function () {
  "use strict";
  var PAYLOAD = "__PAYLOAD_B64__";
  var ITER = ${ITER};
  var SS_KEY = "scrapowanie_gate_pw";

  function b64ToBytes(b64) {
    var bin = atob(b64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  async function decrypt(pw) {
    var raw = b64ToBytes(PAYLOAD);
    if (!(raw[0] === 0x53 && raw[1] === 0x47 && raw[2] === 0x01 && raw[3] === 0x00)) {
      throw new Error("format");
    }
    var salt = raw.slice(4, 20), iv = raw.slice(20, 32), ct = raw.slice(32);
    var base = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(pw.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: ITER, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
    return new TextDecoder().decode(pt);
  }

  function render(html) {
    document.open();
    document.write(html);
    document.close();
  }

  function setStatus(msg, cls) {
    var el = document.getElementById("status");
    if (el) { el.textContent = msg; el.className = "status" + (cls ? " " + cls : ""); }
  }

  async function unlock(pw, fromSession) {
    try {
      var html = await decrypt(pw);          // złe hasło -> tag GCM nie pasuje -> wyjątek
      try { sessionStorage.setItem(SS_KEY, pw); } catch (e) {}
      render(html);
    } catch (e) {
      if (fromSession) {
        try { sessionStorage.removeItem(SS_KEY); } catch (e2) {}
        setStatus("Czeka na hasło...", "");
      } else {
        setStatus("Błąd odszyfrowania - sprawdź hasło lub skontaktuj się z prowadzącym.", "bad");
      }
    }
  }

  document.getElementById("formularz").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pw = document.getElementById("haslo").value;
    if (!pw) { setStatus("Wpisz hasło.", "bad"); return; }
    setStatus("Odszyfrowywanie...", "");
    unlock(pw, false);
  });

  // auto-unlock: jeśli hasło już jest w sesji (odblokowano inny poziom albo reload 6/7)
  var saved = null;
  try { saved = sessionStorage.getItem(SS_KEY); } catch (e) {}
  if (saved) { setStatus("Odszyfrowywanie...", ""); unlock(saved, true); }
})();
</script>
</body>
</html>
`.replace('__PAYLOAD_B64__', payloadB64);
}

// Tokeny (słowa >= 8 liter) - do blocklisty.
function tokens(str) {
  return new Set(str.match(/\p{L}{8,}/gu) || []);
}

// Tokeny stałej skorupy (nazwy API JS, słowa z formularza) - to NIE są wycieki.
const SHELL_TOKENS = tokens(shell('', '0'));

// Charakterystyczne tokeny plaintextu poziomu z pominięciem tych, które i tak są w skorupie.
// Zostają realne słowa treści (wiersze, autorzy), których obecność w artefakcie = wyciek.
function distinctiveTokens(plaintext) {
  return [...tokens(plaintext)]
    .filter((t) => !SHELL_TOKENS.has(t))
    .sort((a, b) => b.length - a.length)
    .slice(0, 20);
}

async function run() {
  const built = [];
  let failures = 0;

  for (const n of LEVELS) {
    const srcPath = path.join(SRC, `${n}.html`);
    const plaintext = await readFile(srcPath, 'utf8');
    const payload = await encryptLevel(plaintext);
    const html = shell(payload, n);

    // TEST 1: round-trip - odszyfrowanie zwraca dokładnie oryginał
    const back = await decryptLevel(payload, PASSWORD);
    if (back !== plaintext) { console.error(`  [FAIL] round-trip poziom ${n}`); failures++; }

    // TEST 2: złe hasło rzuca wyjątek (nie zwraca treści)
    let threw = false;
    try { await decryptLevel(payload, PASSWORD + '_zle'); } catch (e) { threw = true; }
    if (!threw) { console.error(`  [FAIL] złe hasło NIE rzuciło wyjątku, poziom ${n}`); failures++; }

    // TEST 3: blocklista - żaden charakterystyczny token nie wycieka do artefaktu
    const leaked = distinctiveTokens(plaintext).filter((t) => html.includes(t));
    if (leaked.length) {
      console.error(`  [FAIL] wyciek plaintextu w poziomie ${n}: ${leaked.join(', ')}`);
      failures++;
    }

    built.push({ n, html, bytes: payload.length });
  }

  if (failures) {
    console.error(`\nTESTY: ${failures} błędów - NIE zapisuję plików.`);
    process.exit(1);
  }

  if (TEST_ONLY) {
    console.log(`TESTY OK (${LEVELS.length} poziomów): round-trip, złe hasło, blocklista.`);
    return;
  }

  for (const { n, html } of built) {
    await writeFile(path.join(ROOT, `${n}.html`), html, 'utf8');
  }
  console.log(`Zbudowano ${built.length} zaszyfrowanych poziomów (PBKDF2 ${ITER}, AES-256-GCM).`);
  console.log('TESTY OK: round-trip, złe hasło, blocklista. Pliki w katalogu głównym zaktualizowane.');
}

run().catch((e) => { console.error(e); process.exit(1); });
