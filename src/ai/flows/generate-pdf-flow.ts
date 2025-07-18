'use server';
/**
 * @fileOverview A server-side PDF generation flow that returns the generated PDF as a Base64 encoded string.
 *
 * - generatePdf - A function that handles filling PDF templates and returning the file content.
 */
import { ai } from '@/ai/genkit';
import type { FormValues, GeneratePdfInput } from '@/lib/definitions';
import { GeneratePdfInputSchema, GeneratePdfOutputSchema } from '@/lib/definitions';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Helper functions
const FONT_SIZE = 13;
const BASE_URL = 'https://pdf.pomazauto.hu';

async function loadAssetAsBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url, { cache: 'no-store' }); // Disable caching to ensure fresh assets
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

const fillFormField = (form: any, fieldName: string, value: string | undefined, font: any) => {
    if (value) {
        try {
            const field = form.getTextField(fieldName);
            // We draw text manually for better control over font and positioning
            const widgets = field.acroField.getWidgets();
            widgets.forEach(widget => {
                const { x, y, width, height } = widget.getRectangle();
                const page = widget.getPage();
                
                page.drawText(value, {
                    x: x + 2,
                    y: y + height / 2 - FONT_SIZE / 2 + 1,
                    font: font,
                    size: FONT_SIZE,
                    color: rgb(0, 0, 0),
                });
            });
            // Clear the original field text to avoid overlap
            field.setText('');

        } catch (e) {
            console.warn(`Field "${fieldName}" not found in PDF for value "${value}".`);
        }
    }
};

async function fillAndGetPdfBytes(templateBytes: Buffer, data: FormValues, fillerFn: (form: any, data: FormValues, font: any) => void, fontBytes: Buffer): Promise<Uint8Array> {
    if (!templateBytes || templateBytes.length === 0) throw new Error("PDF template is not loaded or is empty.");
    if (!fontBytes || fontBytes.length === 0) throw new Error("Font is not loaded or is empty.");

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    
    const customFont = await pdfDoc.embedFont(fontBytes);
    
    const form = pdfDoc.getForm();
    fillerFn(form, data, customFont);

    form.flatten();

    return pdfDoc.save();
}

function fillMainPdfForm(form: any, data: FormValues, font: any) {
    fillFormField(form, 'rendszám', data.rendszam, font);
    fillFormField(form, 'gyártmány_típus', data.gyartmany_tipus, font);
    fillFormField(form, 'alvázszám', data.alvazszam, font);
    fillFormField(form, 'motorszám', data.motorszam, font);
    fillFormField(form, 'km_állás', data.km_allas, font);
    fillFormField(form, 'törzskönyv_szám', data.torzskonyv_szam, font);
    fillFormField(form, 'forgalmi_engedély_száma', data.forgalmi_szam, font);
    fillFormField(form, 'km_óra_állás_rögzítés_dátuma', data.km_idopont, font);

    fillFormField(form, 'ceg_neve_elado', data.ceg_neve, font);
    fillFormField(form, 'ceg_kepviselo_elado', data.ceg_kepviselo, font);
    fillFormField(form, 'cegjegyzekszam_elado', data.cegjegyzekszam, font);
    fillFormField(form, 'ceg_szekhely_elado', data.szekhely, font);

    fillFormField(form, 'vevo_neve', data.vevo_nev, font);
    fillFormField(form, 'vevo_születési_hely_ido', data.vevo_szul_hely_ido, font);
    fillFormField(form, 'vevo_anyja_neve', data.vevo_anyja_neve, font);
    fillFormField(form, 'vevo_okmány_száma', data.vevo_okmany_szam, font);
    fillFormField(form, 'vevo_lakcím', data.vevo_lakcim, font);

    fillFormField(form, 'átadás_év', data.atadas_ev, font);
    fillFormField(form, 'átadás_hónap', data.atadas_ho, font);
    fillFormField(form, 'átadás_nap', data.atadas_nap, font);
    fillFormField(form, 'hatály_év', data.hataly_ev, font);
    fillFormField(form, 'hatály_hónap', data.hataly_ho, font);
    fillFormField(form, 'hatály_nap', data.hataly_nap, font);
    fillFormField(form, 'birtokba_adás_év', data.birtok_ev, font);
    fillFormField(form, 'birtokba_adás_hónap', data.birtok_ho, font);
    fillFormField(form, 'birtokba_adás_nap', data.birtok_nap, font);
    fillFormField(form, 'birtokba_adás_óra', data.birtok_ora, font);
    fillFormField(form, 'birtokba_adás_perc', data.birtok_perc, font);
    fillFormField(form, 'szerződés_kelte_év', data.szerzodes_ev, font);
    fillFormField(form, 'szerződés_kelte_hónap', data.szerzodes_ho, font);
    fillFormField(form, 'szerződés_kelte_nap', data.szerrzodes_nap, font);

    fillFormField(form, 'tanú_1_neve', data.tanu1_nev, font);
    fillFormField(form, 'tanú_1_lakcím', data.tanu1_lakcim, font);
    fillFormField(form, 'tanú_1_szig', data.tanu1_szig, font);
    fillFormField(form, 'tanú_2_neve', data.tanu2_nev, font);
    fillFormField(form, 'tanú_2_lakcím', data.tanu2_lakcim, font);
    fillFormField(form, 'tanú_2_szig', data.tanu2_szig, font);

    fillFormField(form, 'vételár_számmal', data.vetelar_szam, font);
    fillFormField(form, 'vételár_betűvel', data.vetelar_betukkel, font);

    let fizetesiMod = data.fizetesi_mod;
    if (fizetesiMod === 'egyéb') {
        fizetesiMod = data.egyeb_fizetesi_mod;
    }
    fillFormField(form, 'fizetési_mód', fizetesiMod, font);
    fillFormField(form, 'fizetés_dátuma', data.fizetesi_datum, font);
}

