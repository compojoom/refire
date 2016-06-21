import React, { Component, PropTypes } from 'react'
import { oAuthLogin } from '../actions/firebase'
import { connect } from 'react-redux'
const validProviders = ["facebook", "google", "twitter", "github"]
const validFlows = ["popup", "redirect"]

@connect()
class FirebaseOAuth extends Component {

  static propTypes = {
    provider: PropTypes.oneOf(validProviders),
    flow: PropTypes.oneOf(validFlows),
    scopes: PropTypes.array
  }

  constructor(props) {
    super(props)
    this.authenticate = this.authenticate.bind(this)
  }

  authenticate() {
    const flow = this.props.flow || "popup"
    this.props.dispatch(
      oAuthLogin(flow, this.props.provider, this.props.scopes)
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
