(() => {
  // src/jsx-runtime.js
  var appendChild = (parent, child) => {
    if (Array.isArray(child)) {
      for (const nestedChild of child) {
        appendChild(parent, nestedChild);
      }
    } else {
      parent.appendChild(
        child?.nodeType ? child : document.createTextNode(child)
      );
    }
  };
  var jsx = (tag, props) => {
    const { children, ...rest } = props;
    if (typeof tag === "function") {
      return tag(props, children);
    }
    const element = document.createElement(tag);
    const propKeys = Object.keys(rest);
    if (propKeys.length > 0) {
      for (const k of propKeys) {
        if (k.startsWith("on") && k.toLowerCase() in window) {
          element.addEventListener(k.toLowerCase().substring(2), rest[k]);
        } else if (k === "className") {
          element.className = rest[k];
        } else {
          element.setAttribute(k, rest[k]);
        }
      }
    }
    appendChild(element, children);
    return element;
  };
  var jsxs = jsx;

  // src/component.jsx
  var Component = ({ name }) => {
    const greeting = "Hello";
    return /* @__PURE__ */ jsxs(
      "button",
      {
        id: "greeting",
        type: "button",
        onClick: () => {
          alert(`${greeting}, ${name}!`);
        },
        children: [
          greeting,
          ", ",
          name,
          "!"
        ]
      }
    );
  };

  // src/index.jsx
  var root = document.getElementById("root");
  root.innerHTML = "";
  root.appendChild(/* @__PURE__ */ jsx(Component, { name: "aoi" }));
})();
