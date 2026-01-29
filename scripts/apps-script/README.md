# Apps Script setup

This script enables two-way sync with the voicemail Google Sheet.

## Steps
1) Open Google Apps Script at script.google.com and create a new project.
2) Replace the default `Code.gs` with the contents of `scripts/apps-script/Code.gs`.
3) Ensure the Sheet has a tab named `Sheet1` (or update `SHEET_NAME` in Code.gs).
4) Deploy as a Web App:
   - Execute as: **Me**
   - Who has access: **Anyone**
5) Copy the Web App URL and set it in your frontend `.env` as `VITE_VOICEMAILS_API_URL`.

## Notes
- `GET ?action=list` returns all rows as voicemail records.
- `POST` with `{"action":"add","data":{...}}` appends a new row.
- `POST` with `{"action":"updateNotes","data":{"id":2,"notes":"..."}}` updates notes in column C.
