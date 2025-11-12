// frontend/src/components/admin/DeletionRequestsTab.js
import React, { useState, useEffect } from 'react';
import './DeletionRequestsTab.css';

const API_BASE_URL = 'http://localhost:3000/api';

const DeletionRequestsTab = ({ apiCall, success, error: errorToast, warning }) => {
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    statut: 'en attente', // Par défaut, montrer les demandes en attente
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    request: null,
    action: null
  });
  const [reviewComment, setReviewComment] = useState('');

  // Charger les demandes de suppression
  const fetchDeletionRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        is_admin: 'true',
        ...(filters.statut && { statut: filters.statut })
      });

      const data = await apiCall(`/deletion-requests?${params}`);
      setDeletionRequests(data.data || []);
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletionRequests();
  }, [filters.statut]);

  // Ouvrir le modal de confirmation
  const openConfirmModal = (request, action) => {
    setConfirmModal({
      isOpen: true,
      request,
      action
    });
    setReviewComment('');
  };

  // Fermer le modal
  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      request: null,
      action: null
    });
    setReviewComment('');
  };

  // Approuver ou rejeter une demande
  const handleReviewRequest = async () => {
    const { request, action } = confirmModal;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      await apiCall(`/deletion-requests/${request.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reviewed_by: user.id_user,
          review_comment: reviewComment || null
        })
      });

      if (action === 'approve') {
        success(
          `Le projet #${request.id_projet} "${request.projet_nom}" a été supprimé avec succès`,
          'Demande approuvée'
        );
      } else {
        success(
          `La demande de suppression a été rejetée`,
          'Demande rejetée'
        );
      }

      closeConfirmModal();
      fetchDeletionRequests();
    } catch (err) {
      errorToast(err.message, 'Erreur');
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Badge de statut
  const getStatusBadge = (statut) => {
    const badges = {
      'en attente': { label: 'En attente', className: 'badge-pending' },
      'accepter': { label: 'Approuvée', className: 'badge-approved' },
      'refuser': { label: 'Rejetée', className: 'badge-rejected' }
    };
    const badge = badges[statut] || { label: statut, className: '' };
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  return (
    <div className="deletion-requests-tab">
      {/* Filtres */}
      <div className="deletion-filters">
        <div className="filter-group">
          <label>Statut:</label>
          <select
            value={filters.statut}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          >
            <option value="">Tous</option>
            <option value="en attente">En attente</option>
            <option value="accepter">Approuvées</option>
            <option value="refuser">Rejetées</option>
          </select>
        </div>

        <button onClick={fetchDeletionRequests} className="btn-refresh">
          🔄 Actualiser
        </button>
      </div>

      {/* Stats rapides */}
      <div className="deletion-stats">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-value">{deletionRequests.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">En attente:</span>
          <span className="stat-value stat-pending">
            {deletionRequests.filter(r => r.statut === 'en attente').length}
          </span>
        </div>
      </div>

      {/* Liste des demandes */}
      {isLoading ? (
        <div className="loading-state">Chargement des demandes...</div>
      ) : deletionRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>Aucune demande de suppression trouvée</p>
        </div>
      ) : (
        <div className="deletion-requests-list">
          {deletionRequests.map((request) => (
            <div key={request.id} className="deletion-request-card">
              {/* Header */}
              <div className="request-header">
                <div className="request-info">
                  <h3>
                    Projet #{request.id_projet}: {request.projet_nom}
                  </h3>
                  {getStatusBadge(request.statut)}
                </div>
                <div className="request-id">Demande #{request.id}</div>
              </div>

              {/* Body */}
              <div className="request-body">
                <div className="request-section">
                  <strong>Demandé par:</strong>
                  <span>{request.requested_by?.nom_complet || request.requested_by?.username || 'N/A'}</span>
                </div>

                <div className="request-section">
                  <strong>Date de demande:</strong>
                  <span>{formatDate(request.created_at)}</span>
                </div>

                <div className="request-section full-width">
                  <strong>Raison:</strong>
                  <p className="request-raison">{request.raison}</p>
                </div>

                {request.projet_description && (
                  <div className="request-section full-width">
                    <strong>Description du projet:</strong>
                    <p className="project-description">{request.projet_description}</p>
                  </div>
                )}

                {/* Informations de révision */}
                {request.statut !== 'en attente' && (
                  <div className="review-info">
                    <div className="review-section">
                      <strong>Révisé par:</strong>
                      <span>{request.reviewed_by?.nom_complet || request.reviewed_by?.username || 'N/A'}</span>
                    </div>
                    <div className="review-section">
                      <strong>Date de révision:</strong>
                      <span>{formatDate(request.reviewed_at)}</span>
                    </div>
                    {request.review_comment && (
                      <div className="review-section full-width">
                        <strong>Commentaire:</strong>
                        <p>{request.review_comment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions (seulement pour les demandes en attente) */}
              {request.statut === 'en attente' && (
                <div className="request-actions">
                  <button
                    className="btn-reject"
                    onClick={() => openConfirmModal(request, 'reject')}
                  >
                    ❌ Rejeter
                  </button>
                  <button
                    className="btn-approve"
                    onClick={() => openConfirmModal(request, 'approve')}
                  >
                    ✅ Approuver et supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmation */}
      {confirmModal.isOpen && (
        <div className="confirmation-modal-overlay" onClick={closeConfirmModal}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {confirmModal.action === 'approve' ? '⚠️ Confirmer la suppression' : '❌ Confirmer le rejet'}
              </h2>
              <button className="modal-close" onClick={closeConfirmModal}>×</button>
            </div>

            <div className="modal-body">
              {confirmModal.action === 'approve' ? (
                <>
                  <div className="warning-box">
                    <p><strong>ATTENTION:</strong> Cette action va supprimer définitivement le projet:</p>
                    <ul>
                      <li>Projet #{confirmModal.request.id_projet}: <strong>{confirmModal.request.projet_nom}</strong></li>
                      <li>Toutes les données associées seront supprimées</li>
                      <li>Cette action est <strong>IRRÉVERSIBLE</strong></li>
                    </ul>
                  </div>
                  <div className="request-details">
                    <p><strong>Raison de la demande:</strong></p>
                    <p className="raison-text">{confirmModal.request.raison}</p>
                  </div>
                </>
              ) : (
                <>
                  <p>Vous allez rejeter la demande de suppression du projet:</p>
                  <p className="project-name">#{confirmModal.request.id_projet}: {confirmModal.request.projet_nom}</p>
                  <p className="info-text">Le projet ne sera pas supprimé et l'utilisateur sera notifié du rejet.</p>
                </>
              )}

              <div className="form-group">
                <label htmlFor="review-comment">
                  Commentaire {confirmModal.action === 'reject' ? '(optionnel)' : '(recommandé)'}:
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    confirmModal.action === 'approve'
                      ? "Expliquez pourquoi cette suppression est justifiée..."
                      : "Expliquez pourquoi cette demande est rejetée..."
                  }
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={closeConfirmModal}>
                Annuler
              </button>
              <button
                className={confirmModal.action === 'approve' ? 'btn-confirm-approve' : 'btn-confirm-reject'}
                onClick={handleReviewRequest}
              >
                {confirmModal.action === 'approve' ? '✅ Confirmer la suppression' : '❌ Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletionRequestsTab;
