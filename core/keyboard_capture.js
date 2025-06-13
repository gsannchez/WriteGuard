const { GlobalKeyboardListener } = require('node-global-key-listener');
const EventEmitter = require('events');

class KeyboardCapture extends EventEmitter {
    constructor() {
        super();
        this.keyListener = null;
        this.isListenerActive = false;
        this.isPaused = false;
        this.currentSentence = '';
        // Mapeo de nombres de teclas de la librería a caracteres o identificadores
        this.keyNameMap = {
            'PERIOD': '.', 'COMMA': ',', 'SLASH': '/', 'BACK_SLASH': '\\',
            'SQUARE_BRACKET_OPEN': '[', 'SQUARE_BRACKET_CLOSE': ']',
            'SEMICOLON': ';', 'APOSTROPHE': "'", 'GRAVE': '`',
            'MINUS': '-', 'EQUALS': '=', 'SPACE': ' ', 'RETURN': 'ENTER',
            'TAB': 'TAB', 'CAPS_LOCK': 'CAPS_LOCK', 'SHIFT': 'SHIFT',
            'CONTROL': 'CONTROL', 'ALT': 'ALT', 'UP': 'UP', 'DOWN': 'DOWN',
            'LEFT': 'LEFT', 'RIGHT': 'RIGHT', 'BACKSPACE': 'BACKSPACE',
            'DELETE': 'DELETE', 'ESCAPE': 'ESCAPE', 'QUESTION_MARK': '?',
            'EXCLAMATION_MARK': '!',
        };
        // Caracteres que indican fin de una oración para análisis inmediato
        this.sentenceSeparators = ['.', '?', '!'];
        this.debounceTimeout = null;
        this.debounceTime = 1500; // ms de inactividad para analizar
    }

    start() {
        if (this.isListenerActive) return;

        console.log('Iniciando captura de teclado global...');
        this.keyListener = new GlobalKeyboardListener();
        this.isListenerActive = true;

        this.keyListener.addListener((e, down) => {
            // Solo procesar teclas cuando se presionan (no al soltar)
            // y si el listener no está en pausa
            if (this.isPaused || e.state !== 'DOWN') return;

            const key = this.getKeyName(e.name);
            this.handleKeyPress(key);
        });
    }

    stop() {
        if (!this.isListenerActive) return;
        console.log('Deteniendo captura de teclado global.');
        if (this.keyListener) {
            this.keyListener.kill();
        }
        this.isListenerActive = false;
        clearTimeout(this.debounceTimeout);
    }

    pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        clearTimeout(this.debounceTimeout); // Cancelar análisis pendiente al pausar
        console.log('--- Captura en Pausa ---');
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        // Limpiamos la frase para no re-analizar el texto que acabamos de corregir
        this.currentSentence = '';
        console.log('--- Captura Reanudada ---');
    }

    handleKeyPress(key) {
        // Reiniciar siempre el temporizador de inactividad con cada tecla
        clearTimeout(this.debounceTimeout);

        if (key.length === 1 && !['ENTER', 'TAB'].includes(key)) {
            this.currentSentence += key;
        } else if (key === 'SPACE') {
            // Añadir espacio solo si la frase no está vacía y no termina ya en espacio
            if (this.currentSentence.length > 0 && this.currentSentence.slice(-1) !== ' ') {
                this.currentSentence += ' ';
            }
        } else if (key === 'BACKSPACE') {
            // Manejar retroceso
            this.currentSentence = this.currentSentence.slice(0, -1);
        }

        // Si la tecla presionada es un separador de frase, analizar inmediatamente
        if (this.sentenceSeparators.includes(key)) {
            this.processCapturedSentence();
        } else {
            // Si no, programar un análisis después de un tiempo de inactividad
            this.debounceTimeout = setTimeout(() => {
                this.processCapturedSentence();
            }, this.debounceTime);
        }
    }
    
    processCapturedSentence() {
        const sentenceToProcess = this.currentSentence.trim();
        if (sentenceToProcess.length === 0) return;

        console.log(`Frase capturada para análisis: "${sentenceToProcess}"`);
        this.emit('text-captured', sentenceToProcess);
        
        // Limpiar la frase actual para empezar a construir la siguiente
        this.currentSentence = '';
    }

    getKeyName(name) {
        // Devuelve el carácter o identificador mapeado, o el nombre original si no está en el mapa
        return this.keyNameMap[name] || name;
    }
}

// Exportar una única instancia (patrón Singleton)
module.exports = new KeyboardCapture(); 