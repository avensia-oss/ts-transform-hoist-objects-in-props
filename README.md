# ts-transform-hoist-objects-in-props

A TypeScript custom transformer that hoists object literals and functions that are passed to JSX props. The use case it tries to solve first and foremost is passing style objects to CSS-in-JS components such as Glitz and Emotion, like `<MyComp css={{background: 'red'}} />`, but it will hoist any object literal or function prop that it finds and determines to be hoistable.

## What it actually does

Let's say that you have a component like this:

```js
export default () => <MyComp css={{ background: 'red' }} />;
```

Each time this component renders the object literal in the `css` prop will be recreated, and the `Comp` cannot use object equality to bail out of rendering again, even though we pass exactly the same data again. The CSS-in-JS lib could of course use `React.memo()`, but you typically have lots of styled components and doing that extra comparision is probably about as expensive as just rendering it again. So it could actually be more costly to add `React.memo()` here. And `React.memo()` doesn't bail on rendering for cases like this:

```js
export default () => <MyComp css={{ background: 'red', color: theme => (theme === 'dark' ? 'black' : 'white') }} />;
```

Since we pass a function that will also be recreated on each render, and `React.memo()` won't be able to bail.

This transformer will transform the code from this:

```js
export default () => <MyComp css={{ background: 'red', color: theme => (theme === 'dark' ? 'black' : 'white') }} />;
```

To this:

```js
export default () => <MyComp css={__$hoisted_o0} />;
const __$hoisted_o0 = { background: 'red', color: theme => (theme === 'dark' ? 'black' : 'white') };
```

This means that we only declare the object once, and that object gets reused on each render. That has a positive (albeit small) impact on memory since we're allocating less objects, but it also means that the component can bail quickly on rendering since it's very cheap to compare objects by reference.

## Other props than for styling

This transform works well for any object literals in props, but it's specifically designed for CSS-in-JS. Since it hoists function props as well as object literal props it might help you with callback props, but only in a few cases. It will optimize this case:

```js
  render() {
    return <Comp onClick={someValue => importedFunction(someValue)} />;
  }
```

Since it can determine that all values used in the function can be hoisted. But most such callback props look more like this:

```js
  render() {
    return <Comp onClick={someValue => this.someMethod(someValue)} />;
  }
```

And this case can't be hoisted since `this` won't be available in the top level scope. Trying to hoist such props is possible, but it's not the goal of this transform.

## Trade-offs

This transform intentionally hoists things that aren't 100% static values. If an object literal contains an imported variable it will still be hoisted, since we assume that the imported value won't ever change. If it ever changes it should be sent as a prop and not as an imported variable. Imported variables are quite common for shared constants, and those are safe to hoist.

If you pass a function in the object literal the transform is quite smart in how it determines if the object can be hoisted. It checks all parameters to the function, and then checks all variables that you use in the function. If you use any variables that are not parameters, imported or declared at the top level of the module the object will not be hoisted. You can see this behavior in the tests.

## Other useful transform

If you find this transform useful you might want to use these ones as well: https://github.com/avensia-oss/

# Installation

```
yarn add @avensia-oss/ts-transform-hoist-objects-in-props
```

## Usage with webpack

Unfortunately TypeScript doesn't let you specifiy custom transformers in `tsconfig.json`. If you're using `ts-loader` with webpack you can specify it like this:
https://github.com/TypeStrong/ts-loader#getcustomtransformers-----before-transformerfactory-after-transformerfactory--

The default export of this module is a function which expects a `ts.Program` an returns a transformer function. Your config should look something like this:

```js
const hoistObjectsInPropsTransform = require('@avensia-oss/ts-transform-hoist-objects-in-props');

return {
  ...
  options: {
    getCustomTransformers: (program) => ({
      before: [hoistObjectsInPropsTransform(program, {
        /**
         * This regex lets you filter which props you want to run the transformation on. It should be safe to
         * run it on any props that contain object literals, but if you want to white list or black list props
         * this lets you do that.
         */
        propRegex: /.*/,
      })]
    })
  }
  ...
};
```
