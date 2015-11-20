import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import createConnect from './connectFirebase'
import { resetPassword, clearResetPasswordError } from '../actions/firebase'
const connectFirebase = createConnect(React, connect)

const defaultValidator = input => {
  return !!input
}

export default function(options = {}) {

  const {validator = defaultValidator} = options

  return WrappedComponent => {
    @connectFirebase(state => ({firebase: ["_status"]}))
    class FirebaseResetPassword extends Component {

      static propTypes = {
        dispatch: PropTypes.func,
        _status: PropTypes.object
      }

      constructor(props) {
        super(props)
        this.state = {
          email: null
        }
      }

      submit(event) {
        event.preventDefault()
        this.props.dispatch(
          resetPassword(this.state.email)
        )
      }

      updateEmail(event) {
        const {errors: {resetPassword: error}} = this.props._status
        if (error) {
          this.props.dispatch(clearResetPasswordError())
        }
        this.setState({email: event.target.value})
      }

      render() {
        const {
          errors: {resetPassword: error},
          processing: {resetPassword: processing},
          completed: {resetPassword: completed}
        } = this.props._status

        const extraProps = {
          email: this.state.email,
          submit: this.submit.bind(this),
          updateEmail: this.updateEmail.bind(this),
          validInput: validator(this.state.email),
          error: error,
          processing: processing,
          completed: completed
        }

        return <WrappedComponent {...this.props} {...extraProps} />
      }

    }

    return FirebaseResetPassword
  }
}
