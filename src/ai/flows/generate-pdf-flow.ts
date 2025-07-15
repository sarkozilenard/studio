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
            field.setText(value);
            // Instead of setting font size on the field, we will draw text manually for better control
            field.setFontSize(FONT_SIZE); // Keep this for fallback or if needed
            
            const widgets = field.acroField.getWidgets();
            widgets.forEach(widget => {
                const { x, y, width, height } = widget.getRectangle();
                const page = widget.getPage();
                
                // Draw text manually to control alignment
                page.drawText(value, {
                    x: x + 2, // Small padding from the left
                    y: y + height / 2 - FONT_SIZE / 2 + 1, // Vertically centered
                    font: font,
                    size: FONT_SIZE,
                    color: rgb(0, 0, 0),
                });
            });


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

    // After filling, flatten the form to make fields uneditable
    form.flatten();

    return pdfDoc.save();
}

function fillMainPdfForm(form: any, data: FormValues, font: any) {
    fillFormField(form, 'rendszam', data.rendszam, font);
    fillFormField(form, 'gyartmany_tipus', data.gyartmany_tipus, font);
    fillFormField(form, 'alvazszam', data.alvazszam, font);
    fillFormField(form, 'motorszam', data.motorszam, font);
    fillFormField(form, 'km_allas', data.km_allas, font);
    fillFormField(form, 'torzskonyv_szam', data.torzskonyv_szam, font);
    fillFormField(form, 'forgalmi_szam', data.forgalmi_szam, font);
    fillFormField(form, 'km_idopont', data.km_idopont, font);

    fillFormField(form, 'ceg_neve', data.ceg_neve, font);
    fillFormField(form, 'ceg_kepviselo', data.ceg_kepviselo, font);
    fillFormField(form, 'cegjegyzekszam', data.cegjegyzekszam, font);
    fillFormField(form, 'ceg_szekhely', data.szekhely, font);

    fillFormField(form, 'vevo_nev', data.vevo_nev, font);
    fillFormField(form, 'vevo_szul_hely_ido', data.vevo_szul_hely_ido, font);
    fillFormField(form, 'vevo_anyja_neve', data.vevo_anyja_neve, font);
    fillFormField(form, 'vevo_okmany_szam', data.vevo_okmany_szam, font);
    fillFormField(form, 'vevo_lakcim', data.vevo_lakcim, font);

    fillFormField(form, 'atadas_ev', data.atadas_ev, font);
    fillFormField(form, 'atadas_ho', data.atadas_ho, font);
    fillFormField(form, 'atadas_nap', data.atadas_nap, font);
    fillFormField(form, 'hataly_ev', data.hataly_ev, font);
    fillFormField(form, 'hataly_ho', data.hataly_ho, font);
    fillFormField(form, 'hataly_nap', data.hataly_nap, font);
    fillFormField(form, 'birtok_ev', data.birtok_ev, font);
    fillFormField(form, 'birtok_ho', data.birtok_ho, font);
    fillFormField(form, 'birtok_nap', data.birtok_nap, font);
    fillFormField(form, 'birtok_ora', data.birtok_ora, font);
    fillFormField(form, 'birtok_perc', data.birtok_perc, font);
    fillFormField(form, 'szerzodes_ev', data.szerzodes_ev, font);
    fillFormField(form, 'szerzodes_ho', data.szerzodes_ho, font);
    fillFormField(form, 'szerrzodes_nap', data.szerrzodes_nap, font);

    fillFormField(form, 'tanu1_nev', data.tanu1_nev, font);
    fillFormField(form, 'tanu1_lakcim', data.tanu1_lakcim, font);
    fillFormField(form, 'tanu1_szig', data.tanu1_szig, font);
    fillFormField(form, 'tanu2_nev', data.tanu2_nev, font);
    fillFormField(form, 'tanu2_lakcim', data.tanu2_lakcim, font);
    fillFormField(form, 'tanu2_szig', data.tanu2_szig, font);

    fillFormField(form, 'vetelar_szam', data.vetelar_szam, font);
    fillFormField(form, 'vetelar_betukkel', data.vetelar_betukkel, font);

    let fizetesiMod = data.fizetesi_mod;
    if (fizetesiMod === 'egyéb') {
        fizetesiMod = data.egyeb_fizetesi_mod;
    }
    fillFormField(form, 'fizetesi_mod', fizetesiMod, font);
    fillFormField(form, 'fizetesi_datum', data.fizetesi_datum, font);
}

function fillWarrantyPdfForm(form: any, data: FormValues, font: any) {
    const today = new Date();
    const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
    const formattedDateForPdfText = `${today.getFullYear()}. ${monthNames[today.getMonth()]} ${today.getDate()}.`;

    fillFormField(form, 'kell_rendszam', data.alvazszam, font);
    fillFormField(form, 'kell_tovabbi_info', data.kell_tovabbi_info, font);
    fillFormField(form, 'kell_datum', formattedDateForPdfText, font);
}

function fillAuthPdfForm(form: any, data: FormValues, font: any) {
    fillFormField(form, 'meghatalmazo_nev_megh', data.vevo_nev, font);
    fillFormField(form, 'meghatalmazo_lakcim_megh', data.vevo_lakcim, font);
    fillFormField(form, 'meghatalmazo_szig_szam_megh', data.vevo_okmany_szam, font);
    fillFormField(form, 'meghatalmazo_anyja_neve_megh', data.vevo_anyja_neve, font);
    fillFormField(form, 'meghatalmazo_szul_hely_ido_megh', data.vevo_szul_hely_ido, font);
    fillFormField(form, 'meghatalmazott_nev_cim_megh', data.meghatalmazott_adatok, font);
    fillFormField(form, 'meghatalmazas_rendszam_megh', data.rendszam, font);
    fillFormField(form, 'meghatalmazas_gyartmany_megh', data.gyartmany_tipus, font);
    fillFormField(form, 'meghatalmazas_alvazszam_megh', data.alvazszam, font);
    fillFormField(form, 'meghatalmazas_datum_ev', data.szerzodes_ev, font);
    fillFormField(form, 'meghatalmazas_datum_ho', data.szerzodes_ho, font);
    fillFormField(form, 'meghatalmazas_datum_nap', data.szerrzodes_nap, font);
    fillFormField(form, 'tanu1_nev_megh', data.tanu1_nev, font);
    fillFormField(form, 'tanu1_lakcim_megh', data.tanu1_lakcim, font);
    fillFormField(form, 'tanu2_nev_megh', data.tanu2_nev, font);
    fillFormField(form, 'tanu2_lakcim_megh', data.tanu2_lakcim, font);
    fillFormField(form, 'tanu1_szemelyi_megh', data.tanu1_szig, font);
    fillFormField(form, 'tanu2_szemelyi_megh', data.tanu2_szig, font);
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
            // Attempt to set margins to zero to maximize content area
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
