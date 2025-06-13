from flask import Flask, request, jsonify
from corrector import ModelCorrector

app = Flask(__name__)

# Inicializa el corrector. La carga del modelo comenzará en un hilo separado.
corrector = ModelCorrector()

@app.route('/correct', methods=['POST'])
def correct_text():
    data = request.get_json()
    if not data or 'sentence' not in data:
        return jsonify({"status": "error", "message": "La solicitud debe ser un JSON con una clave 'sentence'."}), 400

    sentence = data.get('sentence')
    if not sentence or not sentence.strip():
        # Si la frase está vacía, devuelve un éxito con la frase vacía.
        return jsonify({"status": "success", "corrected_sentence": ""})

    # La lógica de 'cargando' y 'error' ahora está encapsulada en correct_sentence.
    # Simplemente llamamos a la función y devolvemos su resultado directamente.
    response_data = corrector.correct_sentence(sentence)

    # Si el modelo está cargando, el corrector devolverá un status 'loading'.
    # Devolvemos un código 503 para que el cliente sepa que debe reintentar.
    if response_data.get("status") == "loading":
        return jsonify(response_data), 503
        
    # Para éxito o error, devolvemos la respuesta JSON con un código 200.
    return jsonify(response_data)

if __name__ == '__main__':
    # Usar host='0.0.0.0' hace que el servidor sea accesible en la red local.
    # El threaded=True es importante para manejar la carga del modelo en segundo plano sin bloquear.
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
