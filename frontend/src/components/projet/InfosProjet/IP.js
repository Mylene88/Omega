// src/components/projet/Infosprojet/InfosProjetSection.jsx
import { useId, useState, useEffect } from 'react';
import '../../common/Collapsible/collapsible.css';
import styles from '../../../styles/InfosProjetSection.module.css';
import { API_BASE_URL } from '../../../config/apiConfig';

export default function InfosProjetSection({
                                               value = {},
                                               onChange,
                                               title = 'Infos du projet',
                                               defaultOpen = true,
                                           }) {
    const [open, setOpen] = useState(!!defaultOpen);
    const [statuses, setStatuses] = useState([]);

    const idNom = useId();
    const idStatut = useId();
    const idDesc = useId();
    const idDate = useId();
    const panelId = useId();

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/statut`)
            .then(res => res.json())
            .then(data => setStatuses(Array.isArray(data) ? data : []))
            .catch(err => console.error('Erreur de fetch pour les statuts:', err));
    }, []);

    const setField = (field, val) => {
        const finalValue = field.endsWith('_id') ? (parseInt(val, 10) || null) : val;
        onChange?.({ ...value, [field]: finalValue });
    };

    return (
        <div className={`collapsible ${open ? 'is-open' : ''}`}>
            <button
                type="button"
                className="collapsible-header"
                aria-expanded={open}
                onClick={() => setOpen(s => !s)}
            >
                <span className="collapsible-title">{title}</span>
                <span className="collapsible-icon" aria-hidden="true">▶</span>
            </button>

            <div id={panelId} className="collapsible-content">
                <div className={styles.stack6}>
                    {/* Nom du projet */}
                    <div className={styles.subStack2}>
                        <label htmlFor={idNom} className={styles.label}>Nom du projet</label>
                        <input
                            id={idNom}
                            type="text"
                            value={value?.nom_projet ?? ''}
                            onChange={(e) => setField('nom_projet', e.target.value)}
                            className={styles.formControl}
                        />
                    </div>

                    {/* Statut du projet */}
                    <div className={styles.subStack2}>
                        <label htmlFor={idStatut} className={styles.label}>Statut du projet</label>
                        <select
                            id={idStatut}
                            value={value?.statut_projet_id ?? ''}
                            onChange={(e) => setField('statut_projet_id', e.target.value)}
                            className={styles.formControl}
                        >
                            <option value="">Sélectionner un statut</option>
                            {statuses.map((s) => (
                                <option key={s.id_statut} value={s.id_statut}>
                                    {s.libelle}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className={styles.subStack2}>
                        <label htmlFor={idDesc} className={styles.label}>Description</label>
                        <textarea
                            id={idDesc}
                            rows={4}
                            value={value?.description ?? ''}
                            onChange={(e) => setField('description', e.target.value)}
                            className={`${styles.formControl} ${styles.textarea}`}
                        />
                    </div>

                    {/* Date de prise de connaissance */}
                    <div className={styles.subStack2}>
                        <label htmlFor={idDate} className={styles.label}>
                            Date de prise de connaissance par la DDT
                        </label>
                        <input
                            id={idDate}
                            type="date"
                            value={value?.date_ident_projet ?? ''}
                            onChange={(e) => setField('date_ident_projet', e.target.value)}
                            className={styles.formControl}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
