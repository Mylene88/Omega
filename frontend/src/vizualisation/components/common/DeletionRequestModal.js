// frontend/src/visualisation/components/common/DeletionRequestModal.js
import React, { useState } from 'react';
import '../../styles/DeletionRequestModal.css';

export default function DeletionRequestModal({ projet, onClose, onSubmit }) {
    const [raison, setRaison] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!raison.trim()) {
            setError('Veuillez indiquer la raison de la suppression');
            return;
        }

        if (raison.trim().length < 10) {
            setError('La raison doit contenir au moins 10 caractères');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit(raison.trim());
            onClose();
        } catch (err) {
            setError(err.message || 'Erreur lors de la soumission de la demande');
            setIsSubmitting(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="deletion-modal-overlay" onClick={handleOverlayClick}>
            <div className="deletion-modal">
                <div className="deletion-modal-header">
                    <h2>🗑️ Demande de suppression</h2>
                    <button
                        className="deletion-modal-close"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <div className="deletion-modal-body">
                    <div className="deletion-warning">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-content">
                            <strong>Attention</strong>
                            <p>Vous êtes sur le point de demander la suppression du projet :</p>
                        </div>
                    </div>

                    <div className="projet-info">
                        <div className="projet-info-item">
                            <span className="label">ID :</span>
                            <span className="value">#{projet.id_projet}</span>
                        </div>
                        <div className="projet-info-item">
                            <span className="label">Nom :</span>
                            <span className="value">{projet.nom_projet || 'Sans nom'}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="raison">
                                Raison de la suppression <span className="required">*</span>
                            </label>
                            <textarea
                                id="raison"
                                value={raison}
                                onChange={(e) => setRaison(e.target.value)}
                                placeholder="Expliquez pourquoi ce projet doit être supprimé (minimum 10 caractères)..."
                                rows={5}
                                disabled={isSubmitting}
                                required
                            />
                            <div className="char-count">
                                {raison.length} caractères
                            </div>
                        </div>

                        {error && (
                            <div className="deletion-error">
                                <span className="error-icon">❌</span>
                                {error}
                            </div>
                        )}

                        <div className="deletion-info-box">
                            <span className="info-icon">ℹ️</span>
                            <p>
                                Votre demande sera envoyée aux administrateurs pour validation.
                                Vous serez notifié de leur décision.
                            </p>
                        </div>

                        <div className="deletion-modal-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="btn-submit-deletion"
                                disabled={isSubmitting || raison.trim().length < 10}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Envoi en cours...
                                    </>
                                ) : (
                                    'Soumettre la demande'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
