let passagers = [];

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("excelFile")
        .addEventListener("change", lireExcel);

    document
        .getElementById("recherche")
        .addEventListener("input", rechercherInstantane);

    chargerDonneesSauvegardees();
});

function lireExcel(event) {

    const fichier = event.target.files[0];

    if (!fichier) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        const data = new Uint8Array(e.target.result);

        const workbook = XLSX.read(data, {
            type: "array"
        });

        passagers = [];

        workbook.SheetNames.forEach(sheetName => {

            const sheet = workbook.Sheets[sheetName];

            const rows = XLSX.utils.sheet_to_json(sheet);

            if (rows.length > 0) {
                alert(JSON.stringify(rows[0], null, 2));
            }

            rows.forEach(row => {

                const nom = String(row["Nom"] || "").trim();

                if (
                    nom === "" ||
                    nom.includes("VISA COURT SEJOUR")
                ) {
                    return;
                }

                passagers.push({
                    id: passagers.length,
                    dossier: row["N° dossier"] || "",
                    nom: row["Nom"] || "",
                    prenom: row["Prénom"] || "",

                    naissance:
                        row["Date de naissance"] ||
                        row["Date de\nnaissance"] ||
                        row["Date de\r\nnaissance"] ||
                        row["Date de naissance "] ||
                        row["Date de\nnaissance "] ||
                        row["DATE DE NAISSANCE"] ||
                        "",

                    controle: false,
                    heureControle: ""
                });
            });
        });

        sauvegarderDonnees();

        document.getElementById("resultat").innerHTML =
            "Passagers chargés : " + passagers.length;

        mettreAJourStats();
    };

    reader.readAsArrayBuffer(fichier);
}

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

                Date de naissance :
                ${p.naissance || "-"}<br>

                Dossier :
                ${p.dossier || "-"}<br>
        `;

        if (p.controle) {

            html += `
                <span style="color:orange;font-weight:bold;">
                    Déjà contrôlé :
                    ${p.heureControle}
                </span>
            `;

        } else {

            html += `
                <button
                    onclick="validerControle(${p.id})">
                    Contrôler
                </button>
            `;
        }

        html += `
            </div>
        `;
    });

    resultat.innerHTML = html;
}

function validerControle(id) {

    const passager =
        passagers.find(
            p => p.id === id
        );

    if (!passager) return;

    passager.controle = true;

    passager.heureControle =
        new Date().toLocaleString("fr-FR");

    sauvegarderDonnees();

    mettreAJourStats();

    rechercherInstantane();
}

function mettreAJourStats() {

    const total = passagers.length;

    const controles =
        passagers.filter(
            p => p.controle
        ).length;

    const restants =
        total - controles;

    document.getElementById("stats").innerHTML = `
        Total : ${total}<br>
        Contrôlés : ${controles}<br>
        Restants : ${restants}
    `;
}

function sauvegarderDonnees() {

    localStorage.setItem(
        "passagers",
        JSON.stringify(passagers)
    );
}

function chargerDonneesSauvegardees() {

    const donnees =
        localStorage.getItem("passagers");

    if (!donnees) return;

    passagers =
        JSON.parse(donnees);

    mettreAJourStats();
}