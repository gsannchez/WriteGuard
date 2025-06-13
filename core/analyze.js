const dictionary = require('./dictionary');
const axios = require('axios');
const { distance } = require('fastest-levenshtein');
const contextualRules = require('./contextual_rules');

// Helper para inferir género y número (simplificado)
const GENDER = { M: 'Masculine', F: 'Feminine' };
const NUMBER = { S: 'Singular', P: 'Plural' };

function inferProperties(word) {
    const l_word = word.toLowerCase();
    let gender = GENDER.M; // Por defecto
    let number = NUMBER.S; // Por defecto

    // Inferir número
    if (l_word.endsWith('s')) {
        number = NUMBER.P;
    }

    // Inferir género (muy simplificado)
    if (l_word.endsWith('a') || l_word.endsWith('as')) {
        gender = GENDER.F;
    } else if (l_word.endsWith('o') || l_word.endsWith('os')) {
        gender = GENDER.M;
    }
    
    return { gender, number };
}

const PYTHON_SERVICE_URL = 'http://127.0.0.1:5000/analyze';

class TextAnalyzer {
    constructor(debugMode = false) {
        this.debugMode = debugMode;
    }

    async analyze(sentence) {
        let analysis;
        try {
            const response = await axios.post(PYTHON_SERVICE_URL, { sentence });
            analysis = response.data;
        } catch (error) {
            console.error('Error al conectar con el servicio de Python:', error.message);
            // Fallback a un análisis simple si el servicio no está disponible
            return this.simpleFallbackAnalysis(sentence);
        }

        let errors = [];

        // 1. Aplicar reglas contextuales específicas
        const contextualErrors = contextualRules.apply(sentence, analysis);
        errors = errors.concat(contextualErrors);

        // 2. Aplicar reglas de concordancia gramatical
        const agreementErrors = this.checkAgreementErrors(analysis);
        errors = errors.concat(agreementErrors);

        // --- Lógica de detección de errores usando el análisis de spaCy ---
        // 3. Detección de errores ortográficos básicos
        for (const token of analysis.tokens) {
            // Ignorar puntuación, palabras de 1 letra y palabras ya marcadas
            if (token.pos === 'PUNCT' || token.text.length <= 1 || errors.some(e => e.originalPhrase === token.text)) {
                continue;
            }

            if (!dictionary.hasWord(token.text.toLowerCase()) && !dictionary.hasWord(token.lemma.toLowerCase())) {
                // Pasamos el POS del token original para mejorar las sugerencias
                const suggestions = await this.getSpellingSuggestions(token.text, token.pos);
                if (suggestions.length > 0) {
                    errors.push({
                        originalPhrase: token.text,
                        correctedPhrase: suggestions[0], 
                        explanation: 'Posible error ortográfico.'
                    });
                }
            }
        }

        // 4. (PRÓXIMAMENTE) Detección de errores semánticos
        // Ej: "haber" vs "a ver"

        return {
            originalText: sentence,
            errors: errors,
            full_analysis: analysis // Para depuración
        };
    }

    async getSpellingSuggestions(word, originalPos, limit = 5) {
        const wordLower = word.toLowerCase();
        
        const candidates = await dictionary.getWordsByStartingLetter(wordLower[0]);
        if (candidates.length === 0) return [];

        const scoredCandidates = candidates.map(candidate => ({
            word: candidate,
            dist: distance(wordLower, candidate)
        }));

        scoredCandidates.sort((a, b) => a.dist - b.dist);
        const topCandidates = scoredCandidates.slice(0, 20).map(c => c.word); // Tomamos más candidatos para filtrar por POS

        try {
            // Analizar todos los candidatos a la vez para eficiencia
            const response = await axios.post(PYTHON_SERVICE_URL, { sentence: topCandidates.join(' ') });
            const analysis = response.data;
            
            const posFiltered = analysis.tokens
                .filter(token => token.pos === originalPos)
                .map(token => token.text);

            if (posFiltered.length > 0) {
                // Re-ordenamos los filtrados por la distancia de Levenshtein original
                const finalSuggestions = posFiltered.sort((a, b) => {
                    const distA = distance(wordLower, a);
                    const distB = distance(wordLower, b);
                    return distA - distB;
                });
                return finalSuggestions.slice(0, limit);
            }
        } catch (error) {
            console.error("Error al obtener POS para las sugerencias:", error.message);
            // Si falla, devolvemos las sugerencias basadas solo en Levenshtein
            return topCandidates.slice(0, limit);
        }

        // Si ningún candidato coincide con el POS, devolvemos los mejores por distancia
        return topCandidates.slice(0, limit);
    }
    
    // Análisis de fallback si el servicio de Python no responde
    simpleFallbackAnalysis(sentence) {
        console.warn("ADVERTENCIA: Usando análisis de fallback. La precisión será limitada.");
        const tokens = sentence.split(/\s+/);
        const errors = [];
        // Lógica muy simple, solo para demostrar el fallback
        for (const token of tokens) {
            if (token.length > 3 && !dictionary.hasWord(token.toLowerCase())) {
                 errors.push({
                    originalPhrase: token,
                    correctedPhrase: token, 
                    explanation: 'Posible error ortográfico (fallback).'
                });
            }
        }
        return { originalText: sentence, errors: errors };
    }

    checkAgreementErrors(analysis) {
        const errors = [];
        const { tokens, dependencies } = analysis;

        dependencies.forEach(dep => {
            // Error de concordancia Adjetivo-Sustantivo
            if (dep.dep === 'amod') { // amod = adjectival modifier
                const headNoun = tokens.find(t => t.text === dep.head);
                const adj = tokens.find(t => t.text === dep.text);

                if (headNoun && adj) {
                    const nounProps = inferProperties(headNoun.text);
                    const adjProps = inferProperties(adj.text);

                    if (nounProps.gender !== adjProps.gender || nounProps.number !== adjProps.number) {
                        errors.push({
                            originalPhrase: `${headNoun.text} ${adj.text}`,
                            correctedPhrase: headNoun.text, // La sugerencia es más compleja
                            explanation: `Error de concordancia: El adjetivo '${adj.text}' (${adjProps.gender}/${adjProps.number}) no concuerda con el sustantivo '${headNoun.text}' (${nounProps.gender}/${nounProps.number}).`
                        });
                    }
                }
            }

            // Error de concordancia Determinante-Sustantivo
            if (dep.dep === 'det') {
                const headNoun = tokens.find(t => t.text === dep.head);
                const det = tokens.find(t => t.text === dep.text);

                if (headNoun && det) {
                    const nounProps = inferProperties(headNoun.text);
                    const detProps = inferProperties(det.text);

                     if (detProps.number !== nounProps.number) {
                         errors.push({
                            originalPhrase: `${det.text} ${headNoun.text}`,
                            correctedPhrase: headNoun.text, // La sugerencia es más compleja
                            explanation: `Error de concordancia: El determinante '${det.text}' (${detProps.number}) no concuerda con el sustantivo '${headNoun.text}' (${nounProps.number}).`
                        });
                     }
                }
            }
        });

        return errors;
    }
}

module.exports = new TextAnalyzer(); 