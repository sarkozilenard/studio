"use client";

import { useState, useEffect } from "react";
import LoginForm from "./login-form";
import MainLayout from "./main-layout";
import { Toaster } from "@/components/ui/toaster";

export default function PdfApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (sessionStorage.getItem("authenticated") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem("authenticated", "true");
    setIsAuthenticated(true);
  };

  if (!isClient) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isAuthenticated ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <MainLayout />
      )}
      <Toaster />
    </div>
  );
}
