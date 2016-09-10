# Refire

> Declarative Firebase bindings for Redux and React

Refire keeps your local [Redux](http://redux.js.org/) store in sync with selected [Firebase](https://www.firebase.com/) paths. You can declaratively bind Firebase paths as Strings, Objects or Arrays.

You can also specify queries based on Redux state (e.g. currently logged in user or route parameter) and Refire will automatically subscribe and unsubscribe your bindings when state changes.

Using provided [React](https://facebook.github.io/react/) higher order components and [React Redux](https://github.com/reactjs/react-redux) helper you also get automatic re-renders for your connected views on any change.

All mutation happens through [Firebase client's](https://www.firebase.com/docs/web/api/firebase) `references` and there's `FirebaseWrite` HOC for easy updates from your React components.

There's also [refire-app](https://github.com/hoppula/refire-app), it wraps Refire, Redux, React Router and React Free Style with developer friendly API.

## syncFirebase({apiKey, projectId, store, bindings, onCancel, onAuth, pathParams, databaseURL, serviceAccount, name})

syncFirebase needs bindings, a Redux store instance and a Firebase instance settings (apiKey & projectId).

`apiKey` is needed for firebase client since 3.x, you can obtain it from [Firebase console](https://console.firebase.google.com), select your project and go to `Add Firebase to your web app`.

`projectId` is the project's identifier, e.g. `projectId`.firebaseio.com

`bindings` bindings define the sync options per firebase path. See the comments below in **Usage example** for more info.

`store` is your Redux store instance, remember to include `firebaseReducer` in your Redux reducer function, see the **Usage example** below.

`databaseURL` (optional) you can override default `projectId.firebaseio.com` url by setting `databaseURL`, pass the whole url.

`serviceAccount` (optional) is only for server-side usage, see [Add Firebase to your Server](https://firebase.google.com/docs/server/setup) for instructions.

`name` (optional) unique identifier for this instance, defaults to `[DEFAULT]`.

`onAuth` (optional) gets called after Firebase's authentication state changes.

`onCancel` (optional) gets called whenever Firebase sync operations fail, e.g. user doesn't have needed permissions.

`pathParams` (optional) gets called with state and result will be provided as second parameter for bindings' path function.

### Usage example
```js
import { applyMiddleware, createStore, compose, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import { firebaseReducer, syncFirebase } from 'refire'

const firebaseBindings = {
  // Primitives can be defined without setting any type, just set the local sync path
  // as key and object containing remote path as value.
  localCounter: {
    path: "counterPathInFirebase"
  },
  // Objects can be defined by setting the type as "Object"
  localObject: {
    type: "Object",
    path: "objectPathInFirebase"
  },
  // Arrays can be defined by setting the type as "Array"
  // You can also define query, it will fetch the initial values
  // with given reference params and also keep your binding live on any changes
  localArray: {
    type: "Array",
    path: "arrayPathInFirebase",
    query: (ref, state) => ref.orderByChild(state.routing.query.orderBy)
  },
  // If you want to react to state changes, you can define the path dynamically
  // by setting the path as function.
  // In this example user store would be populated with user data when user logs in
  // and automatically cleared when user logs out.
  user: {
    type: "Object",
    path: state => {
      if (state.firebase.authenticatedUser) {
        return `users/${state.firebase.authenticatedUser.uid}`
      } else {
        return null
      }
    }
  },
  // You can use populate to easily get related items
  // Your flattened data (here users/:uid/reviews) should be in format:
  // {firstReviewId: true, secondReviewId: true, ...}
  // as described in: https://www.firebase.com/docs/web/guide/structuring-data.html#section-join
  // Using populate will return an array where placeholder values are replaced with real values from
  // the path that gets returned in populate function.
  userReviews: {
    path: state => {
      if (state.firebase.authenticatedUser) {
        return `users/${state.firebase.authenticatedUser.uid}/reviews`
      } else {
        return null
      }
    }
    populate: (key) => `reviews/${key}`
  }
}

const reducer = combineReducers({
  firebase: firebaseReducer(firebaseBindings),
  // your other reducers
})
const store = compose(applyMiddleware(thunk))(createStore)(reducer)

const {unsubscribe} = syncFirebase({
  store: store,
  apiKey: "BIzaXyD_O6g9v12ozW38XRJ3DYhI-Q3sEDdqYmw",
  projectId: "your-firebase-instance",
  bindings: firebaseBindings,
  onAuth: (authData) => {},
  onCancel: (error) => {}
})
```

## React Redux connect helper

### firebaseToProps(localBindings, mapStateToProps)

Creates selector function for [react-redux's connect](https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options).

`firebaseToProps` will return the content of your given bindings as props.

If you also need to return something else from Redux, pass your normal mapStateToProps as second parameter, firebaseToProps will merge the results.

```js
class Counter extends Component {
  render() {
    // counter data available as this.props.counter
  }
}
export default connect(firebaseToProps(["counter"]))(Counter)
```

There's also special `_status` binding available, it provides an object with latest `authenticatedUser`, `connected`, `errors` and `initialFetchDone` values.

```js
class App extends Component {

  render() {
    const { _status: status } = this.props
    const connected = status.connected && status.initialFetchDone

    if (!connected) {
      return (
        <div>Loading...</div>
      )
    } else {
      // firebase connected & all initial fetching done
    }
  }
}
export default connect(firebaseToProps(["_status"]))(App)
```

## React components

These higher order components will help you with basic Firebase tasks.

**FirebaseOAuth** does not work with [React Native](https://facebook.github.io/react-native/) yet as it requires browser redirects or popups. It might be possible to add React Native version later as WebView component is now available for both iOS & Android.

### Documentation

[FirebaseLogin](docs/FirebaseLogin.md)

[FirebaseLogout](docs/FirebaseLogout.md)

[FirebaseOAuth](docs/FirebaseOAuth.md)

[FirebaseRegistration](docs/FirebaseRegistration.md)

[FirebaseResetPassword](docs/FirebaseResetPassword.md)

[FirebaseWrite](docs/FirebaseWrite.md)

## Data shape

All returned values are wrapped in `{key, value}` shaped object for easier consumption.

Primitives and Objects could be returned as they are, but then consumption of Array elements would be different, it's easier to have uniform way to access keys and values.

### Usage example using ES6 destructuring assignment
```js
// Primitives
// {key: "counter", value: 1}
const {value: counter} = this.props.counter

// Objects
// {key: "project", value: {title: "Cool"}}
const {value: project} = this.props.project

// Arrays
// {key: "projects", value: [{key: "-K1XY-B3ZR...", value: {title: "refire"}}]}
const {value: projects} = this.props.projects
projects.map(record => {
  const {key: id, value: project} = record
  return <li key={id}>{project.title}</li>
})
```

## Promises needed

Refire uses [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) but doesn't include any polyfill. If you want to use Refire in browsers without Promise support, you have to include something like [es6-promise](https://github.com/stefanpenner/es6-promise) or [native-promise-only](https://github.com/getify/native-promise-only).

## License

MIT
