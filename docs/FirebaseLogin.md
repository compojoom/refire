# FirebaseLogin

> HOC for Firebase login with e-mail & password

## Options

**validator** *(state) => Boolean*

Optional. Custom validator function.

```js
import { FirebaseLogin } from 'refire-app'
class LoginComponent extends Component {
  render() {
    const {
      email,
      password,
      submit,
      updateEmail,
      updatePassword,
      validInput,
      error,
      processing,
      completed
    } = this.props
  }
}
export default FirebaseLogin({
  validator: optionalCustomValidatorFn
})(LoginComponent)
```
