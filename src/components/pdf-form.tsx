"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSchema, type FormValues, type Seller, type Witness } from "@/lib/definitions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs, query, serverTimestamp } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { convertNumberToWords } from "@/ai/flows/convert-number-to-words";
import { fillAndDownloadAll, fillAndPrintSingle } from "@/lib/pdf-utils";
import { Download, Printer, Save, Trash2, Loader2 } from "lucide-react";

const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];

type PdfFormProps = {
  pdfDocs: {
    main: boolean | null;
    kellekszavatossag: boolean | null;
    meghatalmazas: boolean | null;
  }
}

const getDefaultValues = () => {
    const today = new Date();
    const year = today.getFullYear().toString();
    const monthIndex = today.getMonth();
    const day = today.getDate().toString();
    const monthName = monthNames[monthIndex];
    const formattedDateForInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return {
      rendszam: "", alvazszam: "", motorszam: "", km_allas: "", torzskonyv_szam: "", forgalmi_szam: "", gyartmany_tipus: "",
      ceg_neve: "", ceg_kepviselo: "", cegjegyzekszam: "", szekhely: "",
      vevo_nev: "", vevo_szul_hely_ido: "", vevo_anyja_neve: "", vevo_okmany_szam: "", vevo_lakcim: "",
      meghatalmazott_adatok: "", kell_tovabbi_info: "",
      tanu1_nev: "", tanu1_lakcim: "", tanu1_szig: "",
      tanu2_nev: "", tanu2_lakcim: "", tanu2_szig: "",
      vetelar_szam: "", vetelar_betukkel: "", fizetesi_mod: "készpénz", egyeb_fizetesi_mod: "",
      km_idopont: formattedDateForInput,
      atadas_ev: year, atadas_ho: monthName, atadas_nap: day,
      hataly_ev: year, hataly_ho: monthName, hataly_nap: day,
      birtok_ev: year, birtok_ho: monthName, birtok_nap: day,
      szerzodes_ev: year, szerzodes_ho: monthName, szerrzodes_nap: day,
      birtok_ora: "12", birtok_perc: "00",
      fizetesi_datum: formattedDateForInput
    };
};

