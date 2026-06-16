const fs = require('fs');
const html = fs.readFileSync('C:/Users/Purushothaman/.gemini/antigravity-ide/brain/eed1eda0-7f23-415a-ab49-91e5ab83db8e/scratch/enquiries_clicked_body.html', 'utf8');

// Find Balaji
const balajiIdx = html.indexOf('Balaji');
console.log('Balaji index:', balajiIdx);
if (balajiIdx !== -1) {
  console.log('Surrounding Balaji:', html.substring(balajiIdx - 200, balajiIdx + 200));
}

// Find Make Call
const callIdx = html.indexOf('Make Call');
console.log('Make Call index:', callIdx);
if (callIdx !== -1) {
  console.log('Surrounding Make Call:', html.substring(callIdx - 200, callIdx + 200));
}

// Find the phone number
const numIdx = html.indexOf('9590370419');
console.log('Phone number index:', numIdx);
if (numIdx !== -1) {
  console.log('Surrounding Phone Number:', html.substring(numIdx - 200, numIdx + 200));
}
