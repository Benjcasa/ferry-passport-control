let passagers = [];
let stream = null;
let tesseractInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("pdfFile")
        .addEventListener("change", lirePDF);

    document
        .getElementById("recherche")
        .addEventListener("input", rechercherInstantane);

    chargerDonneesSauvegardees();
});

// ==================== LECTURE PDF ====================

async function lirePDF(event) {
    const fichier = event.target.files[0];

    if (!fichier) return;

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const pdf = await pdfjsLib.getDocument(e.target.result).promise;
            passagers = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const texte = textContent.items.map(item => item.str).join(" ");
                
                extrairePassagersDuTexte(texte);
            }

            sauvegarderDonnees();

            document.getElementById("resultat").innerHTML =
                "Passagers chargés : " + passagers.length;

            mettreAJourStats();
        } catch (erreur) {
            console.error("Erreur lecture PDF :", erreur);
            document.getElementById("resultat").innerHTML = "Erreur : " + erreur.message;
        }
    };

    reader.readAsArrayBuffer(fichier);
}

// Extrait les passagers du texte PDF
function extrairePassagersDuTexte(texte) {
    // Normaliser le texte
    texte = texte.replace(/\r\n/g, "\n");
    
    console.log("Texte brut du PDF:", texte);
    
    const lignes = texte.split(/\n/);
    
    lignes.forEach((ligne, index) => {
        ligne = ligne.trim();
        
        if (!ligne || ligne.length < 5) return;
        
        // Plusieurs patterns pour capturer les données
        // Pattern 1 : Format avec N° ordre et N° dossier séparés
        // Exemple: 26 000009782222 ABASSI MOHTADA M P 26/10/1984
        const regex1 = /^(\d{1,3})\s+(\d{9,})\s+([A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ\s]+?)\s+([A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ\s]+?)\s+([MF])\s+([A-Z])\s+(\d{1,2}\/\d{1,2}\/\d{4})/i;
        
        // Pattern 2 : Format sans N° ordre
        const regex2 = /^(\d{9,})\s+([A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ\s]+?)\s+([A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ\s]+?)\s+([MF])\s+([A-Z])\s+(\d{1,2}\/\d{1,2}\/\d{4})/i;
        
        let match = ligne.match(regex1);
        if (match) {
            const nom = match[3].trim();
            const prenom = match[4].trim();
            
            if (nom && prenom && nom.length > 1 && prenom.length > 1) {
                passagers.push({
                    id: passagers.length,
                    dossier: match[2],
                    nom: nom,
                    prenom: prenom,
                    naissance: match[7],
                    controle: false,
                    heureControle: "",
                    cartouches: 0,
                    bouteilles: 0
                });
                console.log("Passager trouvé (Pattern 1):", nom, prenom, match[7]);
            }
            return;
        }
        
        match = ligne.match(regex2);
        if (match) {
            const nom = match[2].trim();
            const prenom = match[3].trim();
            
            if (nom && prenom && nom.length > 1 && prenom.length > 1) {
                passagers.push({
                    id: passagers.length,
                    dossier: match[1],
                    nom: nom,
                    prenom: prenom,
                    naissance: match[6],
                    controle: false,
                    heureControle: "",
                    cartouches: 0,
                    bouteilles: 0
                });
                console.log("Passager trouvé (Pattern 2):", nom, prenom, match[6]);
            }
            return;
        }
    });
}

// ==================== RECHERCHE ====================

