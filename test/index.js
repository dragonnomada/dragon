<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>
  </head>
  <body>
    <script src="../alpha/dragon.js"></script>
    <script>
      dragon(({ css, html, select }) => {
        css`
          span {
            color: red;
          }
          button {
            color: blue;
          }
        `;

        html`
          <span>Hola</span>
          <button>Hola</button>
        `;

        const span = select`span`;
        span.textContent = "Hola mundo";

        let count = 0;

        const button = select`button`;

        button.addEventListener("click", () => {
          span.textContent = `clicks: ${++count}`;
        });
      });
    </script>
  </body>
</html>