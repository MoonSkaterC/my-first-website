// ==========================
// CONTRACT HELPER JAVASCRIPT (KEY POINTS ONLY)
// ==========================

// --- PDF IMPORT FEATURE ---
// This allows the user to upload a PDF file and extract its text
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];

  // ✅ Check file type (only accept PDFs)
  if (file && file.type === "application/pdf") {
    const fileReader = new FileReader();

    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);

      // Use PDF.js library to read the PDF file
      pdfjsLib.getDocument(typedarray).promise.then(async function(pdf) {
        let textContent = "";

        // Loop through all pages in the PDF
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();

          // Combine all words into sentences
          const pageText = text.items.map(item => item.str).join(" ");
          textContent += pageText + "\n\n";
        }

        // Put extracted text into the hidden textarea (for analysis use)
        document.getElementById('contractText').value = textContent;

        // ✅ Run analysis immediately after upload
        analyzeContract();
      });
    };

    // Read the PDF file as binary data
    fileReader.readAsArrayBuffer(file);
  } else {
    alert("Please upload a valid PDF file.");
  }
}

// --- ANALYSIS FEATURE ---
// This scans the contract text and looks for key clauses (not every sentence!)
document.getElementById('analyzeBtn').addEventListener('click', analyzeContract);

function analyzeContract() {
  const text = document.getElementById('contractText').value.trim();
  const results = document.getElementById('results');
  results.innerHTML = ''; // Clear old results

  if (!text) {
    alert("Please paste text or upload a PDF before analyzing.");
    return;
  }

  // --- CLAUSE DETECTION RULES ---
  // Each rule looks for certain keywords and explains them in simple English
  const clauses = [
    [/early termination|cancellation fee/i, 
      '❌ High Risk: You may have to pay fees if you end the contract early.', 'red'],
    [/balloon payment|final payment/i, 
      '❌ High Risk: There may be a large final payment at the end.', 'red'],
    [/variable interest|APR may change/i, 
      '⚠️ Important: Interest rate could increase during the contract.', 'orange'],
    [/repossession|take back vehicle/i, 
      '❌ High Risk: Lender can repossess the car if payments are missed.', 'red'],
    [/penalty|late fee/i, 
      '⚠️ Important: Extra costs apply if payments are late.', 'orange'],
    [/mandatory insurance|GAP insurance/i, 
      '⚠️ Important: You may be required to buy extra insurance.', 'orange'],
    [/mileage limit|excess mileage/i,
      '⚠️ Important: Extra charges may apply if you drive over the set mileage.', 'orange'],
    [/maintenance|servicing/i,
      '⚠️ Important: You may be responsible for maintenance/servicing.', 'orange']
  ];

  let foundSomething = false;

  // Check each clause against the contract text
  clauses.forEach(([regex, msg, color]) => {
    if (regex.test(text)) {
      addResult(msg, color); // Show warning/info
      foundSomething = true;
    }
  });

  // If no risky/important clauses were found
  if (!foundSomething) {
    addResult("✅ No obvious high-risk clauses were detected. Please still review carefully.", "green");
  }
}

// --- Helper Function: Add result line to the screen ---
function addResult(msg, color) {
  const li = document.createElement('li');
  li.textContent = msg;
  li.className = color; // Add CSS class (red, orange, green)

  // 🗣 Click on result to hear it read aloud (for accessibility)
  li.onclick = () => {
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.9; // Slightly slower for clarity
    speechSynthesis.speak(utter);
  };

  // Add the result item to the results list
  document.getElementById('results').appendChild(li);
}

 
