import Firebase from 'firebase'

export default function createProvider(React) {
  const { Component, PropTypes, Children } = React

  class FirebaseProvider extends Component {
    getChildContext() {
      return { firebase: this.firebase }
    }

    constructor(props, context) {
      super(props, context)
      this.firebase = new Firebase(props.url)
    }

    render() {
      return Children.only(this.props.children)
    }
  }

  FirebaseProvider.propTypes = {
    url: PropTypes.string.isRequired,
    children: PropTypes.element.isRequired
  }

  FirebaseProvider.childContextTypes = {
    firebase: PropTypes.object.isRequired
  }

  return FirebaseProvider
}
