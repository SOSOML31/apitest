const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const resultDiv = document.getElementById('result');

// Variables de contrôle
let lastDetectedPlate = '';
let isScanning = false;
let isPaused = false; // Variable pour gérer la pause

// Accès à la caméra arrière du dispositif
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => video.srcObject = stream);

// Fonction de capture d'image toutes les 3 secondes
function capture() {
    // Vérifie que la vidéo est prête, qu'un scan n'est pas déjà en cours, et que la vidéo n'est pas en pause
    if (video.readyState !== 4 || isScanning || isPaused) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(sendToOCR, 'image/png');
}

// Envoie l'image capturée au serveur OCR et traite la réponse
function sendToOCR(blob) {
    isScanning = true;
    
    const formData = new FormData();
    formData.append('image', blob, 'capture.png');
    
    fetch('http://localhost:8080/ocr', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.text && data.text !== lastDetectedPlate) {
            lastDetectedPlate = data.text;
            
            if (data.statut === 'Autorisé') {
                resultDiv.textContent = `✅ Accès autorisé pour ${data.proprietaire || 'propriétaire inconnu'}`;
                resultDiv.className = 'status-success';
            } else if (data.statut === 'Non autorisé') {
                resultDiv.textContent = `❌ Accès interdit – ${data.message || 'Plaque non reconnue'}`;
                resultDiv.className = 'status-error';
            } else {
                resultDiv.textContent = '⚠️ Réponse inattendue du serveur.';
                resultDiv.className = 'status-warning';
            }
        }
    })
    .finally(() => {
        isScanning = false;
    });
}

// Fonction pour envoyer manuellement une plaque
function sendManualPlate(plateNumber) {
    if (!plateNumber || plateNumber.trim() === '') {
        resultDiv.textContent = '⚠️ Veuillez entrer un numéro de plaque.';
        resultDiv.className = 'status-warning';
        return;
    }
    
    isScanning = true;
    
    const formData = new FormData();
    formData.append('text', plateNumber.trim());
    
    fetch('http://localhost:8080/ocr', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        lastDetectedPlate = plateNumber.trim();
        
        if (data.statut === 'Autorisé') {
            resultDiv.textContent = `✅ Accès autorisé pour ${data.proprietaire || 'propriétaire inconnu'}`;
            resultDiv.className = 'status-success';
        } else if (data.statut === 'Non autorisé') {
            resultDiv.textContent = `❌ Accès interdit – ${data.message || 'Plaque non reconnue'}`;
            resultDiv.className = 'status-error';
        } else {
            resultDiv.textContent = '⚠️ Réponse inattendue du serveur.';
            resultDiv.className = 'status-warning';
        }
    })
    .catch(error => {
        resultDiv.textContent = `❌ Erreur: ${error.message}`;
        resultDiv.className = 'status-error';
    })
    .finally(() => {
        isScanning = false;
    });
}

// Gestion du bouton pause/lecture
document.getElementById('pauseBtn').addEventListener('click', function() {
    isPaused = !isPaused;
    this.textContent = isPaused ? '▶️ Reprendre' : '⏸️ Pause';
});

// Gestion du bouton d'envoi manuel
document.getElementById('sendManualBtn').addEventListener('click', function() {
    const inputField = document.querySelector('.search-bar input[type="text"]');
    sendManualPlate(inputField.value);
});

// Lance la capture toutes les 3 secondes
setInterval(capture, 3000);