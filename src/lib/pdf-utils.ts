'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';
import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

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
 * Calls the server to generate a PDF, then uploads it to Firebase Storage from the client,
 * and finally opens the public URL in a new browser tab.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
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

        // Step 2: Upload the PDF from the client to Firebase Storage.
        const storageRef = ref(storage, `generated-pdfs/${result.filename}`);
        // We upload as a base64 string, which is efficient.
        const snapshot = await uploadString(storageRef, result.pdfBase64, 'base64', {
            contentType: 'application/pdf'
        });

        // Step 3: Get the public download URL.
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Step 4: Open the public URL from Firebase Storage in a new tab.
        const newWindow = window.open(downloadURL, '_blank');
        if (!newWindow) {
            throw new Error("A böngésző letiltotta a felugró ablakot. Kérjük, engedélyezze a felugró ablakokat ezen az oldalon.");
        }

    } catch (error: any) {
        console.error("Hiba a PDF feldolgozása közben:", error);
        // Re-throw the error to be caught by the form's error handler.
        throw error; 
    }
}
