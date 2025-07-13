'use server';
/**
 * @fileOverview A server-side PDF generation flow that returns the generated PDF as a Base64 encoded string.
 *
 * - generatePdf - A function that handles filling PDF templates and returning the file content.
 */
import { ai } from '@/ai/genkit';
import type { FormValues, GeneratePdfInput } from '@/lib/definitions';
import { GeneratePdfInputSchema, GeneratePdfOutputSchema } from '@/lib/definitions';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Helper functions
const FONT_SIZE = 12;
const BASE_URL = 'https://pdf.pomazauto.hu';

async function loadAssetAsBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url, { cache: 'no-store' }); // Disable caching to ensure fresh assets
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

const fillFormField = (form: any, fieldName: string, value: string | undefined) => {
    if (value) {
        try {
            const field = form.getTextField(fieldName);
            field.setText(value);
            field.setFontSize(FONT_SIZE);
        } catch (e) {
            console.warn(`Field "${fieldName}" not found in PDF for value "${value}".`);
        }
    }
};

async function fillAndGetPdfBytes(templateBytes: Buffer, data: FormValues, fillerFn: (form: any, data: FormValues) => void, fontBytes: Buffer): Promise<Uint8Array> {
    if (!templateBytes || templateBytes.length === 0) throw new Error("PDF template is not loaded or is empty.");
    if (!fontBytes || fontBytes.length === 0) throw new Error("Font is not loaded or is empty.");

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    
    const customFont = await pdfDoc.embedFont(fontBytes);
    
    const form = pdfDoc.getForm();
    fillerFn(form, data);

    form.getFields().forEach(field => {
        try {
           if (field.getName()) {
               const tf = form.getTextField(field.getName());
               tf.updateAppearances(customFont);
           }
        } catch (e) {
            // Not a text field, ignore
        }
    });

    form.flatten();
    return pdfDoc.save();
}

function fillMainPdfForm(form: any, data: FormValues) {
    fillFormField(form, 'rendszam', data.rendszam);
    fillFormField(form, 'gyartmany_tipus', data.gyartmany_tipus);
    fillFormField(form, 'alvazszam', data.alvazszam);
    fillFormField(form, 'motorszam', data.motorszam);
    fillFormField(form, 'km_allas', data.km_allas);
    fillFormField(form, 'torzskonyv_szam', data.torzskonyv_szam);
    fillFormField(form, 'forgalmi_szam', data.forgalmi_szam);
    fillFormField(form, 'km_idopont', data.km_idopont);

    fillFormField(form, 'ceg_neve', data.ceg_neve);
    fillFormField(form, 'ceg_kepviselo', data.ceg_kepviselo);
    fillFormField(form, 'cegjegyzekszam', data.cegjegyzekszam);
    fillFormField(form, 'ceg_szekhely', data.szekhely);

    fillFormField(form, 'vevo_nev', data.vevo_nev);
    fillFormField(form, 'vevo_szul_hely_ido', data.vevo_szul_hely_ido);
    fillFormField(form, 'vevo_anyja_neve', data.vevo_anyja_neve);
    fillFormField(form, 'vevo_okmany_szam', data.vevo_okmany_szam);
    fillFormField(form, 'vevo_lakcim', data.vevo_lakcim);

    fillFormField(form, 'atadas_ev', data.atadas_ev);
    fillFormField(form, 'atadas_ho', data.atadas_ho);
    fillFormField(form, 'atadas_nap', data.atadas_nap);
    fillFormField(form, 'hataly_ev', data.hataly_ev);
    fillFormField(form, 'hataly_ho', data.hataly_ho);
    fillFormField(form, 'hataly_nap', data.hataly_nap);
    fillFormField(form, 'birtok_ev', data.birtok_ev);
    fillFormField(form, 'birtok_ho', data.birtok_ho);
    fillFormField(form, 'birtok_nap', data.birtok_nap);
    fillFormField(form, 'birtok_ora', data.birtok_ora);
    fillFormField(form, 'birtok_perc', data.birtok_perc);
    fillFormField(form, 'szerzodes_ev', data.szerzodes_ev);
    fillFormField(form, 'szerzodes_ho', data.szerzodes_ho);
    fillFormField(form, 'szerrzodes_nap', data.szerrzodes_nap);

    fillFormField(form, 'tanu1_nev', data.tanu1_nev);
    fillFormField(form, 'tanu1_lakcim', data.tanu1_lakcim);
    fillFormField(form, 'tanu1_szig', data.tanu1_szig);
    fillFormField(form, 'tanu2_nev', data.tanu2_nev);
    fillFormField(form, 'tanu2_lakcim', data.tanu2_lakcim);
    fillFormField(form, 'tanu2_szig', data.tanu2_szig);

    fillFormField(form, 'vetelar_szam', data.vetelar_szam);
    fillFormField(form, 'vetelar_betukkel', data.vetelar_betukkel);

    let fizetesiMod = data.fizetesi_mod;
    if (fizetesiMod === 'egyéb') {
        fizetesiMod = data.egyeb_fizetesi_mod;
    }
    fillFormField(form, 'fizetesi_mod', fizetesiMod);
    fillFormField(form, 'fizetesi_datum', data.fizetesi_datum);
}

function fillWarrantyPdfForm(form: any, data: FormValues) {
    const today = new Date();
    const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
    const formattedDateForPdfText = `${today.getFullYear()}. ${monthNames[today.getMonth()]} ${today.getDate()}.`;

    fillFormField(form, 'kell_rendszam', data.alvazszam);
    fillFormField(form, 'kell_tovabbi_info', data.kell_tovabbi_info);
    fillFormField(form, 'kell_datum', formattedDateForPdfText);
}

function fillAuthPdfForm(form: any, data: FormValues) {
    fillFormField(form, 'meghatalmazo_nev_megh', data.vevo_nev);
    fillFormField(form, 'meghatalmazo_lakcim_megh', data.vevo_lakcim);
    fillFormField(form, 'meghatalmazo_szig_szam_megh', data.vevo_okmany_szam);
    fillFormField(form, 'meghatalmazo_anyja_neve_megh', data.vevo_anyja_neve);
    fillFormField(form, 'meghatalmazo_szul_hely_ido_megh', data.vevo_szul_hely_ido);
    fillFormField(form, 'meghatalmazott_nev_cim_megh', data.meghatalmazott_adatok);
    fillFormField(form, 'meghatalmazas_rendszam_megh', data.rendszam);
    fillFormField(form, 'meghatalmazas_gyartmany_megh', data.gyartmany_tipus);
    fillFormField(form, 'meghatalmazas_alvazszam_megh', data.alvazszam);
    fillFormField(form, 'meghatalmazas_datum_ev', data.szerzodes_ev);
    fillFormField(form, 'meghatalmazas_datum_ho', data.szerzodes_ho);
    fillFormField(form, 'meghatalmazas_datum_nap', data.szerrzodes_nap);
    fillFormField(form, 'tanu1_nev_megh', data.tanu1_nev);
    fillFormField(form, 'tanu1_lakcim_megh', data.tanu1_lakcim);
    fillFormField(form, 'tanu2_nev_megh', data.tanu2_nev);
    fillFormField(form, 'tanu2_lakcim_megh', data.tanu2_lakcim);
    fillFormField(form, 'tanu1_szemelyi_megh', data.tanu1_szig);
    fillFormField(form, 'tanu2_szemelyi_megh', data.tanu2_szig);
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
        copiedPages.forEach((page) => mergedPdf.addPage(page));
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
