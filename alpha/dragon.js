/**
* dragon.js
* @dragonnomada
* Alan Badillo Salas - dragonnomada123@gmail.com
* Abril 2021 version alpha
* Nano-Librería de construcción de componentes html/css/javascript
*/

function dragon(handler, parent = document.body) {
  const node = document.createElement("div");
  node.id = `node-${Math.random().toString(32).slice(2)}`;
  node.root =
    parent instanceof HTMLElement
      ? parent
      : document.querySelector(parent);
  node.css = ([css]) => {
    console.log(css);
    const style = document.createElement("style");
    style.textContent = `\n${css}`.replace(
      /\n\s*[^\n\{]+\{/g,
      (w) => `\n#${node.id} > ${w.trim()}`
    );
    // node.root.append(style);
    node.append(style);
  };
  node.html = ([html]) => {
    console.log(html);
    const div = document.createElement("div");
    div.innerHTML = html;
    // node.append(div);
    for (let element of [...div.querySelectorAll("*")]) {
      node.append(element);
    }
  };
  node.select = (...params) => {
    return node.querySelector(...params);
  };
  node.selectAll = (...params) => {
    return node.querySelectorAll(...params);
  };
  node.root.append(node);
  handler(node);
}
