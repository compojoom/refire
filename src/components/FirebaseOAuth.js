import React, { Component, PropTypes } from 'react'
import { oAuthLogin } from '../actions/firebase'
import { connect } from 'react-redux'
const validProviders = ["facebook", "google", "twitter", "github"]
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

  constructor(props) {
    super(props)
    this.authenticate = this.authenticate.bind(this)
  }

  authenticate() {
    const flow = this.props.flow || "authWithOAuthPopup"
    this.props.dispatch(
      oAuthLogin(flow, this.props.provider)
    ).catch(() => {})
  }

  render() {
    return React.Children.only(
      React.cloneElement(this.props.children, {
        onClick: this.authenticate
      })
    )
  }

}

export default FirebaseOAuth
