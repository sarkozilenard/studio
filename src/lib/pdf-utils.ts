'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';
import type { GeneratePdfOutput } from './definitions';

export const loadPdfTemplates = async () => {
    // This function now just checks if the templates exist on the server by trying to fetch them.
    // The actual files are loaded by the server-side Genkit flow.
    try {
        const [mainRes, kellekRes, meghatRes] = await Promise.all([
            fetch('/sablon.pdf'),
            fetch('/kellekszavatossagi_nyilatkozat.pdf'),
            fetch('/meghatalmazas_okmanyiroda.pdf'),
        ]);

        return {
            main: mainRes.ok ? true : null,
            kellekszavatossag: kellekRes.ok ? true : null,
            meghatalmazas: meghatRes.ok ? true : null,
        };
    } catch (error) {
        console.error("Error checking PDF templates:", error);
        return { main: null, kellekszavatossag: null, meghatalmazas: null };
    }
};

/**
 * Converts a Base64 string to a Blob.
 * @param base64Data The Base64 encoded data.
 * @param contentType The content type of the data.
 * @returns A Blob object.
 */
function base64ToBlob(base64Data: string, contentType = 'application/pdf'): Blob {
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}


/**
 * Generates a PDF on the server and provides it to the client for immediate download or printing.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 * @param action The action to perform ('download' or 'print').
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print'
) {
    try {
        // Step 1: Generate PDF on the server to get Base64 data and filename.
        const result: GeneratePdfOutput = await generatePdf({ formData, pdfType });
        
        if (!result || !result.base64Data) {
            throw new Error("PDF generation failed on the server.");
        }

        // Step 2: Convert Base64 to a Blob.
        const pdfBlob = base64ToBlob(result.base64Data);

        // Step 3: Create a local URL for the Blob.
        const blobUrl = URL.createObjectURL(pdfBlob);

        // Step 4: Handle the final action based on the local URL.
        if (action === 'print') {
            // Open the local URL in a new tab. The browser's PDF viewer will have a print button.
            window.open(blobUrl, '_blank');
        } else if (action === 'download') {
            // Create a link to trigger the download.
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Optional: Revoke the blob URL after a short delay to allow the new tab/download to process.
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
        throw error;
    }
}
