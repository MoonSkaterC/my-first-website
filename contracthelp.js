// ==========================
// CONTRACT HELPER JAVASCRIPT
// ==========================

// When the "Analyze" button is clicked, run analyzeContract()
document.getElementById('analyzeBtn').addEventListener('click', analyzeContract);

function analyzeContract() {
  // Get the contract text from the textarea
  const text = document.getElementById('contractText').value;

  // Reference to the results <ul>
  const results = document.getElementById('results');
  results.innerHTML = ''; // Clear old results

  // --- STEP 1: Break contract into sentences and show as "info" ---
  // This gives a simple breakdown so user doesn’t face a giant block of text
  const sentences = text.split(/(?<=[.!?])\s+/); // split by punctuation
  sentences.forEach(s => {
    if (s.trim().length > 0) {
      addResult('✅ Info: ' + s, 'green'); // each sentence is added as "info"
    }
  });

  // --- STEP 2: Look for hidden or risky clauses ---
  // Each regex checks if certain keywords exist in the text
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

  // Go through each clause pattern and check against the contract text
  clauses.forEach(([regex, msg, color]) => {
    if (regex.test(text)) {
      addResult(msg, color);
    }
  });
}

// --- Helper function to create results ---
function addResult(msg, color) {
  const li = document.createElement('li');
  li.textContent = msg;
  li.className = color;

  // Add click-to-speak functionality for accessibility (e.g. dyslexia support)
  li.onclick = () => {
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.9; // slightly slower speed for clarity
    speechSynthesis.speak(utter);
  };

  // Add this item to the results list
  document.getElementById('results').appendChild(li);
}

