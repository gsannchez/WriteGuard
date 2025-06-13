const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

class TextAnalysisEngine {
    constructor() {
        this.history = [];
        this.maxHistorySize = 100;
        this.processingQueue = [];
        this.isProcessing = false;
        this.lastProcessTime = 0;
        this.minProcessInterval = 500; // ms
        this.tokenizer = new natural.WordTokenizer();
        this.language = 'es';
    }

    async analyzeText(text, context = {}) {
        // Agregar a la cola de procesamiento
        return new Promise((resolve) => {
            this.processingQueue.push({
                text,
                context,
                resolve
            });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.processingQueue.length === 0) return;

        const now = Date.now();
        if (now - this.lastProcessTime < this.minProcessInterval) {
            setTimeout(() => this.processQueue(), this.minProcessInterval);
            return;
        }

        this.isProcessing = true;
        const { text, context, resolve } = this.processingQueue.shift();

        try {
            const results = await this.performAnalysis(text, context);
            this.addToHistory(text, results);
            resolve(results);
        } catch (error) {
            console.error('Error en análisis:', error);
            resolve({ errors: [], suggestions: [] });
        } finally {
            this.isProcessing = false;
            this.lastProcessTime = Date.now();
            this.processQueue();
        }
    }

    async performAnalysis(text, context) {
        const tokens = tokenizer.tokenize(text);
        const errors = [];
        const suggestions = [];

        // Análisis básico de palabras
        for (let i = 0; i < tokens.length; i++) {
            const word = tokens[i];
            
            // Ejemplo: detectar palabras en inglés (simulado)
            if (this.looksLikeEnglish(word)) {
                errors.push({
                    type: 'idioma',
                    word: word,
                    suggestion: this.getSpanishEquivalent(word),
                    explanation: 'Posible palabra en inglés'
                });
            }

            // Ejemplo: detectar palabras mal escritas comunes
            const correction = this.checkSpelling(word);
            if (correction) {
                errors.push({
                    type: 'ortografía',
                    word: word,
                    suggestion: correction,
                    explanation: 'Posible error ortográfico'
                });
            }
        }

        // Análisis de frases (simulado)
        const phrases = text.split(/[.!?]+/).filter(p => p.trim().length > 0);
        for (const phrase of phrases) {
            const suggestion = this.analyzeSentence(phrase.trim());
            if (suggestion) {
                suggestions.push(suggestion);
            }
        }

        return {
            errors,
            suggestions,
            timestamp: Date.now(),
            language: this.detectLanguage(text),
            tokenCount: tokens.length
        };
    }

    looksLikeEnglish(word) {
        // Lista básica de palabras comunes en inglés
        const commonEnglishWords = ['the', 'is', 'are', 'was', 'were', 'will', 'would', 'should', 'could'];
        return commonEnglishWords.includes(word.toLowerCase());
    }

    getSpanishEquivalent(word) {
        // Diccionario básico inglés-español
        const dictionary = {
            'the': 'el/la',
            'is': 'es',
            'are': 'son/están',
            'was': 'era/estaba',
            'were': 'eran/estaban',
            'will': 'será/estará',
            'would': 'sería/estaría',
            'should': 'debería',
            'could': 'podría'
        };
        return dictionary[word.toLowerCase()] || word;
    }

    checkSpelling(word) {
        // Lista básica de correcciones comunes
        const corrections = {
            'q': 'que',
            'xq': 'porque',
            'pq': 'porque',
            'k': 'que',
            'tb': 'también',
            'tmb': 'también',
            'x': 'por'
        };
        return corrections[word.toLowerCase()];
    }

    analyzeSentence(sentence) {
        // Análisis básico de estructura de frases
        if (sentence.length < 10) {
            return {
                original: sentence,
                suggestion: 'Considere expandir esta frase para mayor claridad',
                type: 'estilo',
                confidence: 0.8
            };
        }
        return null;
    }

    detectLanguage(text) {
        // Implementación básica de detección de idioma
        const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'en', 'de'];
        const englishWords = ['the', 'a', 'an', 'and', 'in', 'of', 'to', 'is', 'are'];

        const tokens = tokenizer.tokenize(text.toLowerCase());
        let spanishCount = 0;
        let englishCount = 0;

        tokens.forEach(token => {
            if (spanishWords.includes(token)) spanishCount++;
            if (englishWords.includes(token)) englishCount++;
        });

        return spanishCount > englishCount ? 'es' : 'en';
    }

