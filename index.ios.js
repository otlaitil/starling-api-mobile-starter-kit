import React, {Component} from 'react';
import {
  AppRegistry
} from 'react-native';
import RootComponent from './RootComponent';

export default class StarlingReactNative extends Component {

  render () {
    return <RootComponent />;
  }

}

AppRegistry.registerComponent('StarlingReactNative', () => StarlingReactNative);
