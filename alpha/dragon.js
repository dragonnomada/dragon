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
        const attribute = node.getAttribute(attributeName);
        const options = attribute.value;
        const componentName = attributeName.slice(1);
        const template = document.querySelector(`template[${componentName}]`);
        const virtualNode = document.importNode(template.content, true);
        node.fallback = node.innerHTML;
        let mounted = false;
        const mount = (clear) => {
          node.clear = clear || (() => {});

          console.log("mount", node.id);
          const range = document.createRange();
          range.selectNodeContents(node);
          range.deleteContents();
          // node.innerHTML = "";
          // while (node.firstChild) {
          //   node.removeChild(node.firstChild);
          // }
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
                  console.log("event", name, eventName);
                  for (let subscriber of (node.subscribers || {})[eventName] ||
                    []) {
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
          mounted = true;
          console.log("mounted", node.id);
        };
        const unmount = (clear) => {
          for (let eventName in node.listeners || {}) {
            const { element, handler } = node.listeners[eventName];
            element.removeEventListener(eventName, handler);
          }

          for (let script of context[node.id].scripts) {
            document.body.removeChild(script);
          }

          node.clear();

          if (typeof clear === "function") {
            clear();
          }

          mounted = false;

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
          node.subscribers[eventName] = node.subscribers[eventName] || [];
          node.subscribers[eventName].push(handler);
          console.log("subscribe", eventName);
        };

        context[node.id] = {
          mount,
          unmount,
          show,
          hide,
          visible: !node.hidden,
          mounted,
          on,
          scripts: []
        };

        for (let script of [...virtualNode.querySelectorAll("script")]) {
          const newScript = document.createElement("script");
          newScript.textContent = `
            (async ({ ${Object.keys(context[node.id]).join(",")} }) => {
              ${script.textContent}
            })(context["${node.id}"]);
          `;
          context[node.id].scripts.push(newScript);
          document.body.append(newScript);
        }
        console.log(componentName, template);
      }
    }
  }
})();
