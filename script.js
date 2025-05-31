const stopwords = {
  en: new Set("a an and are as at be by for from has he in is it its of on that the to was will with but they have had what said each which she do how their if up out many then them these so some would make like into him time two more go no".split(" ")),
  es: new Set("el la de que y es en un una por con para como su del se los las no lo le da su son desde hasta cuando donde porque pero si ya muy también todo hacer más entre sobre después tanto mismo cada tanto bien otros otra vez puede ser estar hacer tener".split(" ")),
  fr: new Set("le de et à un il être et en avoir que pour dans ce son une sur avec ne se pas tout plus par grand il avoir ce pouvoir ou dire ce notre vous tout faire comme aller voir savoir prendre venir vouloir même".split(" ")),
  de: new Set("der die und in den von zu das mit sich des auf für ist im dem nicht ein zu eine als auch nach bei einer hat dass er sich der und sie es oder an werden wenn noch können durch man muss wo wie was".split(" ")),
  // Add more languages as needed
};

let chartInstance ;
let currentLanguage = 'en';

// File upload handling
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('inputText').value = e.target.result;
    showNotification('File uploaded successfully!', 'success');
  };
  reader.readAsText(file);
}

// Drag and drop functionality
const fileUploadArea = document.getElementById('fileUploadArea');

fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
      document.getElementById('inputText').value = event.target.result;
      showNotification('File uploaded successfully!', 'success');
    };
    reader.readAsText(file);
  }
});

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [];
}

function tokenize(sentence, lang = 'en') {
  const words = sentence.toLowerCase().match(/[a-z]+/g) || [];
  const currentStopwords = stopwords[lang] || stopwords.en;
  return words.filter(w => w.length >= 3 && !currentStopwords.has(w));
}

function calculateTFIDF(word, sentWords, allSentences) {
  let tf = sentWords.filter(w => w === word).length / sentWords.length;
  let docCount = allSentences.filter(s => s.includes(word)).length;
  let idf = Math.log(allSentences.length / (docCount + 1));
  return tf * idf;
}

function getPositionBonus(pos, total) {
  if (total <= 1) return 1.0;
  if (pos === 0) return 1.2;
  if (pos === total - 1) return 1.1;
  if (pos === 1) return 1.05;
  return 0.9;
}

function summarize() {
  const text = document.getElementById("inputText").value.trim();
  if (!text) {
    showNotification('Please enter some text to summarize!', 'warning');
    return;
  }

  document.getElementById("loader").style.display = "block";
  currentLanguage = document.getElementById("languageSelect").value;

  setTimeout(() => {
    const sentences = splitSentences(text).map(s => s.trim()).filter(s => s.length > 8);
    const tokenized = sentences.map(s => tokenize(s, currentLanguage));
    const scored = [];
    const wordFreq = {};

    for (let i = 0; i < sentences.length; i++) {
      const words = tokenized[i];
      if (words.length === 0) {
        scored.push({ score: 0, index: i });
        continue;
      }

      for (let word of words) wordFreq[word] = (wordFreq[word] || 0) + 1;

      let tfidfSum = words.reduce((sum, word) => sum + calculateTFIDF(word, words, tokenized), 0);
      let avgTFIDF = tfidfSum / words.length;
      let posBonus = getPositionBonus(i, sentences.length);
      let lengthPenalty = (words.length < 6) ? 0.7 : (words.length > 30) ? 0.8 : 1.0;

      scored.push({ score: avgTFIDF * posBonus * lengthPenalty, index: i });
    }

    scored.sort((a, b) => b.score - a.score);
    const topN = parseInt(document.getElementById("lengthSlider").value);
    const topIndices = scored.slice(0, topN).map(s => s.index).sort((a, b) => a - b);
    const summary = topIndices.map(i => sentences[i]);

    document.getElementById("summaryOutput").innerText = summary.join("\n\n");
    document.getElementById("summaryBox").style.display = "block";
    document.getElementById("originalText").innerText = text;
    
    // Show summary statistics
    showSummaryStats(text, summary.join(" "));
    
    localStorage.setItem("inputText", text);
    localStorage.setItem("summary", summary.join("\n\n"));
    showChart(wordFreq);
    showWordCloud(wordFreq);
    document.getElementById("loader").style.display = "none";
    
    showNotification('Summary generated successfully!', 'success');
  }, 800);
}

