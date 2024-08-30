import * as re from "./lib/core";

export default function Component() {
  const [count, setCount] = re.useState(0);
  const [name, setName] = re.useState("");

  return (
    <div>
      <input
        type="text"
        placeholder="Enter your name"
        onChange={e => setName(_ => e.target.value.trim())}
      />
      <button
        id="greeting"
        type="button"
        onClick={() => {
          setCount(c => c + 1);
        }}
      >
        Hello, {name}!
      </button>
      <p>click count: {count}</p>
    </div>
  );
}
