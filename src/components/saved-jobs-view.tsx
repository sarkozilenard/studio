"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";
import type { SavedJob } from "@/lib/definitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Printer, Loader2, Car, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generateAndHandlePdf } from "@/lib/pdf-utils";

function Countdown({ expiryTimestamp }: { expiryTimestamp: number }) {
  const calculateTimeLeft = () => {
    const difference = expiryTimestamp - new Date().getTime();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents: any[] = [];

  Object.keys(timeLeft).forEach((interval) => {
    if (!timeLeft[interval as keyof typeof timeLeft]) {
      return;
    }
    timerComponents.push(
      <span key={interval}>
        {String(timeLeft[interval as keyof typeof timeLeft]).padStart(2, '0')}{interval.charAt(0)}
      </span>
    );
  });

  return (
    <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
        <Clock className="h-3 w-3" />
        {timerComponents.length ? timerComponents.join(' : ') : <span>Lejárt</span>}
    </div>
  )
}

export default function SavedJobsView() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const EXPIRY_HOURS = 48;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobsQuery = query(collection(db, "savedJobs"), orderBy("createdAt", "desc"));
      const jobsSnapshot = await getDocs(jobsQuery);
      
      const now = Date.now();
      const validJobs = jobsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SavedJob))
        .filter(job => {
            if (job.createdAt) {
                const jobTime = (job.createdAt as Timestamp).toDate().getTime();
                return now - jobTime < EXPIRY_HOURS * 60 * 60 * 1000;
            }
            return false;
        });

      setSavedJobs(validJobs);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
      toast({ title: "Hiba a mentett munkák betöltésekor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const interval = setInterval(() => {
        fetchData();
    }, 60000); // Refresh every minute to clear out expired jobs
    fetchData();
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "savedJobs", id));
      toast({ title: "Sikeres törlés", description: "A mentett munka eltávolítva." });
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: "Hiba a törlés során.", variant: "destructive" });
    }
  };

  const handlePrint = async (job: SavedJob) => {
    setIsProcessing(job.id);
    toast({ title: "PDF generálása nyomtatáshoz...", description: "Ez eltarthat egy pillanatig." });
    try {
        await generateAndHandlePdf(job.formData, 'all');
    } catch (error) {
        console.error("PDF generation/printing error:", error);
        toast({
            title: "Hiba a PDF nyomtatása közben",
            description: (error as Error).message,
            variant: "destructive"
        });
    } finally {
        setIsProcessing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2">
      <Card>
        <CardHeader>
          <CardTitle>Mentett Munkák (48 óráig elérhető)</CardTitle>
        </CardHeader>
        <CardContent>
          {savedJobs.length > 0 ? (
            <ul className="space-y-3">
              {savedJobs.map((job) => {
                const expiryTime = job.createdAt 
                  ? (job.createdAt as Timestamp).toDate().getTime() + EXPIRY_HOURS * 60 * 60 * 1000
                  : 0;

                return (
                    <li key={job.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                            <Car className="h-6 w-6 text-primary" />
                            <div>
                                <p className="font-semibold">{job.rendszam}</p>
                                <p className="text-sm text-muted-foreground">Vevő: {job.formData.vevo_nev}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <Countdown expiryTimestamp={expiryTime} />
                            <Button variant="secondary" size="sm" onClick={() => handlePrint(job)} disabled={!!isProcessing}>
                                {isProcessing === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                <span className="hidden sm:inline ml-2">Nyomtatás</span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Biztosan törli?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Ez a művelet nem vonható vissza. Véglegesen törli a mentett munkát.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(job.id)} className="bg-destructive hover:bg-destructive/90">
                                    Törlés
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </li>
                )
              })}
            </ul>
          ) : (
            <p>Nincsenek aktív mentett munkák.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
