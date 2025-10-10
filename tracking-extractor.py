import os
import subprocess
import pdfplumber
import csv
import re

# Configure Tesseract path on Windows if installed in the default location
try:
    import pytesseract
    _tess_path = r"C:\Users\chris.garland\AppData\Local\Programs\Tesseract-OCR"
    # If a directory was provided, append the executable name
    if os.path.isdir(_tess_path):
        _tess_path = os.path.join(_tess_path, "tesseract.exe")
    pytesseract.pytesseract.tesseract_cmd = _tess_path
except Exception:
    pass

def extract_ups_tracking_numbers(pdf_path):
    """
    Extract UPS tracking numbers starting with 1Z from even pages only
    Uses OCR for scanned PDFs
    """
    tracking_numbers = []
    
    try:
        # Try to import pytesseract for OCR
        try:
            import pytesseract
            from PIL import Image
            ocr_available = True
            # Print resolved Tesseract path/version for diagnostics
            try:
                resolved_cmd = getattr(pytesseract.pytesseract, 'tesseract_cmd', 'tesseract')
                if not resolved_cmd:
                    resolved_cmd = 'tesseract'
                ver = subprocess.run([resolved_cmd, '--version'], capture_output=True, text=True, timeout=3)
                if ver.returncode == 0 and ver.stdout:
                    first_line = ver.stdout.splitlines()[0]
                    print(f"✓ OCR available — using: {resolved_cmd} ({first_line})\n")
                else:
                    print("✓ OCR available (will read scanned PDFs)\n")
            except Exception:
                print("✓ OCR available (will read scanned PDFs)\n")
        except ImportError:
            ocr_available = False
            print("⚠ OCR not available (install: pip install pytesseract pillow)\n")
        
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Total pages: {len(pdf.pages)}")
            print("Processing even pages only (2, 4, 6, ...)...\n")
            
            for page_num in range(len(pdf.pages)):
                actual_page_number = page_num + 1
                
                # Only process EVEN pages
                if actual_page_number % 2 != 0:
                    continue
                
                page = pdf.pages[page_num]
                text = page.extract_text()
                
                print(f"Page {actual_page_number}:")
                
                # If no text extracted, try OCR
                if not text or len(text.strip()) < 10:
                    if ocr_available:
                        print("  No text found - trying OCR...")
                        try:
                            # Convert page to image and OCR it
                            img = page.to_image(resolution=300)
                            pil_img = img.original
                            text = pytesseract.image_to_string(pil_img)
                            print(f"  OCR extracted {len(text)} characters")
                        except Exception as e:
                            print(f"  OCR failed: {e}")
                            text = ""
                    else:
                        print("  No text found (PDF may be scanned - install pytesseract for OCR)")
                        print("  Run: pip install pytesseract pillow")
                        print("  Also install Tesseract: https://github.com/tesseract-ocr/tesseract")
                        continue
                
                if not text:
                    print("  No text available\n")
                    continue
                
                # Show a sample of extracted text
                print(f"  Text sample: {text[:200]}...")
                
                # Find ALL occurrences across the whole text allowing spaces/dashes
                found_in_page = []
                pattern = re.compile(r'1Z(?:[\s\-]?[A-Z0-9]){16}', re.IGNORECASE)
                matches = pattern.findall(text or "")

                for raw in matches:
                    candidate = raw.upper()
                    # Normalize: remove non-alphanumerics, fix common OCR error O->0
                    candidate = re.sub(r'[^A-Z0-9]', '', candidate)
                    candidate = candidate.replace('O', '0')
                    # Validate format: starts with 1Z and total length 18
                    if not candidate.startswith('1Z'):
                        continue
                    if len(candidate) != 18:
                        continue
                    if candidate not in found_in_page:
                        found_in_page.append(candidate)
                        tracking_numbers.append(candidate)
                
                if found_in_page:
                    print(f"  ✓ Found {len(found_in_page)} tracking number(s):")
                    for tn in found_in_page:
                        print(f"    • {tn}")
                else:
                    print("  No tracking numbers found")
                print()
    
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    return tracking_numbers

def save_to_csv(tracking_numbers, output_path):
    """Save tracking numbers to CSV"""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Tracking Number'])
        for tn in tracking_numbers:
            writer.writerow([tn])
    print(f"✓ Saved {len(tracking_numbers)} tracking numbers to: {output_path}\n")

def main():
    # Find desktop
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    if not os.path.exists(desktop):
        desktop = os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop")
    
    # Find PDF
    pdf_path = os.path.join(desktop, "UPS.10.10.pdf")
    
    if not os.path.exists(pdf_path):
        print(f"ERROR: UPS.10.10.pdf not found at {desktop}")
        print("\nEnter full path to PDF:")
        pdf_path = input("> ").strip().strip('"')
        if not os.path.exists(pdf_path):
            print("File not found. Exiting.")
            return
    
    print(f"Reading: {pdf_path}\n")
    
    # Extract
    tracking_numbers = extract_ups_tracking_numbers(pdf_path)
    
    if not tracking_numbers:
        print("\n❌ No tracking numbers found")
        print("\nTroubleshooting:")
        print("1. Make sure PDF has tracking numbers on EVEN pages (2, 4, 6...)")
        print("2. If PDF is scanned, install OCR: pip install pytesseract pillow")
        print("3. Install Tesseract: https://github.com/tesseract-ocr/tesseract")
        return
    
    # Remove duplicates
    unique_tracking = list(dict.fromkeys(tracking_numbers))
    
    print(f"\n{'='*60}")
    print(f"TOTAL FOUND: {len(unique_tracking)} unique tracking numbers")
    print(f"{'='*60}\n")
    
    # Save to requested location inside a 'Tracking numbers' folder
    base_dir = r"C:\\Users\\chris.garland\\Mark 3 International\\Mark 3-OXF Warehouse - Documents\\Customers\\SHARE\\OUTBOUND\\10-OCT\\10.10"
    tracking_dir = os.path.join(base_dir, "Tracking numbers")
    os.makedirs(tracking_dir, exist_ok=True)
    output_path = os.path.join(tracking_dir, "ups_tracking_numbers.csv")
    save_to_csv(unique_tracking, output_path)
    
    print("✅ DONE!")

if __name__ == "__main__":
    main()
