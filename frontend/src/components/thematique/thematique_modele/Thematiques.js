// frontend/src/components/thematique/thematique_modele/Thematiques.js
// FIXED: Use relative URLs to let setupProxy.js handle routing

import { useId, useState, useEffect } from 'react';
import '../../common/Collapsible/collapsible.css';
import styles from '../../../styles/ThematiqueSection.module.css';

const genId = () => `thematique-${Math.random().toString(36).substr(2, 9)}`;

export default function Thematiques({ value = [], onChange, title = 'Thematique(s)' }) {
  const rootId = useId();
  const [openRoot, setOpenRoot] = useState(true);

  const [modelOptions, setModelOptions] = useState([]);
  const [enumOptions, setEnumOptions] = useState({});
  const [loadingEnums, setLoadingEnums] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const firstId = useId();
  const initial = value.length
      ? value
      : [
        {
          id: firstId,
          modeleThematique: '',
          fields: {}
        }
      ];

  const [thematiques, setThematiques] = useState(initial);
  const [openStates, setOpenStates] = useState(initial.map(p => p.id));

  useEffect(() => {
    fetchModelOptions();
  }, []);

  const fetchModelOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Chargement des modèles depuis API...');

      // ✅ FIX: Use relative URL - setupProxy.js will route to port 3000
      const apiUrl = 'http://localhost:3000/api/thematiques/modeles';

      console.log('📡 Calling:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📡 Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText.substring(0, 500));
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Data reçue:', data);

      if (data.success && data.data?.modelOptions) {
        console.log('✅ Options chargées:', data.data.modelOptions.length);
        console.log('📋 Exemple d\'option:', data.data.modelOptions[0]);

        setModelOptions(data.data.modelOptions);
      } else {
        throw new Error(data.message || 'Structure de réponse inattendue');
      }
    } catch (error) {
      console.error('💥 Erreur fetchModelOptions:', error);
      setError(`Erreur lors du chargement des modèles: ${error.message}`);
      setModelOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEnumOptions = async (enumType) => {
    if (!enumType) {
      console.error('❌ enumType is required');
      return;
    }

    if (Array.isArray(enumOptions[enumType]) && enumOptions[enumType].length >= 0) {
      console.log(`✅ Enum ${enumType} already loaded (${enumOptions[enumType].length} items)`);
      return;
    }

    if (loadingEnums[enumType]) {
      console.log(`⏳ Enum ${enumType} already loading...`);
      return;
    }

    try {
      setLoadingEnums(prev => ({ ...prev, [enumType]: true }));

      console.log(`🔄 Loading enum: ${enumType}`);

      // ✅ FIX: Use relative URL - setupProxy.js will route to port 3000
      const apiUrl = `http://localhost:3000/api/thematiques/enums/${enumType}`;

      console.log('📡 Calling:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📊 Response status for ${enumType}:`, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Error response for ${enumType}:`, errorData);
        setEnumOptions(prev => ({ ...prev, [enumType]: [] }));
        return;
      }

      const data = await response.json();
      console.log(`✅ Enum data for ${enumType}:`, data);

      if (data.success && Array.isArray(data.data)) {
        setEnumOptions(prev => ({ ...prev, [enumType]: data.data }));
        console.log(`✅ Loaded ${data.data.length} options for ${enumType}`);
      } else {
        console.error(`❌ Invalid response structure for ${enumType}:`, data);
        setEnumOptions(prev => ({ ...prev, [enumType]: [] }));
      }

    } catch (error) {
      console.error(`❌ Exception loading ${enumType}:`, error);
      setEnumOptions(prev => ({ ...prev, [enumType]: [] }));
    } finally {
      setLoadingEnums(prev => ({ ...prev, [enumType]: false }));
    }
  };

  const validateField = (field, value) => {
    const errors = [];

    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push(`${field.label} est requis`);
    }

    if (field.validation && value) {
      const { validation } = field;

      if (validation.len && typeof value === 'string') {
        const [min, max] = validation.len;
        if (value.length < min || value.length > max) {
          errors.push(`${field.label} doit contenir entre ${min} et ${max} caractères`);
        }
      }

      if (validation.isCurrency) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`${field.label} doit être un montant valide`);
        }
      }

      if (validation.isAfter) {
        const compareValue = thematiques.find(t => t.id === field.thematiqueId)?.[validation.isAfter];
        if (compareValue && new Date(value) <= new Date(compareValue)) {
          errors.push(`${field.label} doit être postérieure à la date de début`);
        }
      }
    }

    return errors;
  };

  const updateWithValidation = (id, fieldName, value) => {
    update(id, fieldName, value);

    const thematique = thematiques.find(t => t.id === id);
    if (!thematique?.modeleThematique) return;

    const selectedOption = modelOptions.find(opt => opt.value === thematique.modeleThematique);
    if (!selectedOption) return;

    const fieldConfig = selectedOption.config.fields.find(f => f.name === fieldName);
    if (!fieldConfig) return;

    const errors = validateField(fieldConfig, value);

    setValidationErrors(prev => ({
      ...prev,
      [`${id}-${fieldName}`]: errors
    }));
  };

  const update = (id, field, val) => {
    const updated = thematiques.map(p => {
      if (p.id === id) {
        if (field === 'modeleThematique') {
          return { ...p, [field]: val, fields: {} };
        } else {
          return { ...p, fields: { ...p.fields, [field]: val } };
        }
      }
      return p;
    });
    setThematiques(updated);
    onChange?.(updated);
  };

  const addThematique = () => {
    const newP = {
      id: genId(),
      modeleThematique: '',
      fields: {}
    };
    const updated = [...thematiques, newP];
    setThematiques(updated);
    onChange?.(updated);
    setOpenStates(states => [...states, newP.id]);
  };

  const removeThematique = id => {
    const updated = thematiques.filter(p => p.id !== id);
    setThematiques(updated);
    onChange?.(updated);
    setOpenStates(states => states.filter(sid => sid !== id));

    setValidationErrors(prev => {
      const cleaned = { ...prev };
      Object.keys(cleaned).forEach(key => {
        if (key.startsWith(`${id}-`)) {
          delete cleaned[key];
        }
      });
      return cleaned;
    });
  };

  const toggleOpen = id => {
    setOpenStates(states =>
        states.includes(id)
            ? states.filter(sid => sid !== id)
            : [...states, id]
    );
  };

  const handleCheckboxChange = (thematiqueId, fieldName, optionId, isChecked) => {
    const thematique = thematiques.find(t => t.id === thematiqueId);
    const currentValues = Array.isArray(thematique.fields[fieldName]) ? thematique.fields[fieldName] : [];

    let newValues;
    if (isChecked) {
      newValues = [...currentValues, optionId];
    } else {
      newValues = currentValues.filter(id => id !== optionId);
    }

    update(thematiqueId, fieldName, newValues);
  };

  const formatCurrency = (thematiqueId, fieldName, value) => {
    if (!value) return;

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const formatted = numValue.toFixed(2);
      update(thematiqueId, fieldName, formatted);
    }
  };

    const handleRadioCheckboxChange = (thematiqueId, fieldName, optionId) => {
    const thematique = thematiques.find(t => t.id === thematiqueId);
    if (!thematique) return;

    const currentValue = thematique.fields[fieldName];
    const newValue = currentValue === optionId ? '' : optionId;

    updateWithValidation(thematique.id, fieldName, newValue);
  };


  const renderField = (field, thematique) => {
    const fieldValue = thematique.fields[field.name] || '';
    const fieldErrors = validationErrors[`${thematique.id}-${field.name}`] || [];
    const hasError = fieldErrors.length > 0;

    const commonProps = {
      value: fieldValue,
      onChange: e => updateWithValidation(thematique.id, field.name, e.target.value),
      className: `${styles.formControl} ${hasError ? styles.error : ''}`,
      placeholder: field.placeholder || `Saisir ${field.label.toLowerCase()}`,
      required: field.required
    };

    let inputElement;

    switch (field.type) {
      case 'textarea':
        inputElement = (
            <textarea
                {...commonProps}
                rows={field.rows || 5}
            />
        );
        break;

      case 'date':
        inputElement = (
            <input
                type="date"
                {...commonProps}
                placeholder={undefined}
            />
        );
        break;

      case 'number':
        inputElement = (
            <input
                type="number"
                {...commonProps}
                min={field.min}
                step={field.step}
            />
        );
        break;

      case 'currency':
        inputElement = (
            <div className={styles.currencyInput}>
              <input
                  type="number"
                  {...commonProps}
                  min={field.min}
                  step={field.step}
                  onBlur={e => formatCurrency(thematique.id, field.name, e.target.value)}
              />
              <span className={styles.currencySymbol}>€</span>
            </div>
        );
        break;

      case 'select':
        if (field.enumTable) {
          if (!enumOptions[field.enumTable] && !loadingEnums[field.enumTable]) {
            loadEnumOptions(field.enumTable);
          }
        }

        const selectOptions = Array.isArray(enumOptions[field.enumTable])
            ? enumOptions[field.enumTable]
            : [];

        inputElement = (
            <select {...commonProps} placeholder={undefined}>
              <option value="">Sélectionner</option>
              {selectOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.value || option.libelle}
                  </option>
              ))}
            </select>
        );
        break;


      case 'checkbox-single':
        if (field.enumTable) {
          if (!enumOptions[field.enumTable] && !loadingEnums[field.enumTable]) {
            loadEnumOptions(field.enumTable);
          }
        }

        const checkboxOptions = Array.isArray(enumOptions[field.enumTable])
            ? enumOptions[field.enumTable]
            : [];

         inputElement = (
            <div className={styles.checkboxGroup}>
              {field.description && (
                <p className={styles.fieldDescription}>{field.description}</p>
              )}
              {checkboxOptions.map(option => (
                <label key={option.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    value={option.id}
                      checked={fieldValue === option.id}
                      onChange={() => handleRadioCheckboxChange(thematique.id, field.name, option.id)}
                      className={styles.checkbox}
                  />
                <span>{option.value || option.libelle}</span>
                </label>
              ))}
            </div>
        );
      break;


      case 'checkbox-multiple':
        if (field.enumTable) {
          if (!enumOptions[field.enumTable] && !loadingEnums[field.enumTable]) {
            loadEnumOptions(field.enumTable);
          }
        }

        const checkboxMultipleOptions = Array.isArray(enumOptions[field.enumTable])
            ? enumOptions[field.enumTable]
            : [];

        inputElement = (
            <div className={styles.checkboxGroup}>
              {field.description && (
                  <p className={styles.fieldDescription}>{field.description}</p>
              )}
              {checkboxMultipleOptions.map(option => (
                  <label key={option.id} className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        value={option.id}
                        checked={Array.isArray(fieldValue) ? fieldValue.includes(option.id) : false}
                        onChange={e => handleCheckboxChange(thematique.id, field.name, option.id, e.target.checked)}
                        className={styles.checkbox}
                    />
                    <span>{option.value || option.libelle}</span>
                  </label>
              ))}
            </div>
        );
        break;

      default:
        inputElement = (
            <input
                type="text"
                {...commonProps}
            />
        );
        break;
    }

    return (
        <>
          {inputElement}
          {hasError && (
              <div className={styles.errorMessages}>
                {fieldErrors.map((error, index) => (
                    <span key={index} className={styles.errorMessage}>
                {error}
              </span>
                ))}
              </div>
          )}
        </>
    );
  };

  const renderDynamicFields = (thematique) => {
    if (!thematique.modeleThematique) {
      return <p className={styles.noModelSelected}>Veuillez d'abord sélectionner un modèle de thématique</p>;
    }

    const selectedOption = modelOptions.find(opt => opt.value === thematique.modeleThematique);
    if (!selectedOption) {
      return <p className={styles.modelNotFound}>Configuration de modèle non trouvée</p>;
    }

    return (
        <div className={styles.dynamicFields}>
          <h4 className={styles.sectionTitle}>
            {selectedOption.config.displayName || selectedOption.label}
          </h4>

          {selectedOption.config.fields.map(field => (
              <div key={field.name} className={styles.subStack2}>
                <label className={styles.label}>
                  {field.label}
                  {field.required && <span className={styles.required}>*</span>}
                  {field.tooltip && (
                    <span className="tooltip-container">
                    <span className="tooltip-icon">(i)</span>
                    <span className="tooltip-text">{field.tooltip}</span>
                    </span>
                )}
                </label>
                {renderField(field, thematique)}
                {field.description && (
                    <small className={styles.fieldHelp}>{field.description}</small>
                )}
              </div>
          ))}
        </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des modèles de thématiques...</div>;
  }

  if (error) {
    return (
        <div className={styles.error}>
          <h3>Erreur</h3>
          <p>{error}</p>
          <button onClick={fetchModelOptions} className={styles.retryButton}>
            Réessayer
          </button>
        </div>
    );
  }

  return (
      <div className={`collapsible ${openRoot ? 'is-open' : ''}`}>
        <button
            type="button"
            className="collapsible-header"
            aria-expanded={openRoot}
            onClick={() => setOpenRoot(o => !o)}
        >
          <span className="collapsible-title">{title}</span>
          <span className="collapsible-icon">▶</span>
        </button>

        <div className={`collapsible-content ${styles.thematiqueContent}`}>
          {thematiques.map((thematique, idx) => {
            const isOpen = openStates.includes(thematique.id);
            return (
                <div key={thematique.id} className={`operation-block ${isOpen ? 'is-open' : ''}`}>
                  <button
                      type="button"
                      className="collapsible-header"
                      aria-expanded={isOpen}
                      onClick={() => toggleOpen(thematique.id)}
                  >
                <span className="collapsible-title">
                  Thématique {idx + 1}
                  {thematique.modeleThematique && (
                      <span className={styles.thematiqueType}>
                      ({modelOptions.find(opt => opt.value === thematique.modeleThematique)?.label || 'Modèle sélectionné'})
                    </span>
                  )}
                </span>
                    <span className="collapsible-icon">▶</span>
                  </button>

                  <div className="collapsible-content">
                    {thematiques.length > 1 && (
                        <button
                            type="button"
                            className={styles['suivi-supprimer']}
                            style={{ float: 'right' }}
                            onClick={() => removeThematique(thematique.id)}
                        >
                          🗑
                        </button>
                    )}

                    <div className={styles.subStack2}>
                      <label className={styles.label}>
                        Modèle de thématique *
                      </label>
                      <select
                          value={thematique.modeleThematique}
                          onChange={e => update(thematique.id, 'modeleThematique', e.target.value)}
                          className={styles.formControl}
                          required
                      >
                        <option value="">Sélectionner un modèle</option>
                        {modelOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                        ))}
                      </select>
                    </div>

                    {renderDynamicFields(thematique)}
                  </div>
                </div>
            );
          })}

          <button
              type="button"
              className="button button-secondary add-button"
              onClick={addThematique}
              style={{ marginTop: '1rem' }}
              disabled={loading}
          >
            + Ajouter une thématique
          </button>
        </div>
      </div>
  );
}