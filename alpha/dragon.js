/**
 * dragon.js
 * @dragonnomada
 * Alan Badillo Salas - dragonnomada123@gmail.com
 * Abril 2021 version alpha
 * Nano-Librería de construcción de componentes html/css/javascript
 */

function dragon(root = document) {
  for (let node of [...root.querySelectorAll("*")]) {
    if (node.tagName === "TEMPLATE") continue;
    if (node.dragon) continue;
    dragon.inspectAttributes(node);
  }
}

dragon.inspectAttributes = (node) => {
  for (let attributeName of node.getAttributeNames()) {
    if (/^@/.test(attributeName)) {
      const options = node.getAttribute(attributeName);
      const componentName = attributeName.slice(1);

      node.componentName = componentName;

      dragon.setNamespace(node);

      dragon.initialize(node);

      if (componentName === "namespace") continue;

      dragon.createFromTemplate(node, componentName, options);
    }
  }
};

dragon.setNamespace = (node) => {
  let namespace = node.getAttribute("namespace") || null;

  let rootNamespace = null;

  let root = node;

  while (root && root !== document && !rootNamespace) {
    // console.log("root", root.id, root.namespace);
    if (root.namespace) {
      rootNamespace = root.namespace;
      break;
    }
    if (!root.parentElement) break;
    root = root.parentElement;
  }

  rootNamespace = rootNamespace || "document";

  if (namespace) {
    namespace = namespace.replace(/{namespace}/g, rootNamespace);
  } else {
    namespace = rootNamespace;
  }

  node.namespace = namespace;

  console.log("namespace", node.namespace);
};

dragon.initialize = (node) => {
  node.dragon = {
    id: node.id || `node-${Math.random().toString(32).slice(2)}`,
    namespace: node.namespace,
    mounted: null,
    scripts: {
      binds: [],
      hooks: [],
      render: "",
      when: {
        mounted: ""
      },
      on: {}
    },
    state: {},
    listeners: {},
    subscribers: {},
    when: {},
    fallback: node.innerHTML,
    clear: () => {
      // const range = document.createRange();
      // range.selectNodeContents(node);
      // range.deleteContents();
      // node.innerHTML = "";
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
    },
    loadFallback: () => {
      node.innerHTML = node.dragon.fallback;
    },
    subscriber: (namespace) => {
      return {
        off: (channel) => {
          const subscribers = (dragon.subscribers[namespace] =
            dragon.subscribers[namespace] || {});
          const subscriber = (subscribers[node.id] =
            subscribers[node.id] || {});
          delete subscriber[channel];
        },
        on: (channel, handler) => {
          const subscribers = (dragon.subscribers[namespace] =
            dragon.subscribers[namespace] || {});
          const subscriber = (subscribers[node.id] =
            subscribers[node.id] || {});
          subscriber[channel] = handler;
        },
        emit: (channel, ...params) => {
          const subscribers = (dragon.subscribers[namespace] =
            dragon.subscribers[namespace] || {});
          for (let id in subscribers) {
            const subscriber = subscribers[id];
            const handler = subscriber[channel] || (() => {});
            handler(...params);
          }
        }
      };
    },
    listen: (channel, handler) => {
      dragon.listeners[node.id] = dragon.listeners[node.id] || {};
      dragon.listeners[node.id][channel] = handler;
    },
    dispatch: (channel, ...params) => {
      for (let id in dragon.listeners) {
        const listener = dragon.listeners[id] || {};
        const handler = listener[channel] || (() => {});
        handler(...params);
      }
    },
    on: (channel, handler, ...params) => {
      if (/^:/.test(channel)) {
        const channelName = channel.slice(1);
        node.dragon.subscribers[channelName] = handler;
        return;
      }
      if (/^#/.test(channel)) {
        const channelName = channel.slice(1);
        node.dragon[channelName] = handler;
        return;
      }
      if (/^@/.test(channel)) {
        const channelName = channel.slice(1);
        node.dragon.when[channelName] = handler;
        return;
      }
      console.log("on", channel, params);
    },
    bind: (...params) => {
      return new Proxy(
        {},
        {
          get(target, name) {
            let current = null;
            if (node.dragon.mounted) {
              current = node.querySelector(...params);
            } else {
              current = node.dragon.virtualNode.querySelector(...params);
            }
            if (name === current) return current;
            if (typeof current[name] === "function") {
              // console.log("invoke", node.id, name, current[name]);
              return (...params) => {
                current[name](...params);
              };
            }
            return current[name];
          },
          set(target, name, value) {
            let current = null;
            if (node.dragon.mounted) {
              current = node.querySelector(...params);
            } else {
              current = node.dragon.virtualNode.querySelector(...params);
            }
            current[name] = value;
          }
        }
      );
    },
    select: (...params) => {
      if (node.dragon.mounted) return node.querySelector(...params);
      return node.dragon.virtualNode.querySelector(...params);
    },
    selectAll: (...params) => {
      if (node.dragon.mounted) return node.querySelectorAll(...params);
      return node.dragon.virtualNode.querySelectorAll(...params);
    },
    fire: (channel, ...params) => {
      node.dragon.when[channel.replace(/^@/g, "")](...params);
    },
    useContext: (namespace, defaultValue) => {
      namespace = `${node.namespace}/${namespace}`;

      console.log("useContext", node.id, namespace);
      if (Object.keys(dragon.context.shared).indexOf(namespace) < 0) {
        dragon.context.shared[namespace] = {
          value: defaultValue,
          nodes: {}
        };
      }
      dragon.context.shared[namespace].nodes[node.id] = node;
      return [
        dragon.context.shared[namespace].value,
        (value) => {
          console.log(
            "useContext update",
            node.id,
            namespace,
            dragon.context.shared[namespace].value,
            value
          );
          dragon.context.shared[namespace].value = value;
          for (let nodeId in dragon.context.shared[namespace].nodes) {
            dragon.context.shared[namespace].nodes[nodeId].dragon.render();
          }
        }
      ];
    },
    useState: new Proxy(
      {},
      {
        get(_, id) {
          return (defaultValue) => {
            console.log("useState", node.id, id);
            if (Object.keys(node.dragon.state).indexOf(id) < 0) {
              node.dragon.state[id] = defaultValue;
            }
            return [
              node.dragon.state[id],
              (value) => {
                console.log(
                  "useState update",
                  node.id,
                  id,
                  node.dragon.state[id],
                  value
                );
                node.dragon.state[id] = value;
                node.dragon.render();
              }
            ];
          };
        }
      }
    )
  };

  node.id = node.dragon.id;

  dragon.context.nodes[node.id] = node;
};

