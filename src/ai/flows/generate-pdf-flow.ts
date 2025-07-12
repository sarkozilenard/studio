'use server';
/**
 * @fileOverview A server-side PDF generation flow.
 *
 * - generatePdf - A function that handles filling PDF templates.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import type { FormValues, GeneratePdfInput, GeneratePdfOutput } from '@/lib/definitions';
import { GeneratePdfInputSchema, GeneratePdfOutputSchema } from '@/lib/definitions';
import fontkit from '@pdf-lib/fontkit';


// Helper functions (adapted from pdf-utils)
const FONT_SIZE = 10;
let pdfTemplateBytes = {
    main: null as Buffer | null,
    kellekszavatossag: null as Buffer | null,
    meghatalmazas: null as Buffer | null,
};
let fontBytes: Buffer | null = null;

async function loadAssets() {
    if (!fontBytes) {
        // Load the font from the local public directory
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf');
        try {
            fontBytes = await fs.readFile(fontPath);
        } catch (error) {
            console.error(`Failed to read font file from ${fontPath}:`, error);
            throw new Error(`Font file not found at ${fontPath}. Please ensure it has been uploaded.`);
        }
    }
    if (!pdfTemplateBytes.main) {
        const mainPath = path.join(process.cwd(), 'public', 'sablon.pdf');
        pdfTemplateBytes.main = await fs.readFile(mainPath);
    }
    if (!pdfTemplateBytes.kellekszavatossag) {
        const kellekPath = path.join(process.cwd(), 'public', 'kellekszavatossagi_nyilatkozat.pdf');
        pdfTemplateBytes.kellekszavatossag = await fs.readFile(kellekPath);
    }
    if (!pdfTemplateBytes.meghatalmazas) {
        const meghatPath = path.join(process.cwd(), 'public', 'meghatalmazas_okmanyiroda.pdf');
        pdfTemplateBytes.meghatalmazas = await fs.readFile(meghatPath);
    }
}


const fillFormField = (form: any, fieldName: string, value: string | undefined) => {
    if (value) {
        try {
            const field = form.getTextField(fieldName);
            field.setText(value);
            field.setFontSize(FONT_SIZE);
        } catch (e) {
            console.warn(`Field "${fieldName}" not found in PDF.`);
        }
    }
};

async function fillAndFlatten(templateBytes: Buffer, data: FormValues, fillerFn: (form: any, data: FormValues) => void) {
    if (!templateBytes) throw new Error("PDF template is not loaded.");
    if (!fontBytes) throw new Error("Font is not loaded.");

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
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

// PDF filling logic from pdf-utils.ts
function fillMainPdfForm(form: any, data: FormValues) {
    fillFormField(form, 'rendszam', data.rendszam);
    fillFormField(form, 'alvazszam', data.alvazszam);
    fillFormField(form, 'motorszam', data.motorszam);
    fillFormField(form, 'km_allas', data.km_allas);
    fillFormField(form, 'torzskonyv_szam', data.torzskonyv_szam);
    fillFormField(form, 'forgalmi_szam', data.forgalmi_szam);
    fillFormField(form, 'gyartmany_tipus', data.gyartmany_tipus);
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
}

const getFilenameBase = (data: FormValues) => {
    const rendszam = data.rendszam?.replace(/[^a-zA-Z0-9-]/g, '_') || 'rendszam';
    const alvazszam = data.alvazszam?.replace(/[^a-zA-Z0-9-]/g, '_') || 'alvazszam';
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return `${rendszam}-${alvazszam}-${dateStr}`;
};

// Main flow
const generatePdfFlow = ai.defineFlow(
  {
    name: 'generatePdfFlow',
    inputSchema: GeneratePdfInputSchema,
    outputSchema: GeneratePdfOutputSchema,
  },
  async ({ formData, pdfType }) => {
    await loadAssets();

    const data: FormValues = formData;
    const filenameBase = getFilenameBase(data);
    const pdfsToGenerate: { type: 'main' | 'kellekszavatossag' | 'meghatalmazas', filler: any, template: Buffer | null, filename: string }[] = [];

    if (pdfType === 'all' || pdfType === 'main') {
        pdfsToGenerate.push({ type: 'main', filler: fillMainPdfForm, template: pdfTemplateBytes.main, filename: `${filenameBase}-adasveteli.pdf` });
    }
    if (pdfType === 'all' || pdfType === 'kellekszavatossag') {
        pdfsToGenerate.push({ type: 'kellekszavatossag', filler: fillWarrantyPdfForm, template: pdfTemplateBytes.kellekszavatossag, filename: `${filenameBase}-kellekszavatossagi.pdf` });
    }
    if (pdfType === 'all' || pdfType === 'meghatalmazas') {
        pdfsToGenerate.push({ type: 'meghatalmazas', filler: fillAuthPdfForm, template: pdfTemplateBytes.meghatalmazas, filename: `${filenameBase}-meghatalmazas.pdf` });
    }

    const generatedPdfs = await Promise.all(
        pdfsToGenerate.map(async ({ template, filler, filename }) => {
            if (!template) {
                throw new Error(`PDF template is missing.`);
            }
            const pdfData = await fillAndFlatten(template, data, filler);
            return { filename, data: pdfData };
        })
    );

    return { pdfs: generatedPdfs };
  }
);

export async function generatePdf(input: GeneratePdfInput): Promise<GeneratePdfOutput> {
  return generatePdfFlow(input);
}
