// frontend/src/pages/Id/Id.js
import React from 'react';

export default function Id({ value, isGenerating }) {
    console.log('🆔 Composant Id - Props reçues:', { value, isGenerating });

    return (
        <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db'
        }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Id du projet :
            </h3>
            {isGenerating ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#6b7280'
                }}>
                    <div className="spinner" style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #e5e7eb',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Génération de l'ID en cours...</span>
                </div>
            ) : (
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '0.375rem',
                    fontFamily: 'monospace',
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: '#1f2937'
                }}>
                    {value?.id_projet || 'ID non disponible'}
                </div>
            )}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}