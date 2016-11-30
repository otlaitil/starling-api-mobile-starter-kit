import React, { Component } from 'react';
import {
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

  constructor(props) {
    super(props);
    this.state = this.initialState();
  }

  render() {
    return (
      <View style={styles.container}>
        {this.state.error ? <Text>Error: {this.state.error}</Text> : null}
        {this.state.customer && this.state.customer.transactions
          ? <LoggedInView style={styles.loggedInView} customer={this.state.customer} onLogoutTapped={this.logout}/>
          : <LoginView onLoginTapped={this.loginWithStarling} />}
      </View>
    );
  }

  /*
   * Used to set the app state back to its initial values.
   */
  initialState() {
    return {
      loggingIn: false,
      loggedOut: true,
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
    this.setState({ loggingIn: true });
    const state = Math.random().toString(36).substring(7);
    const oauthUrl = `starlingbank://oauth?client_id=${config.clientId}&response_type=code&redirect_url=${encodeURIComponent(config.oauthLoginCallbackUri)}&state=${state}`;
    Linking.openURL(oauthUrl).catch(err => this.setState({error: error.message}));
  }

  /*
   * Sends an HTTP request to the app server to destroy the session.
   */
  logout = () => {
    fetch(`${config.appServerBase}/api/logout`)
    .then(() => {
      this.setState(this.initialState());
    })
    .catch((error) => {
      console.log("Error logging out: ", error)
    });
  }

  /*
   * Register the `handleOauthLoginCallback` link handler. This is called when the
   * Starling app opens the `redirect_url` to return the authorisation code back to
   * this app. Note that the `URL types` property has been added to `Info.plist` to
   * register the customer URL scheme (you can also use Universal Links).
   * Then try to load the customer's transactions. If the app server returns a 403,
   * the customer will be promted to 'log in with Starling'.
   */
  componentDidMount() {
    Linking.addEventListener('url', this.handleOauthLoginCallback.bind(this));
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    this.loadTransactions();
  }

  /*
   * Remove event listeners.
   */
  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOauthLoginCallback);
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  /*
   * If the app is brought into the foreground, but not via the OAuth redirect link
   * opened by the Starling app, then we'll want to reset the app to its initial
   * state to hide the 'Logging in' message and show the 'Log in with Starling button'.
   */
  handleAppStateChange(appState) {
    if (appState == "active" && this.state.loggingIn) {
      this.setState(this.initialState());
    }
  }

  /*
   * Handles the callback from the Starling app. The "request" query string
   * contains the OAuth authorisation code, which together with the client ID
   * and client secret can be swapped for authorisation and refresh tokens.
   * As we don't want the app to have access to the client secret, it simply
   * forwards these query parameters on to the app server, which stores these
   * tokens in the app's HTTP session.
   */
  handleOauthLoginCallback(event) {
    if (event.url.startsWith(config.oauthLoginCallbackUri)) {
      var queryParams = {}
      const queryString = event.url.substring(config.oauthLoginCallbackUri.length + 1)
      // TODO: Handle request not authorised.
      // TODO: Handle error.
      fetch(`${config.appServerBase}${config.appServerTokenRequestPath}?${queryString}`)
      .then(() => {
        this.setState({
          loggingIn: false,
          loggedOut: false
        })
      })
      .then(() => {
        this.loadTransactions();
      })
      .catch((error) => {
        console.log("Error logging in: ", error)
      });
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
  loadTransactions() {
    this.setState({ loading: true });
    console.log("Fetching transactions: " + `${config.appServerBase}/api/transactions`);
    fetch(`${config.appServerBase}/api/transactions`, {
      method: 'GET',
      headers: {
       'Accept': 'application/json'
      }
    })
    .then((transactionsResponse) => {
      if (transactionsResponse.status == 401 || transactionsResponse.status == 403) {
        this.setState(this.initialState());
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
          loading: false,
          customer: customer
        });
      }
    })
    .catch((error) => {
      this.setState({ error: error.message });
    });
  }
}

/*
 * A view to render a "Log in with Starling" button.
 */
const LoginView = (props) => {
  return (
    <TouchableOpacity onPress={props.onLoginTapped}>
      <View>
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
      <TouchableOpacity onPress={props.onLogoutTapped}>
        <View style={styles.logoutButton}>
          <Text style={styles.buttonText}>Logout</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.header}>Your Transactions</Text>
      {props.customer.transactions
        ? <TransactionList transactions={props.customer.transactions} />
        : <LoadingView message="No transactions"/> }
    </View>
  );
}

/*
 * The `ListView` of transactions.
 */
const TransactionList = (props) => {
  return (
    <ListView style={styles.transactionList} dataSource={props.transactions} renderRow={(t) => <TransactionListItem transaction={t} /> } />
  );
}

/*
 * The view to render an individual transaction within `TransactionList`.
 */
const TransactionListItem = (props) => {
  const transaction = props.transaction;
  return (
    <View style={styles.transactionListItem}>
      <Text style={styles.transactionReference}>{transaction.reference}</Text>
      <Text style={styles.transactionAmount}>{formatAmount(transaction)}</Text>
    </View>
  );
};

const formatAmount = (transaction) => {
  return `${currencySymbol(transaction.currency)}${transaction.amount.toFixed(2)}`
};

const currencySymbol = (currency) => {
  switch (currency) {
    case "GBP": return "£";
    case "EUR": return "€";
    case "USD": return "$";
    default: return currency;
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f4f4',
    padding: 10,
  },
  header: {
    marginTop: 20,
    marginBottom: 15,
    fontSize: 22,
    fontWeight: '700',
    color: '#4a4d75'
  },
  transactionList: {
    width: windowSize.width - 20
  },
  transactionListItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  transactionReference: {
    fontSize: 20,
    color: '#556655'
  },
  transactionAmount: {
    fontSize: 20,
    color: '#887645'
  },
  loggedInView: {
    marginTop: 50
  },
  buttonText: {
    fontSize: 18,
    fontWeight : '700',
    color: '#4a4d75',
  },
  logoutButton: {
    padding: 10,
    alignItems: 'flex-end'
  }
});

AppRegistry.registerComponent('StarlingReactNative', () => StarlingReactNative);
