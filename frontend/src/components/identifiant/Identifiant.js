//frontend/src/components/identifiant/Identifiant.js
import React from 'react';

const Identifiant = ({ projectId, isGenerating = false, className = "" }) => {
  return (
    <div className={`project-id-container ${className}`}>
      <label htmlFor="project-id" className="block text-sm font-medium text-gray-700 mb-1">
        ID du projet :
      </label>
      <div className="relative">
        <input
          id="project-id"
          type="text"
          value={projectId || ''}
          readOnly
          className={`
            mt-1 block w-full px-3 py-2 border rounded-md text-sm
            ${projectId 
              ? 'bg-green-50 border-green-300 text-green-800' 
              : 'bg-gray-100 border-gray-300 text-gray-500'
            }
            ${isGenerating ? 'animate-pulse' : ''}
          `}
          placeholder={isGenerating ? "Génération en cours..." : "L'ID sera généré automatiquement"}
        />
        {projectId && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      {projectId && (
        <p className="mt-1 text-xs text-green-600">
          ✓ Projet créé avec succès
        </p>
      )}
    </div>
  );
};

export default Identifiant;
