'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';
import type { GeneratePdfOutput } from './definitions';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
 * Creates an iframe with the PDF and triggers the print dialog.
 * @param blob The PDF blob to print.
 */
function printBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        }, 1); // A minimal timeout can help ensure the print dialog opens reliably.
    };
}


/**
 * Generates a PDF on the server, and handles the user action (print/download).
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
        // 1. Generate PDF on the server and get the Base64 data
        const result: GeneratePdfOutput = await generatePdf({ formData, pdfType });
        
        if (!result || !result.base64Data) {
            throw new Error("PDF generation failed on the server.");
        }

        // 2. Convert Base64 to Blob
        const pdfBlob = base64ToBlob(result.base64Data);

        // 3. Handle action
        if (action === 'print') {
            // For printing, use a blob URL directly for speed.
            printBlob(pdfBlob);
        } else if (action === 'download') {
            // For downloading, upload to Firebase for a persistent URL.
            const storageRef = ref(storage, `generated-pdfs/${result.filename}`);
            await uploadBytes(storageRef, pdfBlob);

            const downloadURL = await getDownloadURL(storageRef);

            const link = document.createElement('a');
            link.href = downloadURL;
            link.target = '_blank'; // Open in new tab which may trigger download or display
            link.download = result.filename; // This is a hint for the browser
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
         // Check for CORS or permission errors specifically
        if (error.code === 'storage/unauthorized' || error.code === 'storage/object-not-found' || (error.message && error.message.includes('CORS'))) {
             throw new Error(
                "PDF Upload Failed: This is likely a permissions or CORS issue with Firebase Storage. " +
                "Please check your Firebase Storage security rules and CORS configuration in the Google Cloud console. " +
                "Original error: " + error.message
            );
        }
        throw error;
    }
}
