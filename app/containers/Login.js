import React, { Component } from 'react'
import { connect } from 'react-redux';
import { ActionCreators } from '../actions';
import { bindActionCreators } from 'redux';
import { appStyle } from '../styles';
import {
  View,
  Linking,
  Image,
  TouchableHighlight,
  Text,
  StyleSheet,
} from 'react-native'

class Login extends Component {

  render() {
    return (
      <View>
        <TouchableOpacity onPress={this.openOauthLink}>
          <View style={styles.button}>
            <Text style={styles.text}>Login with Starling</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  openOauthLink = () => {
    Linking.openURL("https://demo-developer.possiblefs.com/oauth?client_id=AVSR61t8XXPMcEzl5DSD&response_type=code&redirect_url=http://google.com&state=012352162163");
  };

}

function mapStateToProps(state) {
  return {};
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(ActionCreators, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Detail);
