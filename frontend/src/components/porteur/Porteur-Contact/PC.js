// src/components/porteur/PorteurContactList.js
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import '../../common/Collapsible/collapsible.css';
import styles from '../../../styles/PorteurContactSection.module.css';
import { API_BASE_URL } from '../../../config/apiConfig';

const genId = () => `porteur-${Math.random().toString(36).slice(2, 9)}`;

export default function PorteurContactList({ value = [], onChange, title = 'Porteur(s) de projet' }) {
  const rootId = useId();
  const [openRoot, setOpenRoot] = useState(true);

  const [types, setTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesError, setTypesError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingTypes(true);
        const res = await fetch(`${API_BASE_URL}/api/type-porteur`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setTypes(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setTypesError('Impossible de charger les types de porteur');
      } finally {
        if (alive) setLoadingTypes(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 2) Etat des porteurs (snake_case aligné au back)
  const firstId = useId();
  const initial = value.length ? value : [{
    id: firstId,
    type_porteur_id: '',
    autre_type_porteur: '',
    nom_structure: '',
    referent_nom: '',
    referent_fonction: '',
    referent_email: '',
    referent_tel: ''
  }];

  const [porteurs, setPorteurs] = useState(initial);
  // ✅ Par défaut, aucun porteur n'est ouvert (ils sont tous fermés)
  const [openStates, setOpenStates] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔄 PorteurContact - Props value changées:', value);
    if (value && value.length > 0 && !isInitialized) {
      // ✅ Seulement au premier chargement
      const porteursAvecIds = value.map(p => ({
        ...p,
        id: p.id || p.id_porteur || genId()
      }));
      setPorteurs(porteursAvecIds);
      setIsInitialized(true);
      console.log('✅ Porteurs initialisés:', porteursAvecIds);
    }
  }, [value, isInitialized]);

  // 3) Collapsible sizing
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (openRoot) {
    // recalculer la hauteur naturelle
      const naturalHeight = el.scrollHeight
      const maxAllowed = porteurs.length > 1 ? 500 : naturalHeight
      el.style.maxHeight = `${maxAllowed}px`;
      el.style.overflowY = porteurs.length > 2 ? 'auto' : 'visible';
    } else {
      el.style.maxHeight = '0px';
      el.style.overflowY = 'hidden';
    }
  }, [openRoot, porteurs.length, openStates, types.length]);  // ← ajouter types.length


  // 4) Helpers
  const update = (id, patch) => {
    const updated = porteurs.map(p => (p.id === id ? { ...p, ...patch } : p));
    setPorteurs(updated);
    onChange?.(updated);
  };

  const addPorteur = () => {
    const newP = {
      id: genId(),
      type_porteur_id: '',
      autre_type_porteur: '',
      nom_structure: '',
      referent_nom: '',
      referent_fonction: '',
      referent_email: '',
      referent_tel: ''
    };
    const updated = [...porteurs, newP];
    setPorteurs(updated);
    onChange?.(updated);
    setOpenStates(states => [...states, newP.id]);
  };

  const removePorteur = id => {
    const updated = porteurs.filter(p => p.id !== id);
    setPorteurs(updated);
    onChange?.(updated);
    setOpenStates(states => states.filter(sid => sid !== id));
  };

  // 5) Rendu
  return (
    <div className={`collapsible ${openRoot ? 'is-open' : ''}`}>
      <button
        type="button"
        className ="collapsible-header"
        aria-expanded={openRoot}
        onClick={() => setOpenRoot(o => !o)}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-icon">▶</span>
      </button>

      <div
        ref={contentRef}
        className="collapsible-content "
        style={{ /*overflow: 'hidden',*/ transition: 'max-height 250ms ease' }}
      >
        {typesError && <p className={styles.error}>{typesError}</p>}
        {porteurs.map((p, idx) => {
          const isOpen = openStates.includes(p.id);
          const selectedType = types.find(t => String(t.id_type_porteur) === String(p.type_porteur_id));
          const showAutre = selectedType?.libelle === 'Autre';

          return (
            <div key={p.id} className={`operation-block ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="collapsible-header"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenStates(states => states.includes(p.id) ? states.filter(s => s !== p.id) : [...states, p.id])
                }
              >
                <span className="collapsible-title">Porteur {idx + 1}</span>
                <span className="collapsible-icon">▶</span>
              </button>

              <div className="collapsible-content">
                {porteurs.length > 1 && (
                  <button
                    type="button"
                    className={styles['suivi-supprimer']}
                    style={{ float: 'right' }}
                    onClick={() => removePorteur(p.id)}
                  >
                    🗑
                  </button>
                )}

                {/* Type de porteur depuis l'API */}
                <div className={styles.subStack3}>
                  <p className={styles.label}>Type de porteur</p>

                  {/* Option A: radios dynamiques */}
                  <div className={styles.grid1Gap3}>
                    {loadingTypes ? (
                      <span className={styles.textMuted}>Chargement…</span>
                    ) : (
                      types.map(t => (
                        <label key={t.id_type_porteur} className={styles.inlineOption}>
                          <input
                            type="radio"
                            name={`type-${p.id}`}
                            value={t.id_type_porteur}
                            checked={String(p.type_porteur_id) === String(t.id_type_porteur)}
                            onClick={() => {
                              // Si on reclique sur l'option déjà sélectionnée, on retire la sélection
                              const newValue = String(p.type_porteur_id) === String(t.id_type_porteur)
                                ? ''
                                : String(t.id_type_porteur);
                              update(p.id, { type_porteur_id: newValue });
                            }}
                            onChange={() => {}} // Gestionnaire vide pour éviter les avertissements React
                            className={styles.radio}
                          />
                          <span className={styles.textMuted}>{t.libelle}</span>
                        </label>
                      ))
                    )}
                  </div>

                  {/* Champ 'Autre' si libellé sélectionné === 'Autre' */}
                  {showAutre && (
                    <input
                      type="text"
                      value={p.autre_type_porteur}
                      onChange={e => update(p.id, { autre_type_porteur: e.target.value })}
                      placeholder="Précisez le type de porteur"
                      className={styles.formControl}
                      style={{ marginTop: '0.75rem' }}
                    />
                  )}
                </div>

                <div className={styles.subStack2}>
                  <label className={styles.label}>Porteur de projet</label>
                  <input
                    type="text"
                    value={p.nom_structure}
                    onChange={e => update(p.id, { nom_structure: e.target.value })}
                    placeholder="Nom ou acronyme de la structure"
                    className={styles.formControl}
                  />
                </div>

                <div className={styles.subStack2}>
                  <label className={styles.label}>Référent</label>
                  <input
                    type="text"
                    value={p.referent_nom}
                    onChange={e => update(p.id, { referent_nom: e.target.value })}
                    placeholder="Nom et prénom du référent"
                    className={styles.formControl}
                  />
                </div>

                <div className={styles.subStack2}>
                  <label className={styles.label}>Fonction du référent</label>
                  <input
                    type="text"
                    value={p.referent_fonction}
                    onChange={e => update(p.id, { referent_fonction: e.target.value })}
                    placeholder="Fonction du référent"
                    className={styles.formControl}
                  />
                </div>

                <div className={styles.subStack2}>
                  <label className={styles.label}>Email référent</label>
                  <input
                    type="email"
                    value={p.referent_email}
                    onChange={e => update(p.id, { referent_email: e.target.value })}
                    placeholder="Email du référent"
                    className={styles.formControl}
                  />
                </div>

                <div className={styles.subStack2}>
                  <label className={styles.label}>Téléphone référent</label>
                  <input
                    type="tel"
                    value={p.referent_tel}
                    onChange={e => update(p.id, { referent_tel: e.target.value })}
                    placeholder="Contact du référent"
                    className={styles.formControl}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="button button-secondary add-button"
          onClick={addPorteur}
          style={{ marginTop: '1rem' }}
        >
          + Ajouter un porteur de projet
        </button>
      </div>
    </div>
  );
}