function rechercherInstantane() {
    const texte = document
        .getElementById("recherche")
        .value
        .trim()
        .toUpperCase();

    const resultat =
        document.getElementById("resultatRecherche");

    if (texte.length < 2) {
        resultat.innerHTML = "";
        return;
    }

    const trouves = passagers
        .filter(p => {
            const recherche =
                (
                    p.nom + " " +
                    p.prenom + " " +
                    p.naissance
                )
                .toUpperCase();

            return recherche.includes(texte);
        })
        .slice(0, 30);

    let html = "";

    trouves.forEach(p => {
        html += `
            <div class="passager ${p.controle ? 'deja-controle' : 'non-controle'}">

                <strong>
                    ${p.nom} ${p.prenom}
                </strong><br>

                <span class="passenger-detail">
                    Date de naissance : ${p.naissance || "-"}
                </span><br>

                <span class="passenger-detail">
                    Dossier : ${p.dossier || "-"}
                </span>
        `;

        if (p.controle) {
            html += `
                <div class="control-status">
                    ✓ Contrôlé : ${p.heureControle}
                </div>

                <div class="quantity-section">
                    <div class="quantity-group">
                        <label>Cartouches :</label>
                        <span class="quantity-value">${p.cartouches}</span>
                        <div class="button-group">
                            <button onclick="modifierCartouches(${p.id},1)" class="btn-plus">+</button>
                            <button onclick="modifierCartouches(${p.id},-1)" class="btn-minus">−</button>
                        </div>
                    </div>

                    <div class="quantity-group">
                        <label>Bouteilles :</label>
                        <span class="quantity-value">${p.bouteilles}</span>
                        <div class="button-group">
                            <button onclick="modifierBouteilles(${p.id},1)" class="btn-plus">+</button>
                            <button onclick="modifierBouteilles(${p.id},-1)" class="btn-minus">−</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="control-action">
                    <button
                        onclick="validerControle(${p.id})"
                        class="btn-control">
                        ✓ Contrôler
                    </button>
                </div>
            `;
        }

        html += `
            </div>
        `;
    });

    resultat.innerHTML = html;
}

// ==================== CONTRÔLE ====================

function validerControle(id) {
    const passager = passagers.find(p => p.id === id);

    if (!passager) return;

    passager.controle = true;
    passager.cartouches = 0;
    passager.bouteilles = 0;
    passager.heureControle = new Date().toLocaleString("fr-FR");

    sauvegarderDonnees();
    mettreAJourStats();
    rechercherInstantane();
}

function modifierCartouches(id, variation) {
    const passager = passagers.find(p => p.id === id);

    if (!passager) return;

    passager.cartouches += variation;
    if (passager.cartouches < 0) passager.cartouches = 0;
    if (passager.cartouches > 2) passager.cartouches = 2;

    sauvegarderDonnees();
    mettreAJourStats();
    rechercherInstantane();
}

function modifierBouteilles(id, variation) {
    const passager = passagers.find(p => p.id === id);

    if (!passager) return;

    passager.bouteilles += variation;
    if (passager.bouteilles < 0) passager.bouteilles = 0;
    if (passager.bouteilles > 2) passager.bouteilles = 2;

    sauvegarderDonnees();
    mettreAJourStats();
    rechercherInstantane();
}

// ==================== STATISTIQUES ====================

