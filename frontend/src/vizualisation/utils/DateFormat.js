// frontend/src/utils/DateFormat.js

export const formatDateTime = (dateString) => {
    if (!dateString) return 'Non renseigné';
    
    try {
        const date = new Date(dateString);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) return 'Non renseigné';
        
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné';
    
    try {
        const date = new Date(dateString);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) return 'Non renseigné';
        
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatDateLong = (dateString) => {
    if (!dateString) return 'Non renseigné';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Non renseigné';
        
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatTime = (dateString) => {
    if (!dateString) return 'Non renseigné';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Non renseigné';
        
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de l\'heure:', error);
        return 'Non renseigné';
    }
};
