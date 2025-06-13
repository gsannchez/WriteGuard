from transformers import T5Tokenizer, T5ForConditionalGeneration
from threading import Thread, Lock

class ModelCorrector:
    def __init__(self):
        # Inicializar todos los atributos primero
        self.model = None
        self.tokenizer = None
        self.loading = True
        self.load_lock = Lock()
        self.load_error = None # Para almacenar el error de carga
        
        # Modelo SOTA para corrección gramatical. No necesita prefijos.
        self.model_name = "pszemraj/flan-t5-large-grammar-synthesis"
        
        # Iniciar el hilo de carga al final
        self.load_model_thread = Thread(target=self._load_model)
        self.load_model_thread.start()

    def _load_model(self):
        # El lock previene condiciones de carrera, aunque en este diseño simple no es estrictamente necesario, es una buena práctica.
        with self.load_lock:
            print(f"Iniciando la carga del modelo: {self.model_name}...")
            try:
                # Usar T5Tokenizer explícitamente puede ser más robusto para modelos T5.
                self.tokenizer = T5Tokenizer.from_pretrained(self.model_name)
                self.model = T5ForConditionalGeneration.from_pretrained(self.model_name)
                print("Modelo cargado exitosamente.")
            except BaseException as e: # Capturamos cualquier tipo de error, incluso los más graves.
                print(f"Error catastrófico al cargar el modelo: {e}")
                self.load_error = e # Guardamos la excepción
                self.model = None
                self.tokenizer = None
            finally:
                # Pase lo que pase, indicamos que la carga ha terminado.
                self.loading = False

    def is_loading(self):
        return self.loading

    def correct_sentence(self, sentence: str, debug: bool = False):
        if self.is_loading():
            # Devolvemos un estado de carga claro para que el cliente pueda reintentar.
            return {"status": "loading"}

        if not self.model or not self.tokenizer:
            error_message = f"Error al cargar el modelo: {self.load_error}" if self.load_error else "El modelo no pudo ser cargado."
            # Devolvemos un estado de error claro.
            return {"status": "error", "message": error_message}

        # Un prompt en inglés, claro y específico para la tarea, es más robusto para los modelos Flan-T5.
        input_text = f"Correct the grammar and spelling in the following Spanish sentence: '{sentence}'"
        
        inputs = self.tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True)
        
        summary_ids = self.model.generate(
            inputs['input_ids'], 
            num_beams=4, # 4 es un buen balance para calidad/velocidad
            max_length=512, 
            early_stopping=True
        )
        corrected_sentence = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        
        debug_info = {}
        if debug:
            debug_info = {
                "original_sentence": sentence,
                "corrected_sentence": corrected_sentence,
                "model_name": self.model_name,
                "input_text": input_text,
                "model_ready": not self.is_loading() and self.model is not None
            }
        
        # Devolvemos una estructura de respuesta consistente.
        return {"status": "success", "corrected_sentence": corrected_sentence, "debug_info": debug_info} 