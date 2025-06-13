from huggingface_hub import snapshot_download
import os

# Define el identificador del modelo en Hugging Face
model_id = "SkitCon/gec-spanish-BARTO-COWS-L2H"

# Define el directorio local donde se guardará el modelo
# Se creará una carpeta 'model' dentro de 'python-service'
local_dir = os.path.join(os.path.dirname(__file__), "model")

print(f"Iniciando la descarga del modelo '{model_id}' a la carpeta local '{local_dir}'...")
print("Esto puede tardar varios minutos dependiendo de tu conexión a internet.")

# Usamos snapshot_download para bajar todos los archivos del repositorio del modelo
snapshot_download(
    repo_id=model_id,
    local_dir=local_dir,
    # Usamos symlinks=False por compatibilidad con Windows y para evitar advertencias
    local_dir_use_symlinks=False,  
    # Permite reanudar descargas interrumpidas
    resume_download=True,
)

print("\n¡Descarga completada!")
print(f"Los archivos del modelo han sido guardados en: {local_dir}") 