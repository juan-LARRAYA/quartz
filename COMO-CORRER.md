# Cómo levantar el wiki

```bash
cd ~/Desktop/coach/knowledge-site
./preview.sh
```

Abre http://localhost:8080 en el browser.

Sirve el wiki en http://localhost:8080. Sin live reload — para ver cambios, corré `./preview.sh` de nuevo.

Para hacer solo el build sin servidor:

```bash
cd ~/Desktop/coach/knowledge-site
npx quartz build -d ../knowledge
```

`content` es un symlink a `../knowledge`: Quartz visualiza la base versionada
sin crear una segunda copia del conocimiento. El comando usa la ruta real para
que Quartz también pueda leer correctamente las fechas desde Git.
