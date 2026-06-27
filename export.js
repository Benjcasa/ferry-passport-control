function exporterControles() {

    const controles = passagers.filter(p => p.controle);

    if (controles.length === 0) {
        alert("Aucun passager contrôlé.");
        return;
    }

    const sens = prompt(
        "Sens de traversée (MRS-TUN ou TUN-MRS)",
        "MRS-TUN"
    );

    if (!sens) return;

    const aujourdhui = new Date();

    const date =
        aujourdhui.getFullYear() + "-" +
        String(aujourdhui.getMonth() + 1).padStart(2, "0") + "-" +
        String(aujourdhui.getDate()).padStart(2, "0");

    const donnees = controles.map(function(p) {
        return {
            Dossier: p.dossier,
            Nom: p.nom,
            Prenom: p.prenom,
            Naissance: p.naissance,
            Heure: p.heureControle,
            Cartouches: p.cartouches,
            Bouteilles: p.bouteilles
        };
    });

    const feuille = XLSX.utils.json_to_sheet(donnees);

    const classeur = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        classeur,
        feuille,
        "Controles"
    );

    XLSX.writeFile(
        classeur,
        sens + "_" + date + ".xlsx"
    );

}