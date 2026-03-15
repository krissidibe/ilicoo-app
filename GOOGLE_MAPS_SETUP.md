# Configuration Google Maps API

Pour que l'autocomplete Google Places fonctionne sur iOS et Android, vous devez configurer votre clé API Google Maps.

## Étape 1 : Obtenir une clé API Google Maps

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez les APIs suivantes :
   - **Places API** (pour l'autocomplete)
   - **Geocoding API** (pour les adresses)
   - **Maps SDK for Android** (pour Android)
   - **Maps SDK for iOS** (pour iOS)
4. Créez une clé API :
   - Allez dans "APIs & Services" > "Credentials"
   - Cliquez sur "Create Credentials" > "API Key"
   - Copiez votre clé API

## Étape 2 : Configurer la clé dans l'application

Ouvrez le fichier `app.json` et remplacez `YOUR_GOOGLE_MAPS_API_KEY` par votre vraie clé API aux **3 endroits** suivants :

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "VOTRE_CLE_API_ICI"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "VOTRE_CLE_API_ICI"
        }
      }
    },
    "extra": {
      "googleMapsApiKey": "VOTRE_CLE_API_ICI"
    }
  }
}
```

## Étape 3 : Restreindre votre clé API (Recommandé)

Pour la sécurité, il est recommandé de restreindre votre clé API :

### Pour Android :
1. Dans Google Cloud Console, cliquez sur votre clé API
2. Sous "Application restrictions", sélectionnez "Android apps"
3. Ajoutez le nom du package : `com.aboukris.Ilicoo-app`
4. Ajoutez votre empreinte de certificat SHA-1

### Pour iOS :
1. Dans Google Cloud Console, cliquez sur votre clé API
2. Sous "Application restrictions", sélectionnez "iOS apps"
3. Ajoutez le bundle identifier : `com.aboukris.Ilicoo-app`

## Étape 4 : Rebuild l'application

Après avoir modifié `app.json`, vous devez rebuild l'application :

```bash
# Pour iOS
npx expo run:ios

# Pour Android
npx expo run:android

# Ou pour development build avec EAS
eas build --profile development --platform all
```

## Fonctionnalités Google Places

L'autocomplete est configuré avec :
- **Langue** : Français
- **Pays** : Mali (country:ml)
- **Types** : Lieux géocodés et établissements
- **Rayon** : 50km autour de Bamako
- **Debounce** : 400ms pour réduire les appels API
- **Plateforme** : iOS et Android

## Dépannage

### L'autocomplete ne fonctionne pas
1. Vérifiez que votre clé API est correctement configurée dans `app.json`
2. Vérifiez que les APIs sont activées dans Google Cloud Console
3. Vérifiez votre quota d'appels API
4. Vérifiez les logs pour les erreurs d'authentification

### "This API project is not authorized to use this API"
- Activez la "Places API" dans Google Cloud Console

### "The provided API key is invalid"
- Vérifiez que la clé est correctement copiée dans `app.json`
- Assurez-vous qu'il n'y a pas d'espaces avant ou après la clé

## Coûts

Google Places API n'est pas gratuit, mais offre :
- $200 de crédit gratuit par mois
- Autocomplete : $2.83 par 1000 requêtes (sans session) ou $17 par 1000 requêtes (avec détails)
- Geocoding : $5 par 1000 requêtes

Pour optimiser les coûts, l'application :
- Utilise un debounce de 400ms pour limiter les requêtes
- Limite les résultats aux environs de Bamako
- N'affiche les résultats qu'après 2 caractères minimum
