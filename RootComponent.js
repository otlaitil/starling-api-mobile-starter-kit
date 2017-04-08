import React, {Component} from 'react';
import {
  ActivityIndicator,
  AppRegistry,
  AppState,
  Linking,
  ListView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Dimensions from 'Dimensions';

const windowSize = Dimensions.get('window');
const config = require('./config.json');

export default class RootComponent extends Component {

  constructor (props) {
    super(props);
    this.state = this.initialState();
  }

  render () {
    return (
      <View style={styles.container}>

        {this.state.message ?
          <Text style={[styles.defaultText, styles.message]}>{this.state.message}</Text> : null}
        {!this.state.loading && !this.state.loggedIn ? <LoginView onLoginTapped={this.loginWithStarling}/> : null}
        {this.state.customer && this.state.customer.transactions
          ? <LoggedInView customer={this.state.customer} onRefreshTapped={this.loadTransactions.bind(this)}
                          onLogoutTapped={this.logout}/>
          : null}
        {this.state.loading
          ? <View
            style={{position: 'absolute', top: 0, left: 0, width: windowSize.width, height: windowSize.height, backgroundColor: 'rgba(120,120,120,0.4)', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator animating={true} style={[styles.centering, {height: 80}]} size="large"/>
          </View>
          : null}
      </View>
    );
  }

  /*
   * Used to set the app state back to its initial values.
   */
  initialState () {
    return {
      loggedIn: true, // Assume logged in until proven otherwise.
      loading: false,
      customer: {}
    };
  }

  /*
   * Launch the Starling iOS app, so that the customer can give approval for this
   * OAuth token to be issued.
   * This app is registered to handle a customer URL scheme (Universal Links will
   * work too), so that the the authorisation is granted or rejected, the Starling
   * app can hand control back to this app (the `Linking.addEventListener` call in
   * `componentDidMount` handles this callback).
   */
  loginWithStarling = () => {
    const oauthState = Math.random().toString(36).substring(7);
    this.setState({
      message: null,
      oauthState: oauthState
    });
    const oauthUrl = `starlingbank://oauth?client_id=${config.clientId}&response_type=code&redirect_url=${encodeURIComponent(config.oauthLoginCallbackUri)}&state=${oauthState}`;
    Linking.openURL(oauthUrl).catch(err => this.setState({message: error.message}));
  };

  /*
   * Sends an HTTP request to the app server to destroy the session.
   */
  logout = () => {
    this.setState({loading: true});
    fetch(`${config.appServerBase}/api/logout`)
      .then(() => {
        this.setState(Object.assign(this.initialState(), {loggedIn: false}));
      })
      .catch((error) => {
        this.setState(Object.assign(this.initialState(), {message: error.message}));
      });
  };

  /*
   * Register the `handleOauthLoginCallback` link handler. This is called when the
   * Starling app opens the `redirect_url` to return the authorisation code back to
   * this app. Note that the `URL types` property has been added to `Info.plist` to
   * register the customer URL scheme (you can also use Universal Links).
   * Then try to load the customer's transactions. If the app server returns a 403,
   * the customer will be promted to 'log in with Starling'.
   */
  componentDidMount () {
    Linking.addEventListener('url', this.handleOauthLoginCallback.bind(this));
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    this.loadTransactions();
  }

  /*
   * Remove event listeners.
   */
  componentWillUnmount () {
    Linking.removeEventListener('url', this.handleOauthLoginCallback);
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  /*
   * If the app is brought into the foreground, but not via the OAuth redirect link
   * opened by the Starling app, then we'll want to reset the app to its initial
   * state to hide the 'Logging in' message and show the 'Log in with Starling button'.
   */
  handleAppStateChange (appState) {
    // if (appState == "active") {
    //   this.setState(this.initialState());
    // }
  }

  /*
   * Handles the callback from the Starling app. The "request" query string
   * contains the OAuth authorisation code, which together with the client ID
   * and client secret can be swapped for authorisation and refresh tokens.
   * As we don't want the app to have access to the client secret, it simply
   * forwards these query parameters on to the app server, which stores these
   * tokens in the app's HTTP session.
   */
  handleOauthLoginCallback (event) {
    if (event.url.startsWith(config.oauthLoginCallbackUri)) {
      var queryParams = {};
      const queryString = event.url.substring(config.oauthLoginCallbackUri.length + 1)
      queryString.split("&").forEach(param => {
        const parts = param.split("=");
        queryParams[parts[0].toLocaleLowerCase()] = parts[1];
      });
      if (this.state.oauthState != queryParams["state"]) {
        this.setState({
          message: "Authentication error: invalid state"
        });
      } else if (queryParams["error"]) {
        const errorCode = queryParams["error"];
        this.setState({
          message: errorCode == "access_denied" ? "Access denied" : "Error: " + errorCode
        });
      } else {
        fetch(`${config.appServerBase}${config.appServerTokenRequestPath}?${queryString}`)
          .then(() => {
            this.setState({
              loggedOut: false,
              oauthState: null
            })
          })
          .then(() => {
            this.loadTransactions();
          })
          .catch((error) => {
            this.setState({message: error.message});
          });
      }
    }
  }

  /*
   * Performs a request to the app server to load the customer's transactions.
   * If the customer has previously logged in via the Starling app, then the
   * app server has an OAuth token in the session. It makes an HTTP request to
   * the Starling API server, adding the authorisation "Bearer" token as an
   * `Authorization` header. If successful, the transactions are added to the
   * React Native app state, causing them to be rendered as a list.
   * If the server returns a 403 (Forbidden) response, then the app server session
   * either has no OAuth authorisation token or that token is no longer valid. The
   * app will be placed back into a logged out state.
   */
  loadTransactions () {
    this.setState({loading: true});
    const path = config.useSandbox ? "/api/sandbox/transactions" : "/api/transactions";
    console.log("Fetching transactions: " + `${config.appServerBase}${path}`);
    fetch(`${config.appServerBase}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
      .then((transactionsResponse) => {
        if (transactionsResponse.status == 401 || transactionsResponse.status == 403) {
          this.setState(Object.assign(this.initialState(), {loggedIn: false}));
          return null;
        } else {
          return transactionsResponse.json();
        }
      })
      .then(transactions => {
        if (transactions) {
          const customer = this.state.customer || {};
          const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
          customer.transactions = ds.cloneWithRows(transactions);
          this.setState({
            loggedIn: true,
            loading: false,
            customer: customer
          });
        }
      })
      .catch((error) => {
        this.setState({message: error.message});
      });
  }
}

/*
 * A view to render a "Log in with Starling" button.
 */
const LoginView = (props) => {
  return (
    <TouchableOpacity onPress={props.onLoginTapped}>
      <View style={styles.button}>
        <Text style={styles.buttonText}>Login with Starling</Text>
      </View>
    </TouchableOpacity>
  );
}

/*
 * The logged in view, showing a logout button and the transaction list.
 */
const LoggedInView = (props) => {
  return (
    <View style={styles.loggedInView}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <TouchableOpacity onPress={props.onRefreshTapped}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Reload</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={props.onLogoutTapped}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View>
        <Text style={styles.header}>Your Transactions</Text>
        {props.customer.transactions
          ? <TransactionList transactions={props.customer.transactions}/>
          : <LoadingView message="No transactions"/> }
      </View>
    </View>
  );
}

/*
 * The `ListView` of transactions.
 */
const TransactionList = (props) => {
  return (
    <ListView style={styles.transactionList} dataSource={props.transactions}
              renderRow={(t) => <TransactionListItem transaction={t} /> }/>
  );
}

/*
 * The view to render an individual transaction within `TransactionList`.
 */
const TransactionListItem = (props) => {
  const transaction = props.transaction;
  return (
    <View style={styles.transactionListItem}>
      <Text style={styles.transactionReference}>{transaction.narrative}</Text>
      <Text style={styles.transactionAmount}>{formatAmount(transaction)}</Text>
    </View>
  );
};

const formatAmount = (transaction) => {
  return `${currencySymbol(transaction.currency)}${transaction.amount.toFixed(2)}`
};

const currencySymbol = (currency) => {
  switch (currency) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return currency;
  }
};

/*
 * Styles to render the screen components.
 */
const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Helvetica',
    fontSize: 14,
  },
  message: {
    fontSize: 26,
    fontWeight: '400',
    color: '#C33C54',
    paddingBottom: 30
  },
  centering: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
    padding: 10,
  },
  header: {
    marginTop: 20,
    marginBottom: 15,
    fontSize: 30,
    fontWeight: '400',
    color: '#7CBA5B'
  },
  transactionList: {
    width: windowSize.width - 20
  },
  transactionListItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 5,
  },
  transactionReference: {
    fontSize: 22,
    fontWeight: '400',
    color: '#2B647F',
    width: windowSize * 0.7,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#24CBD0'
  },
  loggedInView: {
    marginTop: 50
  },
  button: {
    backgroundColor: '#ACADAF',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#193957',
  },
});

AppRegistry.registerComponent('StarlingReactNative', () => StarlingReactNative);
