# Lupi: State management as easy as possible

Lupi is a state management library that is designed to be as easy to use as possible.

## Features

- **Ready-to-use Hook**: Lupi has a ready-to-use hook that you can use to create a store in your React components.
- **Type-safe**: Lupi is written in TypeScript, so you can be sure that your store is type-safe.
- **Persistency**: Lupi can persist your store in the browser's local storage automatically if you provide a `storageKey` option.
- **Security**: If you provide a `secret` string, Lupi will encrypt your store before saving it to the local storage.

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

Here is an example of how to use the `createStoreHook` from the `lupi` library in a React component:

```tsx
import { createStore } from 'lupi';
import './App.css';

const useCounter = createStore(0);

function MyChildComponent() {
  const [counter, setCount] = useCounter();

  return <button onClick={() => setCount(counter + 1)}>count is {counter}</button>;
}

function AnotherChildComponent() {
  const [counter, setCount] = useCounter();

  return <button onClick={() => setCount(counter - 1)}>count is {counter}</button>;
}

function App() {
  const [counter] = useCounter();

  return (
    <div>
      <h1>Simple Counter</h1>
      <p>Count is {counter.count}</p>

      <MyChildComponent />
      <AnotherChildComponent />
    </div>
  );
}

export default App;
```
