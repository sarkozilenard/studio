"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PdfForm from "./pdf-form";
import SavedDataView from "./saved-data-view";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { loadPdfTemplates } from "@/lib/pdf-utils";
import type { PDFDocument } from 'pdf-lib';
import { Loader2 } from "lucide-react";

type PdfDocs = {
  main: PDFDocument | null;
  kellekszavatossag: PDFDocument | null;
  meghatalmazas: PDFDocument | null;
};

export default function MainLayout() {
  const [pdfDocs, setPdfDocs] = useState<PdfDocs | null>(null);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("form");
  
  const handleLoadPdfs = async () => {
    setIsLoadingPdfs(true);
    toast({ title: "PDF sablonok betöltése..." });
    try {
      const docs = await loadPdfTemplates();
      setPdfDocs(docs);
      const allLoaded = Object.values(docs).every(doc => doc !== null);
      if (allLoaded) {
        toast({ title: "PDF sablonok sikeresen betöltve!", variant: "default" });
      } else {
        toast({ title: "Egyes PDF sablonok betöltése sikertelen.", description: "Kérjük ellenőrizze a 'public' mappában a fájlokat.", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Hiba a PDF sablonok betöltésekor.", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingPdfs(false);
    }
  };

  useEffect(() => {
    handleLoadPdfs();
  }, []);

  return (
    <div>
      <div className="text-center bg-primary text-primary-foreground p-8 rounded-lg shadow-lg mb-8">
        <h1 className="text-4xl font-bold">e-Szerződés</h1>
        <p className="text-lg opacity-90 mt-2">Járműadásvételi szerződés és kiegészítő dokumentumok kitöltő és kezelő rendszer</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Űrlap Kitöltés</TabsTrigger>
          <TabsTrigger value="saved">Mentett Adatok</TabsTrigger>
        </TabsList>
        <TabsContent value="form">
          <Card className="mt-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>PDF Sablonok</CardTitle>
                <Button onClick={handleLoadPdfs} disabled={isLoadingPdfs}>
                  {isLoadingPdfs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sablonok újratöltése
                </Button>
              </div>
              <CardDescription>Az alkalmazás alapértelmezetten betölti a szükséges PDF sablonokat. Itt újratöltheti őket.</CardDescription>
            </CardHeader>
          </Card>
          {pdfDocs ? (
            <PdfForm pdfDocs={pdfDocs} />
          ) : (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </TabsContent>
        <TabsContent value="saved">
          <SavedDataView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
