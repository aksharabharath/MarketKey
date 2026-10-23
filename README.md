# MarketKey

MarketKey is a web-based permit helper for food vendors in Fremont and Alameda County. It turns a complicated health permit application into a guided set of questions and produces a completed county PDF at the end.

## Why we built it

Small food businesses often have to work through dense government wording, branching rules, and several disconnected PDF pages just to figure out which permit they need. The difference between paths such as a Temporary Food Facility (TFF) and a Mobile Food Facility is not always obvious, especially for someone opening a booth for the first time.

We built MarketKey to make that process easier to understand. It explains the requirements in plain English, asks questions in a useful order, and keeps the official application format for the final submission.

---

## Core features

- **Guided questionnaire and routing:** A 58-question workflow uses plain language and routes vendors through the relevant permit questions.
- **Multilingual access:** The interface supports English, Spanish, Mandarin, and Hindi. Labels can be localized while stored answers keep their canonical English values for reliable PDF mapping.
- **Official PDF generation:** `pdf-lib` fills the official county PDF template in the browser. The flow also captures and embeds a signature drawing.
- **Landing page and app flow:** A two-layer layout gives visitors a short overview first, then opens the five-step application workflow when they are ready to start.
- **Privacy-minded drafts:** Form data is handled on the client, with local draft state used to keep answers available during the session. The app does not need a backend database for the application.

---

## Tech stack and architecture

MarketKey uses vanilla JavaScript, HTML5, and CSS3. Tailwind utility classes are used for some layout styles, but there is no large frontend framework or build step.

The main files are in `main code/`:

```text
main code/
├── index.html       # landing page and five-step app markup
├── script.js        # state, routing, translations, validation, and PDF export
├── style.css        # custom responsive styles
├── questions.json   # questionnaire definitions and localized prompts
└── assets/
    └── tff-application.pdf  # official PDF template
```

---

The app loads the questionnaire and PDF template in the browser. User answers are collected in client-side state, then mapped to the PDF's AcroForm fields when the vendor downloads the completed application.

## Run it locally

Because the app loads JSON and PDF files, open it through a local web server instead of double-clicking `index.html`.

From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000/main%20code/](http://localhost:8000/main%20code/) in a browser.

You can also open `main code/index.html` with the VS Code Live Server extension. There is no package installation or build command required for the current version.

## Congressional App Challenge

MarketKey is a student-built project for local food entrepreneurs. We hope it helps a vendor spend less time decoding a government form and more time getting their business ready for the community.
