# Photo Permit Scanner — automated tests

## Commands

| Command | What it runs |
|---------|----------------|
| `npm test` | OCR rules + static regression + full Playwright suite |
| `npm run test:permit-ocr` | Node VM tests for classification/extraction only |
| `npm run test:permit-e2e` | Browser UI + **real Tesseract.js** on synthetic images |
| `npm run test:permit-transfer` | Browser questionnaire transfer workflow |
| `npm run test:permit-scanner-static` | No fake fallbacks, transfer map, storage guards |

## Requirements

- Node 18+
- `npm install` (installs `@playwright/test` and Chromium via `postinstall`)
- Network on first OCR run (pinned Tesseract 5.1.1 jsDelivr CDN + English language data)
- Python 3 for the static file server (started automatically by Playwright `webServer`)

If the CDN is unreachable, OCR browser tests **fail** with a load error — they do not skip.

## Fixtures

`global-setup.mjs` renders fictional permit/application/email PNGs into `tests/permit-scanner/fixtures/` before the suite runs. No real permits or personal data are used.