    addToHistory(text, results) {
        this.history.unshift({
            text,
            results,
            timestamp: Date.now()
        });

        if (this.history.length > this.maxHistorySize) {
            this.history.pop();
        }
    }

    // Métodos auxiliares
    isSingularArticle(article) {
        return ['el', 'la', 'un', 'una'].includes(article.toLowerCase());
    }

    isPluralVerb(verb) {
        return verb.endsWith('n') || verb.endsWith('s');
    }

    isGenderMismatch(article, noun) {
        const feminineArticles = ['la', 'las'];
        const masculineArticles = ['el', 'los'];
        const feminineEndings = ['a', 'as'];
        const masculineEndings = ['o', 'os'];

        const isFeminineArticle = feminineArticles.includes(article.toLowerCase());
        const isMasculineArticle = masculineArticles.includes(article.toLowerCase());
        const isFeminineNoun = feminineEndings.some(ending => noun.toLowerCase().endsWith(ending));
        const isMasculineNoun = masculineEndings.some(ending => noun.toLowerCase().endsWith(ending));

        return (isFeminineArticle && isMasculineNoun) || (isMasculineArticle && isFeminineNoun);
    }

    getCorrectArticle(noun) {
        const feminineEndings = ['a', 'as'];
        return feminineEndings.some(ending => noun.toLowerCase().endsWith(ending)) ? 'la' : 'el';
    }

    getSingularVerb(verb) {
        const verbMap = {
            'juegan': 'juega',
            'comen': 'come',
            'beben': 'bebe',
            'corren': 'corre'
        };
        return verbMap[verb.toLowerCase()] || verb;
    }

    getStyleSuggestion(type, text) {
        const suggestions = {
            repetition: text => {
                const words = text.split(' ');
                return [...new Set(words)].join(' ');
            },
            longSentence: text => {
                const sentences = text.split(/[,;]/);
                return sentences[0] + '.';
            },
            passiveVoice: text => {
                return text.replace(/\b(?:es|son|fue|fueron)\s+(?:por|para)\s+(\w+)/gi, '$1');
            }
        };

        return suggestions[type] ? suggestions[type](text) : text;
    }

    getStyleExplanation(type) {
        const explanations = {
            repetition: 'Evite la repetición de palabras',
            longSentence: 'La oración es demasiado larga',
            passiveVoice: 'Considere usar voz activa'
        };
        return explanations[type] || 'Mejora de estilo sugerida';
    }

    areSentencesCoherent(sentence1, sentence2) {
        // Implementación básica de coherencia
        const connectors = ['además', 'por lo tanto', 'sin embargo', 'porque', 'ya que'];
        return connectors.some(connector => 
            sentence2.toLowerCase().includes(connector) || 
            this.haveCommonTopics(sentence1, sentence2)
        );
    }

    haveCommonTopics(sentence1, sentence2) {
        const topics1 = this.extractTopics(sentence1);
        const topics2 = this.extractTopics(sentence2);
        return topics1.some(topic => topics2.includes(topic));
    }

    extractTopics(sentence) {
        // Implementación básica de extracción de temas
        const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'en', 'de'];
        return tokenizer.tokenize(sentence.toLowerCase())
            .filter(word => !stopWords.includes(word));
    }

    getCoherenceSuggestion(prevSentence, currentSentence) {
        // Implementación básica de sugerencia de coherencia
        return `Además, ${currentSentence}`;
    }
}

module.exports = new TextAnalysisEngine(); 