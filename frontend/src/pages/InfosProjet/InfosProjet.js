// src/pages/InfosProjetSection/InfosProjetSection.js

import { useState } from 'react';
import InfosProjetSection from '../../components/projet/InfosProjet/IP';
import '../../styles/globals.css';


export default function InfosProjet() {

    const [infos, setInfos] = useState({
        nom_projet: '',
        statut_projet_id: 1,
        description: '',
        datePriseConnaissance: '',
    });

    return (
        <div className="p-6">
            <InfosProjetSection value={infos} onChange={setInfos} />
        </div>
    );
}
