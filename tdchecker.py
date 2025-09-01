from flask import Flask, render_template, request

app = Flask(__name__)

# Mocked tariff database — can be replaced with real API
tariff_database = {
    "1006": { "US": 10, "EU": 0 },     # Rice
    "8471": { "US": 0, "EU": 0 },      # Computers
    "6109": { "US": 16.5, "EU": 12 }   # T-shirts
}

@app.route('/TDcheck', methods=['GET', 'POST'])
def td_check():
    result = None
    if request.method == 'POST':
        hs_code = request.form['hs_code']
        destination = request.form['destination'].upper()
        
        try:
            value = float(request.form['value'])
        except ValueError:
            result = {'error': 'Invalid value for product.'}
            return render_template('tdcheck.html', result=result)
        
        rate = tariff_database.get(hs_code, {}).get(destination)
        if rate is None:
            result = {'error': f"No tariff data found for HS code {hs_code} to {destination}"}
        else:
            duty = (rate / 100) * value
            total = value + duty
            result = {
                'hs_code': hs_code,
                'destination': destination,
                'value': f"${value:.2f}",
                'rate': f"{rate}%",
                'duty': f"${duty:.2f}",
                'total': f"${total:.2f}",
                'message': f"Customer must pay ${duty:.2f} in tariffs/duties."
            }
    
    return render_template('tdcheck.html', result=result)

if __name__ == '__main__':
    app.run(debug=True)