dragon.createFromTemplate = (node, componentName, options) => {
  const template = document.querySelector(`template[${componentName}]`);

  console.log("@dragon: Template loaded", template);

  if (!template) {
    console.warn("@dragon invalid template", componentName);
    return;
  }

  const virtualNode = document.importNode(template.content, true);

  dragon.loadScripts(node, virtualNode);

  const mountChildren = () => {
    for (let element of [...virtualNode.querySelectorAll(":scope > *")]) {
      if (element.tagName === "SCRIPT") continue;
      if (element.tagName === "STYLE") {
        element.textContent = element.textContent.replace(
          /:scope/g,
          `#${node.id}`
        );
      }
      node.appendChild(element);
    }
  };

  const unmountChildren = () => {
    for (let element of [...node.querySelectorAll(":scope > *")]) {
      virtualNode.appendChild(element);
    }
  };

  node.dragon.template = template;
  node.dragon.virtualNode = virtualNode;
  node.dragon.mountChildren = mountChildren;
  node.dragon.unmountChildren = unmountChildren;

  dragon.mount(node);
};

dragon.loadScripts = (node, virtualNode) => {
  for (let script of [...virtualNode.querySelectorAll("script")]) {
    const code = script.textContent.trim();

    if (script.hasAttribute("ref")) {
      node.dragon.scripts.binds.push(code);
      continue;
    }
    if (script.hasAttribute("hook")) {
      node.dragon.scripts.hooks.push(code);
      continue;
    }
    if (script.hasAttribute("render")) {
      node.dragon.scripts.render = code;
      continue;
    }
    if (script.hasAttribute("mounted")) {
      node.dragon.scripts.when.mounted = code;
      continue;
    }
    for (let attributeName of script.getAttributeNames()) {
      if (/^:/.test(attributeName)) {
        const eventName = attributeName.slice(1);
        node.dragon.scripts.on[eventName] = code;
        continue;
      }
      if (/^@/.test(attributeName)) {
        const eventName = attributeName.slice(1);
        node.dragon.scripts.when[eventName] = code;
        continue;
      }
    }
  }

  node.dragon.stateCount = 0;

  const makeScript = () => {
    const hooks = node.dragon.scripts.hooks
      .map((hook) =>
        hook.replace(/useState/g, () => `useState[${node.dragon.stateCount++}]`)
      )
      .join("\n");

    return `
      (() => {
        const node = dragon.context.nodes["${node.id}"];

        (async ({ ${Object.keys(node.dragon)}, ...lib }) => {
          // binds
          ${node.dragon.scripts.binds.join("\n")}

          // render
          on("#render", async () => {
            console.log("#render", node.id);

            // hooks
            ${hooks}

            ${node.dragon.scripts.render}
          });

          // when
          ${Object.entries(node.dragon.scripts.when)
            .map(
              ([
                eventName,
                code
              ]) => `on("@${eventName}", async (event, ...params) => {
                // hooks
                ${hooks}
                
                ${code}
              });`
            )
            .join("\n")}
          
          // on
          ${Object.entries(node.dragon.scripts.on)
            .map(
              ([
                eventName,
                code
              ]) => `on(":${eventName}", async (event, ...params) => {
                // hooks
                ${hooks}
                
                ${code}
              });`
            )
            .join("\n")}

        })(node.dragon);
      })();
    `;
  };

  node.dragon.makeScript = makeScript;
  node.dragon.script = makeScript();

  // console.log(node.dragon.script);
};

