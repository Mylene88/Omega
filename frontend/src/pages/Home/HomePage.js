// Version simplifiée avec bouton direct
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleCreateProject = () => {
    navigate('/projets/create');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('temp_token');
    localStorage.removeItem('temp_user');
    navigate('/login', { replace: true });
  };

   const handleViewProjects = () => {
    navigate('/projets/carte');
  };

  const handleAdminAccess = () => {
    // TODO: Vérifier que l'utilisateur est admin
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 relative">
      {/* Bouton Admin en haut à gauche */}
      <button
        onClick={handleAdminAccess}
        className="absolute top-6 left-6 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 flex items-center gap-2"
        title="Administration"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Admin
      </button>

      {/* Bouton de déconnexion en haut à droite */}
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 flex items-center gap-2"
        title="Se déconnecter"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Déconnexion
      </button>

      {/* Reste du contenu identique */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-8">Tableau de bord</h1>

        {user && (
          <div className="mb-8 p-4 bg-indigo-50 rounded-2xl">
            <p className="text-indigo-700 font-medium">
              Bienvenue, {user.prenom || user.username} !
            </p>
          </div>
        )}

        <div className="space-y-6">
          <Button
            onClick={handleCreateProject}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-105 shadow-lg"
          >
            ➕ Créer un nouveau projet
          </Button>
          <Button
              onClick={handleViewProjects}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-105 shadow-lg"
            >
              📋 Afficher tous les projets
            </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
