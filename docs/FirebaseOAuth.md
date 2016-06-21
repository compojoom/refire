# FirebaseOAuth

> Firebase OAuth login

Available providers are `facebook`, `google`, `twitter` and `github`.

Available authentication flows are `popup` and `redirect`.

You can also pass `scopes` prop to request extra information, e.g. obtaining birthday with Facebook authentication you'd pass `['user_birthday']` as prop.

```js
import { FirebaseOAuth } from 'refire-app'
const LoginWithGoogle = () => {
  return (
    <FirebaseOAuth provider="google" flow="popup">
      <Button>Login with Google</Button>
    </FirebaseOAuth>
  )
}
```
