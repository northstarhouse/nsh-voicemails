# nsh-voicemails

Voicemail dashboard with two-way sync to a Google Sheet via Apps Script.

## Setup
1) Install dependencies
```
npm install
```

2) Configure the Apps Script Web App URL
- Copy `.env.example` to `.env`
- Set `VITE_VOICEMAILS_API_URL` to your Apps Script Web App URL

3) Run locally
```
npm run dev
```

## Apps Script
See `scripts/apps-script/README.md` for deployment steps.
