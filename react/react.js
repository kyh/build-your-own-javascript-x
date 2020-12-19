/**
 * createElement creates and returns a new React element of a given type.
 *
 * @param {*} type - the type of the element we are creating. This can be
 *    either be a HTML element or a React component. If we are creating a
 *    HTML element, the name of the element (div, p etc.) is passed as a
 *    string. If we are creating a React component, the variable that the
 *    component is assigned to is passed as the value.
 * @param {*} props - An object containing the properties (props) that get
 *    passed to the component.
 * @param  {...any} children - The children of the component. You can pass
 *    as many children as you want.
 *
 * ```
 *  Example response:
    {
      type: 'div',
      props: {
        className: 'my-class',
        randomProp: 'randomValue',
        children: [{
          type: 'button',
          props: { className: 'blue' }
        }, {
          type: 'button',
          props: { className: 'red' }
        }]
      },
      $$typeof: Symbol.for("react.element"),
      ref: null,
      _owner: null
    }
 * ```
 */
const createElement = (type, props, ...children) => ({
  $$typeof: Symbol.for("react.element"),
  type: type,
  props: {
    children: children.flat(1),
    ...props,
  },
  ref: null,
  _owner: null,
});

class Component {
  constructor(props) {
    this.props = props;
  }

  setState(state) {
    // Do not rerender if setState is called with null or undefined
    if (state == null) {
      return;
    }

    if (typeof state === "function") {
      this.state = { ...this.state, ...state(this.state) };
    } else {
      this.state = { ...this.state, ...state };
    }

    setTimeout(render, 0);
  }

  render() {
    throw new Error(
      "React.Component may not be used directly. Create your own class which extends this class."
    );
  }
}

Component.prototype.isReactComponent = true;

/**
 * `VDomNode` is a "virtual" DOM-node. Everything that can be represented
 * in the DOM, such as a number, string, div, a, p etc. should be a VDomNode
 */
class VDomNode {
  static isEmpty(reactElement) {
    return reactElement === undefined || reactElement == null;
  }

  static isPrimitive(reactElement) {
    return (
      !reactElement.type &&
      (typeof reactElement === "string" || typeof reactElement === "number")
    );
  }

  static getChildrenAsArray(props) {
    const { children = [] } = props || {};
    return !Array.isArray(children) ? [children] : children;
  }

  static setAttributes(domNode, props = {}) {
    const { className, style, ...restProps } = props;

    // Set className
    if (className) {
      domNode.className = className;
    }

    // Set styles
    if (style) {
      Object.entries(style).forEach(([key, value]) => {
        domNode.style[key] = value;
      });
    }

    // Add event listeners and other props
    Object.entries(restProps).forEach(([key, value]) => {
      if (key === "children") {
        return;
      }

      if (/^on.*$/.test(key)) {
        domNode.addEventListener(key.substring(2).toLowerCase(), value);
      } else if (key === "value") {
        domNode.value = value;
      } else {
        domNode.setAttribute(key, value);
      }
    });
  }

  static buildDomNode(reactElement) {
    if (VDomNode.isEmpty(reactElement)) {
      return document.createTextNode(""); // Empty node
    }

    if (VDomNode.isPrimitive(reactElement)) {
      return document.createTextNode(reactElement);
    }

    const { type, props } = reactElement;

    const domNode = document.createElement(type);
    VDomNode.setAttributes(domNode, props);

    return domNode;
  }

  constructor(reactElement) {
    this.currentReactElement = reactElement;
    this.domNode = null;
  }

  getPublicInstance() {
    return this.domNode;
  }

  mount(classCache) {
    const { props } = this.currentReactElement || {};

    this.domNode = VDomNode.buildDomNode(this.currentReactElement);

    const childrenVNodes = VDomNode.getChildrenAsArray(props).map(
      instantiateVNode
    );

    for (const childVNode of childrenVNodes) {
      const childDomNode = childVNode.mount(classCache);
      this.domNode.appendChild(childDomNode);
    }

    return this.domNode;
  }
}

/**
 * VCompositeNode` represents a "virtual" react-component node. Everything
 * else, and by that we mean stateful - or stateless-components should be a
 * VCompositeNode.
 */
class VCompositeNode {
  static isReactClassComponent(type) {
    return type.prototype && type.prototype.isReactComponent;
  }

  static isVCompositeNode(type) {
    return typeof type === "function";
  }

  constructor(reactElement) {
    this.currentReactElement = reactElement;
    this.classInstance = null;
  }

  getPublicInstance() {
    return this.classInstance;
  }

  mount(classCache) {
    const { type, props } = this.currentReactElement;

    let renderedInstance;
    if (VCompositeNode.isReactClassComponent(type)) {
      const cacheIndex = classCache.index++;
      const cachedInstance = classCache.cache[cacheIndex];

      const instance = cachedInstance ? cachedInstance : new type(props);
      instance.props = props;

      classCache.cache[cacheIndex] = instance;

      renderedInstance = instantiateVNode(instance.render());
      this.classInstance = instance;
    } else {
      renderedInstance = instantiateVNode(type(props));
      this.classInstance = null;
    }

    return renderedInstance.mount(classCache);
  }
}

const root = {};

/**
 * With the class-cache we can just replace every node on a render of the DOM
 * and just pop stateful components from the cache whenever we encounter one.
 * That way, we won't loose that state of the component when re-rendering.
 *
 * This is instead of having to traverse the virtual-DOM tree and compare
 * every child-node with it's previous instance and then removing, replacing
 * or appending that child to the node.
 */
const classCache = {
  index: -1,
  cache: [],
};

const instantiateVNode = (reactElement) => {
  const { type } = reactElement || {};

  if (VCompositeNode.isVCompositeNode(type)) {
    return new VCompositeNode(reactElement);
  }

  return new VDomNode(reactElement);
};

const render = (
  reactElement = root.reactElement,
  domContainerNode = root.domContainerNode
) => {
  if (root.domContainerNode) {
    domContainerNode.innerHTML = "";
    classCache.index = -1;
  }

  const vNode = instantiateVNode(reactElement);
  const domNode = vNode.mount(classCache);

  domContainerNode.appendChild(domNode);

  root.reactElement = reactElement;
  root.domContainerNode = domContainerNode;

  return vNode.getPublicInstance();
};

const React = {
  createElement,
  Component,
  render,
};

window.React = React;
