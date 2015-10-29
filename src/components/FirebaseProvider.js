import { Component, PropTypes, Children } from 'react';
import Firebase from 'firebase';

class FirebaseProvider extends Component {
  getChildContext() {
    return { firebase: this.firebase };
  }

  constructor(props, context) {
    super(props, context);
    this.firebase = new Firebase(props.url);
  }

  render() {
    let { children } = this.props;
    return Children.only(children);
  }
}

FirebaseProvider.propTypes = {
  url: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired
};

FirebaseProvider.childContextTypes = {
  firebase: PropTypes.object.isRequired
};

export default FirebaseProvider;
