import React, { Component, PropTypes } from 'react'
import { oAuthLogin } from '../actions/firebase'
import { connect } from 'react-redux'
const validProviders = ["facebook", "google", "twitter"]
const validFlows = ["authWithOAuthPopup", "authWithOAuthRedirect"]

@connect()
class FirebaseOAuth extends Component {
  static propTypes = {
    provider: PropTypes.oneOf(validProviders),
    flow: PropTypes.oneOf(validFlows)
  }

  static contextTypes = {
    firebase: PropTypes.object
  }

  authenticate() {
    const flow = this.props.flow || "authWithOAuthPopup"
    this.props.dispatch(
      oAuthLogin(flow, this.props.provider)
    )
  }

  render() {
    return React.Children.only(
      React.cloneElement(this.props.children, {
        onClick: this.authenticate.bind(this)
      })
    )
  }
}

export default FirebaseOAuth
