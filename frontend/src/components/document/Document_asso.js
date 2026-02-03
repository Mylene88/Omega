// src/components/document/Document_asso.js
import React, { useState, useEffect } from 'react';
import '../common/Collapsible/Collapsible';
import styles from '../../styles/DocumentSection.module.css';

// Type de fichiers supportés avec leurs icônes
const FILE_TYPES = {
  pdf: { icon: '📄', color: '#E53E3E', label: 'PDF' },
  doc: { icon: '📝', color: '#2B6CB0', label: 'Word' },
  docx: { icon: '📝', color: '#2B6CB0', label: 'Word' },
  odt: { icon: '📝', color: '#38A169', label: 'ODT' },
  xls: { icon: '📊', color: '#38A169', label: 'Excel' },
  xlsx: { icon: '📊', color: '#38A169', label: 'Excel' },
  ods: { icon: '📊', color: '#38A169', label: 'ODS' },
  ppt: { icon: '📽️', color: '#D69E2E', label: 'PowerPoint' },
  pptx: { icon: '📽️', color: '#D69E2E', label: 'PowerPoint' },
  txt: { icon: '📋', color: '#718096', label: 'Texte' },
  zip: { icon: '🗜️', color: '#805AD5', label: 'Archive' },
  rar: { icon: '🗜️', color: '#805AD5', label: 'Archive' },
  folder: { icon: '📁', color: '#805AD5', label: 'Dossier' },
  web: { icon: '🌐', color: '#3182CE', label: 'Web' }
};

const getFileType = (url) => {
  if (!url) return FILE_TYPES.folder;
  if (!url.includes('.') || url.endsWith('\\') || url.endsWith('/')) {
    return FILE_TYPES.folder;
  }
  const extension = url.split('.').pop().toLowerCase();
  return FILE_TYPES[extension] || FILE_TYPES.folder;
};

const VALIDATORS = {
  web: (value) => /^https?:\/\/.+\..+/.test(value),
  internal: (value) => {
    const trimmed = value.trim();
    const windowsNetwork = /^\\\\[A-Za-z0-9._-]+\\.*/i.test(trimmed);
    const windowsLocal = /^[A-Za-z]:[\\\/].+/i.test(trimmed);
    const unixPath = /^\/[A-Za-z0-9._\-\/]+/i.test(trimmed);
    return windowsNetwork || windowsLocal || unixPath;
  }
};

