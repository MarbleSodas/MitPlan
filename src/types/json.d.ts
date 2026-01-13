declare module '*.json' {
  const value: import('./index').BossAction[];
  export default value;
}
