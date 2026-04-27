import React, { useState } from 'react';
import '../../styles/DeletionRequestModal.css';

export default function ArchiveRequestModal({ projet, requestType = 'archivage', onClose, onSubmit }) {
    const [raison, setRaison] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isRestore = requestType === 'restauration';
    const title = isRestore ? 'Demande de restauration' : 'Demande d\'archivage';
    const actionLabel = isRestore ? 'restauration' : 'archivage';

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
        }
    };

    return (
        <div className="deletion-modal-overlay" onClick={handleOverlayClick}>
            <div className="deletion-modal">
                <div className="deletion-modal-header">
                    <h2>{isRestore ? '♻️' : '🗃️'} {title}</h2>
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
                        <span className="warning-icon">ℹ️</span>
                        <div className="warning-content">
                            <strong>Information</strong>
                            <p>Vous êtes sur le point de demander la {actionLabel} du projet :</p>
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
                            <label htmlFor="archive-raison">Motif (optionnel)</label>
                            <textarea
                                id="archive-raison"
                                value={raison}
                                onChange={(e) => setRaison(e.target.value)}
                                placeholder="Vous pouvez préciser le motif de votre demande..."
                                rows={5}
                                disabled={isSubmitting}
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
                                Le motif est facultatif.
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
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Envoi en cours...
                                    </>
                                ) : (
                                    'Envoyer la demande'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
