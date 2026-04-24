import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const handleAdminAccess = () => {
    navigate('/admin');
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

  const isAdmin = Boolean(
    user?.role?.libelle &&
    ['admin', 'administrateur'].includes(user.role.libelle.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left: Logo and Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* French Republic Logo */}
          {/*<img 
            src="https://cdn.builder.io/api/v1/image/assets%2F2af24fd0e4044d3bbd5b2f47c5e24db5%2Fe9318300183944c6b32768fd287337b8?format=webp&width=200&height=150"
            alt="République Française"
            style={{
              width: '60px',
              height: 'auto',
              objectFit: 'contain'
            }}
          />*/}
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            DDT 28 - Eure-et-Loir
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <button
              onClick={handleAdminAccess}
              style={{
                backgroundColor: '#ffffff',
                color: '#000091',
                border: '1px solid #000091',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#000091';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#000091';
              }}
            >
              Administration
              <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 01.894.553l1.618 3.282 3.626.527a1 1 0 01.554 1.705l-2.623 2.556.62 3.613a1 1 0 01-1.451 1.054L10 13.889l-3.238 1.701a1 1 0 01-1.451-1.054l.62-3.613-2.623-2.556a1 1 0 01.554-1.705l3.626-.527L9.106 2.553A1 1 0 0110 2z" />
              </svg>
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#000091',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#000070'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#000091'}
          >
            Déconnexion
            <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '48px 32px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Page Title */}
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#000091',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            Tableau de bord
          </h1>

          {/* Welcome Message */}
          <p style={{
            fontSize: '16px',
            color: '#374151',
            marginBottom: '48px',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            Bienvenue, {user?.prenom || user?.username || 'Utilisateur'} !
          </p>

          {/* Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {/* Card 1: Create Project */}
            <button
              onClick={handleCreateProject}
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #d1d5db',
                borderRadius: '12px',
                padding: '40px 32px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                transition: 'all 0.3s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#000091';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 145, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '48px',
                color: '#000091'
              }}>
                +
              </div>
              <span style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#000091'
              }}>
                Créer un nouveau projet
              </span>
            </button>

            {/* Card 2: View Projects */}
            <button
              onClick={handleViewProjects}
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #d1d5db',
                borderRadius: '12px',
                padding: '40px 32px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                transition: 'all 0.3s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#000091';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 145, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '48px',
                color: '#000091'
              }}>
                📋
              </div>
              <span style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#000091'
              }}>
                Afficher tous les projets
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