export default function PdfForm({ pdfDocs }: PdfFormProps) {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: getDefaultValues(),
  });

  const fizetesiMod = form.watch("fizetesi_mod");

  const loadDropdownData = useCallback(async () => {
    try {
      const sellersSnapshot = await getDocs(query(collection(db, "sellers")));
      const sellersData = sellersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
      setSellers(sellersData);

      const witnessesSnapshot = await getDocs(query(collection(db, "witnesses")));
      const witnessesData = witnessesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Witness));
      setWitnesses(witnessesData);
    } catch (error) {
      console.error("Error loading dropdown data:", error);
      toast({ title: "Hiba a mentett adatok betöltésekor", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  const handleVetelarChange = async (value: number) => {
    if (isNaN(value) || value <= 0) {
      form.setValue("vetelar_betukkel", "");
      return;
    }
    try {
      const result = await convertNumberToWords({ number: value });
      if (result.words) {
        form.setValue("vetelar_betukkel", result.words);
      }
    } catch (error) {
      console.error("Error converting number to words:", error);
      toast({
        title: "Hiba",
        description: "A vételár betűvel való átírása sikertelen.",
        variant: "destructive",
      });
    }
  };

  const debouncedVetelarChange = useCallback(debounce(handleVetelarChange, 500), []);

  const handleSave = async (type: "seller" | "witness1" | "witness2") => {
    let dataToSave;
    let collectionName: string;
    let successMessage: string;

    if (type === 'seller') {
      dataToSave = {
        name: form.getValues('ceg_neve'),
        kepviseloName: form.getValues('ceg_kepviselo'),
        documentNumber: form.getValues('cegjegyzekszam'),
        address: form.getValues('szekhely'),
      };
      collectionName = 'sellers';
      successMessage = 'Eladó adatok mentve.';
    } else {
      const witnessNum = type === 'witness1' ? 1 : 2;
      dataToSave = {
        name: form.getValues(`tanu${witnessNum}_nev`),
        address: form.getValues(`tanu${witnessNum}_lakcim`),
        idNumber: form.getValues(`tanu${witnessNum}_szig`),
      };
      collectionName = 'witnesses';
      successMessage = `${witnessNum}. tanú adatok mentve.`;
    }

    if (!dataToSave.name) {
      toast({ title: "Hiányzó adat", description: "A név megadása kötelező.", variant: "destructive" });
      return;
    }
    
    try {
      await addDoc(collection(db, collectionName), { ...dataToSave, timestamp: serverTimestamp() });
      toast({ title: "Sikeres mentés", description: successMessage });
      loadDropdownData();
    } catch (error) {
      toast({ title: "Hiba mentés közben", variant: "destructive" });
    }
  };

  const handleLoad = (type: 'seller' | 'witness1' | 'witness2', id: string) => {
    if (type === 'seller') {
      const seller = sellers.find(s => s.id === id);
      if (seller) {
        form.setValue('ceg_neve', seller.name);
        form.setValue('ceg_kepviselo', seller.kepviseloName || '');
        form.setValue('cegjegyzekszam', seller.documentNumber || '');
        form.setValue('szekhely', seller.address);
      }
    } else {
      const witnessNum = type === 'witness1' ? 1 : 2;
      const witness = witnesses.find(w => w.id === id);
      if (witness) {
        form.setValue(`tanu${witnessNum}_nev`, witness.name);
        form.setValue(`tanu${witnessNum}_lakcim`, witness.address);
        form.setValue(`tanu${witnessNum}_szig`, witness.idNumber);
      }
    }
  };

  const processPdfAction = async (action: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await action();
    } catch (error) {
        toast({
            title: "Hiba a PDF feldolgozása közben",
            description: (error as Error).message,
            variant: "destructive"
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const onDownloadAll = () => processPdfAction(() => fillAndDownloadAll(form.getValues(), pdfDocs));
  const onPrintMain = () => processPdfAction(() => fillAndPrintSingle(form.getValues(), pdfDocs, 'main'));
  const onPrintWarranty = () => processPdfAction(() => fillAndPrintSingle(form.getValues(), pdfDocs, 'kellekszavatossag'));
  const onPrintAuth = () => processPdfAction(() => fillAndPrintSingle(form.getValues(), pdfDocs, 'meghatalmazas'));
  
  return (
    <Form {...form}>
      <form className="space-y-4 mt-4">
        {/* Jármű adatok */}
        <Card>
          <CardHeader><CardTitle>Jármű adatok</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField control={form.control} name="rendszam" render={({ field }) => (<FormItem><FormLabel>Rendszám:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="alvazszam" render={({ field }) => (<FormItem><FormLabel>Alvázszám:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="motorszam" render={({ field }) => (<FormItem><FormLabel>Motorszám:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="km_allas" render={({ field }) => (<FormItem><FormLabel>Km állás:</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="torzskonyv_szam" render={({ field }) => (<FormItem><FormLabel>Törzskönyv szám:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="forgalmi_szam" render={({ field }) => (<FormItem><FormLabel>Forgalmi szám:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="gyartmany_tipus" render={({ field }) => (<FormItem><FormLabel>Gyártmány/típus:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="km_idopont" render={({ field }) => (<FormItem><FormLabel>Km állásfelvétel időpontja:</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
          </CardContent>
        </Card>

        {/* Eladó adatok */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Eladó adatok</CardTitle>
                <CardDescription>Cég vagy magánszemély adatai.</CardDescription>
              </div>
              <Button type="button" size="sm" onClick={() => handleSave('seller')}><Save className="mr-2 h-4 w-4" />Mentés</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="ceg_neve" // dummy field for the dropdown
              render={() => (
                <FormItem>
                  <FormLabel>Mentett eladók</FormLabel>
                  <Select onValueChange={(value) => handleLoad('seller', value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon mentett eladót..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sellers.map(seller => (
                        <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="ceg_neve" render={({ field }) => (<FormItem><FormLabel>Név / Cégnév:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="ceg_kepviselo" render={({ field }) => (<FormItem><FormLabel>Képviselő neve:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="cegjegyzekszam" render={({ field }) => (<FormItem><FormLabel>Cégjegyzékszám / Szem. ig. sz.:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="szekhely" render={({ field }) => (<FormItem><FormLabel>Székhely / Lakcím:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </div>
          </CardContent>
        </Card>

        {/* Vevő adatok */}
        <Card>
          <CardHeader><CardTitle>Vevő adatok</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="vevo_nev" render={({ field }) => (<FormItem><FormLabel>Vevő neve:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="vevo_szul_hely_ido" render={({ field }) => (<FormItem><FormLabel>Születési hely és idő:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="vevo_anyja_neve" render={({ field }) => (<FormItem><FormLabel>Anyja neve:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="vevo_okmany_szam" render={({ field }) => (<FormItem><FormLabel>Okmány szám (Személyi ig. szám):</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="vevo_lakcim" render={({ field }) => (<FormItem><FormLabel>Lakcím (Székhely, lakcím):</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </CardContent>
        </Card>

        {/* Kiegészítő adatok */}
        <Card>
            <CardHeader><CardTitle>Kiegészítő adatok</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-1 gap-4">
                <FormField control={form.control} name="meghatalmazott_adatok" render={({ field }) => (<FormItem><FormLabel>Meghatalmazott neve és címe:</FormLabel><FormControl><Input {...field} placeholder="pl. Kovács Géza, 1024 Budapest, Fő utca 1." /></FormControl></FormItem>)} />
                <FormField control={form.control} name="kell_tovabbi_info" render={({ field }) => (<FormItem><FormLabel>Kellékszavatossági további információk:</FormLabel><FormControl><Textarea {...field} placeholder="Írja ide a további információkat..." /></FormControl></FormItem>)} />
            </CardContent>
        </Card>
        
        {/* Dátumok */}
        <Card>
            <CardHeader><CardTitle>Dátumok (Adásvételi Szerződéshez)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2 text-primary">Átadás dátuma</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="atadas_ev" render={({ field }) => (<FormItem><FormLabel>Év</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="atadas_ho" render={({ field }) => (<FormItem><FormLabel>Hónap</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="atadas_nap" render={({ field }) => (<FormItem><FormLabel>Nap</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    </div>
                </div>
                 <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2 text-primary">Birtokba vétel</h4>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        <FormField control={form.control} name="birtok_ev" render={({ field }) => (<FormItem><FormLabel>Év</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="birtok_ho" render={({ field }) => (<FormItem><FormLabel>Hónap</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="birtok_nap" render={({ field }) => (<FormItem><FormLabel>Nap</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="birtok_ora" render={({ field }) => (<FormItem><FormLabel>Óra</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="birtok_perc" render={({ field }) => (<FormItem><FormLabel>Perc</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                    </div>
                </div>
                <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2 text-primary">Szerződés kelte</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="szerzodes_ev" render={({ field }) => (<FormItem><FormLabel>Év</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="szerzodes_ho" render={({ field }) => (<FormItem><FormLabel>Hónap</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="szerrzodes_nap" render={({ field }) => (<FormItem><FormLabel>Nap</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Tanúk */}
        <Card>
            <CardHeader><CardTitle>Tanúk</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-semibold text-lg text-primary">1. Tanú</h3>
                        </div>
                        <Button type="button" size="sm" onClick={() => handleSave('witness1')}><Save className="mr-2 h-4 w-4" />Mentés</Button>
                    </div>
                    <div className="space-y-4">
                       <FormField
                          control={form.control}
                          name="tanu1_nev"
                          render={() => (
                            <FormItem>
                              <FormLabel>Mentett tanúk</FormLabel>
                              <Select onValueChange={(value) => handleLoad('witness1', value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Válasszon mentett tanút..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {witnesses.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <div className="grid md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="tanu1_nev" render={({ field }) => (<FormItem><FormLabel>Neve:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="tanu1_lakcim" render={({ field }) => (<FormItem><FormLabel>Lakcíme:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="tanu1_szig" render={({ field }) => (<FormItem><FormLabel>Személyigazolvány száma:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
                        </div>
                    </div>
                </div>
                 <div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-semibold text-lg text-primary">2. Tanú</h3>
                        </div>
                        <Button type="button" size="sm" onClick={() => handleSave('witness2')}><Save className="mr-2 h-4 w-4" />Mentés</Button>
                    </div>
                    <div className="space-y-4">
                       <FormField
                          control={form.control}
                          name="tanu2_nev"
                          render={() => (
                            <FormItem>
                              <FormLabel>Mentett tanúk</FormLabel>
                              <Select onValueChange={(value) => handleLoad('witness2', value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Válasszon mentett tanút..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {witnesses.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <div className="grid md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="tanu2_nev" render={({ field }) => (<FormItem><FormLabel>Neve:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="tanu2_lakcim" render={({ field }) => (<FormItem><FormLabel>Lakcíme:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="tanu2_szig" render={({ field }) => (<FormItem><FormLabel>Személyigazolvány száma:</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl></FormItem>)} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Vételár */}
        <Card>
            <CardHeader><CardTitle>Vételár és fizetés</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="vetelar_szam" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Vételár (számmal):</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} onChange={(e) => {
                                field.onChange(e);
                                debouncedVetelarChange(parseInt(e.target.value, 10));
                            }} />
                        </FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="vetelar_betukkel" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Vételár (betűkkel):</FormLabel>
                        <FormControl><Input {...field} readOnly /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="fizetesi_mod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fizetési mód</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Válasszon..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="készpénz">Készpénz</SelectItem>
                        <SelectItem value="utalás">Utalás</SelectItem>
                        <SelectItem value="készpénz és utalás">Készpénz és utalás</SelectItem>
                        <SelectItem value="egyéb">Egyéb</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {fizetesiMod === 'egyéb' && (
                  <FormField control={form.control} name="egyeb_fizetesi_mod" render={({ field }) => (<FormItem><FormLabel>Egyéb fizetési mód:</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                )}
                 <FormField control={form.control} name="fizetesi_datum" render={({ field }) => (<FormItem><FormLabel>Fizetés dátuma:</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
            </CardContent>
        </Card>
        
        {/* Műveletek */}
        <Card>
            <CardHeader><CardTitle>Műveletek</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <Button type="button" onClick={onDownloadAll} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Összes PDF letöltése
                </Button>
                <Button type="button" variant="secondary" onClick={onPrintMain} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Adásvételi Nyomtatása
                </Button>
                 <Button type="button" variant="secondary" onClick={onPrintWarranty} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Kellékszavatossági Nyomtatása
                </Button>
                 <Button type="button" variant="secondary" onClick={onPrintAuth} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Meghatalmazás Nyomtatása
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Űrlap Törlése
                </Button>
            </CardContent>
        </Card>

      </form>
    </Form>
  );
}
