# Console admin privée

La console est construite dans l'image API et servie sur le port privé `3101`.
Elle n'est pas incluse dans le site public et ses routes restent absentes de
`api.tidetrade.xyz`.

Depuis le Mac, ouvrir un seul tunnel et le laisser actif :

```bash
ssh -N -L 3101:127.0.0.1:3101 serveur
```

Puis ouvrir <http://localhost:3101/>. Aucun serveur Vite ou `pnpm` local n'est
nécessaire. La page demande le `TIDE_ADMIN_TOKEN`; les seeds importées ne sont
jamais renvoyées au navigateur après l'import.
