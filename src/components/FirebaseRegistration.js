import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import createConnect from './connectFirebase'
import { clearRegistrationError, createUser } from '../actions/firebase'
const connectFirebase = createConnect(React, connect)

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

export default function(options = {}) {

  const {
    fields = ["email", "password"],
    submit = defaultSubmit,
    validator = defaultValidator
  } = options

  return WrappedComponent => {
    @connectFirebase(state => ({firebase: ["_status"]}))
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
      }

      submit(event) {
        event.preventDefault()
        submit(this.props.dispatch, this.state)
      }

      update(event, field) {
        const {errors: {login: error}} = this.props._status
        if (error) {
          this.props.dispatch(clearRegistrationError())
        }
        this.setState({[field]: event.target.value})
      }

      render() {
        const {
          errors: {createUser: error},
          processing: {createUser: processing},
          completed: {createUser: completed}
        } = this.props._status

        const extraProps = {
          ...this.state,
          submit: this.submit.bind(this),
          update: (field) => {
            return (event) => {
              this.update(event, field)
            }
          },
          validInput: validator(this.state),
          error: error,
          processing: processing,
          completed: completed
        }

        return <WrappedComponent {...this.props} {...extraProps} />
      }

    }

    return FirebaseRegistration
  }
}
