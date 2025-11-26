// frontend/src/components/common/Search/Search.js
import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import LocationOnIcon from "@mui/icons-material/LocationOn";

function Search({ data = [], onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        
        if (value.length > 1) {
            const searchValue = value.toLowerCase();
            
            // Filtrer les communes qui correspondent à n'importe quel champ
            const filtered = data.filter((item) => 
            item.nom?.toLowerCase().includes(searchValue) ||
            item.arrondissement?.toLowerCase().includes(searchValue) ||
            item.epci?.toLowerCase().includes(searchValue) ||
            item.codeInsee?.toLowerCase().startsWith(searchValue)
            );
            
            // ✅ Calculer un score de pertinence 
            const scoredResults = filtered.map(item => {
            const nom = item.nom?.toLowerCase() || '';
            const arr = item.arrondissement?.toLowerCase() || '';
            const epci = item.epci?.toLowerCase() || '';
            const code = item.codeInsee?.toLowerCase() || '';
            
            let score = 0;
            
            // Score pour le NOM (priorité maximale)
            if (nom === searchValue) {
                score += 1000; // Correspondance exacte du nom
            } else if (nom.startsWith(searchValue)) {
                score += 500; // Le nom commence par la recherche
            } else if (nom.includes(searchValue)) {
                score += 100; // Le nom contient la recherche
            }
            
            // Score pour le CODE INSEE (haute priorité)
            if (code === searchValue) {
                score += 800; // Code INSEE exact
            } else if (code.startsWith(searchValue)) {
                score += 400; // Code INSEE commence par
            }
            
            // Score pour l'ARRONDISSEMENT (priorité moyenne)
            if (arr.includes(searchValue)) {
                score += 50; // Arrondissement contient
            }
            
            // Score pour l'EPCI (priorité moyenne)
            if (epci.includes(searchValue)) {
                score += 30; // EPCI contient
            }
            
            return {
                ...item,
                score
            };
            });
            
            // Trier par score décroissant, puis alphabétiquement
            const sorted = scoredResults.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Score le plus élevé en premier
            }
            // Si même score, trier alphabétiquement par nom
            return (a.nom || '').localeCompare(b.nom || '');
            });
            
            setResults(sorted.slice(0, 10));
        } else {
            setResults([]);
        }
    };


    const handleSelect = (item) => {
        setQuery(item.nom);
        setResults([]);
        onSelect(item);
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <TextField
                label="Recherche"
                variant="outlined"
                fullWidth
                value={query}
                onChange={handleChange}
                placeholder="Commune, service, thématique, etc."
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" />
                        </InputAdornment>
                    ),
                    endAdornment: query && (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="effacer la recherche"
                                onClick={handleClear}
                                edge="end"
                                size="small"
                            >
                                <ClearIcon />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            {results.length > 0 && (
                <ul
                    style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "8px 0 0 0",
                        maxHeight: 300,
                        overflowY: "auto",
                        backgroundColor: "white",
                        border: "1px solid #dcdde1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        position: "absolute",
                        width: "100%",
                        zIndex: 1000,
                    }}
                >
                    {results.map((item) => (
                        <li
                            key={item.codeInsee || item.id || item.value || item.nom}
                            onClick={() => handleSelect(item)}
                            style={{
                                padding: "12px 16px",
                                cursor: "pointer",
                                borderBottom: "1px solid #ecf0f1",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px"
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}
                        >
                            <LocationOnIcon style={{ color: "#e74c3c", fontSize: "20px" }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "#2c3e50", marginBottom: "4px" }}>
                                    {item.nom}
                                </div>
                                <div style={{ fontSize: "12px", color: "#7f8c8d" }}>
                                    {[
                                        item.type && `Type: ${item.type}`,
                                        item.arrondissement && `Arr: ${item.arrondissement}`,
                                        item.epci && `EPCI: ${item.epci}`,
                                        item.codeInsee && `Code: ${item.codeInsee}`
                                    ].filter(Boolean).join(' • ')}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {query.length > 1 && results.length === 0 && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "8px",
                    padding: "12px 16px",
                    backgroundColor: "white",
                    border: "1px solid #dcdde1",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    color: "#7f8c8d",
                    fontSize: "14px",
                    zIndex: 1000
                }}>
                    Aucun résultat trouvé
                </div>
            )}
        </div>
    );
}

export default Search;
