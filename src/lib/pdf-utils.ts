'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';

function base64ToBlob(base64: string, contentType = 'application/pdf'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
}

/**
 * Generates a PDF on the server, gets the Base64 data, creates a local blob URL,
 * and opens it for the user to print or download.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 * @param action The action to perform (download or print).
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print'
) {
    try {
        // Step 1: Call the server flow to generate the PDF data.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfBase64 || !result.filename) {
            throw new Error("PDF generation failed on the server or returned no data.");
        }

        // Step 2: Convert Base64 to a Blob on the client.
        const pdfBlob = base64ToBlob(result.pdfBase64);
        
        // Step 3: Create a local URL for the Blob.
        const blobUrl = URL.createObjectURL(pdfBlob);

        // Step 4: Perform the requested action.
        if (action === 'print') {
            // Open the blob URL in a new tab. Modern browsers will show a PDF viewer
            // with a print button, which is more reliable than direct print commands.
            window.open(blobUrl, '_blank');
        } else if (action === 'download') {
            // Create a temporary link element to trigger the download.
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Optional: Revoke the blob URL after a short delay to free up memory.
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        }

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
        throw new Error(`PDF processing failed: ${error.message}`);
    }
}
