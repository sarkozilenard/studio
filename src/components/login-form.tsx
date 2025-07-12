"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleLogin = () => {
    if (password === "user") {
      onLoginSuccess();
    } else {
      toast({
        title: "Hibás jelszó!",
        variant: "destructive",
        description: "Kérjük, próbálja újra a helyes jelszóval.",
      });
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <Card className="w-full max-w-sm border-primary shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">Bejelentkezés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              id="password"
              type="password"
              placeholder="Jelszó"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="text-center"
            />
            <Button onClick={handleLogin} className="w-full font-semibold">
              Belépés
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
