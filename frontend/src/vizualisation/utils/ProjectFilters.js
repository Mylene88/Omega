//frontend/src/vizualisation/utils/ProjectFilters.js

/**
 * Vérifie si un projet correspond à la recherche de commune
 * Supporte format array (GeoJSON) et string (Liste)
 */
const matchesCommuneSearch = (project, filters) => {
  // Si aucun filtre de commune n'est actif, on accepte le projet
  if (!filters.searchText && !filters.searchCodeInsee && !filters.searchEpci && !filters.searchArrondissement) {
    return true;
  }

  // Gérer le format array (GeoJSON) ou string (Liste)
  let communes = project.communes_traversees || [];
  
  // Si c'est une string, la convertir en array
  if (typeof communes === 'string') {
    communes = [communes];
  }
  
  // Si tableau vide, vérifier aussi le champ 'commune' (singulier)
  if (!Array.isArray(communes) || communes.length === 0) {
    if (project.commune) {
      communes = [project.commune];
    } else {
      return false; // Pas de données de commune
    }
  }

  // Vérifier si au moins une commune correspond aux critères
  return communes.some(commune => {
    const communeLower = (commune || '').toLowerCase();
    
    // Recherche par nom de commune
    if (filters.searchText && communeLower.includes(filters.searchText.toLowerCase())) {
      return true;
    }
    
    // Recherche par code INSEE
    if (filters.searchCodeInsee && communeLower.includes(filters.searchCodeInsee.toLowerCase())) {
      return true;
    }
    
    // Recherche par EPCI
    if (filters.searchEpci && communeLower.includes(filters.searchEpci.toLowerCase())) {
      return true;
    }
    
    // Recherche par arrondissement
    if (filters.searchArrondissement && communeLower.includes(filters.searchArrondissement.toLowerCase())) {
      return true;
    }
    
    return false;
  });
};

/**
 * Filtre un seul projet GeoJSON selon tous les critères
 * Utilisé par filterProjects pour MapView.js
 */
export const filterProject = (feature, filters) => {
  if (!feature?.properties) return false;
  
  const props = feature.properties;
  
  // 1. Filtre par commune
  if (!matchesCommuneSearch(props, filters)) {
    return false;
  }
  
  // 2. Filtre par service DDT
  if (filters.serviceIds && filters.serviceIds.length > 0) {
    const projetServiceId = props.service_id || props.serviceId || props.service_ddt_id;
    
    if (!projetServiceId || !filters.serviceIds.includes(projetServiceId)) {
      return false;
    }
  }
  
  // 3. Filtre par thématique
  if (filters.thematiqueIds && filters.thematiqueIds.length > 0) {
    const projetThematiques = props.thematiques || [];

    let hasMatchingThematique = false;

    if (Array.isArray(projetThematiques) && projetThematiques.length > 0) {
      const firstItem = projetThematiques[0];

      // 🔍 Debug AVANT le filtrage
      console.log(`🔍 [AVANT FILTRAGE] Projet: ${props.nom_projet || props.name}`);
      console.log(`   - Thématiques du projet:`, projetThematiques.map(t => t.value || t));
      console.log(`   - Filtre appliqué:`, filters.thematiqueIds);

      // CAS 1: Format GeoJSON {value: "Risques-Bruit", label: "Risques - Bruit"}
      if (typeof firstItem === 'object' && firstItem !== null && firstItem.value) {
        // 🔍 CORRESPONDANCE EXACTE - insensible à la casse pour éviter les problèmes
        hasMatchingThematique = projetThematiques.some(t => {
          const projectThemValue = (t.value || '').toLowerCase();
          const match = filters.thematiqueIds.some(filterId => {
            const filterIdLower = filterId.toLowerCase();
            const isMatch = projectThemValue === filterIdLower;
            console.log(`      Comparaison: "${projectThemValue}" === "${filterIdLower}" ? ${isMatch}`);
            return isMatch;
          });
          return match;
        });
      }
      // CAS 2: Format objet {categorie: "Risques", sous_categorie: "Bruit"}
      else if (typeof firstItem === 'object' && firstItem !== null && firstItem.categorie) {
        hasMatchingThematique = projetThematiques.some(t => {
          const thematiqueValue = `${t.categorie}-${t.sous_categorie}`.toLowerCase();
          return filters.thematiqueIds.some(filterId =>
            thematiqueValue === filterId.toLowerCase()
          );
        });
      }
      // CAS 3: Format string direct ["Risques-Bruit", "Eau-Assainissement"]
      else if (typeof firstItem === 'string') {
        hasMatchingThematique = projetThematiques.some(t => {
          const thematiqueValue = String(t).toLowerCase();
          return filters.thematiqueIds.some(filterId =>
            thematiqueValue === filterId.toLowerCase()
          );
        });
      }
    }

    console.log(`   ➡️ Résultat: ${hasMatchingThematique ? '✅ ACCEPTÉ' : '❌ REJETÉ'}`);

    if (!hasMatchingThematique) return false;
  }
  
  // 4. Filtre par statut du projet
  if (filters.statutIds && filters.statutIds.length > 0) {
    const projetStatutId = props.statut_projet_id || props.statut_id || props.statutId || props.id_statut;

    if (!projetStatutId || !filters.statutIds.includes(projetStatutId)) {
      return false;
    }
  }

  // 5. Filtre projet archivé
  if (filters.projetArchive && !props.is_archived) {
    return false;
  }

  // 6. Filtre projet signalé
  if (filters.projetSignale && !props.projet_signale) {
    return false;
  }

  // 7. Filtre charte accueil
  if (filters.charteAccueil && !props.charte_accueil) {
    return false;
  }

  return true;
};

