"use client";

import { useState, useEffect, useCallback } from "react";
import type { Seller, Witness } from "@/lib/definitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, User, Building, Loader2 } from "lucide-react";
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
import { getSellers, getWitnesses, deletePerson } from "@/ai/flows/person-flows";

export default function SavedDataView() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ sellers }, { witnesses }] = await Promise.all([getSellers(), getWitnesses()]);
      setSellers(sellers);
      setWitnesses(witnesses);
    } catch (error) {
      console.error("Error fetching saved data:", error);
      toast({ title: "Hiba az adatok betöltésekor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (collectionName: 'sellers' | 'witnesses', id: string) => {
    try {
      const result = await deletePerson({ collectionName, id });
      if (result.success) {
        toast({ title: "Sikeres törlés", description: "Az adat eltávolítva." });
        fetchData(); // Refresh data
      } else {
        throw new Error(result.error || "Ismeretlen hiba a szerveren.");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: "Hiba a törlés során.", description: (error as Error).message, variant: "destructive" });
    }
  };

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
          <CardTitle>Mentett Eladók</CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length > 0 ? (
            <ul className="space-y-3">
              {sellers.map((seller) => (
                <li key={seller.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Building className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{seller.name}</p>
                      <p className="text-sm text-muted-foreground">{seller.address}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Biztosan törli?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ez a művelet nem vonható vissza. Véglegesen törli a mentett eladót.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete("sellers", seller.id)} className="bg-destructive hover:bg-destructive/90">
                          Törlés
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nincsenek mentett eladók.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mentett Tanúk</CardTitle>
        </CardHeader>
        <CardContent>
          {witnesses.length > 0 ? (
            <ul className="space-y-3">
              {witnesses.map((witness) => (
                <li key={witness.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <User className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{witness.name}</p>
                      <p className="text-sm text-muted-foreground">{witness.address}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Biztosan törli?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ez a művelet nem vonható vissza. Véglegesen törli a mentett tanút.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete("witnesses", witness.id)} className="bg-destructive hover:bg-destructive/90">
                          Törlés
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nincsenek mentett tanúk.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
