// frontend/src/components/admin/DeletionRequestsTab.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeletionRequestsTab.css';
import UserDisplay from '../common/UserDisplay';

const DeletionRequestsTab = ({
  apiCall,
  success,
  error: errorToast,
  warning,
  mode = 'deletion'
}) => {
  const isArchiveMode = mode === 'archive';
  const endpoint = isArchiveMode ? '/archive-requests' : '/deletion-requests';
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    statut: 'en attente',
    requestType: ''
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    request: null,
    action: null
  });
  const [reviewComment, setReviewComment] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        is_admin: 'true',
        ...(filters.statut && { statut: filters.statut }),
        ...(isArchiveMode && filters.requestType && { request_type: filters.requestType })
      });

      const data = await apiCall(`${endpoint}?${params}`);
      setRequests(data.data || []);
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, endpoint, errorToast, filters.requestType, filters.statut, isArchiveMode]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openConfirmModal = (request, action) => {
    setConfirmModal({
      isOpen: true,
      request,
      action
    });
    setReviewComment('');
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      request: null,
      action: null
    });
    setReviewComment('');
  };

  const handleReviewRequest = async () => {
    const { request, action } = confirmModal;

    if (isArchiveMode && action === 'reject' && !reviewComment.trim()) {
      warning('Le motif de rejet est obligatoire.', 'Motif requis');
      return;
    }

    try {
      await apiCall(`${endpoint}/${request.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          review_comment: reviewComment || null
        })
      });

      if (isArchiveMode) {
        if (action === 'approve') {
          if (request.request_type === 'restauration') {
            success(
              `Le projet #${request.id_projet} "${request.projet_nom}" a ete restaure avec succes`,
              'Demande approuvee'
            );
          } else {
            success(
              `Le projet #${request.id_projet} "${request.projet_nom}" a ete archive avec succes`,
              'Demande approuvee'
            );
          }
        } else {
          success('La demande a ete rejetee', 'Demande rejetee');
        }
      } else if (action === 'approve') {
        success(
          `Le projet #${request.id_projet} "${request.projet_nom}" a ete supprime avec succes`,
          'Demande approuvee'
        );
      } else {
        success('La demande de suppression a ete rejetee', 'Demande rejetee');
      }

      closeConfirmModal();
      fetchRequests();
    } catch (err) {
      errorToast(err.message, 'Erreur');
    }
  };

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

  const getStatusBadge = (statut) => {
    const badges = {
      'en attente': { label: 'En attente', className: 'badge-pending' },
      accepter: { label: 'Approuvee', className: 'badge-approved' },
      refuser: { label: 'Rejetee', className: 'badge-rejected' }
    };
    const badge = badges[statut] || { label: statut, className: '' };
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  const getRequestTypeLabel = (requestType) => {
    if (!isArchiveMode) return 'Suppression';
    return requestType === 'restauration' ? 'Restauration' : 'Archivage';
  };

  const getApproveActionLabel = (request) => {
    if (!isArchiveMode) return '✅ Approuver et supprimer';
    return request.request_type === 'restauration' ? '✅ Approuver la restauration' : '✅ Approuver l\'archivage';
  };

  const getTabTitle = () => (isArchiveMode ? 'd\'archivage' : 'de suppression');

  const goToProjectDetails = useCallback((request) => {
    if (!request?.id_projet) {
      return;
    }

    const params = new URLSearchParams({
      projectId: request.id_projet
    });

    if (request.projet_is_archived) {
      params.set('archives', '1');
    }

    navigate(`/projets/liste?${params.toString()}`);
  }, [navigate]);

  return (
    <div className="deletion-requests-tab">
      <div className="deletion-filters">
        <div className="filter-group">
          <label>Statut:</label>
          <select
            value={filters.statut}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          >
            <option value="">Tous</option>
            <option value="en attente">En attente</option>
            <option value="accepter">Approuvees</option>
            <option value="refuser">Rejetees</option>
          </select>
        </div>

        {isArchiveMode && (
          <div className="filter-group">
            <label>Type:</label>
            <select
              value={filters.requestType}
              onChange={(e) => setFilters({ ...filters, requestType: e.target.value })}
            >
              <option value="">Tous</option>
              <option value="archivage">Archivage</option>
              <option value="restauration">Restauration</option>
            </select>
          </div>
        )}

        <button onClick={fetchRequests} className="btn-refresh">
          🔄 Actualiser
        </button>
      </div>

      <div className="deletion-stats">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-value">{requests.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">En attente:</span>
          <span className="stat-value stat-pending">
            {requests.filter((r) => r.statut === 'en attente').length}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Chargement des demandes...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>Aucune demande {getTabTitle()} trouvee</p>
        </div>
      ) : (
        <div className="deletion-requests-list">
          {requests.map((request) => (
            <div key={request.id} className="deletion-request-card">
              <div className="request-header">
                <div className="request-info">
                  <h3>
                    <button
                      type="button"
                      className="project-link-button"
                      onClick={() => goToProjectDetails(request)}
                    >
                      Projet #{request.id_projet}: {request.projet_nom}
                    </button>
                  </h3>
                  {getStatusBadge(request.statut)}
                </div>
                <div className="request-id">Demande #{request.id}</div>
              </div>

              <div className="request-body">
                <div className="request-section">
                  <strong>Demandeur:</strong>
                  <UserDisplay
                    name={request.requested_by?.nom_complet}
                    username={request.requested_by?.username}
                    isActive={request.requested_by?.is_active}
                  />
                </div>

                <div className="request-section">
                  <strong>Date de demande:</strong>
                  <span>{formatDate(request.created_at)}</span>
                </div>

                {isArchiveMode && (
                  <div className="request-section">
                    <strong>Type de demande:</strong>
                    <span>{getRequestTypeLabel(request.request_type)}</span>
                  </div>
                )}

                {(request.projet_statut || request.projet_service_referent) && (
                  <div className="request-section full-width">
                    <strong>Resume projet:</strong>
                    <p className="project-description">
                      Statut: {request.projet_statut || 'N/A'}
                      {' | '}
                      Service referent: {request.projet_service_referent || 'N/A'}
                    </p>
                  </div>
                )}

                {request.raison && (
                  <div className="request-section full-width">
                    <strong>Motif utilisateur:</strong>
                    <p className="request-raison">{request.raison}</p>
                  </div>
                )}

                {request.projet_description && (
                  <div className="request-section full-width">
                    <strong>Description du projet:</strong>
                    <p className="project-description">{request.projet_description}</p>
                  </div>
                )}

                {request.statut !== 'en attente' && (
                  <div className="review-info">
                    <div className="review-section">
                      <strong>Revise par:</strong>
                      <UserDisplay
                        name={request.reviewed_by?.nom_complet}
                        username={request.reviewed_by?.username}
                        isActive={request.reviewed_by?.is_active}
                      />
                    </div>
                    <div className="review-section">
                      <strong>Date de revision:</strong>
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

              {request.statut === 'en attente' && (
                <div className="request-actions">
                  <button className="btn-reject" onClick={() => openConfirmModal(request, 'reject')}>
                    ❌ Rejeter
                  </button>
                  <button className="btn-approve" onClick={() => openConfirmModal(request, 'approve')}>
                    {getApproveActionLabel(request)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="confirmation-modal-overlay" onClick={closeConfirmModal}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {confirmModal.action === 'approve'
                  ? isArchiveMode
                    ? '⚠️ Confirmer la decision'
                    : '⚠️ Confirmer la suppression'
                  : '❌ Confirmer le rejet'}
              </h2>
              <button className="modal-close" onClick={closeConfirmModal}>×</button>
            </div>

            <div className="modal-body">
              {confirmModal.action === 'approve' ? (
                isArchiveMode ? (
                  <>
                    <div className="warning-box">
                      <p>
                        <strong>Projet #{confirmModal.request.id_projet}:</strong> {confirmModal.request.projet_nom}
                      </p>
                      <p>
                        Action: {confirmModal.request.request_type === 'restauration' ? 'restauration du projet' : 'archivage du projet'}
                      </p>
                    </div>
                    {confirmModal.request.raison && (
                      <div className="request-details">
                        <p><strong>Motif utilisateur:</strong></p>
                        <p className="raison-text">{confirmModal.request.raison}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="warning-box">
                      <p><strong>ATTENTION:</strong> Cette action va supprimer definitivement le projet:</p>
                      <ul>
                        <li>Projet #{confirmModal.request.id_projet}: <strong>{confirmModal.request.projet_nom}</strong></li>
                        <li>Toutes les donnees associees seront supprimees</li>
                        <li>Cette action est <strong>IRREVERSIBLE</strong></li>
                      </ul>
                    </div>
                    <div className="request-details">
                      <p><strong>Raison de la demande:</strong></p>
                      <p className="raison-text">{confirmModal.request.raison}</p>
                    </div>
                  </>
                )
              ) : (
                <>
                  <p>
                    Vous allez rejeter la demande {isArchiveMode ? '' : 'de suppression '}du projet:
                  </p>
                  <p className="project-name">
                    #{confirmModal.request.id_projet}: {confirmModal.request.projet_nom}
                  </p>
                  <p className="info-text">
                    {isArchiveMode
                      ? 'Le projet conservera son etat actuel.'
                      : 'Le projet ne sera pas supprime et l\'utilisateur sera notifie du rejet.'}
                  </p>
                </>
              )}

              <div className="form-group">
                <label htmlFor="review-comment">
                  Commentaire
                  {confirmModal.action === 'reject'
                    ? isArchiveMode
                      ? ' (obligatoire)'
                      : ' (optionnel)'
                    : ' (optionnel)'}
                  :
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    confirmModal.action === 'approve'
                      ? isArchiveMode
                        ? 'Commentaire optionnel...'
                        : 'Expliquez pourquoi cette suppression est justifiee...'
                      : isArchiveMode
                        ? 'Expliquez pourquoi cette demande est rejetee...'
                        : 'Expliquez pourquoi cette demande est rejetee...'
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
                disabled={isArchiveMode && confirmModal.action === 'reject' && !reviewComment.trim()}
              >
                {confirmModal.action === 'approve'
                  ? isArchiveMode
                    ? '✅ Confirmer la decision'
                    : '✅ Confirmer la suppression'
                  : '❌ Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletionRequestsTab;
