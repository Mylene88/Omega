//frontend/src/pages/auth/ChangedPasswordPage.js
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../config/apiConfig';

const ChangedPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [useGenerated, setUseGenerated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const token = location.state?.token || localStorage.getItem('temp_token');
  const user = location.state?.user || JSON.parse(localStorage.getItem('temp_user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Optionnel : générer un mot de passe suggéré
    generateSuggestedPassword();
  }, [token, navigate]);

  const generateSuggestedPassword = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'GET'
      });
      
      const data = await response.json();
      if (data.success) {
        setSuggestedPassword(data.data.suggested_password);
      }
    } catch (error) {
      console.error('Erreur génération mot de passe:', error);
    }
  };

  const handleUseGenerated = () => {
    setUseGenerated(true);
    setNewPassword(suggestedPassword);
    setConfirmPassword(suggestedPassword);
    setShowPassword(true);
  };

  const handleManualPassword = () => {
    setUseGenerated(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const validatePassword = (password) => {
    const rules = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    return Object.values(rules).every(Boolean);
  };

  const getPasswordStrength = (password) => {
    const rules = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    return rules;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!useGenerated && newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!validatePassword(newPassword)) {
      setError('Le mot de passe ne respecte pas les critères de sécurité');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword: useGenerated ? suggestedPassword : newPassword,
          useGeneratedPassword: false  // Toujours false car on envoie le mot de passe
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors du changement de mot de passe');
        return;
      }

      // Nettoyer le stockage temporaire
      localStorage.removeItem('temp_token');
      localStorage.removeItem('temp_user');
      
      // Stocker les nouvelles données
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      setSuccess('Mot de passe changé avec succès !');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      setError('Impossible de changer le mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Changement de mot de passe requis
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Bonjour {user.nom_complet || user.username}, vous devez changer votre mot de passe provisoire pour sécuriser votre compte
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Première connexion</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Pour votre sécurité, vous devez remplacer votre mot de passe provisoire par un mot de passe personnel.
                </p>
              </div>
            </div>
          </div>

          {/* Options de mot de passe */}
          <div className="mb-6">
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={handleManualPassword}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  !useGenerated 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={!useGenerated}
                    onChange={handleManualPassword}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Créer mon propre mot de passe</div>
                    <div className="text-sm text-gray-500">
                      Choisir un mot de passe personnalisé (recommandé)
                    </div>
                  </div>
                </div>
              </button>

              {suggestedPassword && (
                <button
                  type="button"
                  onClick={handleUseGenerated}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    useGenerated 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      checked={useGenerated}
                      onChange={handleUseGenerated}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Utiliser un mot de passe généré</div>
                      <div className="text-sm text-gray-500">
                        Mot de passe sécurisé généré automatiquement
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {useGenerated && suggestedPassword && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-green-800 mb-2">
                  Mot de passe généré :
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={suggestedPassword}
                    readOnly
                    className="flex-1 px-3 py-2 border border-green-300 rounded-md bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(suggestedPassword)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="Copier"
                  >
                    📋
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  ⚠️ Veuillez noter ce mot de passe dans un endroit sûr !
                </p>
              </div>
            )}

            {!useGenerated && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Entrez votre nouveau mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-600"
                    >
                      {showPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirmez votre nouveau mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-600"
                    >
                      {showConfirmPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                {/* Indicateur de force du mot de passe */}
                {newPassword && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Critères de sécurité :
                    </p>
                    <ul className="text-xs space-y-1">
                      <li className={passwordStrength.minLength ? 'text-green-600' : 'text-red-500'}>
                        {passwordStrength.minLength ? '✅' : '❌'} Au moins 8 caractères
                      </li>
                      <li className={passwordStrength.hasUppercase ? 'text-green-600' : 'text-red-500'}>
                        {passwordStrength.hasUppercase ? '✅' : '❌'} Une majuscule
                      </li>
                      <li className={passwordStrength.hasLowercase ? 'text-green-600' : 'text-red-500'}>
                        {passwordStrength.hasLowercase ? '✅' : '❌'} Une minuscule
                      </li>
                      <li className={passwordStrength.hasNumber ? 'text-green-600' : 'text-red-500'}>
                        {passwordStrength.hasNumber ? '✅' : '❌'} Un chiffre
                      </li>
                      <li className={passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-red-500'}>
                        {passwordStrength.hasSpecialChar ? '✅' : '❌'} Un caractère spécial (!@#$%^&*(),.?":{}|&lt;&gt;)
                      </li>
                    </ul>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!useGenerated && (!newPassword || !confirmPassword))}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Changement en cours...
                </>
              ) : (
                'Changer le mot de passe'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangedPasswordPage;
