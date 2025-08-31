// ==========================
// CONTRACT HELPER JAVASCRIPT
// ==========================

// --- PDF IMPORT FEATURE ---
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === "application/pdf") {
    const fileReader = new FileReader();

    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);

      pdfjsLib.getDocument(typedarray).promise.then(async function(pdf) {
        let textContent = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          const pageText = text.items.map(item => item.str).join(" ");
          textContent += pageText + "\n\n";
        }

        // Put extracted text into textarea
        document.getElementById('contractText').value = textContent;

        // ✅ Automatically run analysis
        analyzeContract();
      });
    };

    fileReader.readAsArrayBuffer(file);
  } else {
    alert("Please upload a valid PDF file.");
  }
}

// --- ANALYSIS FEATURE ---
document.getElementById('analyzeBtn').addEventListener('click', analyzeContract);

function analyzeContract() {
  const text = document.getElementById('contractText').value.trim();
  const results = document.getElementById('results');
  results.innerHTML = '';

  if (!text) {
    alert("Please paste text or upload a PDF before analyzing.");
    return;
  }

  // Split text into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  sentences.forEach(s => {
    if (s.trim().length > 0) {
      addResult('✅ Info: ' + s, 'green');
    }
  });

  // Clause detection
  const clauses = [
    [/early termination|cancellation fee/i, 
      '❌ High Risk: Check for fees if you end the contract early.', 'red'],
    [/balloon payment|final payment/i, 
      '❌ High Risk: There may be a large payment at the end.', 'red'],
    [/variable interest|APR may change/i, 
      '⚠️ Important: Your interest rate could go up.', 'orange'],
    [/repossession|take back vehicle/i, 
      '❌ High Risk: They can take the car if you miss payments.', 'red'],
    [/penalty|late fee/i, 
      '⚠️ Important: Extra costs if you miss or delay payments.', 'orange'],
    [/mandatory insurance|GAP insurance/i, 
      '⚠️ Important: You might be required to buy extra insurance.', 'orange']
  ];

  clauses.forEach(([regex, msg, color]) => {
    if (regex.test(text)) {
      addResult(msg, color);
    }
  });
}

// --- Helper: Add result line ---
function addResult(msg, color) {
  const li = document.createElement('li');
  li.textContent = msg;
  li.className = color;

  // Click to read aloud
  li.onclick = () => {
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
  };

  document.getElementById('results').appendChild(li);
}
