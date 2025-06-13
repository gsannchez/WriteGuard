const { clipboard, globalShortcut } = require('electron');
const TextAnalyzer = require('./analyze');
const corrector = require('./corrector');

const textAnalyzer = new TextAnalyzer(true); // Activar modo debug

class TextCapture {
    constructor() {
        this.lastText = '';
        this.isCapturing = false;
        this.buffer = '';
        this.lastKeyTime = Date.now();
        this.KEY_TIMEOUT = 500; // ms
        this.bufferSize = 1000; // caracteres
        this.debugMode = true; // Cambiado a true por defecto para diagnóstico
        this.keyBuffer = [];
        this.lastClipboardContent = '';
        this.analysisHistory = [];
        this.registeredShortcuts = [];
        this.analysisTimeout = null;
    }

    initialize() {
        console.log('Inicializando TextCapture...');
        try {
            // Registrar atajos globales
            this.registerShortcut('CommandOrControl+Shift+G', () => {
                console.log('Atajo de activación detectado');
                this.toggleCapture();
            }, 'toggle-capture');

            this.registerShortcut('CommandOrControl+Shift+S', () => {
                console.log('Atajo de sugerencias detectado');
                this.showSuggestions();
            }, 'show-suggestions');

            this.registerShortcut('CommandOrControl+Shift+D', () => {
                console.log('Atajo de debug detectado');
                this.toggleDebugMode();
            }, 'toggle-debug');

            // Iniciar monitoreo
            this.startMonitoring();
            console.log('TextCapture inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar TextCapture:', error);
        }
    }

    registerShortcut(accelerator, callback, name) {
        try {
            const success = globalShortcut.register(accelerator, callback);
            if (success) {
                console.log(`Atajo ${name} (${accelerator}) registrado correctamente`);
                this.registeredShortcuts.push(accelerator);
            } else {
                console.error(`Error al registrar atajo ${name} (${accelerator})`);
            }
        } catch (error) {
            console.error(`Error al registrar atajo ${name}:`, error);
        }
    }

    toggleCapture() {
        try {
            this.isCapturing = !this.isCapturing;
            console.log(`Estado de captura cambiado a: ${this.isCapturing}`);
            if (this.isCapturing) {
                this.startCapture();
            } else {
                this.stopCapture();
            }
            this.logDebug(`Captura ${this.isCapturing ? 'activada' : 'desactivada'}`);
        } catch (error) {
            console.error('Error en toggleCapture:', error);
        }
    }

