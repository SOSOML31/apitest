document.getElementById('fileInput').addEventListener('change', function (e) {
  const files = e.target.files;
  const count = files.length;
  document.getElementById('imagesProcessed').textContent = count;
  document.getElementById('uploadSize').textContent = 'Maintenant';

  // Simuler une réduction de données
  const totalSizeMB = [...files].reduce((acc, file) => acc + file.size / (1024 * 1024), 0);
  const reducedMB = (totalSizeMB * 0.3).toFixed(2); // Supposons 30% de compression
  document.getElementById('dataReduced').textContent = `${reducedMB} MB`;
  document.getElementById('avgCompression').textContent = '30%';
  document.getElementById('bandwidthSaved').textContent = `${reducedMB} MB`;
});
