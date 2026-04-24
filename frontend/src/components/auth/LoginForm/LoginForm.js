import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, LoadingSpinner } from '../../common';
import ErrorMessage from "../../common/ErrorMessage/ErrorMessage";
import { API_BASE_URL } from '../../../config/apiConfig';

const LoginForm = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPasswordTooltip, setShowForgotPasswordTooltip] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.username.trim() || !formData.password.trim()) {
            setError('Veuillez remplir tous les champs.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username.trim(),
                    password: formData.password
                })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Erreur lors de la connexion.');
                return;
            }

            if (data.data?.user?.first_login) {
                localStorage.setItem('temp_token', data.data.token);
                localStorage.setItem('temp_user', JSON.stringify(data.data.user));
                navigate('/change-password', {
                    state: { token: data.data.token, username: data.data.user },
                });
            } else {
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            setError('Impossible de se connecter au serveur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ width: '100%' }}>
            {/* White Card Container */}
            <div style={{
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                padding: '32px'
            }}>
                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#000091',
                        marginBottom: '8px'
                    }}>
                        Connexion
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        Accédez à votre espace sécurisé
                    </p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                    {/* Username Field */}
                    <div>
                        <label htmlFor="username" style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '8px'
                        }}>
                            Nom d'utilisateur
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                color: '#9ca3af',
                                fontSize: '18px'
                            }}></span>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={formData.username}
                                onChange={handleInputChange}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    paddingRight: '16px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    border: '1px solid #000091',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: '#374151',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                placeholder="Saisissez votre identifiant"
                                onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)'}
                                onBlur={(e) => e.target.style.boxShadow = 'none'}
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <label htmlFor="password" style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#1f2937'
                            }}>
                                Mot de passe
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    fontWeight: '500',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                                disabled={loading}
                                onMouseEnter={(e) => e.target.style.color = '#374151'}
                                onMouseLeave={(e) => e.target.style.color = '#6b7280'}
                                aria-label={showPassword ? 'Cacher mot de passe' : 'Afficher mot de passe'}
                            >
                                {showPassword ? 'Masquer' : 'Afficher'}
                            </button>
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                color: '#9ca3af',
                                fontSize: '18px'
                            }}></span>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    paddingRight: '16px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: '#374151',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                placeholder="Saisissez votre mot de passe"
                                onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)'}
                                onBlur={(e) => e.target.style.boxShadow = 'none'}
                            />
                        </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div style={{ textAlign: 'center', position: 'relative' }}>
                        <button
                            type="button"
                            style={{
                                fontSize: '12px',
                                color: '#374151',
                                fontWeight: '500',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                position: 'relative'
                            }}
                            disabled={loading}
                            onMouseEnter={(e) => {
                                e.target.style.color = '#1f2937';
                                setShowForgotPasswordTooltip(true);
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.color = '#374151';
                                setShowForgotPasswordTooltip(false);
                            }}
                            onClick={() => setShowForgotPasswordTooltip(!showForgotPasswordTooltip)}
                        >
                            Mot de passe oublié?
                        </button>
                        
                        {/* Tooltip */}
                        {showForgotPasswordTooltip && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '8px',
                                backgroundColor: '#1f2937',
                                color: 'white',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                zIndex: 1000,
                                maxWidth: '280px',
                                whiteSpace: 'normal',
                                textAlign: 'center',
                                lineHeight: '1.5'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '8px solid transparent',
                                    borderRight: '8px solid transparent',
                                    borderBottom: '8px solid #1f2937'
                                }}></div>
                                📧 Contactez un administrateur.<br/>
                                Il vous fournira un nouveau mot de passe provisoire.
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            borderLeft: '4px solid #ef4444',
                            padding: '16px',
                            borderRadius: '4px'
                        }}>
                            <ErrorMessage message={error} style={{ color: '#b91c1c', fontSize: '14px' }} />
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={loading || !formData.username.trim() || !formData.password.trim()}
                        style={{
                            width: '100%',
                            backgroundColor: loading || !formData.username.trim() || !formData.password.trim() ? '#000091' : '#000091',
                            opacity: loading || !formData.username.trim() || !formData.password.trim() ? 0.6 : 1,
                            color: 'white',
                            fontWeight: '700',
                            paddingTop: '12px',
                            paddingBottom: '12px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading || !formData.username.trim() || !formData.password.trim() ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? (
                            <>
                                <LoadingSpinner style={{ width: '20px', height: '20px', color: 'white' }} />
                                <span>Connexion en cours...</span>
                            </>
                        ) : (
                            <span>Se connecter</span>
                        )}
                    </Button>
                </form>

                {/* First Login Info Box */}
                <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#000091',
                        marginBottom: '8px'
                    }}>
                        Première connexion ?
                    </h3>
                    <p style={{
                        fontSize: '12px',
                        color: '#374151',
                        lineHeight: '1.5',
                        margin: 0
                    }}>
                        Utilisez le mot de passe provisoire fourni. Vous serez invité à le modifier pour sécuriser votre compte.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
