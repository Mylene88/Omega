// frontend/src/components/auth/LoginForm/LoginForm.js

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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Contenu principal centré */}
            <main className="flex flex-1 flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-lg w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-12 border border-white/20">

                    {/* En-tête */}
                    <div className="text-center mb-10">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                            <span className="text-3xl text-white font-bold">Ω</span>
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                            Connexion
                        </h1>
                        <p className="text-gray-500 font-medium">Accédez à votre espace sécurisé</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Groupe Username */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                            <label htmlFor="username" className="block text-base font-bold text-blue-700 mb-4">
                                👤 Nom d'utilisateur
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={formData.username}
                                onChange={handleInputChange}
                                disabled={loading}
                                className="w-full px-6 py-4 bg-white border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-400 focus:border-blue-500 transition-all duration-300 text-lg placeholder-gray-400 shadow-inner"
                                placeholder="Saisissez votre identifiant"
                            />
                        </div>

                        {/* Groupe Password avec label à gauche */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
                            <div className="flex items-center gap-30">
                                <label htmlFor="password" className="text-base font-bold text-indigo-700 whitespace-nowrap">
                                    🔒 Mot de passe
                                </label>
                                <div className="relative flex-1">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        className="w-full px-6 py-4 bg-white border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-400 focus:border-indigo-500 transition-all duration-300 text-lg placeholder-gray-400 shadow-inner pr-24"
                                        placeholder="Saisissez votre mot de passe"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 px-6 ml-3 flex items-center text-gray-500 hover:text-indigo-600 transition-colors duration-200 text-xl"
                                        disabled={loading}
                                        aria-label={showPassword ? 'Cacher mot de passe' : 'Afficher mot de passe'}
                                    >
                                        {showPassword ? '👁️' : '🙈'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Message d'erreur avec style amélioré */}
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                                <div className="flex">
                                    <span className="text-red-400 mr-3 text-xl">⚠️</span>
                                    <ErrorMessage message={error} className="text-red-700 font-medium" />
                                </div>
                            </div>
                        )}

                        {/* Bouton de connexion amélioré */}
                        <Button
                            type="submit"
                            disabled={loading || !formData.username.trim() || !formData.password.trim()}
                            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-5 px-8 rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
                        >
                            {loading ? (
                                <>
                                    <LoadingSpinner className="h-6 w-6 text-white mr-3" />
                                    <span className="text-lg">Connexion en cours...</span>
                                </>
                            ) : (
                                <span className="text-lg">➤ Se connecter</span>
                            )}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default LoginForm;