dragon.registerEvents = (node) => {
  for (let element of [...node.querySelectorAll("*")]) {
    for (let elementAttributeName of element.getAttributeNames()) {
      if (/^:/.test(elementAttributeName)) {
        const channel = element
          .getAttribute(elementAttributeName)
          .toLowerCase();
        const eventName = elementAttributeName.slice(1);

        dragon.listenEvent(node, element, eventName, channel);
      }
    }
  }
};

dragon.listenEvent = (node, element, eventName, channel) => {
  const handler = (...params) => {
    if (!node.dragon.mounted) return;
    console.log("event", node.id, eventName, channel);

    const subscriber = node.dragon.subscribers[channel];

    if (typeof subscriber === "function") {
      subscriber(...params);
    }
  };
  // if (node.dragon.listeners[channel]) {
  //   const { element, eventName, handler } = node.dragon.listeners[channel];
  //   element.removeEventListener(eventName, handler);
  //   console.log("remove listener", node.id, eventName, channel);
  // }
  // node.dragon.listeners[channel] = {
  //   eventName,
  //   element,
  //   handler
  // };
  node.dragon.listeners[channel] = node.dragon.listeners[channel] || [];
  node.dragon.listeners[channel].push({
    eventName,
    element,
    handler
  });
  element.addEventListener(eventName, handler);
  console.log("add listener", node.id, eventName, channel);
};

dragon.execScript = (node) => {
  const script = document.createElement("script");
  script.textContent = node.dragon.script;
  if (node.dragon.instancedScript) {
    document.body.removeChild(node.dragon.instancedScript);
  }
  node.dragon.instancedScript = script;
  document.body.appendChild(script);
};

dragon.mount = (node) => {
  node.dragon.clear();

  node.dragon.mountChildren();

  dragon.registerEvents(node);

  dragon.execScript(node);

  node.dragon.mounted = true;

  if (typeof node.dragon.render === "function") {
    node.dragon.render();
  }

  if (node.dragon.when["mounted"]) {
    node.dragon.when["mounted"]();
    dragon(node);
  }
};

dragon.context = {
  subscribers: {},
  listeners: {},
  shared: {},
  nodes: {}
};

(async () => {
  console.log(`dragon.js v0.21.4.8.103 - Dragon Nomada (Alan Badillo Salas)`);

  for (let link of [...document.querySelectorAll(`link[rel="import"]`)]) {
    const response = await fetch(link.href);

    const html = await response.text();

    const div = document.createElement("div");

    div.innerHTML = html;

    for (let template of [...div.querySelectorAll("template")]) {
      document.body.appendChild(template);
    }
  }

  dragon();
})();
