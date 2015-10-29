# redux-firebase-sync

Syncs your selected Firebase paths to redux and automatically re-renders all your views on changes. You can also switch watched paths based on state changes.

## TODO

 - documentation
 - tests
 - example app
 - publish to github

## syncFirebase({store, url, bindings, onCancel, onAuth})

TODO: describe how to use

## React components

### <FirebaseProvider url={your_firebase_url} />

Puts Firebase instance reference to context, when you use `connectFirebase` it gets automatically passed as `firebase` prop.

### connectFirebase()

Decorator with same function signature as react-redux's connect.

TODO: describe how to easily select wanted firebase paths & special `_status`

## Usage:
```javascript
// primitive
// path: "counter" => {key: "counter", value: 1}
const {value: counter} = this.props.counter;

// object
// path: "projects/1" => {key: "1", value: {title: "Cool"}}
const {value: project} = this.props.project;

// array
// path: "projects" => {key: "projects", value: [{key: "1", value: {title: "Cool"}}]}
const {value: projects} = this.props.projects;
projects.map(record => {
  const {key: id, value: project} = record;
  return <li>{id} {project.title}</li>;
})
```
