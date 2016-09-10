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

  const { path = "", method } = options

  if (typeof path !== "function" && typeof path !== "string") {
    throw new Error("options.path must be a function or string")
  }

  if (typeof method !== "string" || !validMethods[method]) {
    throw new Error(`options.method must be one of: ${Object.keys(validMethods).join(", ")}`)
  }

  return WrappedComponent => {

    @connect((state, ownProps) => {
      const processing = state.firebase.writes.processing
      const errors = state.firebase.writes.errors
      const firebasePath = typeof path === "function"
        ? path(state, ownProps)
        : path

      return {
        processing: processing[firebasePath],
        errors: errors[firebasePath]
      }
    })
    class FirebaseWrite extends Component {

      static propTypes = {
        dispatch: PropTypes.func,
        processing: PropTypes.array,
        errors: PropTypes.array
      }

      constructor(props) {
        super(props)
        this.clearErrors = this.clearErrors.bind(this)
        this.submit = this.submit.bind(this)
      }

      submit(value) {
        const { dispatch, processing, errors, ...ownProps } = this.props
        return dispatch(
          write({ method, path, value, ownProps })
        )
      }

      clearErrors() {
        this.props.dispatch(
          clearWriteErrors(path)
        )
      }

      render() {
        const processing = this.props.processing && !!this.props.processing.length
        const errors = this.props.errors || []

        const extraProps = {
          submit: this.submit,
          clearErrors: this.clearErrors,
          errors: errors,
          processing: processing
        }

        return <WrappedComponent { ...this.props } { ...extraProps } />
      }

    }

    return FirebaseWrite
  }
}
