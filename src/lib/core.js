// 仮想DOMノードを作成
function createElement(type, props, ...children) {
  console.log("1. createElement");
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child),
      ),
    },
  };
}

// 仮想テキストノードを作成
function createTextElement(text) {
  console.log("1-2. createElement");
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// 仮想DOMから実際のDOMノードを生成する
// 初回 render 時に呼ばれる
function createDOM(fiber) {
  console.log("2. createDOM");
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  // 初回のDOM生成時に属性やイベントリスナーを設定
  updateDOM(dom, {}, fiber.props);

  return dom;
}

const isEvent = key => key.startsWith("on");
const isProperty = key => key !== "children" && !isEvent(key);
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);

// DOMの属性 / イベントリスナーの追加・削除・更新
function updateDOM(dom, prevProps, nextProps) {
  console.log("3. updateDOM");
  for (const key of Object.keys(prevProps)) {
    // イベントリスナーを削除
    if (
      isEvent(key) &&
      (!Object.hasOwn(nextProps, key) || isNew(prevProps, nextProps)(key))
    ) {
      const eventType = key.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[key]);
    }
  }

  // イベントリスナーを追加
  for (const key of Object.keys(nextProps)) {
    if (isEvent(key) && isNew(prevProps, nextProps)(key)) {
      const eventType = key.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[key]);
    }
  }

  // 古い属性を削除
  for (const key of Object.keys(prevProps)) {
    if (isProperty(key) && !Object.hasOwn(nextProps, key)) {
      dom[key] = "";
    }
  }

  // 新しい属性を追加 or 更新
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

// Fiberノードの作業を実際にコミット
function commitWork(fiber) {
  console.log("5. commitWork");
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;

  // 実際のDOMノードを持つ親を探していく
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }

  const domParent = domParentFiber.dom;

  // 新規作成されたDOMノードを追加
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  }
  // 既存のDOMノードを更新
  else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
  }
  // 削除対象のノードを削除
  else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  // 子・兄弟ノードにもコミットしていく
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

// 初回レンダリングを開始する
function render(element, container) {
  console.log("0. render");
  // Fiberツリーの初期化
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };

  // 削除されるノードのリスト
  deletions = [];

  // 次の作業ユニットをルートノードに設定する
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = null;

// 作業単位（ユニット）を処理するループ
function workLoop(deadline) {
  // 処理を中断すべきかどうか
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    // 次の作業単位
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // アイドル時間がなくなったら、falseを返して中断する
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    // 全ての処理が完了したら、DOMをコミットする
    commitRoot();
  }

  // 次のアイドル時間にworkLoop()関数を再実行
  requestIdleCallback(workLoop);
}

// 初回
requestIdleCallback(workLoop);

// 各Fiberの作業を行う
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;

  // custom component or HTML要素
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 子ノード
  if (fiber.child) {
    return fiber.child;
  }

  // 兄弟ノード
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

// 関数コンポーネントの更新
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;

  wipFiber.hooks = [];

  const children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
}

let wipFiber = null;
let hookIndex = null;

function useState(initial) {
  const oldHook = wipFiber.alternate?.hooks?.[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  for (const action of actions) {
    hook.state = action(hook.state);
  }

  const setState = action => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
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

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
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
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
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
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

export { createElement, render, useState };