    toggleDebugMode() {
        try {
            this.debugMode = !this.debugMode;
            console.log(`Modo debug cambiado a: ${this.debugMode}`);
            this.logDebug(`Modo debug ${this.debugMode ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error('Error en toggleDebugMode:', error);
        }
    }

    startCapture() {
        console.log('Iniciando captura...');
        try {
            this.buffer = '';
            this.lastText = '';
            this.lastClipboardContent = clipboard.readText();
            this.monitorClipboard();
            this.monitorKeyboard();
            console.log('Captura iniciada correctamente');
        } catch (error) {
            console.error('Error al iniciar captura:', error);
        }
    }

    stopCapture() {
        console.log('Deteniendo captura...');
        try {
            this.buffer = '';
            this.lastText = '';
            this.keyBuffer = [];
            console.log('Captura detenida correctamente');
        } catch (error) {
            console.error('Error al detener captura:', error);
        }
    }

    startMonitoring() {
        console.log('Iniciando monitoreo...');
        try {
            this.monitorClipboard();
            this.monitorKeyboard();
            console.log('Monitoreo iniciado correctamente');
        } catch (error) {
            console.error('Error al iniciar monitoreo:', error);
        }
    }

    monitorClipboard() {
        console.log('Iniciando monitoreo del portapapeles...');
        try {
            setInterval(() => {
                if (!this.isCapturing) return;

                const currentContent = clipboard.readText();
                if (currentContent !== this.lastClipboardContent) {
                    console.log('Cambio detectado en el portapapeles');
                    this.scheduleAnalysis(currentContent);
                    this.lastClipboardContent = currentContent;
                }
            }, 100);
        } catch (error) {
            console.error('Error en monitoreo del portapapeles:', error);
        }
    }

    monitorKeyboard() {
        console.log('Iniciando monitoreo del teclado...');
        try {
            setInterval(() => {
                if (!this.isCapturing) return;

                const now = Date.now();
                if (now - this.lastKeyTime > this.KEY_TIMEOUT) {
                    if (this.buffer.length > 0) {
                        console.log('Procesando buffer de teclado');
                        this.scheduleAnalysis(this.buffer);
                        this.buffer = '';
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error en monitoreo del teclado:', error);
        }
    }

    scheduleAnalysis(text) {
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }
        this.analysisTimeout = setTimeout(() => {
            this.processText(text);
        }, 500); // Debounce de 500ms
    }

    async processText(text) {
        if (!this.isCapturing) return;

        try {
            this.logDebug(`Procesando texto: ${text.substring(0, 50)}...`);
            
            const results = await textAnalyzer.analyze(text);
            console.log('Resultados del análisis:', results);

            if (results.errors.length > 0) {
                const error = results.errors[0];
                const originalWord = error.originalPhrase;
                const correctedWord = error.correctedPhrase;

                // Para evitar bucles de corrección, solo corregimos si la palabra original está presente.
                if (text.includes(originalWord)) {
                    await corrector.correctWord(originalWord, correctedWord);
                    
                    this.logDebug(`Corrección aplicada: "${originalWord}" -> "${correctedWord}"`);

                    this.emit('text-corrected', {
                        original: text,
                        corrected: text.replace(originalWord, correctedWord),
                        errorCount: results.errors.length,
                        firstError: error
                    });
                }
            }

            this.analysisHistory.push({
                text,
                results,
                timestamp: Date.now()
            });

            // Mantener solo los últimos 100 análisis
            if (this.analysisHistory.length > 100) {
                this.analysisHistory.shift();
            }

            // Emitir evento para análisis (útil para la ventana de debug)
            this.emit('textChange', {
                text,
                results,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error al procesar texto:', error);
        }
    }

    showSuggestions() {
        try {
            if (!this.isCapturing) {
                console.log('No se pueden mostrar sugerencias: captura inactiva');
                return;
            }
            
            const lastAnalysis = this.analysisHistory[this.analysisHistory.length - 1];
            if (lastAnalysis && lastAnalysis.results.errors.length > 0) {
                console.log('Mostrando sugerencias del último análisis');
                
                // Extraer sugerencias de los errores
                const suggestions = lastAnalysis.results.errors.flatMap(error => error.suggestions || []);

                this.emit('showSuggestions', {
                    text: lastAnalysis.text,
                    suggestions: suggestions,
                    timestamp: Date.now()
                });
            } else {
                console.log('No hay análisis previos o errores para mostrar sugerencias');
            }
        } catch (error) {
            console.error('Error al mostrar sugerencias:', error);
        }
    }

    emit(event, data) {
        try {
            console.log(`Emitiendo evento ${event}`);
            if (this.onTextChange && event === 'textChange') {
                this.onTextChange(data);
            }
            if (this.onShowSuggestions && event === 'showSuggestions') {
                this.onShowSuggestions(data);
            }
            if (this.onTextCorrected && event === 'text-corrected') {
                this.onTextCorrected(data);
            }
        } catch (error) {
            console.error(`Error al emitir evento ${event}:`, error);
        }
    }

    logDebug(message) {
        if (this.debugMode) {
            console.log(`[WriteGuard Debug] ${message}`);
        }
    }

    getAnalysisHistory() {
        return this.analysisHistory;
    }

    clearHistory() {
        try {
            this.analysisHistory = [];
            this.logDebug('Historial de análisis limpiado');
        } catch (error) {
            console.error('Error al limpiar historial:', error);
        }
    }

    cleanup() {
        console.log('Limpiando recursos de TextCapture...');
        try {
            // Desregistrar todos los atajos
            this.registeredShortcuts.forEach(shortcut => {
                globalShortcut.unregister(shortcut);
            });
            this.registeredShortcuts = [];
            console.log('Recursos limpiados correctamente');
        } catch (error) {
            console.error('Error al limpiar recursos:', error);
        }
    }
}

module.exports = new TextCapture(); 