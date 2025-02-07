import { createStoreHook } from '../lib/lupi-validation';
import './App.css';

const useCounter = createStoreHook({ count: 0 });

function MyChildComponent() {
  const [counter, setCount] = useCounter();

  return (
    <button onClick={() => setCount({ count: counter.count + 1 })}>count is {counter.count}</button>
  );
}

function AnotherChildComponent() {
  const [counter, setCount] = useCounter();

  return (
    <button onClick={() => setCount({ count: counter.count - 1 })}>count is {counter.count}</button>
  );
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
