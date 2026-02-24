// Hydro Sentinel Main Application
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Precipitations from "./pages/Precipitations";
import Debits from "./pages/Debits";
import Apports from "./pages/Apports";
import Lachers from "./pages/Lachers";
import Stations from "./pages/Stations";
import Dams from "./pages/Dams";
import Import from "./pages/Import";
import DataScan from "./pages/DataScan";
import DataManagement from "./pages/DataManagement";
import Settings from "./pages/Settings";

import RecapBarrage from "./pages/RecapBarrage";
import Volume from "./pages/Volume";
import Environment from "./pages/Environment";
import NotFound from "./pages/NotFound";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = () => {
  const token = useAuthStore(state => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />; // Layout contains Outlet
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/precipitations" element={<Precipitations />} />
            <Route path="/precipitations/station" element={<Precipitations />} />
            <Route path="/precipitations/bassin" element={<Precipitations />} />
            <Route path="/debits" element={<Debits />} />
            <Route path="/debits/station" element={<Debits />} />
            <Route path="/apports" element={<Apports />} />
            <Route path="/apports/barrage" element={<Apports />} />
            <Route path="/volume" element={<Volume />} />
            <Route path="/volume/barrage" element={<Volume />} />
            <Route path="/recap-barrage" element={<RecapBarrage />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/barrages" element={<Dams />} />
            <Route path="/import" element={<Import />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/data-scan" element={<DataScan />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/environment" element={<Environment />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
