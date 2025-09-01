// Tariff rate database (simplified for demonstration)
const tariffRates = {
    'electronics': {
        'CN-US': 25.0, 'MX-US': 0.0, 'CA-US': 0.0, 'DE-US': 3.5,
        'JP-US': 0.0, 'KR-US': 0.0, 'GB-US': 0.0, 'default': 5.0
    },
    'textiles': {
        'CN-US': 15.0, 'VN-US': 18.0, 'IN-US': 12.0, 'MX-US': 0.0,
        'CA-US': 0.0, 'default': 10.0
    },
    'automotive': {
        'default': 2.5, 'CN-US': 27.5, 'MX-US': 0.0, 'CA-US': 0.0
    },
    'machinery': {
        'default': 3.7, 'CN-US': 7.5, 'DE-US': 2.1, 'JP-US': 0.0
    },
    'chemicals': {
        'default': 6.5, 'CN-US': 10.0, 'DE-US': 3.2
    },
    'food': {
        'default': 8.0, 'MX-US': 0.0, 'CA-US': 0.0
    },
    'furniture': {
        'default': 7.0, 'CN-US': 25.0, 'IT-US': 4.0
    },
    'toys': {
        'default': 0.0, 'CN-US': 0.0
    },
    'medical': {
        'default': 0.0, 'CN-US': 7.5
    },
    'jewelry': {
        'default': 5.0, 'CN-US': 12.0
    },
    'books': {
        'default': 0.0
    },
    'sports': {
        'default': 4.0, 'CN-US': 15.0
    }
};

// Additional fees structure
const additionalFees = {
    'US': {
        'harbor_maintenance': 0.125, // % of value
        'merchandise_processing_fee': { min: 2.0, max: 485.0, rate: 0.3464 } // % of value
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTariffCalculator();
});