/**
 * Filtre une collection GeoJSON de projets
 * Utilisé dans MapView.js
 */
export const filterProjects = (geojsonCollection, filters, debug = false) => {
  if (!geojsonCollection?.features?.length) {
    return { type: 'FeatureCollection', features: [] };
  }
  
  if (debug) {
    console.log('🔍 Filtres actifs (Carte):', filters);
    console.log('📊 Projets avant filtrage:', geojsonCollection.features.length);
  }
  
  const filtered = geojsonCollection.features.filter(feature => 
    filterProject(feature, filters)
  );
  
  if (debug) {
    console.log(`✅ Projets après filtrage: ${filtered.length}/${geojsonCollection.features.length}`);
    
    // Debug détaillé si aucun projet ne passe
    if (filtered.length === 0 && geojsonCollection.features.length > 0) {
      console.log('⚠️ Aucun projet ne passe les filtres !');
      console.log('🔍 Test du premier projet:');
      const testFeature = geojsonCollection.features[0];
      const props = testFeature.properties;
      console.log('  - Nom:', props.nom_projet);
      console.log('  - Service ID:', props.service_id || props.serviceId || props.service_ddt_id);
      console.log('  - Thématiques:', props.thematiques);
      console.log('  - Communes:', props.communes_traversees);
    }
  }
  
  return {
    type: 'FeatureCollection',
    features: filtered
  };
};

/**
 * Filtre un tableau de projets (format standard, pas GeoJSON)
 * Utilisé dans ListeProjetPage.js
 */
