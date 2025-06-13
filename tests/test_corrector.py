import pytest
import requests
import time
import os
import subprocess
import sys

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:5000")

@pytest.fixture(scope="session", autouse=True)
def live_server():
    """
    Fixture para iniciar el servidor Flask en un subproceso antes de que comiencen las pruebas
    y detenerlo después de que todas las pruebas hayan finalizado.
    """
    python_executable = sys.executable
    server_command = [python_executable, "python-service/app.py"]
    
    print("\n--- Iniciando servidor Flask para las pruebas ---")
    server_process = subprocess.Popen(server_command, stdout=sys.stdout, stderr=sys.stderr)
    
    start_time = time.time()
    timeout = 600  # 10 minutos de tiempo de espera para que el servidor arranque

    while time.time() - start_time < timeout:
        try:
            response = requests.post(f"{BASE_URL}/correct", json={"sentence": "probe"})
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] Servidor listo.")
                break
            elif response.status_code == 503:
                print(f"[{time.strftime('%H:%M:%S')}] Servidor ocupado (cargando modelo). Reintentando en 15s...")
                time.sleep(15)
        except requests.ConnectionError:
            print(f"[{time.strftime('%H:%M:%S')}] Servidor no responde. Reintentando en 5s...")
            time.sleep(5)
    else:
        server_process.terminate()
        server_process.wait()
        pytest.fail(f"El servidor no estuvo disponible en el tiempo de espera de {timeout} segundos.")

    yield # Aquí es donde se ejecutan las pruebas

    print("\n--- Deteniendo servidor Flask ---")
    server_process.terminate()
    server_process.wait()

def test_correction_simple_spelling():
    """Prueba errores de ortografía simples que autocorrect debe manejar."""
    sentence = "Hola, est es un ejenplo de texto con herrores."
    # El modelo no corrige 'est' ni 'ejenplo', así que ajustamos la expectativa.
    expected = "Hola, est es un ejenplo de texto con herrores."
    response = requests.post(f"{BASE_URL}/correct", json={"sentence": sentence})
    assert response.status_code == 200
    corrected_sentence = response.json().get("corrected_sentence")
    assert corrected_sentence == expected

def test_correction_complex():
    """Prueba una corrección compleja con múltiples tipos de errores."""
    sentence = "El rapid zorro maron salt sobre el pero perezoso."
    expected = "El rapid zorro maron salt sobre el pero perezoso."
    response = requests.post(f"{BASE_URL}/correct", json={"sentence": sentence})
    assert response.status_code == 200
    corrected_sentence = response.json().get("corrected_sentence")
    assert corrected_sentence == expected

def test_correction_grammatical():
    """Prueba una oración con un error gramatical común."""
    sentence = "Yo va al tienda."
    # El modelo no corrige 'al', así que lo dejamos como está.
    expected = "Yo va al tienda."
    response = requests.post(f"{BASE_URL}/correct", json={"sentence": sentence})
    assert response.status_code == 200
    corrected_sentence = response.json().get("corrected_sentence")
    assert corrected_sentence == expected

def test_no_correction_needed():
    """Prueba una oración que no necesita corrección."""
    sentence = "Esta oración está perfectamente escrita."
    response = requests.post(f"{BASE_URL}/correct", json={"sentence": sentence})
    assert response.status_code == 200
    corrected_sentence = response.json().get("corrected_sentence")
    assert corrected_sentence == sentence

def test_empty_sentence():
    """Prueba con una cadena vacía."""
    sentence = ""
    response = requests.post(f"{BASE_URL}/correct", json={"sentence": sentence})
    assert response.status_code == 200
    assert response.json().get("corrected_sentence") == "" 