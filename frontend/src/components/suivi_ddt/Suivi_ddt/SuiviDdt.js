// src/components/suivi_ddt/Suivi_ddt/SuiviDdt.js
import { useId, useMemo, useState, useEffect } from 'react';
import '../../common/Collapsible/collapsible.css';
import styles from '../../../styles/SuiviDDTSection.module.css';


export default function SuiviDdtSection({value = {}, onChange ,
  title = 'Suivi DDT',
  onAddSuivi,
  onDeleteSuivi,
  defaultOpen = true,
}) {
  const pid = useId();
  const idService = useId();
  const idContact = useId();
  const idDateCreation = useId();
  const idCreateur = useId();
  const idDateMaj = useId();
  const idSuiviDesc = useId();

  const [services, setServices] = useState([]);


  const [open, setOpen] = useState(!!defaultOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // 🔹 Fetch des services
    useEffect(() => {
        fetch('http://localhost:3000/api/service')
            .then((res) => res.json())
            .then((data) => setServices(data))
            .catch((err) => console.error('Erreur de fetch pour les services:', err));
    }, []);

  const v = useMemo(
    () => ({
      enjeuPrioritaire: !!value.enjeuPrioritaire,
      charteAccueil: !!value.charteAccueil,
      numeroDossier: value.numeroDossier ?? '',
      service_id: value.service_id || (services[0]?.id_service ?? ''),
      contactDDT: value.contactDDT ?? '',
      dateCreation: value.dateCreation ?? '',
      createur: value.createur ?? '',
      dateMaj: value.dateMaj ?? '',
      suiviDescription: value.suiviDescription ?? '',
      historique: Array.isArray(value.historique) ? value.historique : [],
    }),
    [value]
  );


  const setField = (field, val) => {
        // S'assurer que les ID sont bien des nombres
        const isIdField = ['statut_projet_id', 'service_id'].includes(field);
        const finalValue = isIdField ? parseInt(val, 10) : val;
        onChange?.({ ...value, [field]: finalValue });
  };

  const emit = (patch) => onChange?.({ ...v, ...patch });

  // Ajouter un suivi via l'API
  const addHistorique = async () => {
    if (!v.suiviDescription.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      if (onAddSuivi) {
        const success = await onAddSuivi(v.suiviDescription.trim());
        if (success) {
          emit({ suiviDescription: '' });
        }
      } else {
        const now = new Date();
        const item = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dateTime: now.toISOString(),
          author: v.createur,
          description: v.suiviDescription.trim(),
        };
        emit({
          historique: [item, ...v.historique],
          suiviDescription: '',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du suivi:', error);
      alert('Une erreur est survenue lors de l\'ajout du suivi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer un suivi
  const deleteHistorique = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce suivi ?')) {
      return;
    }

    if (onDeleteSuivi) {
      await onDeleteSuivi(id);
    } else {
      emit({ historique: v.historique.filter((h) => h.id !== id) });
    }
  };

  // Démarrer l'édition inline
  const startEditHistorique = (id) => {
    const entry = v.historique.find((h) => h.id === id);
    if (!entry) return;
    
    setEditingId(id);
    setEditingText(entry.description);
  };

  // Sauvegarder la modification
  const saveEdit = async (id) => {
    if (!editingText.trim()) {
      alert('Le suivi ne peut pas être vide');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const updatedHistorique = v.historique.map(h => 
        h.id === id ? { 
          ...h, 
          description: editingText.trim(),
          modifiedAt: now.toISOString() // Heure de modification 
        } : h
      );
      emit({ 
        historique: updatedHistorique,
        dateMaj: now.toISOString().slice(0, 10) // MAJ de la fiche
      });
      
      setEditingId(null);
      setEditingText('');
    } catch (error) {
      console.error('Erreur lors de la modification du suivi:', error);
      alert('Erreur lors de la modification du suivi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };



  return (
    <div className={`collapsible ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="collapsible-header"
        aria-expanded={open}
        aria-controls={pid}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-icon" aria-hidden="true">▶</span>
      </button>

      <div id={pid} className={`collapsible-content ${styles.suividdtContent}`}>
        <label className="checkbox-label" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={v.enjeuPrioritaire}
            onChange={(e) => emit({ enjeuPrioritaire: e.target.checked })}
          />
          <strong style={{ fontSize: '16px' }}>Projet enjeu prioritaire</strong>
          <span className="tooltip-container">
            <span className="tooltip-icon">(i)</span>
            <span className="tooltip-text">
              Cochez si le projet nécessite une attention particulière
            </span>
          </span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={v.charteAccueil}
            onChange={(e) => emit({ charteAccueil: e.target.checked })}
          />
          <strong style={{ fontSize: '16px' }}>Charte d'Accueil</strong>
          <span className="tooltip-container">
            <span className="tooltip-icon">(i)</span>
            <span className="tooltip-text">
              Cochez si le projet fait l'objet d'une charte d'accueil
            </span>
          </span>
        </label>

        <div className="form-group">
          <label htmlFor={idService}>Service</label>
          <select
            id={idService}
            value={v.service_id}
            onChange={(e) => setField('service_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
          {services.length === 0 && <option>Chargement...</option>}

            <option value="">Sélectionner</option>
            {services.map((service) => (
              <option key={service.id_service} value={service.id_service}>
                  {service.libelle_service}
              </option> 
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={idContact}>Contact à la DDT</label>
          <input
            id={idContact}
            type="text"
            value={v.contactDDT}
            onChange={(e) => emit({ contactDDT: e.target.value })}
            placeholder="Nom et prénom"
          />
        </div>

        <div className="form-group">
          <label htmlFor={idSuiviDesc}>Suivi</label>
          <textarea
            id={idSuiviDesc}
            rows={3}
            placeholder="Saisir le suivi du projet..."
            value={v.suiviDescription}
            onChange={(e) => emit({ suiviDescription: e.target.value })}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="button button-primary"
            onClick={addHistorique}
            disabled={!v.suiviDescription.trim() || isSubmitting}
          >
            {isSubmitting ? 'Ajout en cours...' : 'Ajouter au suivi'}
          </button>
        </div>

        {/* Historique des suivis */}
        <div
          className={`${styles.feed} ${
            v.historique.length > 3 ? styles.scrollableFeed : ''
          }`}
          style={{ marginBottom: '2rem' }}
        >
          {v.historique.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              Aucun suivi enregistré pour le moment
            </p>
          )}
          
          {v.historique.map((h) => {
            const date = new Date(h.dateTime);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            
            const isEditing = editingId === h.id;
            
            return (
              <div key={h.id} className={styles.item}>
                {isEditing ? (
                  // Mode édition
                  <>
                    <div className={styles.itemHeader} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          ✏️ Édition
                        </span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>{dateStr}</span>
                        <strong style={{ color: '#1e293b' }}>👤 {h.author}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          title="Valider la modification"
                          onClick={() => saveEdit(h.id)}
                          disabled={isSubmitting}
                          style={{
                            background: '#10b981',
                            border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '1.2rem',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            fontWeight: 'bold'
                          }}
                        >
                          ✓ Valider
                        </button>
                        <button
                          type="button"
                          title="Annuler la modification"
                          onClick={cancelEdit}
                          disabled={isSubmitting}
                          style={{
                            background: '#dc3545',
                            border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '1.2rem',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            fontWeight: 'bold'
                          }}
                        >
                          ✕ Annuler
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #10b981',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: '1.6',
                        backgroundColor: '#f0fdf4'
                      }}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </>
                ) : (
                  // Mode lecture
                  <>
                    <div className={styles.itemHeader} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {timeStr}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>{dateStr}</span>
                        {h.modifiedAt && (
                          <span style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontStyle: 'italic',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '3px'
                          }}>
                            modifié à {new Date(h.modifiedAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <strong style={{ color: '#1e293b' }}>👤 {h.author}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          title="Modifier ce suivi"
                          className={styles['suivi-modifier']}
                          onClick={() => startEditHistorique(h.id)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          title="Supprimer ce suivi"
                          className={styles['suivi-supprimer']}
                          onClick={() => deleteHistorique(h.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <div className={styles.itemBody}>
                      {h.description}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="form-group">
          <label htmlFor={idDateCreation}>Date de création de la fiche</label>
          <input
            id={idDateCreation}
            type="date"
            value={v.dateCreation}
            readOnly
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor={idCreateur}>Créateur de la fiche</label>
          <input
            id={idCreateur}
            type="text"
            value={v.createur}
            placeholder="Créateur"
            readOnly
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor={idDateMaj}>Date de dernière mise à jour</label>
          <input
            id={idDateMaj}
            type="date"
            value={v.dateMaj}
            readOnly
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
          />
        </div>
      </div>
    </div>
  );
}