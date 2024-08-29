export const Component = ({ name }) => {
  const greeting = "Hello";
  return (
    <button
      id="greeting"
      type="button"
      onClick={() => {
        alert(`${greeting}, ${name}!`);
      }}
    >
      {greeting}, {name}!
    </button>
  );
};
