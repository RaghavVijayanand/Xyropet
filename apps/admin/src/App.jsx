import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './lib/auth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings/index';
import BookingDetail from './pages/Bookings/Detail';
import Groomers from './pages/Groomers/index';
import Areas from './pages/Areas/index';
import Pets from './pages/Pets/index';
import Reminders from './pages/Reminders';

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/:id" element={<BookingDetail />} />
        <Route path="groomers" element={<Groomers />} />
        <Route path="areas" element={<Areas />} />
        <Route path="pets" element={<Pets />} />
        <Route path="reminders" element={<Reminders />} />
      </Route>
    </Routes>
  );
}
