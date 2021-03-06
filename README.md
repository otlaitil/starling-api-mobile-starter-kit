
<!-- Logo -->
<p align="center">
    <img height="180" width="180" src="https://www.starlingbank.com/static-files/developer-portal/github/starter-mobile.png">
</p>

<!-- Name -->
<h1 align="center">
  <a href="http://developer.starlingbank.com/get-started">Starling Developers</a>
  <br>Mobile Starter Kit
</h1>


This project contains a React Native sample application for mobile that integrates with the Starling Bank API to retrieve a customer's transaction history.

It can be used for development on both iOS and Android.

Looking for the [Web Starter Kit](https://github.com/starlingbank/starling-api-web-starter-kit) instead?

## Getting Started
Please also take a look at the higher-level [Getting Started Guide](http://developer.starlingbank.com/get-started) on our site.

Once you have signed up to the [Starling Developers](http://developer.starlingbank.com/signup/new) site, you can register an application, giving you a `client_id` and `client_secret`.

### Configuration

You will then need to run an app server to make API requests to the Starling API server, as the client secret needs to be hidden.
 
 Clone the [Web Starter Kit](https://github.com/starlingbank/starling-api-web-starter-kit#mobile-starter-kit-users) project and start the server as documented there using this `config.json`:

```JSON
{
  "clientId": "<application client id>",
  "clientSecret": "<application client secret>",

  "cookieSecret": "21e361d0-ff2c-4763-a084-1032f2103ce8",

  "productionApi": "https://api.starlingbank.com",
  "personalAccessToken": "<personal access token>",

  "sandboxApi": "https://api-sandbox.starlingbank.com/",
  "initialRefresh": "<refresh token from Starling Developers site>",

  "oauthApi": "https://oauth.starlingbank.com",
  "oauthRedirectUri": "http://localhost:3000/api/oauth/redirect"
}
```

Now set up the React Native app:
* Open
* Edit config.json (use your IP address, rather than `localhost`, so that the app can connect to this server):
```JSON
{
  "oauthLoginCallbackUri": "starlingreactnative://login",
  "clientId": "<client_id>",
  "appServerBase": "http://<your_ip_address>:3000",
  "appServerTokenRequestPath": "/oauth"
}
```
* Run the React Native app.
For iOS this means: opening `XCode`, select the `StarlingReactNative` scheme; select your device with the Starling app on it; click the `Run` button. The app should now be built and installed onto your device.
