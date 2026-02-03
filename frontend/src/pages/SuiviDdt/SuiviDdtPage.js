// src/pages/SuiviDdt/SuiviDDTPage.js
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SuiviDdtSection from '../../components/suivi_ddt/Suivi_ddt/SuiviDdt';
import '../../components/common/Collapsible/collapsible.css';
import '../../styles/globals.css';

export default function SuiviDdtPage() {
    const { id } = useParams(); // Récupérer l'ID du projet depuis l'URL
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjetData = async () => {
            try {
                setLoading(true);
                
                // Récupérer les données du projet depuis l'API
                const response = await fetch(`/api/projets/${id}`);
                
                if (!response.ok) {
                    throw new Error('Erreur lors de la récupération du projet');
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'Erreur');
                }
                
                const projetData = result.data;
                
                // Formater les données pour le composant
                const formattedData = {
                    numeroDossier: projetData.projet.id,
                    dateCreation: projetData.projet.dateCreation 
                        ? new Date(projetData.projet.dateCreation).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10),
                    dateMaj: projetData.projet.dateMiseAJour 
                        ? new Date(projetData.projet.dateMiseAJour).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10),
                    // Le créateur est celui qui a créé le projet
                    createur: projetData.createur?.nomComplet || projetData.createur?.username || 'Inconnu',
                    // L'historique provient des suivis
                    historique: projetData.suivis?.map(suivi => ({
                        id: suivi.id,
                        date: new Date(suivi.dateCreation).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        // Afficher le nom complet de l'utilisateur qui a créé le suivi
                        user: suivi.creePar?.nomComplet || suivi.creePar?.username || 'Inconnu',
                        contenu: suivi.contenu
                    })) || [],
                    // Autres données du projet
                    nom_projet: projetData.projet.nom,
                    description: projetData.projet.description,
                    projetSignale: projetData.projet.projetSignale,
                    charteAccueil: projetData.projet.charteAccueil,
                    serviceDdt: projetData.serviceDdt?.libelle_service || '',
                    referentDdt: projetData.projet.referentDdt || ''
                };
                
                setForm(formattedData);
                setError(null);
            } catch (err) {
                console.error('Erreur lors du chargement du projet:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProjetData();
        }
    }, [id]);

    if (loading) {
        return (
            <main className="page-layout">
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des données...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="page-layout">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-600 font-medium">Erreur: {error}</p>
                </div>
            </main>
        );
    }

    if (!form) {
        return (
            <main className="page-layout">
                <div className="text-center p-8">
                    <p className="text-gray-600">Aucune donnée disponible</p>
                </div>
            </main>
        );
    }

    return (
        <main className="page-layout">
            <SuiviDdtSection value={form} onChange={setForm} />
        </main>
    );
}