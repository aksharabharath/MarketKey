# MarketKey

![MarketKey Application Screenshot](marketkey-screenshot.png)

**A permit-navigation helper for food vendors in Fremont and Alameda County—plain-language guidance and a guided path to the county Temporary Food Facility (TFF) application.**

MarketKey is a static web app that helps vendors understand Alameda County–oriented permit steps. On the **TFF path**, users complete a structured workflow and download a filled county PDF. On the **agricultural path**, the app shows exemption-oriented guidance only (no PDF is generated).

**[Try MarketKey Live](https://marketkey-one.vercel.app/)**

---

## Why We Built It

Small food businesses often face dense terminology, branching requirements, and multi-page county forms when preparing health permit paperwork.

We built MarketKey to make that process easier to follow locally: a landing overview, language selection, product-path triage, and—for prepared-food vendors—a guided walkthrough that maps answers onto the official Alameda County TFF template.

MarketKey is focused on **Fremont and Alameda County** use cases. It is not a statewide permit system.

## Core Features

- **Five-step workflow:** Language → path selection → questions (form, commissary, food-safety quiz, checklist, signature) → review → download confirmation.
- **Question bank:** `questions.json` defines **58** county-application questions with localized prompts; the UI renders most of them on the TFF path (one office-use field is omitted from the form).
- **Food-safety quiz & checklist:** Additional English-language quiz and self-inspection checklist steps are part of the TFF experience beyond the JSON question bank.
- **Multilingual UI:** English, Spanish, Chinese (`zh`), and Hindi for navigation, many form labels, and select options. Free-text answers are labeled **“Type your answers in English”** for consistent PDF mapping.
- **TFF PDF generation:** The TFF path uses [pdf-lib](https://pdf-lib.js.org/) (loaded from jsDelivr) to fill `main code/assets/tff-application.pdf` in the browser.
- **Digital signature:** Users draw a signature on a canvas; it is embedded into the generated TFF PDF when supported by the template.
- **Client-side processing:** No backend receives completed applications; state lives in browser memory for the active session.

## How It Works

1. **Landing & language:** Visitors review the overview, then choose English, Spanish, Chinese, or Hindi.
2. **Path selection:** **TFF** (prepared food, baked goods, samples) opens the full questionnaire. **Agricultural** (farm-grown whole produce, etc.) shows guidance text only.
3. **TFF questionnaire:** Dynamic fields from `questions.json`, plus food-safety quiz items and a booth checklist (see above).
4. **Review:** Users confirm answers, then trigger PDF generation.
5. **Download:** `pdf-lib` fills the bundled county template and embeds the signature. In-memory form data is cleared after a successful download. The agricultural path does not run this step.

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5, CSS3, JavaScript | Static app shell, styling, and logic |
| `questions.json` | Question definitions and localized prompts |
| pdf-lib (CDN) | Client-side PDF form filling |
| Tailwind CSS (CDN) | Utility layout on top of custom CSS |
| Google Fonts | League Spartan, Yeseva One |
| Vercel | Hosting for the live demo |

No frontend build step is required to run the app locally.

### Project Structure

```text
MarketKey/
├── main code/                 # Application root (also Vercel deploy root)
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   ├── questions.json
│   └── assets/
│       ├── logo.png
│       └── tff-application.pdf
├── data/                      # PDF field reference data (development)
├── docs/                      # Design and permit research notes
├── scripts/                   # Optional maintainer checks
├── package.json               # Optional dev dependency (e.g. field extraction)
├── marketkey-screenshot.png
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- [Python 3](https://www.python.org/) (for a local static file server)
- A modern web browser
- [Git](https://git-scm.com/) (to clone the repository)

### Run locally

```bash
git clone https://github.com/aksharabharath/MarketKey.git
cd MarketKey/"main code"
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

Stop the server with `Control+C` in the terminal.

### Live demo

[https://marketkey-one.vercel.app/](https://marketkey-one.vercel.app/)

## Privacy & Data Handling

MarketKey reduces reliance on a central database for vendor form data, but it is not an offline-only app.

- **Session state:** Answers are kept in **browser memory** (`appState`) while the tab is open. Closing or refreshing the page clears unsaved progress; data is reset after a successful PDF download on the TFF path.
- **No submission backend:** Completed applications are **not** sent to MarketKey servers. Users download the PDF locally and submit it to the county themselves.
- **PDF generation:** Runs entirely in the browser for the TFF path.
- **Network requests:** The app may load **Google Fonts**, the **Tailwind CSS** CDN, **jsDelivr** (pdf-lib), and static files such as `questions.json` and `tff-application.pdf` from the host serving the site.

Review your PDF carefully before submitting it to Alameda County Environmental Health or an event coordinator.

## Important Disclaimer

MarketKey is an independent student civic-tech project. It is **not** affiliated with or endorsed by Alameda County.

It does **not** issue permits, decide eligibility, or guarantee approval. Requirements change; always confirm current rules with the county.

## Team

**MarketKey Team**

- Akshara Bharath
- Sharayu Patil
- Sriya Lingam

## License

MarketKey source code in this repository is released under the [MIT License](LICENSE).

The bundled **Alameda County PDF template** (`main code/assets/tff-application.pdf`), county form content, fonts, and other third-party assets may be subject to **separate** ownership and usage terms. The MIT License does not grant rights to those materials.

---

**Built to make local food business permitting more accessible, understandable, and approachable.**