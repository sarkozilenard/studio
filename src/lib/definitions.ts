import { z } from 'zod';

export const FormValuesSchema = z.object({
  // Vehicle data
  rendszam: z.string().optional(),
  alvazszam: z.string().optional(),
  motorszam: z.string().optional(),
  km_allas: z.string().optional(),
  torzskonyv_szam: z.string().optional(),
  forgalmi_szam: z.string().optional(),
  gyartmany_tipus: z.string().optional(),
  km_idopont: z.string().optional(),

  // Seller data
  ceg_neve: z.string().optional(),
  ceg_kepviselo: z.string().optional(),
  cegjegyzekszam: z.string().optional(),
  szekhely: z.string().optional(),

  // Buyer data
  vevo_nev: z.string().optional(),
  vevo_szul_hely_ido: z.string().optional(),
  vevo_anyja_neve: z.string().optional(),
  vevo_okmany_szam: z.string().optional(),
  vevo_lakcim: z.string().optional(),

  // Additional data
  meghatalmazott_adatok: z.string().optional(),
  kell_tovabbi_info: z.string().optional(),

  // Dates
  atadas_ev: z.string().optional(),
  atadas_ho: z.string().optional(),
  atadas_nap: z.string().optional(),
  hataly_ev: z.string().optional(),
  hataly_ho: z.string().optional(),
  hataly_nap: z.string().optional(),
  birtok_ev: z.string().optional(),
  birtok_ho: z.string().optional(),
  birtok_nap: z.string().optional(),
  birtok_ora: z.string().optional(),
  birtok_perc: z.string().optional(),
  szerzodes_ev: z.string().optional(),
  szerzodes_ho: z.string().optional(),
  szerrzodes_nap: z.string().optional(),

  // Witnesses
  tanu1_nev: z.string().optional(),
  tanu1_lakcim: z.string().optional(),
  tanu1_szig: z.string().optional(),
  tanu2_nev: z.string().optional(),
  tanu2_lakcim: z.string().optional(),
  tanu2_szig: z.string().optional(),

  // Price
  vetelar_szam: z.string().optional(),
  vetelar_betukkel: z.string().optional(),
  fizetesi_mod: z.string().optional(),
  egyeb_fizetesi_mod: z.string().optional(),
  fizetesi_datum: z.string().optional(),
});
export const FormSchema = FormValuesSchema; // for backward compatibility if used elsewhere

export type FormValues = z.infer<typeof FormValuesSchema>;


export const SellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kepviseloName: z.string().optional(),
  documentNumber: z.string().optional(),
  address: z.string(),
  timestamp: z.any().optional(),
});
export type Seller = z.infer<typeof SellerSchema>;


export const WitnessSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  idNumber: z.string(),
  timestamp: z.any().optional(),
});
export type Witness = z.infer<typeof WitnessSchema>;


export const SavedJobSchema = z.object({
  id: z.string(),
  formData: FormValuesSchema,
  createdAt: z.string(), // Using string for serializable date
  rendszam: z.string(),
});
export type SavedJob = z.infer<typeof SavedJobSchema>;


// Schemas for generatePdf flow
export const GeneratePdfInputSchema = z.object({
  formData: FormSchema.describe('The form data object.'),
  pdfType: z.enum(['main', 'kellekszavatossag', 'meghatalmazas', 'all']).describe('The type of PDF to generate.'),
});
export type GeneratePdfInput = z.infer<typeof GeneratePdfInputSchema>;

export const GeneratePdfOutputSchema = z.object({
    pdfBase64: z.string().describe('The Base64 encoded string of the generated PDF.'),
    filename: z.string().describe('The suggested filename for the PDF.'),
});
export type GeneratePdfOutput = z.infer<typeof GeneratePdfOutputSchema>;


// Schemas for Job flows
export const SaveJobInputSchema = z.object({
  formData: FormValuesSchema,
});
export type SaveJobInput = z.infer<typeof SaveJobInputSchema>;

export const SaveJobOutputSchema = z.object({
  success: z.boolean(),
  jobId: z.string().optional(),
  error: z.string().optional(),
});
export type SaveJobOutput = z.infer<typeof SaveJobOutputSchema>;

export const GetSavedJobsOutputSchema = z.object({
    jobs: z.array(SavedJobSchema),
});
export type GetSavedJobsOutput = z.infer<typeof GetSavedJobsOutputSchema>;

export const DeleteJobInputSchema = z.object({
    jobId: z.string(),
});
export type DeleteJobInput = z.infer<typeof DeleteJobInputSchema>;
