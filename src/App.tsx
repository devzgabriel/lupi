import { createStoreHook } from '../lib/lupi-validation';
import './App.css';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

const useCounter = createStoreHook(
  { count: 0, isOdd: true },
  {
    storageKey: 'counter_store',
  },
);

function MyChildComponent() {
  const [counter, setCount] = useCounter();

  return (
    <div>
      <button onClick={() => setCount((p) => ({ ...p, count: p.count + 1 }))}>
        count is {counter.count}
      </button>
    </div>
  );
}

function App() {
  const [counter, setCount] = useCounter();

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() =>
            setCount({
              count: counter.count + 1,
              isOdd: counter.count % 2 !== 0,
            })
          }
        >
          count is {counter.count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>

      <MyChildComponent />
    </>
  );
}

export default App;