function showSummaryStats(originalText, summaryText) {
  const originalWords = originalText.split(/\s+/).length;
  const summaryWords = summaryText.split(/\s+/).length;
  const compressionRatio = ((originalWords - summaryWords) / originalWords * 100).toFixed(1);
  
  document.getElementById('summaryStats').innerHTML = `
    <div class="mb-2">
      <small>Original: ${originalWords} words</small>
    </div>
    <div class="mb-2">
      <small>Summary: ${summaryWords} words</small>
    </div>
    <div>
      <strong>${compressionRatio}% compression</strong>
    </div>
  `;
}

function copySummary() {
  const summaryText = document.getElementById("summaryOutput").innerText;
  if (!summaryText) {
    showNotification('No summary to copy!', 'warning');
    return;
  }
  
  navigator.clipboard.writeText(summaryText).then(() => {
    showNotification('Summary copied to clipboard!', 'success');
  });
}

function downloadSummary() {
  const summaryText = document.getElementById("summaryOutput").innerText;
  if (!summaryText) {
    showNotification('No summary to download!', 'warning');
    return;
  }
  
  const blob = new Blob([summaryText], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "summary.txt";
  link.click();
  showNotification('Summary downloaded!', 'success');
}

function toggleTheme() {
  const html = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');
  
  if (html.getAttribute("data-theme") === "light") {
    html.setAttribute("data-theme", "dark");
    themeIcon.className = "fas fa-sun";
    localStorage.setItem('theme', 'dark');
  } else {
    html.setAttribute("data-theme", "light");
    themeIcon.className = "fas fa-moon";
    localStorage.setItem('theme', 'light');
  }
}

function showChart(wordFreq) {
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const canvas = document.getElementById("wordChart");
  const ctx = canvas.getContext("2d");

  // Destroy previous chart if it exists
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topWords.map(([word]) => word),
      datasets: [{
        label: "Word Frequency",
        data: topWords.map(([, freq]) => freq),
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { display: false }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function showWordCloud(wordFreq) {
  const cloudWords = Object.entries(wordFreq).map(([text, weight]) => [text, weight * 10]);
  WordCloud(document.getElementById("wordCloud"), { 
    list: cloudWords,
    weightFactor: 3,
    fontFamily: 'Inter, sans-serif',
    color: 'random-light',
    backgroundColor: 'transparent',
    rotateRatio: 0.3
  });
}

function toggleOriginal() {
  const box = document.getElementById("originalTextBox");
  box.style.display = (box.style.display === "none") ? "block" : "none";
}

function shareSummary() {
  const text = document.getElementById("summaryOutput").innerText;
  if (!text) {
    showNotification('No summary to share!', 'warning');
    return;
  }
  
  if (navigator.share) {
    navigator.share({ 
      title: "Text Summary", 
      text: text 
    }).catch(err => showNotification("Share failed: " + err, 'error'));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Summary copied to clipboard (sharing not supported)', 'info');
    });
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed`;
  notification.style.cssText = `
    top: 2rem; 
    right: 2rem; 
    z-index: 9999; 
    min-width: 300px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    border-radius: 12px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'} me-2"></i>
    ${message}
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function restoreLastInput() {
  // Restore theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('theme-icon').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  
  // Restore content
  document.getElementById("inputText").value = localStorage.getItem("inputText") || "";
  if (localStorage.getItem("summary")) {
    document.getElementById("summaryOutput").innerText = localStorage.getItem("summary");
    document.getElementById("summaryBox").style.display = "block";
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);