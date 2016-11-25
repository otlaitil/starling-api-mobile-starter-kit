import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Linking,
  TouchableOpacity,
  ListView
} from 'react-native';

const oauthLoginCallbackPrefix = "starlingreactnative://login"
const initialState = {
  oauthAccessToken: undefined,
  oauthRefreshToken: undefined,
  oauthState: undefined,
  customer: undefined
}

export default class StarlingReactNative extends Component {

  constructor(props) {
    super(props);
    this.state = Object.assign({}, initialState);
  }

  render() {
    console.log("render >> state",  this.state);
    return (
      <View style={styles.container}>
        {this.state.error ? <Text>Error: {this.state.error}</Text> : null}
        {this.state.loggingIn
          ? <LoadingView message="Logging in..." />
          : !this.isLoggedIn()
            ? <LoginView onLoginTapped={this.loginWithStarling} />
            : this.state.loading
              ? <LoadingView message="Loading..." />
              : <ProfileView customer={this.state.customer} />}
      </View>
    );
  }

  isLoggedIn() {
    return this.state.oauthAccessToken !== undefined && this.state.oauthAccessToken != null;
  }

  loginWithStarling = () => {
    this.setState({
      loggingIn: true,
      oauthState: state
    });
    const state = Math.random().toString(36).substring(7);
    const oauthUrl = `starlingbank://oauth?client_id=AVSR61t8XXPMcEzl5DSD&response_type=code&redirect_url=${encodeURIComponent("starlingreactnative://login")}&state=${state}`;
    Linking.openURL(oauthUrl);
  }

  componentDidMount() {
    const _this = this
    this.linkingUrlHandler = event => {
      console.log(">> Handling app launch URL: " + event.url);
      if (event.url.startsWith(oauthLoginCallbackPrefix)) {
        _this.handleOauthLoginCallback(event.url);
      }
    };
    Linking.addEventListener('url', this.linkingUrlHandler);
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.linkingUrlHandler);
  }

  handleOauthLoginCallback(url) {
    var queryParams = {}
    url.substring(oauthLoginCallbackPrefix.length + 1).split("&").forEach(queryParam => {
      const queryParamParts = queryParam.split("=");
      queryParams[queryParamParts[0].toLowerCase()] = queryParamParts[1];
    });
    const accessCode = queryParams["code"]
    const state = queryParams["state"]
    if (this.state.oauthState != state) {
      this.setState(Object.assign({}, initialState));
    }
    const clientId = "AVSR61t8XXPMcEzl5DSD"
    const clientSecret = "62nG9S5ERuYYgwqKuLoh6e2ZeCsouDLX8cFeor6R"
    const redirectUri = "starlingreactnative://login"
    const formParams = {
      code: accessCode,
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    };
    var formBody = [];
    for (var property in formParams) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(formParams[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    fetch("https://demo-api.possiblefs.com/oauth/access-token", {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody
    })
    .then((tokenResponse) => {
      return tokenResponse.json();
    })
    .then((tokenResponseJson) => {
      this.setState({
        loggingIn: false,
        loading: true,
        oauthAccessToken: tokenResponseJson.access_token,
        oauthAccessTokenExpiresInSecs: tokenResponseJson.expires_in,
        oauthRefreshToken: tokenResponseJson.refresh_token
      })
      return tokenResponseJson;
    })
    .then((tokenResponseJson) => {
      return fetch("https://demo-api.possiblefs.com/api/v1/transactions", {
        method: 'GET',
        headers: {
         'Accept': 'application/json',
         'Authorization': "Bearer " + tokenResponseJson.access_token
        }
      });
    })
    .then((transactionsResponse) => {
      return transactionsResponse.json();
    })
    .then(transactionsResult => {
      // FIXME: Use Immutable.js?
      const customer = this.state.customer || {};
      const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
      customer.transactions = ds.cloneWithRows(transactionsResult._embedded.transactions);
      this.setState({
        loading: false,
        customer: customer
      });
    }).catch((error) => {
      this.setState({error: error.message});
    });
  }
}

const LoginView = (props) => {
  return (
    <TouchableOpacity onPress={props.onLoginTapped}>
      <View style={styles.button}>
        <Text style={styles.text}>Login with Starling</Text>
      </View>
    </TouchableOpacity>
  );
}

const LoadingView = (props) => {
  return <View><Text>{props.message || "Loading..."}</Text></View>;
}

const ProfileView = (props) => {
  return <TransactionList transactions={props.customer.transactions} />;
}

const TransactionList = (props) => {
  return <ListView dataSource={props.transactions} renderRow={(t) => <TransactionListItem transaction={t} /> } />;
}

const TransactionListItem = (props) => {
  const transaction = props.transaction;
  return (
      <Text>{transaction.reference}: {transaction.currency}{transaction.amount}</Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('StarlingReactNative', () => StarlingReactNative);
