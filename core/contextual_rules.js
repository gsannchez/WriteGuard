// core/contextual_rules.js

const commonErrors = [
    {
        // "a ver" vs "haber"
        // Detecta: "vamos a haber que pasa" -> "vamos a ver que pasa"
        // Detecta: "tiene que a ver" -> "tiene que haber"
        pattern: /a\s+ver/i,
        suggestion: 'haber',
        condition: (analysis, index) => {
            // Si "a ver" va precedido de un verbo que indica obligación o futuro
            const prevToken = analysis.tokens[index - 1];
            return prevToken && prevToken.tag.startsWith('VM'); // Verbo principal
        }
    },
    {
        pattern: /haber/i,
        suggestion: 'a ver',
        condition: (analysis, index) => {
            // Si "haber" se usa en un contexto de expectación o pregunta
            const prevToken = analysis.tokens[index - 1];
            return prevToken && (prevToken.lemma === 'ir' || prevToken.lemma === 'vamos');
        }
    },
    {
        // "echo" vs "hecho"
        pattern: /echo/i,
        suggestion: 'hecho',
        condition: (analysis, index) => {
            // Si "echo" es participio del verbo "hacer". El análisis de dependencias es clave.
            const token = analysis.tokens[index];
            const depInfo = analysis.dependencies.find(d => d.text === token.text);
            // Si funciona como un auxiliar o parte de una construcción verbal
            return depInfo && (depInfo.dep === 'aux' || depInfo.dep === 'ROOT'); 
        }
    },
    {
        pattern: /hecho/i,
        suggestion: 'echo',
        condition: (analysis, index) => {
             // Si "hecho" se usa como verbo "echar" en primera persona.
            const token = analysis.tokens[index];
            const depInfo = analysis.dependencies.find(d => d.text === token.text && d.dep === 'ROOT');
            const subject = analysis.dependencies.find(d => d.head === token.text && d.dep === 'nsubj');
            return depInfo && subject && (subject.text.toLowerCase() === 'yo' || !subject); // "Yo echo" o sujeto implícito
        }
    }
    // ... añadir más reglas aquí ...
];

class ContextualRules {
    apply(sentence, analysis) {
        const errors = [];
        const lowerSentence = sentence.toLowerCase();

        commonErrors.forEach(rule => {
            if (rule.pattern.test(lowerSentence)) {
                const tokenIndex = analysis.tokens.findIndex(t => t.text.toLowerCase().match(rule.pattern));
                if (tokenIndex !== -1 && rule.condition(analysis, tokenIndex)) {
                    errors.push({
                        originalPhrase: analysis.tokens[tokenIndex].text,
                        correctedPhrase: rule.suggestion,
                        explanation: 'Error contextual común.'
                    });
                }
            }
        });

        return errors;
    }
}

module.exports = new ContextualRules(); 