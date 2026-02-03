// frontend/src/components/common/UserMenu.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer les informations utilisateur
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fermer le menu si on clique ailleurs
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('temp_token');
    localStorage.removeItem('temp_user');
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Bouton utilisateur */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-shadow border border-gray-200"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold">
            {user.prenom ? user.prenom[0].toUpperCase() : user.username[0].toUpperCase()}
          </span>
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">
            {user.nomcomplet || user.username}
          </p>
          <p className="text-xs text-gray-500">
            {user.role?.libelle || 'Utilisateur'}
          </p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          {/* Informations utilisateur */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-medium text-gray-900">{user.nomcomplet || user.username}</p>
            <p className="text-sm text-gray-500">{user.username}</p>
            <p className="text-xs text-blue-600 font-medium">{user.role?.libelle}</p>
          </div>

          {/* Options du menu */}
          <div className="py-2">
            <button 
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              onClick={() => {
                setIsOpen(false);
                // Ajouter navigation vers profil si nécessaire
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mon Profil
            </button>

            <button 
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              onClick={() => {
                setIsOpen(false);
                // Ajouter navigation vers paramètres si nécessaire
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </button>

            <hr className="my-2 border-gray-100" />

            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
