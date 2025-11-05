// frontend/src/visualisation/pages/VisualisationPage.jsx
import React, { useState } from 'react';
import Map from '../components/MapView';
import Sidebar from '../components/Sidebar';

export default function VisualisationPage() {
    const [selectedId, setSelectedId] = useState(null);
    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <Sidebar selectedId={selectedId} onClose={() => setSelectedId(null)} />
            <Map onSelect={setSelectedId} />
        </div>
    );
}
