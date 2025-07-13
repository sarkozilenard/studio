'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';

/**
 * Converts a Base64 string to a Blob.
 * @param base64 The Base64 string.
 * @param contentType The content type of the Blob.
 * @returns A Blob object.
 */
function base64ToBlob(base64: string, contentType: string = 'application/pdf'): Blob {
    const byteCharacters = atob(base64);
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
 * Calls the server to generate a PDF, then opens it in a new tab using a blob URL.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 * @param action The action to perform: 'open' or 'download'.
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all'
) {
    try {
        // Step 1: Call the server flow to get the generated PDF data.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfBase64 || !result.filename) {
            throw new Error("A PDF generálása a szerveren sikertelen volt, vagy hiányos adatot adott vissza.");
        }

        // Step 2: Convert base64 to blob and create a blob URL
        const blob = base64ToBlob(result.pdfBase64);
        const url = URL.createObjectURL(blob);
        
        // Step 3: Open the blob URL in a new tab.
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
            throw new Error("A böngésző letiltotta a felugró ablakot. Kérjük, engedélyezze a felugró ablakokat ezen az oldalon.");
        }
        // It's good practice to release the object URL when it's no longer needed.
        // The browser will handle this when the new tab is closed, but this is cleaner.
        newWindow.addEventListener('beforeunload', () => URL.revokeObjectURL(url));

    } catch (error: any) {
        console.error("Hiba a PDF feldolgozása közben:", error);
        // Re-throw the error to be caught by the form's error handler.
        throw error; 
    }
}
