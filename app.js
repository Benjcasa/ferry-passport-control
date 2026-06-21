let passagers = [];

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("excelFile")
        .addEventListener("change", lireExcel);

    document
        .getElementById("btnRecherche")
        .addEventListener("click", rechercherPassager);

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

            rows.forEach(row => {

                const nom = String(row["Nom"] || "").trim();

                if (
                    nom === "" ||
                    nom.includes("VISA COURT SEJOUR")
                ) {
                    return;
                }

                passagers.push({
                    dossier: row["N° dossier"] || "",
                    nom: row["Nom"] || "",
                    prenom: row["Prénom"] || "",
                    naissance: row["Date de naissance"] || "",
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

function rechercherPassager() {

    const nom = document
        .getElementById("nomRecherche")
        .value
        .trim()
        .toUpperCase();

    const prenom = document
        .getElementById("prenomRecherche")
        .value
        .trim()
        .toUpperCase();

    const passager = passagers.find(p =>

        String(p.nom)
            .toUpperCase()
            .includes(nom)

        &&

        String(p.prenom)
            .toUpperCase()
            .includes(prenom)

    );

    const resultat =
        document.getElementById("resultatRecherche");

    if (!passager) {

        resultat.innerHTML =
            "<h3 style='color:red'>Passager introuvable</h3>";

        return;
    }

    if (passager.controle) {

        resultat.innerHTML = `
            <h3 style="color:orange">
                Déjà contrôlé
            </h3>

            <p>
                ${passager.nom} ${passager.prenom}
            </p>

            <p>
                Heure :
                ${passager.heureControle}
            </p>
        `;

        return;
    }

    resultat.innerHTML = `
        <h3 style="color:green">
            Passager trouvé
        </h3>

        <p>
            ${passager.nom} ${passager.prenom}
        </p>

        <p>
            Dossier :
            ${passager.dossier}
        </p>

        <button onclick="validerControle('${passager.dossier}')">
            ✓ VALIDER LE CONTRÔLE
        </button>
    `;
}

function validerControle(dossier) {

    const passager = passagers.find(
        p => p.dossier == dossier
    );

    if (!passager) return;

    passager.controle = true;

    passager.heureControle =
        new Date().toLocaleString("fr-FR");

    sauvegarderDonnees();

    mettreAJourStats();

    alert(
        `${passager.nom} ${passager.prenom}
Contrôlé à ${passager.heureControle}`
    );

    rechercherPassager();
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