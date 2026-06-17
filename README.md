# Scrapowanie z konsoli

Materiał edukacyjny do kursu vibecodingu. Siedem broniących się stron - każda ukrywa kultowy
cytat z science fiction i każe "odpowiedzieć na 10 pytań". Zadaniem kursanta jest **obejść obronę
z konsoli przeglądarki (F12)** i wydobyć tekst.

**Wersja na żywo:** https://bartekszyma.github.io/scrapowanie-z-consoli/

## Poziomy

| Nr | Temat | Czego uczy |
|----|-------|-----------|
| 1 | Schowane w DOM | `hidden`, `disabled`, manipulacja DOM |
| 2 | Walidacja w JS | nadpisywanie funkcji, flagi, honeypoty |
| 3 | Zakodowany tekst | base64 / XOR, dekoje |
| 4 | Zatrute kopiowanie | `textContent`, pseudo-elementy, blokada schowka |
| 5 | Aktywna obrona | dynamiczne pola, MutationObserver, anty-devtools |
| 6 | Auto-refresh (aha!) | `view-source`, Disable JavaScript |
| 7 | Boss: refresh + JS | pauza wykonania, breakpoint, `clearTimeout` |

## Pointa

Żadna z obron nie jest "nie do złamania" - bo cokolwiek trafia do przeglądarki, da się stamtąd
wydobyć, a model AI tylko to przyspiesza. To jest lekcja: **obrona po stronie klienta to teatr.
Nigdy nie ufaj klientowi.**

Instrukcja dla kursanta (cel, reguły gry, rozgrzewka z konsolą): [`instrukcja.html`](https://bartekszyma.github.io/scrapowanie-z-consoli/instrukcja.html).

Cytaty to krótkie, kultowe linie z filmów/książek sci-fi, przytoczone jako cytat w materiale edukacyjnym.

## Brama szyfrująca (dla prowadzącego)

Serwowane `1.html`..`7.html` zawierają **tylko szyfrogram** (AES-256-GCM). Treść poziomu jest
odszyfrowywana w przeglądarce dopiero po podaniu **hasła rozdanego na zajęciach** - dzięki temu
samo wklejenie adresu poziomu do narzędzia AI nic nie da (narzędzie dostaje szum, nie ma hasła).
To celowo mobilizuje kursantów do realnej pracy w konsoli przy wsparciu modelu.

Plaintext poziomów żyje lokalnie w `src/` (w `.gitignore`, nigdy do publicznego repo).
Budowanie zaszyfrowanych plików (Node >= 20):

```bash
GATE_PASSWORD="twoje-haslo-z-zajec" npm run build   # szyfruje src/ -> 1.html..7.html
GATE_PASSWORD="twoje-haslo-z-zajec" npm test         # same testy (round-trip, złe hasło, blocklista)
```

Hasło podajesz przez zmienną środowiskową - nigdy nie trafia do repo. Pełny opis mechanizmu,
modelu zagrożeń i ograniczeń: `docs/superpowers/specs/2026-06-17-brama-szyfrujaca-design.md`
(lokalnie, poza repo).
