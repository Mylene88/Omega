// frontend/src/visualisation/components/common/Pagination.js
import React from 'react';

export default function Pagination({
                                       currentPage,
                                       totalPages,
                                       totalItems,
                                       itemsPerPage,
                                       onPageChange
                                   }) {
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            // Afficher toutes les pages si <= 5
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Logique pour afficher avec ellipses
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                Affichage de {startItem} à {endItem} sur {totalItems} projets
            </div>

            <div className="pagination-buttons">
                <button
                    className="pagination-button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11 1l-7 7 7 7V1z"/>
                    </svg>
                    Précédent
                </button>

                <div className="pagination-page-numbers">
                    {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                ...
                            </span>
                        ) : (
                            <button
                                key={page}
                                className={`pagination-page-button ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>

                <button
                    className="pagination-button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Suivant
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 1l7 7-7 7V1z"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}