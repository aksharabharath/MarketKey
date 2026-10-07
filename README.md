# MarketKey
**Simplifying Temporary Food Facility (TFF) permits for Fremont food vendors through lightweight civic tech and multilingual accessibility.**

## Team:
Akshara Bharath, Sharayu Patil, Sriya Lingam

---

## About the Project
Navigating county health permits can be an intimidating, bureaucratic hurdle—especially for small business owners and immigrant food vendors. MarketKey is a zero-backend web application designed to streamline the Alameda County TFF permit application process. 

By translating complex government forms into an intuitive, plain-language questionnaire, MarketKey helps Fremont vendors generate official, ready-to-file PDF applications in seconds.

---

## Key Features
* **Zero-Framework Architecture:** Built using pure HTML, CSS (Tailwind), and Vanilla JavaScript for maximum speed and simplicity. No bloated build tools or complex frameworks.
* **Client-Side PDF Automation:** Leverages `pdf-lib` directly in the browser to map user answers onto the official government PDF template (`tff-application.pdf`) instantly.
* **Zero-Data-Retention Privacy Policy:** All processing happens entirely in the user's browser memory. No sensitive business or personal data is ever saved to an external database or server.
* **Multilingual Accessibility:** Designed to support local vendors in multiple languages (English, Spanish, Mandarin).
* **Instant Deployment:** Hosted seamlessly via Vercel for immediate public accessibility.

---

## Project Directory Structure

```text
MarketKey/
├── index.html           # Main user interface and multi-step wizard structure
├── style.css            # Custom styles complementing Tailwind CSS
├── script.js            # Frontend logic, form handlers, and pdf-lib generator engine
├── tff-application.pdf  # The official blank government form template
└── README.md            # Project documentation

```

---

## How It Works (Technical Architecture)
1. Vendors answer simple, localized questions across a clean interface styled with Tailwind CSS.
2. When the suer completes the questionnaire and clicks download, JavaScript fetches the local template (`tff-application.pdf`) as a binary byte array.
3. `pdf-lib` programmatically fills the exact native form fields with the user's data.
4. The browser automatically triggers a download of the completed PDF file, and the application state instantly clears to protect user privacy.

---

## Development
This project is configured for instant continuous deployment via Vercel. Every push to the `main` branch automatically updates the live production URL.

---

## Congressional App Challenge
Built with passion by the MarketKey team to empower local small businesses and food entrepreneurs in Fremont, California.
