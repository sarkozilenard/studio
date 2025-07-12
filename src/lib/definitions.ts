import { z } from 'zod';

export const FormSchema = z.object({
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

export type FormValues = z.infer<typeof FormSchema>;

export type Seller = {
  id: string;
  name: string;
  kepviseloName?: string;
  documentNumber?: string;
  address: string;
  timestamp?: any;
};

export type Witness = {
  id: string;
  name:string;
  address: string;
  idNumber: string;
  timestamp?: any;
};
