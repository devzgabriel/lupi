import { createStore } from '../lib/lupi-validation';

export const counterStore = createStore(
  { count: 0, isOdd: true },
  // {
  //   storageKey: 'counter',
  //   schema: {
  //     count:{
  //      validators:[
  //       (value) => value > 0,
  //       (value) => value < 100
  //      ]
  //     },
  //     isOdd:{
  //       isBoolean: true
  //     }
  //   },
  // },
);
