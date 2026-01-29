const SHEET_ID = "1kqVXngOaf_X1lrB6Nbi5U_3NJ4_P_fGMqxhyqdfuDT0";
const SHEET_NAME = "Sheet1";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  if (action !== "list") {
    return jsonResponse({ error: "Unsupported action." }, 400);
  }
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);
  const voicemails = rows.map((row, index) => {
    const messageText = row[0] || "";
    const dateTime = row[1] || "";
    const notes = row[2] || "";
    const phoneMatch = messageText.match(/\+1 (\d{3}-\d{3}-\d{4})/);
    const phone = phoneMatch ? phoneMatch[1] : "";
    const messageMatch = messageText.match(
      /voicemail on "Main Office":\s*(.+?)\s*-\s*The Google Voice team/
    );
    const message = messageMatch ? messageMatch[1] : messageText;
    const lowerMessage = String(message).toLowerCase();
    let category = "other";
    if (lowerMessage.includes("wedding") || lowerMessage.includes("bride")) category = "wedding";
    else if (lowerMessage.includes("tour") || lowerMessage.includes("visit")) category = "tour";
    else if (
      lowerMessage.includes("event") ||
      lowerMessage.includes("party") ||
      lowerMessage.includes("dinner")
    )
      category = "event";
    else if (
      lowerMessage.includes("vendor") ||
      lowerMessage.includes("catering") ||
      lowerMessage.includes("staffing")
    )
      category = "vendor";
    const hasNotes = notes && String(notes).trim().length > 0;
    return {
      id: index + 2,
      phone,
      message: String(message).trim(),
      dateTime,
      notes,
      status: hasNotes ? "handled" : "pending",
      category,
      rawText: messageText,
    };
  });

  return jsonResponse({ voicemails });
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({ error: "Missing body." }, 400);
  }
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Invalid JSON." }, 400);
  }

  const action = body.action;
  const data = body.data || {};
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

  if (action === "add") {
    const phone = data.phone || "";
    const message = data.message || "";
    const dateTime = data.dateTime || new Date().toISOString();
    const notes = data.notes || "";
    if (!message) {
      return jsonResponse({ error: "Message required." }, 400);
    }
    const messageText = phone
      ? `New voicemail from +1 ${phone}: ${message}`
      : message;
    sheet.appendRow([messageText, dateTime, notes]);
    return jsonResponse({ ok: true });
  }

  if (action === "updateNotes") {
    const id = Number(data.id);
    if (!id || id < 2) {
      return jsonResponse({ error: "Invalid id." }, 400);
    }
    sheet.getRange(id, 3).setValue(data.notes || "");
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Unsupported action." }, 400);
}

function jsonResponse(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  if (typeof output.setHeader === "function") {
    output.setHeader("Access-Control-Allow-Origin", "*");
    output.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    output.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (statusCode && typeof output.setStatusCode === "function") {
    output.setStatusCode(statusCode);
  }
  return output;
}
