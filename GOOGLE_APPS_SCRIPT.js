/**
 * GOOGLE APPS SCRIPT CODE
 * 
 * To use this:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste the code below.
 * 4. Deploy as a Web App (Execute as: Me, Access: Anyone).
 * 5. Copy the Web App URL and use it in your application.
 */

/*
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Example: Append a row with timestamp and data
    sheet.appendRow([
      new Date(),
      data.userId || "N/A",
      data.type || "N/A",
      data.destination || "N/A",
      data.date || "N/A",
      data.status || "Pending"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      "result": "success",
      "message": "Data appended successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "result": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
*/