export default function DocumentManager({
                                          value = [],
                                          onChange,
                                          title = 'Documents'
                                        }) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Ne pas réinitialiser si déjà initialisé et qu'on a des items
    if (isInitialized && items.length > 0) {
      return;
    }

    console.log('📥 Document_asso - Initialisation avec value:', value);

    if (Array.isArray(value) && value.length > 0) {
      // ✅ Si c'est déjà un array de {lien_local, lien_web}
      const formattedItems = value.map(doc => {
        if (doc.lien_web) {
          return {
            id: Date.now() + Math.random(),
            type: 'web',
            url: doc.lien_web,
            valid: VALIDATORS.web(doc.lien_web)
          };
        } else if (doc.lien_local) {
          return {
            id: Date.now() + Math.random(),
            type: 'internal',
            url: doc.lien_local,
            valid: VALIDATORS.internal(doc.lien_local)
          };
        }
        return null;
      }).filter(Boolean);

      setItems(formattedItems);
      setIsInitialized(true);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Format alternatif (legacy)
      const itemsArray = [];
      if (value.liensWeb) {
        itemsArray.push(...value.liensWeb.map(url => ({
          type: 'web',
          url,
          id: Date.now() + Math.random(),
          valid: VALIDATORS.web(url)
        })));
      }
      if (value.liensInternes) {
        itemsArray.push(...value.liensInternes.map(url => ({
          type: 'internal',
          url,
          id: Date.now() + Math.random(),
          valid: VALIDATORS.internal(url)
        })));
      }
      if (itemsArray.length > 0) {
        setItems(itemsArray);
        setIsInitialized(true);
      }
    }
  }, [value, isInitialized, items.length]);

  const addItem = (type) => {
    const newItem = {
      id: Date.now() + Math.random(),
      type,
      url: '',
      valid: false
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    // ✅ Ne pas envoyer les items vides au parent
    const validItems = updatedItems.filter(item => item.valid);
    const formattedForBackend = validItems.map(item => ({
      lien_local: item.type === 'internal' ? item.url : null,
      lien_web: item.type === 'web' ? item.url : null
    }));

    console.log('📤 Document_asso (addItem) - Envoi au parent:', formattedForBackend);
    if (onChange) onChange(formattedForBackend);
  };

  const updateUrl = (id, url) => {
    const updatedItems = items.map(item =>
        item.id === id
            ? { ...item, url, valid: VALIDATORS[item.type](url.trim()) }
            : item
    );
    setItems(updatedItems);

    // ✅ Filtrer seulement les items valides
    const validItems = updatedItems.filter(item => item.valid);
    const formattedForBackend = validItems.map(item => ({
      lien_local: item.type === 'internal' ? item.url : null,
      lien_web: item.type === 'web' ? item.url : null
    }));

    console.log('📤 Document_asso (updateUrl) - Envoi au parent:', formattedForBackend);
    if (onChange) onChange(formattedForBackend);
  };

  const removeItem = (id) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);

    // ✅ FIX: Correction de la typo "intetnal" → "internal"
    const validItems = updatedItems.filter(item => item.valid);
    const formattedForBackend = validItems.map(item => ({
      lien_local: item.type === 'internal' ? item.url : null, // ✅ CORRIGÉ
      lien_web: item.type === 'web' ? item.url : null
    }));

    console.log('📤 Document_asso (removeItem) - Envoi au parent:', formattedForBackend);
    if (onChange) onChange(formattedForBackend);
  };

  const openLink = (url) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      alert(
          '⚠️ Les navigateurs bloquent l\'accès direct aux fichiers locaux.\n\n' +
          '📋 Utilisez le bouton "Copier" puis collez le chemin dans l\'Explorateur Windows (Ctrl+V dans la barre d\'adresse).\n\n' +
          'Chemin : ' + url
      );
    }
  };

  const copyToClipboard = async (id, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        alert('Erreur lors de la copie');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
      <div className={`collapsible ${open ? 'is-open' : ''}`}>
        <button
            type="button"
            className="collapsible-header"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
        >
          <span className="collapsible-title">{title}</span>
          <span className="collapsible-icon">▶</span>
        </button>

        <div className="collapsible-content">
          <label>Documents associés</label>

          <div className={styles.buttonGroup}>
            <button
                type="button"
                className="button button-secondary"
                onClick={() => addItem('web')}
            >
              🌐 Lien web
            </button>
            <button
                type="button"
                className="button button-secondary"
                onClick={() => addItem('internal')}
            >
              📁 Lien interne
            </button>
          </div>

          <div id="documents-list" className={styles.documentList}>
            {items.length === 0 ? (
                <p className={styles.emptyState}>
                  Aucun document ajouté. Cliquez sur un bouton ci-dessus pour ajouter un lien.
                </p>
            ) : (
                items.map(item => {
                  const fileType = item.valid ? getFileType(item.url) : FILE_TYPES.folder;
                  const isCopied = copiedId === item.id;

                  return (
                      <div key={item.id} className={styles.docItem}>
                        <div className={styles.fileInfo}>
                    <span
                        className={styles.fileIcon}
                        style={{ color: fileType.color }}
                        title={fileType.label}
                    >
                      {fileType.icon}
                    </span>
                          <span className={styles.fileType}>
                      {fileType.label}
                    </span>
                        </div>

                        <input
                            type="text"
                            className={styles.docInput}
                            placeholder={
                              item.type === 'internal'
                                  ? 'C:/dossier/fichier.pdf, \\\\serveur\\dossier, /home/user/doc.pdf'
                                  : 'https://example.com/document.pdf'
                            }
                            value={item.url}
                            onChange={e => updateUrl(item.id, e.target.value)}
                            style={{
                              borderColor: item.url === ''
                                  ? '#cbd5e1'
                                  : item.valid
                                      ? '#10b981'
                                      : '#ef4444',
                              backgroundColor: item.url === ''
                                  ? 'white'
                                  : item.valid
                                      ? '#f0fdf4'
                                      : '#fef2f2'
                            }}
                        />

                        <button
                            type="button"
                            className={`button button-secondary ${styles.docCopy}`}
                            onClick={() => copyToClipboard(item.id, item.url)}
                            disabled={!item.valid}
                            title="Copier le lien"
                            style={{
                              backgroundColor: isCopied ? '#10b981' : undefined,
                              color: isCopied ? 'white' : undefined
                            }}
                        >
                          {isCopied ? '✓' : '📋'}
                        </button>

                        {item.type === 'web' ? (
                            <button
                                type="button"
                                className={`button button-secondary ${styles.docOpen}`}
                                onClick={() => {
                                  if (item.url.trim() && item.valid) {
                                    openLink(item.url.trim());
                                  }
                                }}
                                disabled={!item.valid}
                                title="Ouvrir le lien"
                            >
                              🔗
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={`button button-secondary ${styles.docOpen}`}
                                onClick={() => {
                                  if (item.url.trim() && item.valid) {
                                    openLink(item.url.trim());
                                  }
                                }}
                                disabled={!item.valid}
                                title="Instructions pour ouvrir"
                            >
                              ℹ️
                            </button>
                        )}

                        <button
                            type="button"
                            className={`button button-secondary ${styles.docRemove}`}
                            onClick={() => removeItem(item.id)}
                            title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                  );
                })
            )}
          </div>

          <div className={styles.helpText}>
            <strong>💡 Types de liens acceptés :</strong>
            <ul>
              <li><strong>Liens web :</strong> https://example.com/document.pdf (s'ouvrent directement)</li>
              <li><strong>Liens internes :</strong> \\serveur\dossier\fichier.pdf, C:/dossier/fichier.pdf</li>
            </ul>
            <div className={styles.helpNote}>
              ⚠️ <strong>Liens internes :</strong> Les navigateurs bloquent l'accès direct aux fichiers locaux/réseau.
              Utilisez le bouton <strong>📋 Copier</strong> puis collez le chemin dans l'Explorateur Windows.
            </div>
          </div>
        </div>
      </div>
  );
}