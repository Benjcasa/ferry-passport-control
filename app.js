let passagers = [];
let stream = null;
let tesseractInitialized = false;
const LONGUEUR_MIN_NOM = 2;
const REGEX_NOM_MAJUSCULE = /^[A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆÑ]+(?:[-'’][A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆÑ]+)*$/;

function estNomValide(mot, source, type = "nom") {
    const motNormalise = (mot || "").trim().toUpperCase();

    if (motNormalise.length < LONGUEUR_MIN_NOM) {
        console.debug(`[${source}] ${type} rejeté (trop court):`, mot);
        return false;
    }

    if (!REGEX_NOM_MAJUSCULE.test(motNormalise)) {
        console.debug(`[${source}] ${type} rejeté (format invalide):`, mot);
        return false;
    }

    return true;
}

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
        if (estNomValide(ligne, "PDF", "nom")) {
            
            // Chercher le prochain mot (potentiel prénom)
            if (i + 1 < lignes.length) {
                const prenom = lignes[i + 1];
                
                if (estNomValide(prenom, "PDF", "prénom")) {
                    
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

    document.getElementById("scannerModal").style.display = "flex";
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

// Normalise un texte pour la comparaison (accents, tirets, espaces)
function normaliserTexte(texte) {
    return texte
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // supprimer accents
        .replace(/[-'\s]+/g, " ")                          // tirets/apostrophes -> espace
        .trim();
}

// Calcule la distance de Levenshtein entre deux chaînes
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

// Retourne vrai si deux tokens sont suffisamment similaires
function tokensSimilaires(a, b) {
    if (a === b) return true;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    // Tolérance : 0 erreur pour ≤3 chars, 1 pour ≤6, 2 pour >6
    const tolerance = maxLen <= 3 ? 0 : maxLen <= 6 ? 1 : 2;
    return dist <= tolerance;
}

// Extrait les noms potentiels du texte OCR
function trouverNomsOCR(texte) {
    console.log("[OCR] Texte brut reçu :\n" + texte);

    // Chercher une date de naissance (DD/MM/YYYY) comme point d'ancrage
    const regexDate = /\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/;
    const matchDate = texte.match(regexDate);
    let zone = texte;
    if (matchDate) {
        // Extraire seulement la partie précédant la date
        zone = texte.substring(0, matchDate.index);
        console.log("[OCR] Date trouvée : " + matchDate[0] + " — analyse de la zone précédente");
    } else {
        console.log("[OCR] Aucune date trouvée, analyse du texte complet");
    }

    const noms = [];
    const regexNom = /^[A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆÑ][A-ZÀÂÄÇÈÉÊËÎÏÔÙÛÜŒÆÑ'\-]*$/;
    const mots = zone.split(/[\s\n,;:.()\[\]\/\\|]+/);

    mots.forEach(mot => {
        mot = mot.trim().toUpperCase();
        if (estNomValide(mot, "OCR")) {
            noms.push(mot);
        }
    });

    console.log("[OCR] Noms/tokens détectés : " + JSON.stringify(noms));
    return noms;
}

// Cherche les passagers correspondant aux noms trouvés
function trouverPassagersOCR(nomsDetectes) {
    const resultats = [];

    nomsDetectes.forEach(nomOCR => {
        const tokenOCR = normaliserTexte(nomOCR);

        passagers.forEach(p => {
            if (resultats.find(r => r.id === p.id)) return;

            // Normaliser nom et prénom du passager en tokens individuels
            const tokensNom    = normaliserTexte(p.nom    || "").split(" ").filter(Boolean);
            const tokensPrenom = normaliserTexte(p.prenom || "").split(" ").filter(Boolean);
            const tousTokens   = [...tokensNom, ...tokensPrenom];

            const trouve = tousTokens.some(t => tokensSimilaires(tokenOCR, t));

            if (trouve) {
                console.log(`[OCR] Correspondance trouvée : "${nomOCR}" ~ "${p.nom} ${p.prenom}"`);
                resultats.push(p);
            } else {
                console.debug(`[OCR] Pas de correspondance : "${nomOCR}" vs tokens ${JSON.stringify(tousTokens)}`);
            }
        });
    });

    console.log("[OCR] Total passagers trouvés : " + resultats.length);
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
