//frontend/src/components/common/Button/LogoutButton.js

import React from 'react'
import { useNavigate } from 'react-router-dom'

const LogoutButton = ({ className = "", variant = "primary"}) => {
    const navigate = useNavigate()

    const handleLogout = () => {
        //supprimer les données de session
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('temp_token')
        localStorage.removeItem('temp_user')

    navigate('/login', { replace: true})
    }

  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2";
  
  const variants = {
    primary: "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300",
    minimal: "text-red-600 hover:text-red-700 hover:bg-red-50"
  };

  return (
    <button
      onClick={handleLogout}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      title="Se déconnecter"
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Déconnexion
    </button>
  );
};

export default LogoutButton;