export const filterProjectsArray = (projects, filters, debug = false) => {
  if (!Array.isArray(projects) || projects.length === 0) {
    return [];
  }
  
  if (debug) {
    console.log('🔍 Filtres actifs (Liste):', filters);
    console.log('📊 Projets avant filtrage:', projects.length);
  }
  
  const filtered = projects.filter(project => {
    // 1. Filtre par commune - UTILISER matchesCommuneSearch pour cohérence
    if (!matchesCommuneSearch(project, filters)) {
      return false;
    }
    
    // 2. Filtre par service DDT
    if (filters.serviceIds && filters.serviceIds.length > 0) {
      const projetServiceId = project.service_id || project.serviceId || project.service_ddt_id;
      
      if (!projetServiceId || !filters.serviceIds.includes(projetServiceId)) {
        return false;
      }
    }
    
    // 3. Filtre par thématique
    if (filters.thematiqueIds && filters.thematiqueIds.length > 0) {
      const projectThematiques = project.thematiques || [];

      let hasMatchingThematique = false;

      if (Array.isArray(projectThematiques) && projectThematiques.length > 0) {
        const firstItem = projectThematiques[0];

        // CAS 1: Format GeoJSON {value: "Risques-Bruit", label: "..."}
        if (typeof firstItem === 'object' && firstItem !== null && firstItem.value) {
          // 🔍 CORRESPONDANCE EXACTE - insensible à la casse pour éviter les problèmes
          hasMatchingThematique = projectThematiques.some(t => {
            const projectThemValue = (t.value || '').toLowerCase();
            return filters.thematiqueIds.some(filterId =>
              projectThemValue === filterId.toLowerCase()
            );
          });
        }
        // CAS 2: Format {categorie, sous_categorie}
        else if (typeof firstItem === 'object' && firstItem !== null && firstItem.categorie) {
          hasMatchingThematique = projectThematiques.some(t => {
            const thematiqueValue = `${t.categorie}-${t.sous_categorie}`.toLowerCase();
            return filters.thematiqueIds.some(filterId =>
              thematiqueValue === filterId.toLowerCase()
            );
          });
        }
        // CAS 3: Format string
        else if (typeof firstItem === 'string') {
          hasMatchingThematique = projectThematiques.some(t => {
            const thematiqueValue = String(t).toLowerCase();
            return filters.thematiqueIds.some(filterId =>
              thematiqueValue === filterId.toLowerCase()
            );
          });
        }
      }

      if (!hasMatchingThematique) return false;
    }
    
    // 4. Filtre par statut du projet
    if (filters.statutIds && filters.statutIds.length > 0) {
      const projetStatutId = project.statut_projet_id || project.statut_id || project.statutId || project.id_statut;

      if (!projetStatutId || !filters.statutIds.includes(projetStatutId)) {
        return false;
      }
    }

    // 5. Filtre projet archivé
    if (filters.projetArchive && !project.is_archived) {
      return false;
    }

    // 6. Filtre projet signalé
    if (filters.projetSignale && !project.projet_signale) {
      return false;
    }

    // 7. Filtre charte accueil
    if (filters.charteAccueil && !project.charte_accueil) {
      return false;
    }

    return true;
  });
  
  if (debug) {
    console.log(`✅ Projets après filtrage: ${filtered.length}/${projects.length}`);
    
    // Debug si aucun résultat
    if (filtered.length === 0 && projects.length > 0) {
      console.log('⚠️ Aucun projet ne passe les filtres !');
      const firstProject = projects[0];
      console.log('🔍 Structure du premier projet:', {
        nom: firstProject.nom_projet,
        service_id: firstProject.service_id,
        thematiques: firstProject.thematiques,
        communes: firstProject.communes_traversees
      });
    }
  }
  
  return filtered;
};

/**
 * Vérifie si au moins un filtre est actif
 */
export const hasActiveFilters = (filters) => {
  return !!(
    filters.searchText ||
    filters.searchCodeInsee ||
    filters.searchEpci ||
    filters.searchArrondissement ||
    (filters.serviceIds && filters.serviceIds.length > 0) ||
    (filters.thematiqueIds && filters.thematiqueIds.length > 0) ||
    (filters.statutIds && filters.statutIds.length > 0) ||
    filters.projetSignale ||
    filters.charteAccueil
  );
};

/**
 * Compte le nombre de filtres actifs
 */
export const countActiveFilters = (filters) => {
  let count = 0;

  if (filters.searchText || filters.searchCodeInsee || filters.searchEpci || filters.searchArrondissement) count++;
  if (filters.serviceIds && filters.serviceIds.length > 0) count += filters.serviceIds.length;
  if (filters.thematiqueIds && filters.thematiqueIds.length > 0) count += filters.thematiqueIds.length;
  if (filters.statutIds && filters.statutIds.length > 0) count += filters.statutIds.length;
  if (filters.projetSignale) count++;
  if (filters.charteAccueil) count++;

  return count;
};
