// src/pages/Porteur-Contact/PorteurContact.js
import { useState } from 'react';
//import PorteurContactSection from '../../components/porteur/Porteur-Contact/PorteurContactSection';
import PorteurContactSection from '../../components/porteur/Porteur-Contact/PC';
import '../../styles/globals.css';


export default function PorteurContact({ value, onChange}) {
    return (
            <PorteurContactSection value={value} onChange={onChange} />
    );
}

