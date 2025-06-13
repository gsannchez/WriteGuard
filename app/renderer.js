const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const correctButton = document.getElementById('correctButton');
    const outputText = document.getElementById('outputText');

    if (correctButton && inputText && outputText) {
        correctButton.addEventListener('click', async () => {
            const textToCorrect = inputText.value;
            if (textToCorrect.trim() !== '') {
                outputText.innerText = 'Corrigiendo...'; // Mostrar un mensaje de espera
                try {
                    // Usar invoke para enviar texto y esperar la respuesta
                    const correctedText = await ipcRenderer.invoke('correct-text', textToCorrect);
                    outputText.innerText = correctedText; // Mostrar el texto corregido
                } catch (error) {
                    console.error('Error durante la corrección:', error);
                    // Mostrar un mensaje de error legible
                    outputText.innerText = `Error: ${error.message || 'Ocurrió un error desconocido durante la corrección.'}`; 
                }
            } else {
                outputText.innerText = 'Por favor, introduce texto para corregir.';
            }
        });

        // Eliminar listeners antiguos de send/on si existen y ya no se usan
        // ipcRenderer.removeAllListeners('corrected-text');
        // ipcRenderer.removeAllListeners('correction-error');

    } else {
        console.error('Elementos de la interfaz no encontrados.');
    }
}); 