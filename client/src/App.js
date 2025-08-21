import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import DashboardHome from './pages/DashboardHome';
import AddRequestPage from './pages/AddRequestPage';
import AllRequestsPage from './pages/AllRequestsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import BloodDonationPage from './pages/BloodDonationPage';
import ElderlySupport from './pages/ElderlySupport';
import AdminDashboard from './pages/AdminDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import Navbar from './components/layout/Navbar';
import DashboardLayout from './components/layout/DashboardLayout';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ChatBot from './components/chatbot/ChatBot';

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <>
            <Navbar />
            <HomePage />
            <Footer />
          </>
        } />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Dashboard Routes with Layout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="add-request" element={<AddRequestPage />} />
          <Route path="requests" element={<AllRequestsPage />} />
          <Route path="chat" element={<div className="p-8 text-center text-gray-500">Chat AI coming soon...</div>} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Legacy Routes (with old navbar/footer) */}
        <Route path="/complaints" element={
          <>
            <Navbar />
            <ProtectedRoute>
              <ComplaintsPage />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        <Route path="/blood-donation" element={
          <>
            <Navbar />
            <ProtectedRoute>
              <BloodDonationPage />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        <Route path="/elderly-support" element={
          <>
            <Navbar />
            <ProtectedRoute>
              <ElderlySupport />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        {/* Role-specific Routes */}
        <Route path="/admin" element={
          <>
            <Navbar />
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        <Route path="/volunteer" element={
          <>
            <Navbar />
            <ProtectedRoute requiredRole="volunteer">
              <VolunteerDashboard />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <ChatBot />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#22c55e',
              secondary: '#black',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ef4444',
              secondary: '#black',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
