import expect from 'expect'
import React, { PropTypes, Component } from 'react'
import proxyquire from 'proxyquire'
import TestUtils from 'react-addons-test-utils'

const Firebase = proxyquire('firebase', {
  'faye-websocket': {
    Client: function (url) {
      url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost').replace('wss://', 'ws://')
      return new originalWebsocket.Client(url)
    }
  }
})

const FirebaseProvider = proxyquire('../../src/components/FirebaseProvider', {
  'firebase': Firebase
})(React)

describe('React', () => {
  describe('FirebaseProvider', () => {
    class Child extends Component {
      static contextTypes = {
        firebase: PropTypes.object.isRequired
      }

      render() {
        return <div />
      }
    }

    it('should enforce a single child', () => {
      const url = "https://dummy1.firebaseio.test"

      // Ignore propTypes warnings
      const propTypes = FirebaseProvider.propTypes
      FirebaseProvider.propTypes = {}

      try {
        expect(() => TestUtils.renderIntoDocument(
          <FirebaseProvider url={url}>
            <div />
          </FirebaseProvider>
        )).toNotThrow()

        expect(() => TestUtils.renderIntoDocument(
          <FirebaseProvider url={url}>
          </FirebaseProvider>
        )).toThrow(/exactly one child/)

        expect(() => TestUtils.renderIntoDocument(
          <FirebaseProvider url={url}>
            <div />
            <div />
          </FirebaseProvider>
        )).toThrow(/exactly one child/)
      } finally {
        FirebaseProvider.propTypes = propTypes
      }
    })

    it('should add the firebase reference to the child context', () => {
      const url = "https://dummy1.firebaseio.test"

      const spy = expect.spyOn(console, 'error')
      const tree = TestUtils.renderIntoDocument(
        <FirebaseProvider url={url}>
          <Child />
        </FirebaseProvider>
      )
      spy.destroy()
      expect(spy.calls.length).toBe(0)

      const child = TestUtils.findRenderedComponentWithType(tree, Child)
      expect(child.context.firebase).toBeA(Firebase)
    })

  })
})
