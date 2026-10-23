# MarketKey

MarketKey is a web-based permit helper for food vendors in Fremont and Alameda County. It turns a complicated health permit application into a guided set of questions and produces a completed county PDF at the end.

## Why We Built It

Small food businesses often have to work through dense government wording, branching rules, and several disconnected PDF pages just to figure out which permit they need. The difference between paths such as a Temporary Food Facility (TFF) and a Mobile Food Facility is not always obvious, especially for someone opening a booth for the first time.

We built MarketKey to make that process easier to understand. It explains the requirements in plain English, asks questions in a useful order, and keeps the official application format for the final submission.

## Core Features

- **Guided questionnaire and routing:** A 58-question workflow uses plain language and routes vendors through the relevant permit questions.
- **Multilingual access:** The interface supports English, Spanish, Mandarin, and Hindi. Labels can be localized while stored answers keep their canonical English values for reliable PDF mapping.
- **Official PDF generation:** `pdf-lib` fills the official county PDF template in the browser. The flow also captures and embeds a signature drawing.
- **Landing page and app flow:** A two-layer layout gives visitors a short overview first, then opens the five-step application workflow when they are ready to start.
- **Privacy-minded drafts:** Form data is handled on the client, with local draft state used to keep answers available during the session. The app does not need a backend database for the application.

## Tech Stack & Architecture

MarketKey uses vanilla JavaScript, HTML5, and CSS3. Utility styles and custom CSS are used, avoiding any heavy frontend frameworks or complex build steps.

The main files are organized under `main code/`:

```text
main code/
├── index.html       # landing page and five-step app markup
├── script.js        # state, routing, translations, validation, and PDF export
├── style.css        # custom responsive styles
├── questions.json   # questionnaire definitions and localized prompts
└── assets/
    └── tff-application.pdf  # official PDF template
