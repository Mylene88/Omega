// frontend/src/components/SpatialResultsDisplay/SpatialResultsDisplay.js
/*import React from 'react';
import styles from '../../styles/CarteSection.module.css'

const SpatialResultsDisplay = ({ spatialAnalysis, isUpdate = false }) => {
    if (!spatialAnalysis) return null;

    return (
        <div className={styles.spatialResults}>
            <h4>
                {isUpdate ? '🔄 Analyse mise à jour' : '✨ Analyse spatiale'}
            </h4>
            
            {isUpdate && (
                <div className={styles.updateNotice}>
                    Les données ont été recalculées suite à la modification du tracé
                </div>
            )}

            <div className={styles.resultsGrid}>
                <div className={styles.resultCard}>
                    <h5>📏 Mesures</h5>
                    <div className={styles.resultItems}>
                        {spatialAnalysis.superficie_ou_longueur && (
                            <div className={styles.resultItem}>
                                <strong>Dimension:</strong> {spatialAnalysis.superficie_ou_longueur}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.resultCard}>
                    <h5>🏘️ Communes ({spatialAnalysis.communes_traversees?.length || 0})</h5>
                    <div className={styles.resultItems}>
                        {spatialAnalysis.communes_traversees?.length > 0 ? (
                            spatialAnalysis.communes_traversees.map((commune, index) => (
                                <div key={index} className={styles.resultItem}>
                                    {commune}
                                </div>
                            ))
                        ) : (
                            <div className={styles.resultItem}>
                                Aucune commune identifiée
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.resultCard}>
                    <h5>🏢 Territoires</h5>
                    <div className={styles.resultItems}>
                        {spatialAnalysis.epci?.length > 0 && (
                            <div className={styles.resultItem}>
                                <strong>EPCI:</strong> {spatialAnalysis.epci.join(', ')}
                            </div>
                        )}
                        {spatialAnalysis.arrondissements?.length > 0 && (
                            <div className={styles.resultItem}>
                                <strong>Arrondissement(s):</strong> {spatialAnalysis.arrondissements.join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.resultCard}>
                    <h5>👥 Élus concernés</h5>
                    <div className={styles.resultItems}>
                        {spatialAnalysis.deputes?.length > 0 && (
                            <div className={styles.resultItem}>
                                <strong>Député(s):</strong> {spatialAnalysis.deputes.join(', ')}
                            </div>
                        )}
                        {spatialAnalysis.maires?.length > 0 && (
                            <div className={styles.resultItem}>
                                <strong>Maire(s):</strong> {spatialAnalysis.maires.slice(0, 3).join(', ')}
                                {spatialAnalysis.maires.length > 3 && ` et ${spatialAnalysis.maires.length - 3} autre(s)`}
                            </div>
                        )}
                        {(!spatialAnalysis.deputes?.length && !spatialAnalysis.maires?.length) && (
                            <div className={styles.resultItem}>
                                Aucun élu identifié
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpatialResultsDisplay;*/
