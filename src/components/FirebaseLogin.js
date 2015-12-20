import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { firebaseToProps } from '../index'
import { clearLoginError, passwordLogin } from '../actions/firebase'

const defaultValidator = state => {
  return Object.keys(state).every(field => {
    return !!state[field]
  })
}

export default function(options = {}) {

  const { validator = defaultValidator } = options

  return WrappedComponent => {

    @connect(firebaseToProps(["_status"]))
    class FirebaseLogin extends Component {

      static propTypes = {
        dispatch: PropTypes.func,
        _status: PropTypes.object
      }

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
        ).catch(() => {})
      }

      updateEmail(event) {
        const { errors: { login: error } } = this.props._status
        if (error) {
          this.props.dispatch(clearLoginError())
        }
        this.setState({ email: event.target.value })
      }

      updatePassword(event) {
        const { errors: { login: error } } = this.props._status
        if (error) {
          this.props.dispatch(clearLoginError())
        }
        this.setState({ password: event.target.value })
      }

      render() {
        const {
          errors: { login: error },
          processing: { login: processing },
          completed: { login: completed }
        } = this.props._status

        const extraProps = {
          email: this.state.email,
          password: this.state.password,
          submit: this.submit.bind(this),
          updateEmail: this.updateEmail.bind(this),
          updatePassword: this.updatePassword.bind(this),
          validInput: validator(this.state),
          error: error,
          processing: processing,
          completed: completed
        }

        return <WrappedComponent { ...this.props } { ...extraProps } />
      }

    }

    return FirebaseLogin
  }
}
