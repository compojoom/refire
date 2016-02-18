import React, { Component } from 'react'
import { connect } from 'react-redux'
import { logout } from '../actions/firebase'

@connect()
class FirebaseLogout extends Component {

  constructor(props) {
    super(props)
    this.logout = this.logout.bind(this)
  }

  logout() {
    this.props.dispatch(logout())
  }

  render() {
    return React.Children.only(
      React.cloneElement(this.props.children, {
        onClick: this.logout
      })
    )
  }

}

export default FirebaseLogout
