import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Search from '../../components/common/Search/Search';
import styles from '../styles/MapFilters.module.css';

export default function MapFilters({
    onFilterChange,
    onLocationSelect,
    communes,
    viewToggleButton // 👈 Nouvelle prop pour le bouton de changement de vue
}) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    searchText: '',
    searchCodeInsee: '',
    searchEpci: '',
    searchArrondissement: '',
    serviceIds: [],
    thematiqueIds: [],  // ✅ Contiendra des strings comme "Risques-Bruit"
    statutIds: [],      // ✅ Contiendra les IDs des statuts sélectionnés
    projetSignale: false,
    charteAccueil: false
  });
  const [services, setServices] = useState([]);
  const [thematiques, setThematiques] = useState([]);
  const [statuts, setStatuts] = useState([]);

  useEffect(() => { loadServices(); loadThematiques(); loadStatuts(); }, []);
  useEffect(() => { onFilterChange(filters); }, [filters, onFilterChange]);

  const loadServices = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/service');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
      console.log('✅ Services chargés:', data.length);
    } catch (e) {
      console.error('❌ Erreur chargement services:', e);
      setServices([]);
    }
  };

  const loadThematiques = async () => {
    try {
      console.log('🔄 Chargement des thématiques depuis /api/thematiques/modeles...');

      const response = await fetch("http://localhost:3000/api/thematiques/modeles");

      if (response.ok) {
        const data = await response.json();
        console.log('📡 Réponse API thématiques:', data);

        if (data.success && data.data?.modelOptions) {
          // ✅ L'API retourne déjà le bon format:
          // [{ value: "Risques-Bruit", label: "Risques - Bruit", ... }]
          setThematiques(data.data.modelOptions);
          console.log('✅ Thématiques chargées:', data.data.modelOptions.length);

          // Log des 3 premières pour vérification
          if (data.data.modelOptions.length > 0) {
            console.log('📋 Exemples de thématiques:');
            data.data.modelOptions.slice(0, 3).forEach(t => {
              console.log(`   - ${t.label} (value: "${t.value}")`);
            });
          }
        } else {
          console.warn('⚠️ Format de réponse inattendu:', data);
          setThematiques([]);
        }
      } else {
        console.error('❌ Erreur HTTP:', response.status);
        setThematiques([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement thématiques:', error);
      setThematiques([]);
    }
  };

  const loadStatuts = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/statut');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setStatuts(Array.isArray(data) ? data : []);
      console.log('✅ Statuts chargés:', data.length);
    } catch (e) {
      console.error('❌ Erreur chargement statuts:', e);
      setStatuts([]);
    }
  };

  const toggleService = (id) => {
    console.log('🔧 Toggle service:', id);
    setFilters(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
          ? prev.serviceIds.filter(x => x !== id)
          : [...prev.serviceIds, id]
    }));
  };

  const toggleThematique = (value) => {
    console.log('🔧 Toggle thématique:', value, '(type:', typeof value + ')');
    console.log('📋 Valeur complète:', value);
    console.log('📋 Thématiques disponibles:', thematiques.find(t => t.value === value));
    setFilters(prev => {
      const newThematiqueIds = prev.thematiqueIds.includes(value)
          ? prev.thematiqueIds.filter(x => x !== value)
          : [...prev.thematiqueIds, value];
      console.log('✅ Filtres mis à jour - thematiqueIds:', newThematiqueIds);
      return {
        ...prev,
        thematiqueIds: newThematiqueIds
      };
    });
  };

  const toggleStatut = (id) => {
    console.log('🔧 Toggle statut:', id);
    setFilters(prev => ({
      ...prev,
      statutIds: prev.statutIds.includes(id)
          ? prev.statutIds.filter(x => x !== id)
          : [...prev.statutIds, id]
    }));
  };

  const handleCheckboxChange = (name) => {
    setFilters(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleCommuneSelect = (commune) => {
    console.log('📍 Commune sélectionnée:', commune);

    setFilters(prev => ({
      ...prev,
      searchText: commune.nom || '',
      searchCodeInsee: commune.codeInsee || '',
      searchEpci: commune.epci || '',
      searchArrondissement: commune.arrondissement || ''
    }));

    if (onLocationSelect) {
      onLocationSelect(commune);
    }
  };

  const resetFilters = () => {
    console.log('🔄 Réinitialisation des filtres');
    setFilters({
      searchText: '',
      searchCodeInsee: '',
      searchEpci: '',
      searchArrondissement: '',
      serviceIds: [],
      thematiqueIds: [],
      statutIds: [],
      projetSignale: false,
      charteAccueil: false
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchText || filters.searchCodeInsee || filters.searchEpci || filters.searchArrondissement) count++;
    count += filters.serviceIds.length;
    count += filters.thematiqueIds.length;
    count += filters.statutIds.length;
    if (filters.projetSignale) count++;
    if (filters.charteAccueil) count++;
    return count;
  }, [filters]);

  return (
      <div className={styles['map-filters-container-horizontal']}>
        <div className={styles['filter-row-single']}>

          {/* Search commune */}
          <div className={styles.group}>
            <label className={styles.label}>
              🔍 Rechercher une commune
              {(filters.searchText || filters.searchCodeInsee) && (
                  <span style={{ marginLeft: '8px', color: '#0078d4', fontSize: '11px' }}>
                (filtre actif)
              </span>
              )}
            </label>
            <div className={styles.searchWrap}>
              <Search
                  data={communes}
                  placeholder="Nom, code INSEE, EPCI, arrondissement..."
                  onSelect={handleCommuneSelect}
                  searchKeys={['nom', 'codeInsee', 'epci', 'arrondissement']}
                  displayKey="nom"
                  filterEnabled={false}
                  searchDelay={300}
              />
            </div>
          </div>

          {/* Services DDT */}
          <div className={styles.group}>
            <label className={styles.label}>
              🏛️ Services DDT {filters.serviceIds.length > 0 && `(${filters.serviceIds.length})`}
            </label>
            <div className={styles.scrollableBox}>
              {services.length === 0 ? (
                  <span style={{ color: '#999', fontSize: '13px', padding: '8px' }}>
                Aucun service disponible
              </span>
              ) : (
                  services.map(service => (
                      <button
                          key={service.id_service}
                          className={`${styles.filterButton} ${
                              filters.serviceIds.includes(service.id_service)
                                  ? styles.filterButtonActive
                                  : ''
                          }`}
                          onClick={() => toggleService(service.id_service)}
                          title={service.libelle_service}
                      >
                        {service.libelle_service}
                      </button>
                  ))
              )}
            </div>
          </div>

          {/* Thématiques */}
          <div className={styles.group}>
            <label className={styles.label}>
              📋 Thématiques {filters.thematiqueIds.length > 0 && `(${filters.thematiqueIds.length})`}
            </label>
            <div className={styles.scrollableBox}>
              {thematiques.length === 0 ? (
                  <span style={{ color: '#999', fontSize: '13px', padding: '8px' }}>
                Chargement...
              </span>
              ) : (
                  thematiques.map(them => (
                      <button
                          key={them.value}
                          className={`${styles.filterButton} ${
                              filters.thematiqueIds.includes(them.value)
                                  ? styles.filterButtonActive
                                  : ''
                          }`}
                          onClick={() => toggleThematique(them.value)}
                          title={them.label}
                      >
                        {them.label}
                      </button>
                  ))
              )}
            </div>
          </div>

          {/* Statut du projet */}
          <div className={styles.group}>
            <label className={styles.label}>
              📊 Statut du projet {filters.statutIds.length > 0 && `(${filters.statutIds.length})`}
            </label>
            <div className={styles.scrollableBox}>
              {statuts.length === 0 ? (
                  <span style={{ color: '#999', fontSize: '13px', padding: '8px' }}>
                Chargement...
              </span>
              ) : (
                  statuts.map(statut => (
                      <button
                          key={statut.id_statut}
                          className={`${styles.filterButton} ${
                              filters.statutIds.includes(statut.id_statut)
                                  ? styles.filterButtonActive
                                  : ''
                          }`}
                          onClick={() => toggleStatut(statut.id_statut)}
                          title={statut.libelle}
                      >
                        {statut.libelle}
                      </button>
                  ))
              )}
            </div>
          </div>

          {/* Options additionnelles */}
          <div className={styles.group}>
            <label className={styles.label}>⚙️ Options</label>
            <div className={styles['filter-statuts-inline']}>
              <label className={styles.checkboxLabel}>
                <input
                    type="checkbox"
                    checked={filters.projetSignale}
                    onChange={() => handleCheckboxChange('projetSignale')}
                />
                <span>🚨 Projet signalé</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                    type="checkbox"
                    checked={filters.charteAccueil}
                    onChange={() => handleCheckboxChange('charteAccueil')}
                />
                <span>✅ Charte d'accueil</span>
              </label>
            </div>
          </div>

          {/* 👇 Bouton de changement de vue (Vue Liste / Vue Carte) */}
          {viewToggleButton && (
              <div className={styles.group}>
                <label className={styles.label} style={{ visibility: 'hidden' }}>Action</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {viewToggleButton}
                </div>
              </div>
          )}

          {/* Bouton reset */}
          <div className={styles.group}>
            <label className={styles.label} style={{ visibility: 'hidden' }}>Reset</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {activeFiltersCount > 0 && (
                  <div className={styles.activeFiltersInfo}>
                    <span className={styles.filterBadge}>{activeFiltersCount}</span>
                    <span>{activeFiltersCount > 1 ? 'filtres actifs' : 'filtre actif'}</span>
                  </div>
              )}
              <button
                  className={styles.resetButton}
                  onClick={resetFilters}
                  disabled={activeFiltersCount === 0}
              >
                🔄 Réinitialiser
              </button>
              <button
                  className={styles.createButton}
                  onClick={() => navigate('/projets/create')}
                  style={{
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
              >
                + Créer un projet
              </button>
            </div>
          </div>

        </div>
      </div>
  );
}