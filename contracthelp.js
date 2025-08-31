// ==========================
// CONTRACT HELPER JAVASCRIPT
// ==========================

// --- PDF IMPORT FEATURE ---
// Attach an event listener to the file input so that when a PDF is chosen, handleFileUpload runs
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0]; // Get the uploaded file
  if (file && file.type === "application/pdf") { // Check if it's a PDF
    const fileReader = new FileReader();

    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result); // Convert to byte array

      // Use PDF.js to read the PDF
      pdfjsLib.getDocument(typedarray).promise.then(async function(pdf) {
        let textContent = "";

        // Loop through all pages of the PDF
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);                // Get page
          const text = await page.getTextContent();         // Extract text
          const pageText = text.items.map(item => item.str).join(" "); // Join text
          textContent += pageText + "\n\n";                 // Add to total
        }

        // Put extracted text into the textarea
        document.getElementById('contractText').value = textContent;

        // ✅ Automatically analyze the contract after loading the PDF
        analyzeContract();
      });
    };

    // Read PDF as array buffer
    fileReader.readAsArrayBuffer(file);
  } else {
    alert("Please upload a valid PDF file."); // Error if not PDF
  }
}

// --- ANALYSIS FEATURE ---
// Run analysis when "Analyze" button is clicked
document.getElementById('analyzeBtn').addEventListener('click', analyzeContract);

function analyzeContract() {
  const text = document.getElementById('contractText').value.trim(); // Get text from textarea
  const results = document.getElementById('results'); // Results list
  results.innerHTML = ''; // Clear previous results

  // If no text is present
  if (!text) {
    alert("Please paste text or upload a PDF before analyzing.");
    return;
  }

  // Split text into sentences for easier reading
  const sentences = text.split(/(?<=[.!?])\s+/);
  sentences.forEach(s => {
    if (s.trim().length > 0) {
      // Add each sentence as general "info"
      addResult('✅ Info: ' + s, 'green');
    }
  });

  // --- CLAUSE DETECTION ---
  // List of patterns to check in the contract text
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

  // Check each regex pattern against the text
  clauses.forEach(([regex, msg, color]) => {
    if (regex.test(text)) {
      addResult(msg, color); // If matched, add to results list
    }
  });
}

// --- Helper Function: Add result to the list ---
function addResult(msg, color) {
  const li = document.createElement('li'); // Create a list item
  li.textContent = msg;                    // Insert message
  li.className = color;                    // Add color class (red, orange, green)

  // Make the list item clickable to read aloud
  li.onclick = () => {
    const utter = new SpeechSynthesisUtterance(msg); // Create speech object
    utter.rate = 0.9;                                // Set speaking speed
    speechSynthesis.speak(utter);                    // Speak text
  };

  // Add the list item to the results <ul>
  document.getElementById('results').appendChild(li);
}

