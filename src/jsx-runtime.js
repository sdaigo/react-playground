const appendChild = (parent, child) => {
  if (Array.isArray(child)) {
    for (const nestedChild of child) {
      appendChild(parent, nestedChild);
    }
  } else {
    parent.appendChild(
      child?.nodeType //
        ? child
        : document.createTextNode(child),
    );
  }
};

const jsx = (tag, props) => {
  const { children, ...rest } = props;

  // Custom component
  if (typeof tag === "function") {
    return tag(props, children);
  }

  const element = document.createElement(tag);

  // Apply props
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

const jsxs = jsx;

export { jsx, jsxs };
