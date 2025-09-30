import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClientLayout from "@/components/layouts/ClientLayout";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback"; // Nova importação
import Pricing from "./pages/Pricing"; // Nova importação para a página de preços
import ReferralHandler from "@/components/ReferralHandler"; // Importa o novo componente
import Dashboard from "./pages/Dashboard";
import Sites from "./pages/Sites";
import Backlinks from "./pages/Backlinks";
import SiteDetailPage from "./pages/SiteDetail"; // New import

import Club from "./pages/Club";
import Affiliate from "./pages/Affiliate";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminNetworkSites from "./pages/AdminNetworkSites";
import AdminCourses from "./pages/AdminCourses";
import AdminClientSitesView from "./pages/AdminClientSitesView";
import AdminLogs from "./pages/AdminLogs";
import AdminApis from "./pages/AdminApis";
import AdminReports from "./pages/AdminReports";
import AdminPrompts from "./pages/AdminPrompts";
import AdminTickets from "./pages/AdminTickets"; // New import
import AdminAffiliates from "./pages/AdminAffiliates"; // New import
import AdminBulkImport from "./pages/AdminBulkImport"; // New import
import UpdatePassword from "./pages/UpdatePassword"; // New import

import AdminLayout from "@/components/layouts/AdminLayout";

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
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/ref/:affiliateCode" element={<ReferralHandler />} />

            
            {/* Protected Routes */}
            <Route element={<ClientLayout />}>
              <Route
                path="/dashboard"
                element={<ProtectedRoute requiredRole="client"><Dashboard /></ProtectedRoute>}
              />
              <Route
                path="/sites"
                element={<ProtectedRoute requiredRole="client"><Sites /></ProtectedRoute>}
              />
              <Route
                path="/sites/:siteId"
                element={<ProtectedRoute requiredRole="client"><SiteDetailPage /></ProtectedRoute>}
              />
              <Route
                path="/backlinks"
                element={<ProtectedRoute requiredRole="client"><Backlinks /></ProtectedRoute>}
              />

              <Route
                path="/club"
                element={<ProtectedRoute requiredRole="client"><Club /></ProtectedRoute>}
              />
              <Route
                path="/affiliate"
                element={<ProtectedRoute requiredRole="client"><Affiliate /></ProtectedRoute>}
              />
              <Route
                path="/support"
                element={<ProtectedRoute requiredRole="client"><Support /></ProtectedRoute>}
              />
              <Route
                path="/settings"
                element={<ProtectedRoute requiredRole="client"><Settings /></ProtectedRoute>}
              />
              <Route
                path="/pricing"
                element={<ProtectedRoute requiredRole="client"><Pricing /></ProtectedRoute>}
              />
            </Route>

            <Route element={<AdminLayout />}>
              <Route
                index
                element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>}
              />
              <Route
                path="/admin/dashboard"
                element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
              />
              <Route
                path="/admin/users"
                element={<ProtectedRoute requiredRole="admin"><AdminUserManagement /></ProtectedRoute>}
              />
              <Route
                path="/admin/network-sites"
                element={<ProtectedRoute requiredRole="admin"><AdminNetworkSites /></ProtectedRoute>}
              />
              <Route
                path="/admin/affiliates"
                element={<ProtectedRoute requiredRole="admin"><AdminAffiliates /></ProtectedRoute>}
              />
              <Route
                path="/admin/courses"
                element={<ProtectedRoute requiredRole="admin"><AdminCourses /></ProtectedRoute>}
              />
              <Route
                path="/admin/client-sites"
                element={<ProtectedRoute requiredRole="admin"><AdminClientSitesView /></ProtectedRoute>}
              />
              <Route
                path="/admin/logs"
                element={<ProtectedRoute requiredRole="admin"><AdminLogs /></ProtectedRoute>}
              />
              <Route
                path="/admin/apis"
                element={<ProtectedRoute requiredRole="admin"><AdminApis /></ProtectedRoute>}
              />
              <Route
                path="/admin/reports"
                element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>}
              />
              <Route
                path="/admin/prompts"
                element={<ProtectedRoute requiredRole="admin"><AdminPrompts /></ProtectedRoute>}
              />
              <Route
                path="/admin/bulk-import"
                element={<ProtectedRoute requiredRole="admin"><AdminBulkImport /></ProtectedRoute>}
              />
              <Route
                path="/admin/tickets"
                element={<ProtectedRoute requiredRole="admin"><AdminTickets /></ProtectedRoute>}
              />
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
