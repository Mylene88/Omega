// src/pages/Document/DocumentPage.js
import React from 'react';
import DocumentManager from '../../components/document/Document_asso';
import '../../styles/globals.css';


export default function DocumentPage({ value = [], onChange }) {

  const handleChange = (documents) => {
    console.log('📄 DocumentPage - Documents reçus de Document_asso:', documents);
    console.log('📄 Type:', Array.isArray(documents) ? 'Array' : typeof documents);
    console.log('📄 Contenu:', JSON.stringify(documents, null, 2));

    if (onChange) {
      console.log('📄 DocumentPage - Envoi au parent (FormulairePage)');
      onChange(documents);
    }
  };

  return (
      <div>
        <DocumentManager
            value={value}
            onChange={handleChange}
            title="Documents"
        />
      </div>
  );
}