// frontend/src/visualisation/pages/VisualisationPage.jsx
import React from 'react';
import Map from '../components/MapView';

export default function VisualisationPage() {
    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <Map />
        </div>
    );
}
