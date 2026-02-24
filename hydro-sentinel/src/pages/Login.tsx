// Login Page for Hydro Sentinel
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api"; // We'll bypass the interceptor for login
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";

export default function Login() {
  const [email, setEmail] = useState("admin@hydro.com");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((state) => state.setToken);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      console.log('🔐 Attempting login with:', email);
      
      const response = await api.post('/login/access-token', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('✅ Login response:', response);
      console.log('📦 Response data:', response.data);
      
      const { access_token } = response.data;
      
      if (!access_token) {
        console.error('❌ No access_token in response:', response.data);
        throw new Error('No access token received');
      }
      
      console.log('🎟️ Token received:', access_token.substring(0, 20) + '...');
      setToken(access_token);
      toast.success("Connexion réussie");
      navigate("/");
    } catch (error) {
      console.error('❌ Login error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      toast.error("Échec de la connexion. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Hydro Sentinel</CardTitle>
          <CardDescription>Entrez vos identifiants pour accéder au dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@hydro.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
            <div className="text-xs text-center text-muted-foreground mt-4">
              <p>Demo Admin: admin@hydro.com / admin</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