function mettreAJourStats() {
    const total = passagers.length;
    const controles = passagers.filter(p => p.controle).length;
    const restants = total - controles;
    const cartouches = passagers.reduce((somme, p) => somme + (p.cartouches || 0), 0);
    const bouteilles = passagers.reduce((somme, p) => somme + (p.bouteilles || 0), 0);

    document.getElementById("stats").innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Total</div>
                <div class="stat-value">${total}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Contrôlés</div>
                <div class="stat-value">${controles}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Restants</div>
                <div class="stat-value">${restants}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">🚬 Cartouches</div>
                <div class="stat-value">${cartouches}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">🍾 Bouteilles</div>
                <div class="stat-value">${bouteilles}</div>
            </div>
        </div>
    `;
}

// ==================== SCANNER PASSEPORT ====================

function ouvrirScanner() {
    if (passagers.length === 0) {
        alert("Veuillez d'abord charger un fichier PDF");
        return;
    }

    document.getElementById("scannerModal").style.display = "block";
    document.getElementById("cameraContainer").style.display = "block";
    document.getElementById("photoContainer").style.display = "none";
    document.getElementById("resultatScanner").style.display = "none";

    // Accéder à la caméra
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
    })
    .then(s => {
        stream = s;
        document.getElementById("videoElement").srcObject = stream;
    })
    .catch(err => {
        alert("Erreur accès caméra : " + err.message);
    });
}

function fermerScanner() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    document.getElementById("scannerModal").style.display = "none";
}

function capturerPhoto() {
    const video = document.getElementById("videoElement");
    const canvas = document.getElementById("photoCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    document.getElementById("cameraContainer").style.display = "none";
    document.getElementById("photoContainer").style.display = "block";
}

function reprendreScan() {
    document.getElementById("cameraContainer").style.display = "block";
    document.getElementById("photoContainer").style.display = "none";
    document.getElementById("resultatScanner").style.display = "none";
}

async function analyserPhoto() {
    const canvas = document.getElementById("photoCanvas");
    const chargement = document.getElementById("chargement");
    const resultatScanner = document.getElementById("resultatScanner");

    chargement.style.display = "block";
    resultatScanner.style.display = "none";

    try {
        // Initialiser Tesseract si pas fait
        if (!tesseractInitialized) {
            await Tesseract.recognize(canvas, "fra");
            tesseractInitialized = true;
        }

        // Extraire le texte de la photo
        const { data: { text } } = await Tesseract.recognize(canvas, "fra");
        
        console.log("OCR résultat:", text);
        
        // Chercher le nom dans le texte OCR
        const nomsDetectes = trouverNomsOCR(text);
        
        // Chercher dans la liste des passagers
        const resultats = trouverPassagersOCR(nomsDetectes);

        chargement.style.display = "none";
        resultatScanner.style.display = "block";

        afficherResultatsScanner(resultats);

    } catch (err) {
        chargement.style.display = "none";
        alert("Erreur OCR : " + err.message);
    }
}

// Extrait les noms potentiels du texte OCR
function trouverNomsOCR(texte) {
    const noms = [];
    
    // Chercher les mots en MAJUSCULES (format passeport)
    const mots = texte.split(/[\s\n]+/);
    
    mots.forEach(mot => {
        mot = mot.trim().toUpperCase();
        if (mot.length > 2 && /^[A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ]+$/.test(mot)) {
            noms.push(mot);
        }
    });
    
    return noms;
}

// Cherche les passagers correspondant aux noms trouvés
function trouverPassagersOCR(nomsDetectes) {
    const resultats = [];

    nomsDetectes.forEach(nomOCR => {
        passagers.forEach(p => {
            // Vérifier si le nom OCR correspond au nom ou prénom
            if (p.nom.toUpperCase().includes(nomOCR) || 
                nomOCR.includes(p.nom.toUpperCase().substring(0, 3))) {
                
                if (!resultats.find(r => r.id === p.id)) {
                    resultats.push(p);
                }
            }
        });
    });

    return resultats.slice(0, 10); // Limiter à 10 résultats
}

// Affiche les résultats du scanner
function afficherResultatsScanner(resultats) {
    const listeResultats = document.getElementById("listeResultats");

    if (resultats.length === 0) {
        listeResultats.innerHTML = "<p>Aucun passager trouvé. Vérifiez la photo.</p>";
        return;
    }

    if (resultats.length === 1) {
        // Un seul résultat : valider directement
        const p = resultats[0];
        listeResultats.innerHTML = `
            <div class="passager non-controle">
                <strong>${p.nom} ${p.prenom}</strong><br>
                <span class="passenger-detail">Date : ${p.naissance}</span><br>
                <button onclick="validerControle(${p.id}); fermerScanner();" class="btn-control">
                    ✓ Valider ce passager
                </button>
            </div>
        `;
        return;
    }

    // Plusieurs résultats : afficher liste
    let html = "";
    resultats.forEach(p => {
        html += `
            <div class="passager non-controle">
                <strong>${p.nom} ${p.prenom}</strong><br>
                <span class="passenger-detail">Date : ${p.naissance}</span><br>
                <button onclick="validerControle(${p.id}); fermerScanner();" class="btn-control">
                    ✓ C'est lui
                </button>
            </div>
        `;
    });
    listeResultats.innerHTML = html;
}

// ==================== SAUVEGARDE ====================

function sauvegarderDonnees() {
    localStorage.setItem("passagers", JSON.stringify(passagers));
}

function chargerDonneesSauvegardees() {
    const donnees = localStorage.getItem("passagers");

    if (!donnees) return;

    passagers = JSON.parse(donnees);
    mettreAJourStats();
}