function initializeTariffCalculator() {
    const form = document.getElementById('tariffForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    calculateTariffs();
}

function calculateTariffs() {
    const formData = getFormData();
    
    if (!validateFormData(formData)) {
        alert('Please fill in all required fields.');
        return;
    }

    // Show loading state
    const button = document.querySelector('.calculate-btn');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="loading"></span>Calculating...';
    button.disabled = true;

    // Simulate processing delay for better UX
    setTimeout(() => {
        const results = performCalculation(formData);
        displayResults(results);
        
        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show results
        const resultsDiv = document.getElementById('results');
        resultsDiv.classList.remove('hidden');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }, 1500);
}

function getFormData() {
    return {
        productValue: parseFloat(document.getElementById('productValue').value) || 0,
        originCountry: document.getElementById('originCountry').value,
        destinationCountry: document.getElementById('destinationCountry').value,
        hsCode: document.getElementById('hsCode').value,
        productCategory: document.getElementById('productCategory').value,
        weight: parseFloat(document.getElementById('weight').value) || 0,
        quantity: parseInt(document.getElementById('quantity').value) || 1,
        tradeAgreement: document.getElementById('tradeAgreement').value,
        productDescription: document.getElementById('productDescription').value
    };
}

function validateFormData(data) {
    return data.productValue > 0 && 
           data.originCountry && 
           data.destinationCountry && 
           data.productCategory && 
           data.weight >= 0 && 
           data.quantity > 0;
}

function performCalculation(data) {
    const totalValue = data.productValue * data.quantity;
    const routeKey = `${data.originCountry}-${data.destinationCountry}`;
    
    // Get base tariff rate
    let tariffRate = getTariffRate(data.productCategory, routeKey);
    
    // Apply trade agreement adjustments
    tariffRate = applyTradeAgreementAdjustments(tariffRate, data);

    const dutyAmount = totalValue * (tariffRate / 100);
    
    // Calculate additional fees
    const fees = calculateAdditionalFees(totalValue, data.destinationCountry);
    
    const totalTaxesAndFees = dutyAmount + fees.harborFee + fees.processingFee;
    const totalCost = totalValue + totalTaxesAndFees;
    const effectiveRate = totalValue > 0 ? (totalTaxesAndFees / totalValue) * 100 : 0;

    return {
        productValue: totalValue,
        tariffRate: tariffRate,
        dutyAmount: dutyAmount,
        harborFee: fees.harborFee,
        processingFee: fees.processingFee,
        totalTaxesAndFees: totalTaxesAndFees,
        totalCost: totalCost,
        effectiveRate: effectiveRate
    };
}

function getTariffRate(category, routeKey) {
    if (tariffRates[category]) {
        return tariffRates[category][routeKey] || 
               tariffRates[category]['default'] || 0;
    }
    return 0;
}

function applyTradeAgreementAdjustments(tariffRate, data) {
    if (data.tradeAgreement === 'none') {
        return tariffRate;
    }

    switch (data.tradeAgreement) {
        case 'nafta':
            if (['MX', 'CA'].includes(data.originCountry) && data.destinationCountry === 'US') {
                return 0;
            }
            break;
        case 'gsp':
            return tariffRate * 0.5; // 50% reduction
        case 'fta':
            return tariffRate * 0.25; // 75% reduction
        case 'mfn':
            return tariffRate * 0.8; // 20% reduction
    }
    
    return tariffRate;
}

function calculateAdditionalFees(totalValue, destinationCountry) {
    let harborFee = 0;
    let processingFee = 0;
    
    if (destinationCountry === 'US' && additionalFees.US) {
        harborFee = totalValue * (additionalFees.US.harbor_maintenance / 100);
        
        const mpf = additionalFees.US.merchandise_processing_fee;
        processingFee = Math.min(
            Math.max(totalValue * (mpf.rate / 100), mpf.min), 
            mpf.max
        );
    }
    
    return { harborFee, processingFee };
}

function displayResults(results) {
    const resultContent = document.getElementById('resultContent');
    
    let html = `
        <div class="result-item">
            <span class="result-label">Product Value:</span>
            <span class="result-value currency">$${formatCurrency(results.productValue)}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Tariff Rate:</span>
            <span class="result-value">${results.tariffRate.toFixed(2)}%</span>
        </div>
        <div class="result-item">
            <span class="result-label">Duty Amount:</span>
            <span class="result-value currency">$${formatCurrency(results.dutyAmount)}</span>
        </div>
    `;
    
    if (results.harborFee > 0) {
        html += `
        <div class="result-item">
            <span class="result-label">Harbor Maintenance Fee:</span>
            <span class="result-value currency">$${formatCurrency(results.harborFee)}</span>
        </div>`;
    }
    
    if (results.processingFee > 0) {
        html += `
        <div class="result-item">
            <span class="result-label">Merchandise Processing Fee:</span>
            <span class="result-value currency">$${formatCurrency(results.processingFee)}</span>
        </div>`;
    }
    
    html += `
        <div class="result-item">
            <span class="result-label">Total Taxes & Fees:</span>
            <span class="result-value currency">$${formatCurrency(results.totalTaxesAndFees)}</span>
        </div>
        <div class="result-item">
            <span class="result-label">Effective Rate:</span>
            <span class="result-value">${results.effectiveRate.toFixed(2)}%</span>
        </div>
        <div class="result-item">
            <span class="result-label">Total Cost (Including Duties):</span>
            <span class="result-value currency">$${formatCurrency(results.totalCost)}</span>
        </div>
    `;
    
    resultContent.innerHTML = html;
}

function formatCurrency(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Utility functions for future enhancements
function resetForm() {
    document.getElementById('tariffForm').reset();
    document.getElementById('results').classList.add('hidden');
}

function exportResults(results) {
    // Future implementation for exporting results to PDF/CSV
    console.log('Export functionality to be implemented', results);
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('TD Check Error:', e.error);
    alert('An error occurred while calculating tariffs. Please try again.');
});
