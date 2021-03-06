import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { firebaseToProps } from '../index'
import { clearRegistrationError, createUser } from '../actions/firebase'

// default validator assumes that each field has some value
const defaultValidator = state => {
  return Object.keys(state).every(field => {
    return !!state[field]
  })
}

const defaultSubmit = (dispatch, state) => {
  return dispatch(
    createUser(state)
  ).catch(() => {})
}

const update = function update(field) {
  return (event) => {
    this.updateField(event, field)
  }
}

export default function(options = {}) {

  const {
    fields = ["email", "password"],
    submit = defaultSubmit,
    validator = defaultValidator
  } = options

  return WrappedComponent => {

    @connect(firebaseToProps(["_status"]))
    class FirebaseRegistration extends Component {

      static propTypes = {
        dispatch: PropTypes.func,
        _status: PropTypes.object
      }

      constructor(props) {
        super(props)
        this.state = fields.reduce((initialState, field) => {
          return {...initialState, [field]: null}
        }, {})
        this.submit = this.submit.bind(this)
        this.update = update.bind(this)
      }

      submit(event) {
        event.preventDefault()
        submit(this.props.dispatch, this.state)
      }

      updateField(event, field) {
        const { errors: { createUser: error } } = this.props._status
        if (error) {
          this.props.dispatch(clearRegistrationError())
        }
        this.setState({ [field]: event.target.value })
      }

      render() {
        const {
          errors: { createUser: error },
          processing: { createUser: processing },
          completed: { createUser: completed }
        } = this.props._status

        const extraProps = {
          ...this.state,
          submit: this.submit,
          update: this.update,
          validInput: validator(this.state),
          error: error,
          processing: processing,
          completed: completed
        }

        return <WrappedComponent { ...this.props } { ...extraProps } />
      }

    }

    return FirebaseRegistration
  }
}
