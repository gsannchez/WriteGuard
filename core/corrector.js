const { exec } = require('child_process');

class Corrector {
    constructor(debugMode = false) {
        this.debugMode = debugMode;
    }

    async correctWord(wrongWord, correctWord) {
        if (this.debugMode) {
            console.log(`Intentando corregir "${wrongWord}" por "${correctWord}"`);
        }

        try {
            // 1. Simular pulsaciones de retroceso para borrar la palabra incorrecta
            for (let i = 0; i < wrongWord.length; i++) {
                await this._sendKeys('{BACKSPACE}');
                await this.sleep(15); // Pausa para estabilidad
            }
            
            // 2. Escribir la palabra corregida
            // Escapamos caracteres especiales para SendKeys
            const sanitizedCorrectWord = correctWord.replace(/([+^%~(){}[\]])/g, '{$1}');
            await this._sendKeys(sanitizedCorrectWord);

            if (this.debugMode) {
                console.log('Corrección aplicada con éxito.');
            }

        } catch (error) {
            console.error('Error durante la corrección automática:', error);
        }
    }

    async correctPhrase(originalPhrase, correctedPhrase) {
        if (this.debugMode) {
            console.log(`Intentando corregir frase: "${originalPhrase}" -> "${correctedPhrase}"`);
        }

        try {
            // 1. Borrar la frase original. Se necesita un espacio al final para asegurar
            // que el último carácter se borra correctamente en algunos editores.
            const backspaces = '{BACKSPACE}'.repeat(originalPhrase.length + 1);
            await this._sendKeys(backspaces);
            await this.sleep(20);
            
            // 2. Escribir la frase corregida seguida de un espacio
            const sanitizedCorrectPhrase = correctedPhrase.replace(/([+^%~(){}[\]])/g, '{$1}');
            await this._sendKeys(sanitizedCorrectPhrase + ' ');

            if (this.debugMode) {
                console.log('Corrección de frase aplicada con éxito.');
            }

        } catch (error) {
            console.error('Error durante la corrección automática de frase:', error);
        }
    }

    _sendKeys(keys) {
        return new Promise((resolve, reject) => {
            // Codificamos el texto en Base64 para pasarlo de forma segura a PowerShell.
            // Esto evita problemas con comillas simples, dobles, y otros caracteres especiales.
            const buffer = Buffer.from(keys, 'utf8');
            const base64Keys = buffer.toString('base64');

            // El comando de PowerShell decodifica el texto desde Base64 y luego lo envía.
            const command = `
                $decodedText = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${base64Keys}'));
                $wshell = New-Object -ComObject wscript.shell;
                $wshell.SendKeys($decodedText);
            `;

            // Usamos -EncodedCommand para pasar el script codificado en UTF-16LE, la forma más robusta.
            const powershellCommand = `powershell -EncodedCommand ${Buffer.from(command, 'utf16le').toString('base64')}`;

            exec(powershellCommand, (error, stdout, stderr) => {
                if (error) {
                    // Incluir stdout y stderr para más contexto en caso de error.
                    console.error(`Error de PowerShell: ${error.message}`);
                    if (stdout) console.log(`PowerShell STDOUT: ${stdout}`);
                    if (stderr) console.error(`PowerShell STDERR: ${stderr}`);
                    return reject(error);
                }
                resolve();
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new Corrector(true); 