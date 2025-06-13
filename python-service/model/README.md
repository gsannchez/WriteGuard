---
language:
- es
metrics:
- bleu
base_model:
- vgaraujov/bart-base-spanish
pipeline_tag: text2text-generation
library_name: transformers
tags:
- gec
- spanish
- seq2seq
- bart
- cows-l2h
---

This model has been trained on 80% of the COWS-L2H dataset for grammatical error correction of Spanish text. The corpus was sentencized, so the model has been fine-tuned for SENTENCE CORRECTION. This model will likely not perform well on an entire paragraph. To correct a paragraph, sentencize the text and run the model for each sentence.

BLEU: 0.846 on COWS-L2H

Example usage:

```python
from transformers import AutoTokenizer, BartForConditionalGeneration

tokenizer = AutoTokenizer.from_pretrained("SkitCon/gec-spanish-BARTO-COWS-L2H")
model = BartForConditionalGeneration.from_pretrained("SkitCon/gec-spanish-BARTO-COWS-L2H")

input_sentences = ["Yo va al tienda.", "Espero que tú ganas."]

tokenized_text = tokenizer(input_sentences, max_length=128, padding="max_length", truncation=True, return_tensors="pt")

input_ids = tokenized_text["input_ids"].squeeze()
attention_mask = tokenized_text["attention_mask"].squeeze()

outputs = model.generate(input_ids=input_ids, attention_mask=attention_mask)

for sentence in tokenizer.batch_decode(outputs, skip_special_tokens=True):
  print(sentence)
```