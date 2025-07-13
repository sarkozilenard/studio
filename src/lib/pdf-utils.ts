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
 * Generates a PDF on the server, uploads it to Firebase Storage, and handles the user action (print/download).
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

        // 3. Upload Blob to Firebase Storage
        const storageRef = ref(storage, `generated-pdfs/${result.filename}`);
        await uploadBytes(storageRef, pdfBlob);

        // 4. Get the public download URL
        const downloadURL = await getDownloadURL(storageRef);

        // 5. Handle the user action with the public URL
        if (action === 'print') {
            const printWindow = window.open(downloadURL, '_blank', 'noopener,noreferrer');
            if (printWindow) {
                printWindow.onload = () => {
                    // Small delay to ensure PDF is fully rendered in the new window
                    setTimeout(() => {
                        try {
                            printWindow.print();
                        } catch (e) {
                            console.error("Print failed:", e);
                            // The user might have a popup blocker, but they can still print manually.
                        }
                    }, 500);
                };
            } else {
                 // Fallback for browsers with strict popup blockers
                 alert("A nyomtatási ablak blokkolva lett. A PDF egy új lapon nyílik meg, ahol manuálisan is nyomtathat.");
                 window.open(downloadURL, '_blank', 'noopener,noreferrer');
            }
        } else if (action === 'download') {
            // For downloading, we can still use the blob to avoid a second network request,
            // or just trigger a download from the new URL. The latter is simpler.
            const link = document.createElement('a');
            link.href = downloadURL;
            link.target = '_blank'; // Open in new tab which will trigger download
            link.download = result.filename; // This is a hint, browser might ignore it
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
        throw error;
    }
}
