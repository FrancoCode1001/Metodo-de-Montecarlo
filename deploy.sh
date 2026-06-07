#!/usr/bin/env sh

# Abortar el script si ocurre algún error
set -e

# 1. Compilar el proyecto para producción
echo "Compilando el proyecto..."
npm run build

# 2. Navegar a la carpeta de salida de la compilación
# Nota: Si usas Create React App cambia 'dist' por 'build'
cd dist

# 3. Inicializar un repositorio Git temporal dentro de la carpeta de producción
echo "Inicializando repositorio temporal en producción..."
git init
git checkout -b gh-pages
git add -A
git commit -m 'deploy: simulación montecarlo'

# 4. Desplegar en la rama gh-pages de tu repositorio
# ⚠️ REEMPLAZA con tu usuario y el nombre exacto de tu repositorio de GitHub:
git push -f git@github.com:FrancoCode1001/Metodo-de-Montecarlo.git gh-pages

cd -

echo "🚀 ¡Despliegue completado con éxito!"