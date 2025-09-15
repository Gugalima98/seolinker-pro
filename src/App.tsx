import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClientLayout from "@/components/layouts/ClientLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sites from "./pages/Sites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Client Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
            </Route>
            
            <Route
              path="/sites"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Sites />} />
            </Route>
            
            <Route
              path="/backlinks"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-8 text-center"><h1 className="text-2xl">Backlinks em desenvolvimento...</h1></div>} />
            </Route>
            
            <Route
              path="/ranking"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-8 text-center"><h1 className="text-2xl">Ranking em desenvolvimento...</h1></div>} />
            </Route>
            
            <Route
              path="/club"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-8 text-center"><h1 className="text-2xl">Club em desenvolvimento...</h1></div>} />
            </Route>
            
            <Route
              path="/affiliate"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-8 text-center"><h1 className="text-2xl">Afiliados em desenvolvimento...</h1></div>} />
            </Route>
            
            <Route
              path="/support"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-8 text-center"><h1 className="text-2xl">Suporte em desenvolvimento...</h1></div>} />
            </Route>
            
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div className="p-8 text-center"><h1 className="text-2xl">Configurações em desenvolvimento...</h1></div>} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
