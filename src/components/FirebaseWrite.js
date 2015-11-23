import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { write, clearWriteErrors } from '../actions/firebase'

const validMethods = {
  push: true,
  set: true,
  transaction: true,
  update: true
}

export default function(options = {}) {

  const {path, method} = options

  if (typeof path !== "function" && typeof path !== "string") {
    throw new Error("options.path must be a function or string")
  }

  if (typeof method !== "string" || !validMethods[method]) {
    throw new Error(`options.method must be one of: ${Object.keys(validMethods).join(", ")}`)
  }

  return WrappedComponent => {
    @connect(state => {
      const processing = state.firebase.writes.processing
      const errors = state.firebase.writes.errors
      const firebasePath = typeof path === "function"
        ? path(state)
        : path

      return {
        processing: processing[firebasePath] || [],
        errors: errors[firebasePath] || []
      }
    })
    class FirebaseWrite extends Component {

      static propTypes = {
        dispatch: PropTypes.func,
        processing: PropTypes.array,
        errors: PropTypes.array
      }

      submit(value) {
        this.props.dispatch(
          write(method, path, value)
        )
      }

      clearErrors() {
        this.props.dispatch(
          clearWriteErrors(method, path)
        )
      }

      render() {
        const processing = !!this.props.processing.length
        const errors = this.props.errors

        const extraProps = {
          submit: this.submit.bind(this),
          clearErrors: this.clearErrors.bind(this),
          errors: errors,
          processing: processing
        }

        return <WrappedComponent {...this.props} {...extraProps} />
      }

    }

    return FirebaseWrite
  }
}
