const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
require('dotenv').config();

const keyboardCapture = require('../core/keyboard_capture');
const corrector = require('../core/corrector');

let mainWindow = null;
let tray = null;
let pythonService = null;

const PYTHON_SERVICE_URL = 'http://127.0.0.1:5000';
const MAX_RETRIES = 100; // 100 reintentos * 3000 ms = 5 minutos
const RETRY_DELAY = 3000; // 3 segundos

// Función mejorada para llamar al servicio de IA con reintentos
async function correctTextWithRetry(text) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await axios.post(`${PYTHON_SERVICE_URL}/correct`, { sentence: text }, { timeout: 15000 });
            // Si el modelo aún está cargando, el servicio devuelve un 200 con un campo específico.
            if (response.data.status === 'loading') {
                console.log(`Intento ${i + 1}/${MAX_RETRIES}: El modelo de IA aún se está cargando, esperando...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                continue;
            }
            return response.data; // Éxito
        } catch (error) {
            // Reintentar en errores de conexión o si el servicio no está disponible (modelo cargando)
            if (error.code === 'ECONNREFUSED' || (error.response && error.response.status === 503)) {
                console.log(`Intento ${i + 1}/${MAX_RETRIES}: El servicio de IA no está listo, reintentando...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
                // Para otros errores (ej. 404, 500), fallar inmediatamente.
                console.error('Error en corrección con servicio IA:', error.message);
                return null; // Devolver null para indicar un fallo no recuperable
            }
        }
    }
    console.error('El servicio de IA no estuvo disponible después de varios reintentos.');
    return null; // Fallo después de todos los reintentos
}

function startPythonService() {
    return new Promise((resolve, reject) => {
        console.log('Iniciando servicio de Python...');
        const scriptPath = path.join(__dirname, '..', 'python-service', 'app.py');
        pythonService = spawn('python', [scriptPath]);

        const onData = (data) => {
            const output = data.toString();
            // Imprimir la salida del servicio para depuración
            // Dividir en stdout/stderr ayuda a colorear, pero el mensaje puede estar en cualquiera
            console.log(`[PythonService]: ${output}`);
            if (output.includes('Running on http://127.0.0.1:5000')) {
                console.log('Servicio de Python listo.');
                // Quitar los listeners para no resolver la promesa múltiples veces
                pythonService.stdout.removeListener('data', onData);
                pythonService.stderr.removeListener('data', onData);
                resolve();
            } else if (output.includes('Address already in use')) {
                console.log('El servicio de Python ya estaba en ejecución.');
                pythonService.stdout.removeListener('data', onData);
                pythonService.stderr.removeListener('data', onData);
                resolve();
            }
        };

        pythonService.stdout.on('data', onData);
        pythonService.stderr.on('data', onData);

        pythonService.on('close', (code) => {
            console.log(`El servicio de Python terminó con el código ${code}`);
            pythonService = null;
        });

        pythonService.on('error', (err) => {
            console.error('Error al iniciar el proceso de Python:', err);
            reject(err);
        });
    });
}

function createWindow() {
    console.log('Creando ventana principal...');
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
    mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    console.log('Creando icono en la bandeja del sistema...');
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Mostrar Ventana',
            click: () => {
                if (!mainWindow) {
                    createWindow();
                } else {
                    mainWindow.show();
                }
            }
        },
        {
            label: 'Activar/Desactivar Corrección Automática',
            click: toggleAutomaticCorrection
        },
        { type: 'separator' },
        { label: 'Salir', click: () => app.quit() }
    ]);
    tray.setToolTip('Text Smart Pilot');
    tray.setContextMenu(contextMenu);
}

function showNotification(title, body) {
    new Notification({ title, body }).show();
}

function toggleAutomaticCorrection() {
    if (keyboardCapture.isListenerActive) {
        keyboardCapture.stop();
        showNotification('Corrección Automática', 'Corrección automática desactivada.');
    } else {
        keyboardCapture.start();
        showNotification('Corrección Automática', 'Corrección automática activada.');
    }
}

ipcMain.handle('correct-text', async (event, text) => {
    console.log(`Recibida solicitud de corrección manual para: "${text}"`);
    try {
        const response = await axios.post(`${PYTHON_SERVICE_URL}/correct`, { sentence: text }, { timeout: 60000 });
        if (response.data && response.data.corrected_sentence) {
            return response.data.corrected_sentence;
        }
        throw new Error('Respuesta inválida del servicio.');
    } catch (error) {
        console.error('Error en corrección manual:', error.message);
        const userMessage = error.code === 'ECONNREFUSED'
            ? 'No se pudo conectar con el servicio de corrección.'
            : 'El modelo de corrección está tardando mucho en responder. Inténtalo de nuevo.';
        throw new Error(userMessage);
    }
});

function cleanup() {
    console.log('Iniciando limpieza de recursos...');
    if (pythonService) {
        console.log('Deteniendo el servicio de Python...');
        pythonService.kill('SIGINT');
    }
    keyboardCapture.cleanup();
    if (tray) tray.destroy();
}

app.whenReady().then(async () => {
    try {
        await startPythonService();
        createWindow();
        createTray();

        keyboardCapture.on('text-captured', async (capturedText) => {
            console.log(`Frase capturada para análisis: "${capturedText}"`);
            
            // La corrección de typos local ha sido eliminada. El texto va directo a la IA.
            const responseData = await correctTextWithRetry(capturedText);

            if (responseData && responseData.status === 'success' && responseData.corrected_sentence) {
                const { corrected_sentence } = responseData;

                // Comparar la corrección final con el texto original.
                if (corrected_sentence.toLowerCase() !== capturedText.toLowerCase()) {
                    console.log(`Corrección final (IA): "${corrected_sentence}"`);
                    keyboardCapture.pause();
                    await corrector.correctPhrase(capturedText, corrected_sentence);
                    setTimeout(() => keyboardCapture.resume(), 100);
                }
            } else if (responseData && responseData.status === 'error') {
                console.error(`Error del servicio de IA: ${responseData.message}`);
            } else {
                console.error('No se pudo obtener una respuesta del servicio de IA, posiblemente porque el tiempo de espera (5 minutos) fue superado mientras el modelo se descargaba.');
            }
        });

        toggleAutomaticCorrection(); // Iniciar activado por defecto
        globalShortcut.register('CommandOrControl+Shift+X', toggleAutomaticCorrection);

        console.log('Text Smart Pilot listo. Presiona Ctrl+Shift+X para activar/desactivar la corrección automática.');
    } catch (error) {
        console.error("Error fatal durante el inicio:", error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    console.log('Todas las ventanas cerradas, la aplicación sigue en la bandeja.');
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
    console.log('Limpiando antes de salir...');
    keyboardCapture.stop();
    cleanup();
});