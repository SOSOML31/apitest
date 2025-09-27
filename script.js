  const video = document.getElementById('video');       // Élément vidéo pour afficher le flux de la caméra
  const canvas = document.getElementById('canvas');     // Élément canvas pour capturer une image du flux
  const context = canvas.getContext('2d');              // Contexte 2D du canvas pour dessiner l'image
  const resultDiv = document.getElementById('result');  // Div pour afficher le résultat du scan

  //  Variables de contrôle
  let lastDetectedPlate = '';   // Stocke la dernière plaque détectée pour éviter les doublons
  let isScanning = false;       // Empêche les scans multiples simultanés

  //  Accès à la caméra arrière du dispositif
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => video.srcObject = stream); // Affiche le flux vidéo dans l'élément <video>

  //  Fonction de capture d'image toutes les 3 secondes
  function capture() {
    // Vérifie que la vidéo est prête et qu'un scan n'est pas déjà en cours
    if (video.readyState !== 4 || isScanning) return;

    // Définit les dimensions du canvas selon la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessine l'image actuelle de la vidéo sur le canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertit le canvas en blob PNG et l'envoie à la fonction OCR
    canvas.toBlob(sendToOCR, 'image/png');
  }

//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

  // Envoie l'image capturée au serveur OCR et traite la réponse
  function sendToOCR(blob) {
    isScanning = true; // Active le verrou de scan 

    // Crée un formulaire avec l'image à envoyer
    const formData = new FormData();
    formData.append('image', blob, 'capture.png');

    // Envoie la requête
    fetch('http://localhost:8080/ocr', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json()) // Convertit la réponse en JSON
    .then(data => {
      // Si une plaque est détectée et différente de la précédente
      if (data.text && data.text !== lastDetectedPlate) {
        lastDetectedPlate = data.text; // Met à jour la dernière plaque

        // 🔓 Cas d'accès autorisé
        if (data.statut === 'Autorisé') {
          resultDiv.textContent = `✅ Accès autorisé pour ${data.proprietaire || 'propriétaire inconnu'}`;
          resultDiv.className = 'status-success';

        //  Cas d'accès interdit
        } else if (data.statut === 'Non autorisé') {
          resultDiv.textContent = `❌ Accès interdit – ${data.message || 'Plaque non reconnue'}`;
          resultDiv.className = 'status-error';

        //  Cas de réponse inattendue
        } else {
          resultDiv.textContent = '⚠️ Réponse inattendue du serveur.';
          resultDiv.className = 'status-warning';
        }
      }
    })
    .finally(() => {
      isScanning = false; // Libère le verrou de scan
    });
  }

  // ⏱️ Lance la capture toutes les 3 secondes
  setInterval(capture, 3000);