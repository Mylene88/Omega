import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm/LoginForm';
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
      <div style={{ minHeight: '100vh', backgroundColor: '#000091', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '48px', width: '48px', border: '4px solid white', borderTopColor: 'transparent', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'white', fontWeight: '500' }}>Vérification de votre session...</p>
        </div>
      </div>
    );
  }

  const handleAdminAccess = () => {
    navigate('/admin/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left Panel - Blue with Logo and Info */}
      <div style={{
        width: '50%',
        backgroundColor: '#000091',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 48px',
        color: 'white'
      }}>
        {/* French Republic Logo */}
        {/*<div style={{ marginBottom: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F2af24fd0e4044d3bbd5b2f47c5e24db5%2Fe9318300183944c6b32768fd287337b8?format=webp&width=400&height=300"
            alt="République Française"
            style={{
              width: '220px',
              height: 'auto',
              marginBottom: '16px',
              objectFit: 'contain'
            }}
          />
        </div>*/}

        {/* Title and Subtitle */}
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '24px',
          lineHeight: '1.2'
        }}>
          Portail de gestion de projets
        </h1>
        <div style={{ textAlign: 'center', color: '#E0E7FF' }}>
          <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>DDT 28 - Direction Départementale des Térritoires d'Eure-et-Loir </p>
          {/*<p style={{ fontSize: '18px', fontWeight: '600' }}>des Territoires</p>*/}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        width: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        backgroundColor: 'white'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <LoginForm />

        </div>
      </div>
    </div>
  );
};

export default Login;
