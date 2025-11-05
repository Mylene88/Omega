// frontend/src/pages/Auth/Login.js

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm/LoginForm';
import AuthInfoBox from "../../components/common/Auth/AuthInfoBox";
import AuthHeader from "../../components/common/Auth/AuthHeader";
import '../../styles/globals.css';


const Login = () => {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
          const userData = JSON.parse(user);
          if (!userData.first_login) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }
        const tempToken = localStorage.getItem('temp_token');
        const tempUser = localStorage.getItem('temp_user');
        if (tempToken && tempUser) {
          navigate('/change-password', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Erreur lors de la vérification d\'authentification:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('temp_token');
        localStorage.removeItem('temp_user');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuthStatus();
  }, [navigate]);

  if (isCheckingAuth) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Vérification de votre session...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 mx-auto flex-grow flex flex-col justify-center">
          {/* En-tête */}
          <AuthHeader
              title={<span>Bienvenue sur <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">OMEGA</span></span>}
              subtitle="Connectez-vous pour accéder à votre espace projet"
          />

          {/* Formulaire */}
          <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
            <LoginForm />
          </div>

          {/* Info première connexion */}
          <AuthInfoBox variant="info" title="Première connexion ?">
            Utilisez le mot de passe provisoire fourni. Vous serez invité à le modifier pour sécuriser votre compte.
          </AuthInfoBox>
        </div>

        {/* Pied de page décalé en bas */}

      </div>
  );
};

export default Login;
