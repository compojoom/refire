import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import createConnect from './connectFirebase'
import { clearLoginError, passwordLogin } from '../actions/firebase'
const connectFirebase = createConnect(React, connect)

const defaultValidator = state => {
  return Object.keys(state).every(field => {
    return !!state[field]
  })
}

export default function(options = {}) {

  const {validator = defaultValidator} = options

  return WrappedComponent => {
    @connectFirebase(state => ({firebase: ["_status"]}))
    class FirebaseLogin extends Component {

      constructor(props) {
        super(props)
        this.state = {
          email: null,
          password: null
        }
      }

      submit(event) {
        event.preventDefault()
        this.props.dispatch(
          passwordLogin(this.state.email, this.state.password)
        )
      }

      updateEmail(event) {
        const {errors: {login: error}} = this.props._status
        if (error) {
          this.props.dispatch(clearLoginError())
        }
        this.setState({email: event.target.value})
      }

      updatePassword(event) {
        const {errors: {login: error}} = this.props._status
        if (error) {
          this.props.dispatch(clearLoginError())
        }
        this.setState({password: event.target.value})
      }

      render() {
        const {errors: {login: error}} = this.props._status
        const extraProps = {
          email: this.state.email,
          password: this.state.password,
          submit: this.submit.bind(this),
          updateEmail: this.updateEmail.bind(this),
          updatePassword: this.updatePassword.bind(this),
          validInput: validator(this.state),
          error: error
        }
        return <WrappedComponent {...this.props} {...extraProps} />
      }

    }

    return FirebaseLogin
  }
}
