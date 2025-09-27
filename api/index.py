from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import logging
import os
import easyocr
import numpy as np


# ✅ Initialisation du lecteur EasyOCR (français + anglais)
reader = easyocr.Reader(['fr', 'en'], gpu=False, verbose=False)


# ✅ Fonction OCR avec EasyOCR
def extract_text(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    result = reader.readtext(np.array(image), detail=0)
    if result:
        return result[0]  # On retourne le premier texte détecté
    return ""

# ✅ Chemin vers le fichier texte
FICHIER_PLAQUES = os.path.join(os.path.dirname(__file__), "plaques.txt")

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

def charger_plaques():
    """Charge les plaques depuis le fichier texte"""
    if not os.path.exists(FICHIER_PLAQUES):
        return {}

    plaques = {}
    with open(FICHIER_PLAQUES, "r", encoding="utf-8") as f:
        for ligne in f:
            parts = ligne.strip().split(";")
            if len(parts) == 3:
                numero, proprietaire, statut = parts
                plaques[numero.replace(" ", "").upper()] = {
                    "proprietaire": proprietaire,
                    "statut": statut
                }
    return plaques

@app.route('/ocr', methods=['POST'])
def ocr():
    try:
        if 'image' not in request.files:
            logging.warning("Aucune image reçue")
            return jsonify({'error': 'Aucun fichier image reçu'}), 400

        image_file = request.files['image']
        image_bytes = image_file.read()

        informationOCR = extract_text(image_bytes).replace(" ", "").upper()
        logging.info(f"Texte extrait : {informationOCR}")

        plaques = charger_plaques()
        info = plaques.get(informationOCR)

        if info:
            response = {
                'text': informationOCR,
                'statut': info["statut"],
                'proprietaire': info["proprietaire"]
            }
            logging.info(f"✅ Plaque '{informationOCR}' reconnue : {info['statut']} ({info['proprietaire']})")
        else:
            response = {
                'text': informationOCR,
                'statut': 'Non autorisé',
                'message': 'Plaque inconnue'
            }
            logging.info(f"❌ Plaque '{informationOCR}' non reconnue : Interdit")

        return jsonify(response)

    except Exception as e:
        logging.error(f"Erreur OCR : {str(e)}")
        return jsonify({'error': 'Erreur interne'}), 500

# ✅ Handler pour Vercel
def handler(environ, start_response):
    return app(environ, start_response)
