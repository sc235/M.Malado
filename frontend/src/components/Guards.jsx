import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../lib/api';

/** Réservé aux clientes connectées. */
export function RequireCustomer({ children }) {
  const { customer, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loader"><div className="loader-spinner" /></div>;
  if (!customer) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  return children;
}

/** Réservé à l'administration. Le jeton admin est distinct du jeton cliente. */
export function RequireAdmin({ children }) {
  const location = useLocation();
  if (!getToken('admin')) {
    return <Navigate to="/secret-mojo-gate" state={{ from: location.pathname }} replace />;
  }
  return children;
}
