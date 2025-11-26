// frontend/src/visualisation/hooks/useAccordion.js
import { useState, useCallback } from 'react';

export function useAccordion(initialState = {}) {
    const [expandedSections, setExpandedSections] = useState(initialState);

    const toggleSection = useCallback((key) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const expandAll = useCallback(() => {
        setExpandedSections((prev) => {
            const newState = {};
            Object.keys(prev).forEach(key => {
                newState[key] = true;
            });
            return newState;
        });
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedSections((prev) => {
            const newState = {};
            Object.keys(prev).forEach(key => {
                newState[key] = false;
            });
            return newState;
        });
    }, []);

    return {
        expandedSections,
        toggleSection,
        expandAll,
        collapseAll
    };
}