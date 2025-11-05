import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import ChangedPasswordPage from './pages/Auth/ChangedPasswordPage';
import VisualisationPage from '../src/vizualisation/pages/VisualisationPage'
import FormulairePage from '../src/pages/FormulairePage';
import ListeProjetPage from "./vizualisation/pages/ListeProjetPage";
import HomePage from './pages/Home/HomePage';
import AdminPage from './pages/Admin/AdminPage';

import './App.css';

function App() {
  return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangedPasswordPage />} />
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/projets/create" element={<FormulairePage />} />
            <Route path = "/projets/edit/:id" element={<FormulairePage />} />
            <Route path="/projets/carte" element={<VisualisationPage />} />
            <Route path="/projets/liste" element={<ListeProjetPage />} />
            <Route path="/FormulairePage" element={<FormulairePage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<div style={{ padding: 24 }}>Page non trouvée</div>} />
          </Routes>
        </div>
      </Router>
  );
}

export default App;