function fillWarrantyPdfForm(form: any, data: FormValues, font: any) {
    const today = new Date();
    const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
    const formattedDateForPdfText = `${today.getFullYear()}. ${monthNames[today.getMonth()]} ${today.getDate()}.`;

    fillFormField(form, 'alvázszám_kellék', data.alvazszam, font);
    fillFormField(form, 'további_információk', data.kell_tovabbi_info, font);
    fillFormField(form, 'dátum_kellék', formattedDateForPdfText, font);
}

function fillAuthPdfForm(form: any, data: FormValues, font: any) {
    fillFormField(form, 'meghatalmazó_neve', data.vevo_nev, font);
    fillFormField(form, 'meghatalmazó_lakcím', data.vevo_lakcim, font);
    fillFormField(form, 'meghatalmazó_szig_szám', data.vevo_okmany_szam, font);
    fillFormField(form, 'meghatalmazó_anyja_neve', data.vevo_anyja_neve, font);
    fillFormField(form, 'meghatalmazó_szül_hely_idő', data.vevo_szul_hely_ido, font);
    fillFormField(form, 'meghatalmazott_neve_címe', data.meghatalmazott_adatok, font);
    fillFormField(form, 'meghatalmazás_rendszám', data.rendszam, font);
    fillFormField(form, 'meghatalmazás_gyártmány', data.gyartmany_tipus, font);
    fillFormField(form, 'meghatalmazás_alvázszám', data.alvazszam, font);
    fillFormField(form, 'meghatalmazás_kelte_év', data.szerzodes_ev, font);
    fillFormField(form, 'meghatalmazás_kelte_hónap', data.szerzodes_ho, font);
    fillFormField(form, 'meghatalmazás_kelte_nap', data.szerrzodes_nap, font);
    fillFormField(form, 'meghatalmazás_tanú1_név', data.tanu1_nev, font);
    fillFormField(form, 'meghatalmazás_tanú1_lakcím', data.tanu1_lakcim, font);
    fillFormField(form, 'meghatalmazás_tanú2_név', data.tanu2_nev, font);
    fillFormField(form, 'meghatalmazás_tanú2_lakcím', data.tanu2_lakcim, font);
    fillFormField(form, 'meghatalmazás_tanú1_szig', data.tanu1_szig, font);
    fillFormField(form, 'meghatalmazás_tanú2_szig', data.tanu2_szig, font);
}


const getFilenameBase = (data: FormValues) => {
    const rendszam = data.rendszam?.replace(/[^a-zA-Z0-9-]/g, '_') || 'rendszam';
    const alvazszam = data.alvazszam?.replace(/[^a-zA-Z0-9-]/g, '_') || 'alvazszam';
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return `${rendszam}-${alvazszam}-${dateStr}`;
};

async function mergePdfs(pdfBytesArray: Uint8Array[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    for (const pdfBytes of pdfBytesArray) {
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
            page.setMediaBox(0, 0, page.getWidth(), page.getHeight());
            mergedPdf.addPage(page);
        });
    }
    return mergedPdf.save();
}

// Main flow
const generatePdfFlow = ai.defineFlow(
  {
    name: 'generatePdfFlow',
    inputSchema: GeneratePdfInputSchema,
    outputSchema: GeneratePdfOutputSchema,
  },
  async ({ formData, pdfType }) => {
    // Load assets on every request to ensure they are always available
    const fontBytes = await loadAssetAsBuffer(`${BASE_URL}/fonts/DejaVuSans.ttf`);

    const templates = {
        main: () => loadAssetAsBuffer(`${BASE_URL}/sablon.pdf`),
        kellekszavatossag: () => loadAssetAsBuffer(`${BASE_URL}/kellekszavatossagi_nyilatkozat.pdf`),
        meghatalmazas: () => loadAssetAsBuffer(`${BASE_URL}/meghatalmazas_okmanyiroda.pdf`),
    };

    const data: FormValues = formData;
    
    const pdfJobs: { type: 'main' | 'kellekszavatossag' | 'meghatalmazas', filler: any, templateLoader: () => Promise<Buffer> }[] = [];

    if (pdfType === 'all' || pdfType === 'main') {
        pdfJobs.push({ type: 'main', filler: fillMainPdfForm, templateLoader: templates.main });
    }
    if (pdfType === 'all' || pdfType === 'kellekszavatossag') {
        pdfJobs.push({ type: 'kellekszavatossag', filler: fillWarrantyPdfForm, templateLoader: templates.kellekszavatossag });
    }
    if (pdfType === 'all' || pdfType === 'meghatalmazas') {
        pdfJobs.push({ type: 'meghatalmazas', filler: fillAuthPdfForm, templateLoader: templates.meghatalmazas });
    }

    const generatedPdfBytesArray = await Promise.all(
      pdfJobs.map(async ({ templateLoader, filler }) => {
        const templateBytes = await templateLoader();
        return fillAndGetPdfBytes(templateBytes, data, filler, fontBytes);
      })
    );
    
    const finalPdfBytes = generatedPdfBytesArray.length > 1
        ? await mergePdfs(generatedPdfBytesArray)
        : generatedPdfBytesArray[0];

    const filenameBase = getFilenameBase(data);
    let filename = `${filenameBase}.pdf`;
    if (pdfType !== 'all') {
        filename = `${filenameBase}-${pdfType}.pdf`;
    }

    // Return the generated PDF as a base64 string
    const pdfBase64 = Buffer.from(finalPdfBytes).toString('base64');
    
    return {
      pdfBase64,
      filename
    };
  }
);

export async function generatePdf(input: GeneratePdfInput) {
  return generatePdfFlow(input);
}
