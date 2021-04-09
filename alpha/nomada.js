/**
 * nomada.js
 * @dragonnomada
 * Alan Badillo Salas - dragonnomada123@gmail.com
 * Abril 2021 version alpha
 * Nano-Librería de construcción de componentes html/css/javascript
 */

async function nomada(template) {
  if (!(template instanceof HTMLElement) || template.tagName !== "TEMPLATE") {
    console.warn(
      `Invalid template artifact. (Maybe is not a template)`,
      template
    );
    return;
  }

  const artifactName = template.getAttribute("artifact");

  if (!/^[a-z-]+$/.test(artifactName)) {
    console.warn(
      `Artifact *${artifactName || "undefinded"}* is not a valid name`
    );
    return;
  }

  const virtualNode = document.importNode(template.content, true);

  const [script, ...otherScripts] =
    [...virtualNode.querySelectorAll("script")] || [];

  if (otherScripts.length > 0) {
    console.warn(
      `Template contains other scripts, they will be ignored.`,
      otherScripts
    );
  }

  const node = document.createElement("div");

  node.nomada = {
    id: `nomada-${Math.random().toString(32).slice(2)}`
  };

  nomada.nodes[node.nomada.id] = node;

  node.id = node.nomada.id;

  const hookCount = nomada.hooks.reduce(
    (hooks, name) => ({ ...hooks, [name]: 0 }),
    {}
  );

  console.log("HOOK COUNT", nomada.hooks);

  node.nomada.handlers = {};
  node.nomada.hooks = {};

  node.nomada.scriptCode = `
        (async (node) => {
            // render
            const render = (parts, ...replaces) => {
                let html = "";
                let children = {};
                for (let i = 0; i < parts.length; i++) {
                    let replace = replaces[i];
                    // console.log(i, replace);
                    if (replace === undefined || replace === null) {
                        replace = "";
                    } else if (replace instanceof HTMLElement) {
                        const id = Math.random().toString(32).slice(2);
                        children[id] = replace;
                        replace = \`<div data-ref="\${id}"></div>\`;
                    } else if (typeof replace === "function") {
                        const id = Math.random().toString(32).slice(2);
                        node.nomada.handlers[id] = replace;
                        replace = \`nomada.handle('\${node.nomada.id}', '\${id}')(event, this)\`;
                    }
                    html += \`\${parts[i]}\${replace}\`;
                }
                // console.log(html);
                node.innerHTML = html;

                for (let [id, child] of Object.entries(children)) {
                    const div = node.querySelector(\`[data-ref="\${id}"]\`);
                    if (child.nomada) {
                        console.log("nomada child", child);
                        child.nomada.mount(div).catch(error => {
                            console.warn("nomada child error", node, child, error);
                        });
                        continue;
                    }
                    div.appendChild(child);
                }
            };

            node.nomada.render = () => {
                const html = render;

                ${script.textContent.replace(
                  /use[A-Z][A-Za-z]+/g,
                  (hook) => `${hook}(node, ${hookCount[hook]++})`
                )}
            };
        })(nomada.nodes["${node.nomada.id}"])
    `;

  node.nomada.mount = async (root) => {
    console.log(`mounting...`, node.nomada.id);

    node.nomada.mounted = true;

    const nodeScript = document.createElement("script");

    nodeScript.textContent = `
            (async (node) => {
                console.log("Artifact ", node.nomada.id ," is mounting...");
                
                await ${node.nomada.scriptCode}

                node.nomada.render();

                console.log("Artifact ", node.nomada.id ," mounted");
            })(nomada.nodes["${node.nomada.id}"]);
        `;

    node.nomada.script = nodeScript;

    if (root) {
      root.appendChild(nodeScript);
      root.appendChild(node);
    }
  };

  return node;
}

nomada.hooks = [];
nomada.nodes = {};

nomada.handle = (nomadaId, handlerId) => (event, target) => {
  const node = nomada.nodes[nomadaId];
  // console.log("handle", nomadaId, handlerId, node, node.nomada);
  node.nomada.handlers[handlerId](event, target);
};

nomada.main = async () => {
  console.log(`nomada.js v0.21.4.8.2359 - By Dragon Nomada`);

  const mainTemplate = document.querySelector("template[artifact='main']");

  if (mainTemplate) {
    const main = await nomada(mainTemplate);

    main.nomada.mount(document.body);
  }
};
