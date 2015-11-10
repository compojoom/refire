# redux-firebase-sync

Fetches selected [Firebase](https://www.firebase.com/) paths to your local [Redux](http://redux.js.org/) store and keeps your local store in sync with server's state. You can also switch watched paths on state changes.

Using provided [React](https://facebook.github.io/react/) components you also get automatic re-renders for your connected views on any change.

All mutation still happens through [Firebase client's](https://www.firebase.com/docs/web/api/firebase) `references`.

## syncFirebase({store, url, bindings, onCancel, onAuth})

syncFirebase needs bindings, a Redux store instance and a Firebase instance url.

`bindings` bindings define the sync options per firebase path. See the comments below in usage example for more info.

`store` is your redux store instance, remember to include `firebaseReducer` in your reducer function, see the usage example below.

`url` is your firebase instance's url.

`onAuth` (optional) gets called after Firebase's authentication state changes

`onCancel` (optional) gets called whenever reading data fails, e.g. client does not have needed read permissions

### Usage example
```javascript
import { applyMiddleware, createStore, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { firebaseReducer, syncFirebase } from 'redux-firebase-sync';

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
  // You can also define initialQuery, it will fetch the initial values
  // with given reference and then listen for changes normally
  localArray: {
    type: "Array",
    path: "arrayPathInFirebase",
    initialQuery: ref => ref.orderByChild("timestamp")
  },
  // If you want to react to state changes, you can define the path dynamically
  // by setting the path as function.
  // In this example user path would be populated with user data when user logs in
  // and automatically cleared when user logs out.
  user: {
    type: "Object",
    path: state => {
      if (state.firebase.authenticatedUser) {
        return `users/${state.firebase.authenticatedUser.uid}`;
      } else {
        return null;
      }
    }
  }	
};

const reducer = combineReducers({
  firebase: firebaseReducer(firebaseBindings),
  // your other reducers
});
const store = compose(applyMiddleware(thunk))(createStore)(reducer);

const {unsubscribe} = syncFirebase({
  store: store,
  url: "https://your-firebase-instance.firebaseio.com/",
  bindings: firebaseBindings,
  onAuth: (authData) => {},
  onCancel: (error) => {}
});
```

## React components

### &lt;FirebaseProvider url={yourFirebaseUrl}&gt;

Puts a Firebase instance reference to React's context, so that when you use `connectFirebase` down the tree, the reference gets automatically passed as `firebase` prop.

```javascript
class Root extends Component {
  render() {
    return (
      <FirebaseProvider url="https://your-firebase-instance.firebaseio.com/">
        <Provider store={store}>
          <Router history={createHistory()}>
            <Route path="/" component={App}>
              <IndexRoute component={Home} />
            </Route>
          </Router>
        </Provider>
      </FirebaseProvider>
    );
  }
}
```

### connectFirebase([mapStateToProps], [mapDispatchToProps], [mergeProps], [options])

Keeps provided React component in sync with given firebase paths in Redux store. 

Same function signature as in [react-redux's connect](https://github.com/rackt/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options).

You can use connectFirebase just like react-redux's connect, but it provides you some extra functionality.

You can get your local binding as a prop by returning `{firebase: ["yourLocalBinding"]}` from mapStateToProps. 

Firebase reference provided by **&lt;FirebaseProvider&gt;** will also be available as `firebase` prop.

```javascript
@connectFirebase(
  state => ({firebase: ["counter"]})
)
class Counter extends Component { 
  render() {
    // counter available as this.props.counter
    // Firebase reference available as this.props.firebase
  }
}
```

There's also special `_status` binding available, it provides an object with `connected` and `initialFetchDone` values. 

```javascript
@connectFirebase(state => ({firebase: ["_status"]}))
class App extends Component {

  render() {
    const {_status: status} = this.props;
    const connected = status.connected && status.initialFetchDone;

    if (!connected) {
      return (
        <div>Loading...</div>
      );
    } else {
      // firebase connected & all initial fetches done
    }
  }
}
```

## Data shape

All returned values are wrapped in `{key, value}` shaped object for easier consumption.
Primitives and Objects could be returned as they are, but then consumption of Array elements would be different, it's easier to have uniform way to access keys and values. I'm also not a big fan of `.key` and `.value` used in [ReactFire](https://github.com/firebase/reactfire). 

```javascript
// Primitives
// {key: "counter", value: 1}
const {value: counter} = this.props.counter;

// Objects
// {key: "project", value: {title: "Cool"}}
const {value: project} = this.props.project;

// Arrays
// {key: "projects", value: [{key: "-K1XY-B3ZR...", value: {title: "redux-firebase-sync"}}]}
const {value: projects} = this.props.projects;
projects.map(record => {
  const {key: id, value: project} = record;
  return <li key={id}>{project.title}</li>;
})
```
