# Starling API React Native Starter Project

A React Native starter project, which logs in using Starling app to app OAuth, then shows a list of transactions.

Visit https://developer.starlingbank.com/ to sign up for a developer account, read the API documentation and create an app.

## Getting Started

You will need to run an app server to make API requests to the Starling API server, as the client secret needs to be hidden.
* Clone the `node-api-starter` project and start it as documented there using this `config.json`:
```{
  "clientId": "<client_id_from_developer_portal>",
  "clientSecret": "<client_secret_from_developer_portal>",
  "cookieSecret": "<a_secret_string>",
  "redirectUri": "starlingreactnative://login",
  "partnerApiBase": "https://demo-api.possiblefs.com",
  "developerPortalBase": "https://demo-developer.possiblefs.com"
}```

Now set up the React Native app:
* Open
* Edit config.json (use your IP address, rather than `localhost`, so that the app can connect to this server):
```{
  "oauthLoginCallbackUri": "starlingreactnative://login",
  "clientId": "<client_id_from_developer_portal>",
  "appServerBase": "http://<your_ip_address>:8888",
  "appServerTokenRequestPath": "/oauth"
}```
* Run the React Native app. For iOS this mean: open `XCode`, select the `StarlingReactNative` scheme; select your device with the Starling app on it; click the `Run` button. The app should now be built and installed onto your device.
