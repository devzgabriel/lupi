# Lupi: State management as easy as possible

Lupi is a state management library that is designed to be as easy to use as possible.

## Features

- **Ready-to-use Hook**: Lupi has a ready-to-use hook that you can use to create a store in your React components.
- **Type-safe**: Lupi is written in TypeScript, so you can be sure that your store is type-safe.
- **Persistency**: Lupi can persist your store in the browser's local storage automatically if you provide a `storageKey` option.
- **Security**: If you provide a `encryptKey` string, Lupi will encrypt your store before saving it to the local storage.
- **Actions**: You can define actions to modify the store and abstract the logic from the components.

## WIP Features

- **Validation**: Lupi will have a validation feature that allows you to validate the store's state.

## Installation

You can install Lupi using npm:

```bash
npm install lupi
```

or using yarn:

```bash
yarn add lupi
```

## Example Usage

Here is an example of how to use the `createStore` from the `lupi` library in a React component:

```tsx
import { createStore } from 'lupi';
import './App.css';

const useCounter = createStore(0);

function MyChildComponent() {
  const { state: counter, copyWith } = useCounter();

  return <button onClick={() => copyWith(counter + 1)}>count is {counter}</button>;
}

function AnotherChildComponent() {
  const { state: counter, copyWith } = useCounter();

  return <button onClick={() => copyWith(counter - 1)}>count is {counter}</button>;
}

function App() {
  const { state: counter } = useCounter();

  return (
    <div>
      <h1>Simple Counter</h1>
      <p>Count is {counter}</p>

      <MyChildComponent />
      <AnotherChildComponent />
    </div>
  );
}

export default App;
```

## Options

You can pass an object as the second argument to the `createStore` function to configure the store:

```tsx
const useCounter = createStore(0, {
  // The key to save the store in the local storage
  storageKey: 'counter',

  // The key to encrypt the store, if empty, the data will be saved as plain text
  // Recommended to use if you want to save sensitive data
  encryptKey: 'my-secret-key',

  actions: {
    // You can define actions to modify the store
    increment: (state: number) => state + 1,
    decrement: (state: number) => state - 1,

    // You can also pass a payload to the action
    equation: (state: number, numberA: number, numberB: number) => (state * numberA) / numberB,
  },
});
```
