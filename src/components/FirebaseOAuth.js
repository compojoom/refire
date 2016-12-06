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
    scopes: PropTypes.array,
    onError: PropTypes.func,
    onClick: PropTypes.func
  }

  constructor(props) {
    super(props)
    this.authenticate = this.authenticate.bind(this)
  }

  authenticate() {
    const flow = this.props.flow || "popup"
    this.props.dispatch(
      oAuthLogin(flow, this.props.provider, this.props.scopes)
    ).catch((error) => {
      if (typeof this.props.onError === "function") {
        this.props.onError(error)
      }
    })
    if (typeof this.props.onClick === "function") {
      this.props.onClick()
    }
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
