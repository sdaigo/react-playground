(() => {
  // src/lib/core.js
  function createElement(type, props, ...children) {
    console.log("1. createElement");
    return {
      type,
      props: {
        ...props,
        children: children.map(
          (child) => typeof child === "object" ? child : createTextElement(child)
        )
      }
    };
  }
  function createTextElement(text) {
    console.log("1-2. createElement");
    return {
      type: "TEXT_ELEMENT",
      props: {
        nodeValue: text,
        children: []
      }
    };
  }
  function createDOM(fiber) {
    console.log("2. createDOM");
    const dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);
    updateDOM(dom, {}, fiber.props);
    return dom;
  }
  var isEvent = (key) => key.startsWith("on");
  var isProperty = (key) => key !== "children" && !isEvent(key);
  var isNew = (prev, next) => (key) => prev[key] !== next[key];
  function updateDOM(dom, prevProps, nextProps) {
    console.log("3. updateDOM");
    for (const key of Object.keys(prevProps)) {
      if (isEvent(key) && (!Object.hasOwn(nextProps, key) || isNew(prevProps, nextProps)(key))) {
        const eventType = key.toLowerCase().substring(2);
        dom.removeEventListener(eventType, prevProps[key]);
      }
    }
    for (const key of Object.keys(nextProps)) {
      if (isEvent(key) && isNew(prevProps, nextProps)(key)) {
        const eventType = key.toLowerCase().substring(2);
        dom.addEventListener(eventType, nextProps[key]);
      }
    }
    for (const key of Object.keys(prevProps)) {
      if (isProperty(key) && !Object.hasOwn(nextProps, key)) {
        dom[key] = "";
      }
    }
    for (const key of Object.keys(nextProps)) {
      if (isProperty(key) && isNew(prevProps, nextProps)(key)) {
        dom[key] = nextProps[key];
      }
    }
  }
  function commitRoot() {
    console.log("5. commitRoot");
    deletions.forEach(commitWork);
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;
  }
  function commitWork(fiber) {
    console.log("5. commitWork");
    if (!fiber) {
      return;
    }
    let domParentFiber = fiber.parent;
    while (!domParentFiber.dom) {
      domParentFiber = domParentFiber.parent;
    }
    const domParent = domParentFiber.dom;
    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
      domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
      updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
    } else if (fiber.effectTag === "DELETION") {
      commitDeletion(fiber, domParent);
    }
    commitWork(fiber.child);
    commitWork(fiber.sibling);
  }
  function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
      domParent.removeChild(fiber.dom);
    } else {
      commitDeletion(fiber.child, domParent);
    }
  }
  function render(element, container) {
    console.log("0. render");
    wipRoot = {
      dom: container,
      props: {
        children: [element]
      },
      alternate: currentRoot
    };
    deletions = [];
    nextUnitOfWork = wipRoot;
  }
  var nextUnitOfWork = null;
  var currentRoot = null;
  var wipRoot = null;
  var deletions = null;
  function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
      shouldYield = deadline.timeRemaining() < 1;
    }
    if (!nextUnitOfWork && wipRoot) {
      commitRoot();
    }
    requestIdleCallback(workLoop);
  }
  requestIdleCallback(workLoop);
  function performUnitOfWork(fiber) {
    const isFunctionComponent = fiber.type instanceof Function;
    if (isFunctionComponent) {
      updateFunctionComponent(fiber);
    } else {
      updateHostComponent(fiber);
    }
    if (fiber.child) {
      return fiber.child;
    }
    let nextFiber = fiber;
    while (nextFiber) {
      if (nextFiber.sibling) {
        return nextFiber.sibling;
      }
      nextFiber = nextFiber.parent;
    }
  }
  function updateFunctionComponent(fiber) {
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
  }
  var wipFiber = null;
  var hookIndex = null;
  function useState(initial) {
    const oldHook = wipFiber.alternate?.hooks?.[hookIndex];
    const hook = {
      state: oldHook ? oldHook.state : initial,
      queue: []
    };
    const actions = oldHook ? oldHook.queue : [];
    for (const action of actions) {
      hook.state = action(hook.state);
    }
    const setState = (action) => {
      hook.queue.push(action);
      wipRoot = {
        dom: currentRoot.dom,
        props: currentRoot.props,
        alternate: currentRoot
      };
      nextUnitOfWork = wipRoot;
      deletions = [];
    };
    wipFiber.hooks.push(hook);
    hookIndex++;
    return [hook.state, setState];
  }
  function updateHostComponent(fiber) {
    if (!fiber.dom) {
      fiber.dom = createDOM(fiber);
    }
    reconcileChildren(fiber, fiber.props.children);
  }
  function reconcileChildren(wipFiber2, elements) {
    let index = 0;
    let oldFiber = wipFiber2.alternate?.child;
    let prevSibling = null;
    while (index < elements.length || oldFiber != null) {
      const element = elements[index];
      let newFiber = null;
      const sameType = oldFiber && element && element.type === oldFiber.type;
      if (sameType) {
        newFiber = {
          type: oldFiber.type,
          props: element.props,
          dom: oldFiber.dom,
          parent: wipFiber2,
          alternate: oldFiber,
          effectTag: "UPDATE"
        };
      }
      if (element && !sameType) {
        newFiber = {
          type: element.type,
          props: element.props,
          dom: null,
          parent: wipFiber2,
          alternate: null,
          effectTag: "PLACEMENT"
        };
      }
      if (oldFiber && !sameType) {
        oldFiber.effectTag = "DELETION";
        deletions.push(oldFiber);
      }
      if (oldFiber) {
        oldFiber = oldFiber.sibling;
      }
      if (index === 0) {
        wipFiber2.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
      index++;
    }
  }

  // src/component.jsx
  function Component() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState("");
    return /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement(
      "input",
      {
        type: "text",
        placeholder: "Enter your name",
        onChange: (e) => setName((_) => e.target.value.trim())
      }
    ), /* @__PURE__ */ createElement(
      "button",
      {
        id: "greeting",
        type: "button",
        onClick: () => {
          setCount((c) => c + 1);
        }
      },
      "Hello, ",
      name,
      "!"
    ), /* @__PURE__ */ createElement("p", null, "click count: ", count));
  }

  // src/index.jsx
  render(/* @__PURE__ */ createElement(Component, null), document.getElementById("root"));
})();
