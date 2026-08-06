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
                
                console.log(`Page ${i} texte:`, texte.substring(0, 200));
                
                extrairePassagersDuTexte(texte);
            }

            console.log("Total passagers extraits:", passagers.length);
            console.log("Premiers passagers:", passagers.slice(0, 3));

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
    
    const lignes = texte.split(/\s+/); // Split par tous les espaces
    
    // Chercher les patterns : AAAA BBBB DD/MM/YYYY
    let i = 0;
    while (i < lignes.length) {
        const ligne = lignes[i];
        
        // Vérifier si c'est un mot potentiel de nom (MAJUSCULES)
        if (ligne.length > 2 && /^[A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ]+$/.test(ligne)) {
            
            // Chercher le prochain mot (potentiel prénom)
            if (i + 1 < lignes.length) {
                const prenom = lignes[i + 1];
                
                if (prenom.length > 2 && /^[A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆ]+$/.test(prenom)) {
                    
                    // Chercher la date (DD/MM/YYYY)
                    let dateIndex = i + 2;
                    let dateFound = false;
                    let date = "";
                    
                    // Chercher dans les 5 prochains éléments
                    for (let j = i + 2; j < Math.min(i + 7, lignes.length); j++) {
                        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(lignes[j])) {
                            date = lignes[j];
                            dateFound = true;
                            break;
                        }
                    }
                    
                    if (dateFound && date) {
                        const nom = ligne.toUpperCase();
                        const prenom_final = prenom.toUpperCase();
                        
                        // Chercher le N° dossier (9 chiffres avant)
                        let dossier = "";
                        for (let j = Math.max(0, i - 5); j < i; j++) {
                            if (/^\d{9,}$/.test(lignes[j])) {
                                dossier = lignes[j];
                                break;
                            }
                        }
                        
                        // Vérifier qu'on n'a pas déjà ce passager
                        const existe = passagers.some(p => 
                            p.nom === nom && p.prenom === prenom_final && p.naissance === date
                        );
                        
                        if (!existe) {
                            passagers.push({
                                id: passagers.length,
                                dossier: dossier,
                                nom: nom,
                                prenom: prenom_final,
                                naissance: date,
                                controle: false,
                                heureControle: "",
                                cartouches: 0,
                                bouteilles: 0
                            });
                            
                            console.log("✓ Passager trouvé:", nom, prenom_final, date, dossier);
                        }
                        
                        i = dateIndex + 1;
                        continue;
                    }
                }
            }
        }
        
        i++;
    }
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

    console.log("Recherche:", texte, "Total passagers:", passagers.length);

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

    console.log("Résultats trouvés:", trouves.length);

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
