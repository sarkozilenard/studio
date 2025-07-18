"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PdfForm from "./pdf-form";
import SavedDataView from "./saved-data-view";
import SavedJobsView from "./saved-jobs-view";
import { ThemeSwitcher } from "./theme-switcher";

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState("form");
  
  return (
    <div>
       <div className="flex justify-between items-center bg-primary text-primary-foreground p-8 rounded-lg shadow-lg mb-8">
          <div>
            <h1 className="text-4xl font-bold">e-Szerződés</h1>
            <p className="text-lg opacity-90 mt-2">Járműadásvételi szerződés és kiegészítő dokumentumok kitöltő és kezelő rendszer</p>
          </div>
          <ThemeSwitcher />
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="form">Űrlap Kitöltés</TabsTrigger>
          <TabsTrigger value="savedJobs">Mentett Munkák</TabsTrigger>
          <TabsTrigger value="saved">Személyek Mentése</TabsTrigger>
        </TabsList>
        <TabsContent value="form">
            <PdfForm />
        </TabsContent>
        <TabsContent value="savedJobs">
          <SavedJobsView />
        </TabsContent>
        <TabsContent value="saved">
          <SavedDataView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
