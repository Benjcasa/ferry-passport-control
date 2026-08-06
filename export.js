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

    // Créer un CSV au lieu d'Excel
    let csv = "Dossier,Nom,Prenom,Naissance,Heure,Cartouches,Bouteilles\n";
    donnees.forEach(d => {
        csv += `"${d.Dossier}","${d.Nom}","${d.Prenom}","${d.Naissance}","${d.Heure}",${d.Cartouches},${d.Bouteilles}\n`;
    });

    // Télécharger le fichier
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const lien = document.createElement("a");
    const url = URL.createObjectURL(blob);
    lien.setAttribute("href", url);
    lien.setAttribute("download", sens + "_" + date + ".csv");
    lien.style.visibility = "hidden";
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
}
