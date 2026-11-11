# So fast transfer

Site de transfert de fichiers (mot de passe, chiffrement AES-256, expiration, limite de téléchargements).

## Déploiement
1. Pousse ce dossier à la racine d'un dépôt GitHub.
2. Vercel -> Add New -> Project -> importe le dépôt (Framework : Other, aucune commande de build).
3. Dans le projet : Storage -> Create -> Blob -> Connect to Project (crée BLOB_READ_WRITE_TOKEN).
4. Deployments -> Redeploy.
