// ==========================
// CONTRACT KEY POINTS ANALYZER
// ==========================

// --- PDF IMPORT FEATURE ---
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const file = event.target.files[0];

  if (file && file.type === "application/pdf") {
    const fileReader = new FileReader();
    
    // Show loading indicator
    document.getElementById('results').innerHTML = '<li class="loading">📄 Extracting text from PDF...</li>';

    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);

      // Use PDF.js library to read the PDF file
      pdfjsLib.getDocument(typedarray).promise.then(async function(pdf) {
        let textContent = "";

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          const pageText = text.items.map(item => item.str).join(" ");
          textContent += pageText + "\n\n";
        }

        // Put extracted text into the textarea
        document.getElementById('contractText').value = textContent;
        
        // Automatically analyze the contract
        analyzeContractKeyPoints();
      }).catch(function(error) {
        document.getElementById('results').innerHTML = '<li class="red">❌ Error reading PDF: ' + error.message + '</li>';
      });
    };

    fileReader.readAsArrayBuffer(file);
  } else {
    alert("Please upload a valid PDF file.");
  }
}

// --- MANUAL ANALYSIS TRIGGER ---
document.getElementById('analyzeBtn').addEventListener('click', analyzeContractKeyPoints);

// --- KEY POINTS ANALYSIS ---
function analyzeContractKeyPoints() {
  const text = document.getElementById('contractText').value.trim();
  const results = document.getElementById('results');
  results.innerHTML = '';

  if (!text) {
    alert("Please paste contract text or upload a PDF before analyzing.");
    return;
  }

  // Show analyzing message
  results.innerHTML = '<li class="loading">🔍 Analyzing contract for key points...</li>';
  
  setTimeout(() => {
    results.innerHTML = ''; // Clear loading message
    
    // --- KEY CONTRACT ELEMENTS TO EXTRACT ---
    const keyPointChecks = [
      // Financial Terms
      {
        patterns: [/total.{0,20}(?:cost|price|amount).{0,50}\$?\d+(?:,\d{3})*(?:\.\d{2})?/gi],
        label: "💰 Total Cost",
        type: "info"
      },
      {
        patterns: [/monthly.{0,20}payment.{0,50}\$?\d+(?:,\d{3})*(?:\.\d{2})?/gi, /\$?\d+(?:,\d{3})*(?:\.\d{2})?.{0,20}per month/gi],
        label: "💳 Monthly Payment",
        type: "info"
      },
      {
        patterns: [/interest.{0,20}rate.{0,50}\d+(?:\.\d+)?%?/gi, /APR.{0,50}\d+(?:\.\d+)?%/gi],
        label: "📈 Interest Rate",
        type: "warning"
      },
      
      // Timeline & Duration
      {
        patterns: [/term.{0,20}(?:of|is).{0,50}\d+.{0,20}(?:years?|months?)/gi, /contract.{0,20}period.{0,50}\d+.{0,20}(?:years?|months?)/gi],
        label: "📅 Contract Duration",
        type: "info"
      },
      {
        patterns: [/(?:expires?|expiration).{0,50}\d{1,2}\/\d{1,2}\/\d{2,4}/gi, /valid.{0,20}until.{0,50}\d{1,2}\/\d{1,2}\/\d{2,4}/gi],
        label: "⏰ Expiration Date",
        type: "info"
      },
      
      // Penalties & Fees
      {
        patterns: [/early.{0,20}termination.{0,50}fee.{0,50}\$?\d+/gi, /cancellation.{0,50}penalty.{0,50}\$?\d+/gi],
        label: "⚠️ Early Termination Fee",
        type: "risk"
      },
      {
        patterns: [/late.{0,20}fee.{0,50}\$?\d+/gi, /penalty.{0,50}\$?\d+/gi],
        label: "⚠️ Late Fees",
        type: "risk"
      },
      
      // Important Clauses
      {
        patterns: [/balloon.{0,20}payment/gi, /final.{0,20}payment.{0,50}\$?\d+/gi],
        label: "🎈 Balloon Payment",
        type: "risk"
      },
      {
        patterns: [/automatic.{0,20}renewal/gi, /auto.{0,20}renew/gi],
        label: "🔄 Auto-Renewal Clause",
        type: "warning"
      },
      {
        patterns: [/arbitration/gi, /dispute.{0,50}arbitration/gi],
        label: "⚖️ Arbitration Clause",
        type: "warning"
      },
      
      // Rights & Responsibilities
      {
        patterns: [/warranty.{0,50}(?:void|excluded|limited)/gi, /no.{0,20}warranty/gi],
        label: "🚫 Limited/No Warranty",
        type: "risk"
      },
      {
        patterns: [/liability.{0,50}limited/gi, /not.{0,20}liable/gi],
        label: "🛡️ Limited Liability",
        type: "warning"
      }
    ];

    let foundPoints = [];

    // Check each pattern against the contract text
    keyPointChecks.forEach(check => {
      check.patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            foundPoints.push({
              label: check.label,
              text: match.trim(),
              type: check.type
            });
          });
        }
      });
    });

    // Remove duplicates
    foundPoints = foundPoints.filter((point, index, self) => 
      index === self.findIndex(p => p.label === point.label && p.text === point.text)
    );

    // Display results
    if (foundPoints.length === 0) {
      addResult("📋 No specific key points detected. Please review contract manually.", "info");
    } else {
      addResult(`📋 Found ${foundPoints.length} key contract points:`, "info");
      
      foundPoints.forEach(point => {
        addDetailedResult(point.label, point.text, point.type);
      });
    }

    // Add general advice
    addResult("💡 Tip: Always read the full contract and consider legal advice for important agreements.", "info");
  }, 1000); // Small delay for better UX
}

// --- Helper Functions ---
function addResult(msg, type) {
  const li = document.createElement('li');
  li.textContent = msg;
  li.className = type;
  
  // Click to hear result read aloud
  li.onclick = () => {
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
  };
  
  document.getElementById('results').appendChild(li);
}

function addDetailedResult(label, extractedText, type) {
  const li = document.createElement('li');
  li.className = type + ' detailed';
  
  // Create expandable result
  li.innerHTML = `
    <strong>${label}</strong>
    <div class="extracted-text" style="font-size: 0.9em; margin-top: 5px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">
      "${extractedText}"
    </div>
  `;
  
  // Click to hear result read aloud
  li.onclick = () => {
    const utter = new SpeechSynthesisUtterance(label + ": " + extractedText);
    utter.rate = 0.8;
    speechSynthesis.speak(utter);
  };
  
  document.getElementById('results').appendChild(li);
}

// --- CLEAR FUNCTION ---
function clearAnalysis() {
  document.getElementById('contractText').value = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('fileInput').value = '';
}
