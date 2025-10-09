import os
import pdfplumber
import csv
import re
import glob
import sys

def extract_ups_tracking_numbers(pdf_path):
    """
    Extract UPS tracking numbers starting with 1Z from even pages only
    Works with both text-based and scanned PDFs
    """
    tracking_numbers = []
    
    # Check for OCR availability
    ocr_available = False
    try:
        import pytesseract
        from pdf2image import convert_from_path
        ocr_available = True
        print("✓ OCR available (can read scanned PDFs)\n")
    except ImportError as e:
        print("⚠ OCR not available - can only read text-based PDFs")
        print(f"  To enable OCR: pip install pytesseract pdf2image pillow\n")
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"Processing: {os.path.basename(pdf_path)}")
            print(f"Total pages: {total_pages}")
            print("Scanning even pages only (2, 4, 6, ...)...\n")
            
            for page_num in range(total_pages):
                actual_page_number = page_num + 1
                
                # Only process EVEN pages
                if actual_page_number % 2 != 0:
                    continue
                
                page = pdf.pages[page_num]
                text = page.extract_text()
                
                print(f"Page {actual_page_number}:", end=" ")
                
                # If no text extracted, try OCR
                if not text or len(text.strip()) < 10:
                    if ocr_available:
                        print("(scanned - using OCR)...", end=" ")
                        try:
                            from pdf2image import convert_from_path
                            import pytesseract
                            
                            images = convert_from_path(
                                pdf_path, 
                                first_page=actual_page_number,
                                last_page=actual_page_number,
                                dpi=300
                            )
                            
                            if images:
                                text = pytesseract.image_to_string(
                                    images[0],
                                    config='--psm 6'
                                )
                            else:
                                text = ""
                        except Exception as e:
                            print(f"OCR failed: {e}")
                            text = ""
                    else:
                        print("(scanned - OCR not available) - SKIPPED")
                        continue
                
                if not text:
                    print("No text extracted")
                    continue
                
                # Find tracking numbers
                found_in_page = []
                text_no_spaces = text.replace(' ', '').replace('\n', '').replace('\r', '')
                
                # UPS pattern: 1Z + 16 alphanumeric characters
                pattern = r'1Z[A-Z0-9]{16}'
                matches = re.findall(pattern, text_no_spaces, re.IGNORECASE)
                
                for match in matches:
                    tracking = match.upper().replace('O', '0')  # Fix OCR errors
                    
                    if tracking not in found_in_page:
                        found_in_page.append(tracking)
                        tracking_numbers.append(tracking)
                
                if found_in_page:
                    print(f"✓ Found {len(found_in_page)} tracking number(s)")
                    for tn in found_in_page:
                        formatted = f"{tn[0:2]} {tn[2:5]} {tn[5:8]} {tn[8:10]} {tn[10:14]} {tn[14:18]}"
                        print(f"    • {formatted}")
                else:
                    print("No tracking numbers found")
    
    except Exception as e:
        print(f"\n❌ ERROR processing {pdf_path}: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    return tracking_numbers

def find_pdfs():
    """Find all PDF files in current directory and pdfs/ subdirectory"""
    pdf_files = []
    
    # Check current directory
    pdf_files.extend(glob.glob("*.pdf"))
    
    # Check pdfs subdirectory
    if os.path.exists("pdfs"):
        pdf_files.extend(glob.glob("pdfs/*.pdf"))
    
    return pdf_files

def save_to_csv(tracking_numbers, output_path):
    """Save tracking numbers to CSV"""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Tracking Number', 'Formatted'])
        for tn in tracking_numbers:
            formatted = f"{tn[0:2]} {tn[2:5]} {tn[5:8]} {tn[8:10]} {tn[10:14]} {tn[14:18]}"
            writer.writerow([tn, formatted])
    
    print(f"\n✓ Saved {len(tracking_numbers)} tracking numbers to: {output_path}")

def main():
    print("="*60)
    print("UPS Tracking Number Extractor (GitHub Compatible)")
    print("="*60 + "\n")
    
    # Find PDFs
    pdf_files = find_pdfs()
    
    if not pdf_files:
        print("❌ No PDF files found!")
        print("\nPlace PDF files in:")
        print("  • Root directory of the repository, OR")
        print("  • A 'pdfs' subdirectory")
        print("\nExpected filename: UPSTracking.pdf (or any .pdf file)")
        sys.exit(1)
    
    print(f"Found {len(pdf_files)} PDF file(s):")
    for pdf in pdf_files:
        print(f"  • {pdf}")
    print()
    
    # Process all PDFs
    all_tracking_numbers = []
    
    for pdf_path in pdf_files:
        print(f"\n{'─'*60}")
        tracking_numbers = extract_ups_tracking_numbers(pdf_path)
        all_tracking_numbers.extend(tracking_numbers)
    
    # Remove duplicates while preserving order
    unique_tracking = list(dict.fromkeys(all_tracking_numbers))
    
    print(f"\n{'='*60}")
    print(f"SUMMARY: {len(unique_tracking)} unique tracking numbers found")
    print(f"{'='*60}")
    
    if not unique_tracking:
        print("\n❌ No tracking numbers found")
        print("\nTroubleshooting:")
        print("1. Verify tracking numbers are on EVEN pages (2, 4, 6...)")
        print("2. Check format: 1Z + 16 alphanumeric characters")
        print("3. For scanned PDFs, install OCR: pip install pytesseract pdf2image")
        print("4. On GitHub Actions, OCR is automatically installed")
        sys.exit(1)
    
    # Save results
    output_path = "ups_tracking_numbers.csv"
    save_to_csv(unique_tracking, output_path)
    
    print("\n✅ DONE!")
    print(f"\nResults saved to: {output_path}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
