// frontend/src/pages/Thematique/ThematiquePage.js
import React, { useState, useEffect, useRef } from "react";
import Thematiques from "../../components/thematique/thematique_modele/Thematiques";
import "../../styles/globals.css";

export default function ThematiquePage({ thematiqueData = [], onThematiqueChange }) {
    const [thematiques, setThematiques] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modelOptions, setModelOptions] = useState([]);
    const [error, setError] = useState(null);

    const thematiquesRef = useRef([]);
    const modelOptionsRef = useRef([]);

    useEffect(() => {
        const fetchThematiques = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('🔍 Fetching thematiques...');

                const res = await fetch("http://localhost:3000/api/thematiques?stats=true&models=true");

                console.log('📡 Response status:', res.status);

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }

                const data = await res.json();
                console.log('✅ Data received:', data);

                if (data.success) {
                    const thematiquesList = data.data || [];
                    const modelOpts = data.modelOptions || [];

                    setThematiques(thematiquesList);
                    thematiquesRef.current = thematiquesList;

                    setModelOptions(modelOpts);
                    modelOptionsRef.current = modelOpts;

                    console.log(`✅ Loaded ${thematiquesList.length} thematiques and ${modelOpts.length} model options`);
                }
            } catch (err) {
                console.error("💥 Error fetching thematiques:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchThematiques();
    }, []);

    const handleChange = (updatedThematiques) => {
        console.log("🏷️ ThematiquePage - Valeurs mises à jour:", updatedThematiques);

        const formattedForBackend = updatedThematiques
            .filter(them => them.modeleThematique)
            .map(them => {
                // ✅ FIX: Trouver l'option de modèle correspondante
                const modelOption = modelOptionsRef.current.find(
                    opt => opt.value === them.modeleThematique
                );

                if (!modelOption) {
                    console.warn(`❌ No model option found for: ${them.modeleThematique}`);
                    return null;
                }

                console.log(`🔍 ModelOption trouvé:`, modelOption);

                // ✅ FIX: Extraire le nom de la thématique depuis modelOption
                // modelOption.value = "Autres-participation_du_public"
                // modelOption.label = "Autres > Participation du public"

                // Option 1: Si modelOption a une propriété "thematique"
                let thematiqueLibelle = null;

                if (modelOption.thematique) {
                    thematiqueLibelle = modelOption.thematique;
                } else if (modelOption.label) {
                    // ✅ Extraire depuis le label : "Autres > Participation du public" → "Autres"
                    thematiqueLibelle = modelOption.label.split('>')[0].trim();
                } else {
                    // Fallback: utiliser le premier segment du value
                    thematiqueLibelle = them.modeleThematique.split('-')[0];
                }

                console.log(`🔍 Recherche thématique avec libellé: "${thematiqueLibelle}"`);

                // ✅ Chercher la thématique par son libellé
                const matchedThematique = thematiquesRef.current.find(
                    t => {
                        // Comparaison insensible à la casse et aux accents
                        const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        return normalize(t.libelle) === normalize(thematiqueLibelle) ||
                            t.libelle.toLowerCase().startsWith(thematiqueLibelle.toLowerCase());
                    }
                );

                if (!matchedThematique) {
                    console.warn(`❌ No thematique found for label: "${thematiqueLibelle}"`);
                    console.log("📋 Thématiques disponibles:", thematiquesRef.current.map(t => t.libelle));
                    return null;
                }

                console.log(`✅ Thématique trouvée:`, matchedThematique);

                // ✅ FIX CRITIQUE: Envoyer les données au format attendu
                return {
                    id_thematique: matchedThematique.id_thematique,
                    modele: them.modeleThematique, // La clé complète "Autres-participation_du_public"
                    fields: them.fields || {},
                    commentaires: them.fields?.commentaires || ''
                };
            })
            .filter(them => them && them.id_thematique);

        console.log("📤 Envoi au parent FormulairePage:", formattedForBackend);

        if (onThematiqueChange) {
            onThematiqueChange(formattedForBackend);
        }
    };

    return (
        <div>
            {loading && <p>Chargement des thématiques...</p>}
            {error && <p style={{ color: 'red' }}>Erreur: {error}</p>}

            {!loading && !error && (
                <form>
                    <Thematiques
                        value={thematiqueData}
                        onChange={handleChange}
                    />
                </form>
            )}
        </div>
    );
}