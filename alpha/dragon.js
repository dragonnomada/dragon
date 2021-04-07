/**
 * dragon.js
 * @dragonnomada
 * Alan Badillo Salas - dragonnomada123@gmail.com
 * Abril 2021 version alpha
 * Nano-Librería de construcción de componentes html/css/javascript
 */

const context = {};

(async () => {
  for (let link of [...document.querySelectorAll(`link[rel="import"]`)]) {
    const response = await fetch(link.href);

    const html = await response.text();

    const div = document.createElement("div");

    div.innerHTML = html;

    for (let template of [...div.querySelectorAll("template")]) {
      document.body.append(template);
    }
  }

  for (let node of [...document.querySelectorAll("*")]) {
    if (node.tagName === "TEMPLATE") continue;
    node.id = node.id || `node-${Math.random().toString(32).slice(2)}`;
    for (let attributeName of node.getAttributeNames()) {
      if (/^@/.test(attributeName)) {
        // const options = node.getAttribute(attributeName);
        const componentName = attributeName.slice(1);
        const template = document.querySelector(`template[${componentName}]`);
        let virtualNode = document.importNode(template.content, true);
        node.fallback = node.innerHTML;
        const mount = (clear) => {
          if (node.mounted) {
            // console.log("already mounted", node.mounted);
            return;
          }

          node.clear = clear;

          console.log("mount", node.id);
          // const range = document.createRange();
          // range.selectNodeContents(node);
          // range.deleteContents();
          // node.innerHTML = "";
          while (node.firstChild) {
            node.removeChild(node.firstChild);
          }
          for (let element of [...virtualNode.querySelectorAll("*")]) {
            if (element.tagName === "STYLE") {
              element.textContent = element.textContent.replace(
                /:scope/g,
                `#${node.id}`
              );
            }
            for (let elementAttributeName of element.getAttributeNames()) {
              if (/^:/.test(elementAttributeName)) {
                const eventName = element.getAttribute(elementAttributeName);
                const name = elementAttributeName.slice(1);
                node.listeners = node.listeners || {};
                const handler = (...params) => {
                  if (!node.mounted) return;
                  console.log("event", name, eventName);
                  if (node.subscribers && node.subscribers[eventName]) {
                    const subscriber = node.subscribers[eventName];
                    subscriber(...params);
                  }
                };
                node.listeners[eventName] = {
                  element,
                  handler
                };
                element.addEventListener(name, handler);
                console.log("listen", name, eventName);
              }
            }
            node.append(element);
          }
          node.mounted = true;
          console.log("mounted", node.id);
        };
        const unmount = (clear) => {
          for (let eventName in node.listeners || {}) {
            const { element, handler } = node.listeners[eventName];
            element.removeEventListener(eventName, handler);
          }
          node.listeners = {};

          for (let script of context[node.id].scripts) {
            document.body.removeChild(script);
          }
          context[node.id].scripts = [];

          if (typeof node.clear === "function") {
            node.clear();
          }

          if (typeof clear === "function") {
            clear();
          }

          node.mounted = false;

          for (let element of [...node.querySelectorAll("*")]) {
            virtualNode.append(element);
          }

          node.innerHTML = node.fallback;

          show();

          console.log("unmounted", node.id);
        };
        const show = () => {
          node.hidden = false;
        };
        const hide = () => {
          node.hidden = true;
        };
        const on = (eventName, handler) => {
          node.subscribers = node.subscribers || {};
          node.subscribers[eventName] = handler;
          console.log("subscribe", eventName);
        };
        const select = (...params) => {
          if (node.mounted) return node.querySelector(...params);
          return virtualNode.querySelector(...params);
        };
        const selectAll = (...params) => {
          if (node.mounted) return node.querySelectorAll(...params);
          return virtualNode.querySelectorAll(...params);
        };
        const render = async () => {
          // if (node.mounted) {
          //   unmount();
          // }
          // virtualNode = document.importNode(template.content, true);
          // console.log(virtualNode.textContent);
          for (let proc of context[node.id].process) {
            await proc();
          }
        };
        const useState = (id) => (defaultValue) => {
          if (Object.keys(node.state).indexOf(id) < 0) {
            node.state[id] = defaultValue;
          }
          const setValue = (newValue) => {
            node.state[id] = newValue;
            console.log("update state", node.state[id]);
            render();
          };
          return [node.state[id], setValue];
        };

        node.state = {};

        context[node.id] = {
          mount,
          unmount,
          show,
          hide,
          visible: !node.hidden,
          mounted: node.mounted,
          on,
          select,
          selectAll,
          useState: new Proxy(
            {},
            {
              get(target, id) {
                return useState(id);
              }
            }
          ),
          scripts: [],
          process: []
        };

        let stateCount = 0;
        for (let script of [...virtualNode.querySelectorAll("script")]) {
          console.log(script);
          const newScript = document.createElement("script");
          newScript.textContent = `
              context["${node.id}"].process.push(
                async () => {
                  await (async ({ ${Object.keys(context[node.id]).join(
                    ","
                  )} }) => {
                    ${script.textContent.replace(
                      /useState/g,
                      () => `useState[${stateCount++}]`
                    )}
                  })(context["${node.id}"]);
                }
              );
            `;
          context[node.id].scripts.push(newScript);
          document.body.append(newScript);
        }

        render();
        console.log(componentName, template);
      }
    }
  }
})();
