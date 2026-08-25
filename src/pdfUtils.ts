import { PDFDocument } from 'pdf-lib';

/**
 * Trims a PDF file to a maximum number of pages and returns its base64 representation.
 * @param file The original PDF file.
 * @param maxPages The maximum number of pages to keep. Default is 3.
 * @returns A Promise that resolves to the base64 string of the trimmed PDF.
 */
export async function getTrimmedPdfBase64(file: File, maxPages: number = 3): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    if (totalPages <= maxPages) {
      // If it's already within limits, just return the original file as base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Create a new PDF with only the first `maxPages` pages
    const newPdfDoc = await PDFDocument.create();
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, Array.from({ length: maxPages }, (_, i) => i));
    
    for (const page of copiedPages) {
      newPdfDoc.addPage(page);
    }
    
    const newPdfBytes = await newPdfDoc.save();
    
    // Convert Uint8Array to base64
    let binary = '';
    const bytes = new Uint8Array(newPdfBytes);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  } catch (err) {
    console.warn("Failed to trim PDF, returning original base64", err);
    // Fallback to original base64 if pdf-lib fails
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
