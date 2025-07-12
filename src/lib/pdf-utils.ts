'use client';
import type { FormValues } from './definitions';
import type { PDFDocument, PDFFont } from 'pdf-lib';

const FONT_SIZE = 15;

async function getFont(pdfDoc: PDFDocument): Promise<PDFFont> {
    const fontBytes = await fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2bo.ttf').then(res => res.arrayBuffer());
    pdfDoc.registerFontkit(window.fontkit);
    return await pdfDoc.embedFont(fontBytes);
}

export const loadPdfTemplates = async () => {
    const templates = {
        main: null as PDFDocument | null,
        kellekszavatossag: null as PDFDocument | null,
        meghatalmazas: null as PDFDocument | null,
    };

    try {
        const [mainRes, kellekRes, meghatRes] = await Promise.all([
            fetch('/sablon.pdf'),
            fetch('/kellekszavatossagi_nyilatkozat.pdf'),
            fetch('/meghatalmazas_okmanyiroda.pdf'),
        ]);

        if (mainRes.ok) templates.main = await window.PDFLib.PDFDocument.load(await mainRes.arrayBuffer());
        if (kellekRes.ok) templates.kellekszavatossag = await window.PDFLib.PDFDocument.load(await kellekRes.arrayBuffer());
        if (meghatRes.ok) templates.meghatalmazas = await window.PDFLib.PDFDocument.load(await meghatRes.arrayBuffer());

    } catch (error) {
        console.error("Error loading PDF templates:", error);
        throw new Error("Hiba a PDF sablonok betöltése közben.");
    }

    return templates;
};

const fillFormField = (form: any, fieldName: string, value: string | undefined) => {
    if (value) {
        try {
            form.getTextField(fieldName).setText(value);
        } catch (e) {
            console.warn(`Field "${fieldName}" not found in PDF.`);
        }
    }
};

async function fillMainPdf(pdfDoc: PDFDocument, data: FormValues) {
    const form = pdfDoc.getForm();
    const font = await getFont(pdfDoc);
    
    // Fill fields
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

    form.updateFieldAppearances(font);
    form.getFields().forEach(field => {
        try {
            const tf = form.getTextField(field.getName())
            tf.setFontSize(FONT_SIZE);
        } catch (e) {
            // Not a text field, ignore
        }
    });

    return pdfDoc.save();
}

async function fillWarrantyPdf(pdfDoc: PDFDocument, data: FormValues) {
    const form = pdfDoc.getForm();
    const font = await getFont(pdfDoc);
    const today = new Date();
    const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
    const formattedDateForPdfText = `${today.getFullYear()}. ${monthNames[today.getMonth()]} ${today.getDate()}.`;

    fillFormField(form, 'kell_rendszam', data.alvazszam);
    fillFormField(form, 'kell_tovabbi_info', data.kell_tovabbi_info);
    fillFormField(form, 'kell_datum', formattedDateForPdfText);

    form.updateFieldAppearances(font);
    form.getFields().forEach(field => {
        try {
            const tf = form.getTextField(field.getName())
            tf.setFontSize(FONT_SIZE);
        } catch (e) {
            // Not a text field, ignore
        }
    });
    return pdfDoc.save();
}

async function fillAuthPdf(pdfDoc: PDFDocument, data: FormValues) {
    const form = pdfDoc.getForm();
    const font = await getFont(pdfDoc);

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
    
    form.updateFieldAppearances(font);
    form.getFields().forEach(field => {
        try {
            const tf = form.getTextField(field.getName())
            tf.setFontSize(FONT_SIZE);
        } catch (e) {
            // Not a text field, ignore
        }
    });
    
    return pdfDoc.save();
}

function downloadPdf(pdfBytes: Uint8Array, filename: string) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

const getFilenameBase = (data: FormValues) => {
    const rendszam = data.rendszam?.replace(/[^a-zA-Z0-9-]/g, '_') || 'rendszam';
    const alvazszam = data.alvazszam?.replace(/[^a-zA-Z0-9-]/g, '_') || 'alvazszam';
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return `${rendszam}-${alvazszam}-${dateStr}`;
};

export async function fillAndDownloadAll(data: FormValues, pdfDocs: any) {
    if (!pdfDocs.main || !pdfDocs.kellekszavatossag || !pdfDocs.meghatalmazas) {
        throw new Error("Nem minden PDF sablon van betöltve.");
    }
    const filenameBase = getFilenameBase(data);

    const mainPdfBytes = await fillMainPdf(await window.PDFLib.PDFDocument.load(await pdfDocs.main.save()), data);
    downloadPdf(mainPdfBytes, `${filenameBase}-adasveteli.pdf`);

    const warrantyPdfBytes = await fillWarrantyPdf(await window.PDFLib.PDFDocument.load(await pdfDocs.kellekszavatossag.save()), data);
    downloadPdf(warrantyPdfBytes, `${filenameBase}-kellekszavatossagi.pdf`);
    
    const authPdfBytes = await fillAuthPdf(await window.PDFLib.PDFDocument.load(await pdfDocs.meghatalmazas.save()), data);
    downloadPdf(authPdfBytes, `${filenameBase}-meghatalmazas.pdf`);
}

export async function fillAndPrintSingle(data: FormValues, pdfDocs: any, type: 'main' | 'kellekszavatossag' | 'meghatalmazas') {
     if (!pdfDocs[type]) {
        throw new Error(`${type} PDF sablon nincs betöltve.`);
    }
    let pdfBytes;
    const docCopy = await window.PDFLib.PDFDocument.load(await pdfDocs[type].save());

    if (type === 'main') {
        pdfBytes = await fillMainPdf(docCopy, data);
    } else if (type === 'kellekszavatossag') {
        pdfBytes = await fillWarrantyPdf(docCopy, data);
    } else {
        pdfBytes = await fillAuthPdf(docCopy, data);
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.contentWindow?.print();
}
