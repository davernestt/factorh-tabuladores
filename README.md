# FactoRH — Tabuladores salariales

Base del sistema de tabuladores salariales de FactoRH, creada con Next.js y el template oficial `with-supabase`.

## Cómo abrir el proyecto en Windows

Estas instrucciones están pensadas para David y se ejecutan en **PowerShell**.

### 1. Abrir PowerShell

Presiona la tecla de Windows, escribe `PowerShell` y abre la aplicación.

### 2. Entrar a la carpeta del proyecto

Copia este comando completo, pégalo en PowerShell y presiona Enter:

```powershell
cd "C:\Users\LENOVO\OneDrive\Escritorio\Proyectos\factorh-tabuladores"
```

### 3. Instalar las dependencias

Este paso prepara las herramientas que necesita el proyecto. Ejecútalo la primera vez o cuando cambien las dependencias:

```powershell
npm install
```

Espera hasta que PowerShell termine y vuelva a mostrar una línea para escribir comandos.

### 4. Iniciar la aplicación

```powershell
npm run dev
```

Cuando aparezca el mensaje indicando que el servidor está listo, no cierres esa ventana de PowerShell mientras uses la aplicación.

### 5. Abrir la aplicación

Abre tu navegador (Chrome, Edge o Firefox) y visita:

<http://localhost:3000>

Para detener la aplicación, regresa a PowerShell y presiona `Ctrl + C`.

> Si PowerShell muestra el mensaje “la ejecución de scripts está deshabilitada”, usa `npm.cmd install` y `npm.cmd run dev` en lugar de los dos comandos `npm` anteriores. Hacen exactamente lo mismo y no requieren cambiar la seguridad de Windows.

## Configuración de Supabase

El archivo `.env.example` muestra las variables que necesitará el proyecto, pero no contiene claves reales. Cuando se configure Supabase:

1. Copia `.env.example` con el nombre `.env.local`.
2. Completa en `.env.local` la URL y la clave publicable del proyecto de Supabase.
3. Nunca compartas ni subas `.env.local` a GitHub.

La aplicación base puede mostrar un aviso de que faltan variables de Supabase hasta que se agreguen valores reales. Esto es normal. El archivo `.gitignore` ya protege `.env.local`.

## Comandos disponibles

- `npm run dev`: inicia la aplicación para trabajar localmente.
- `npm run build`: comprueba y genera la versión lista para producción.
- `npm start`: inicia la versión de producción después de ejecutar `npm run build`.
- `npm run lint`: revisa la calidad del código.

## Base técnica conservada

El proyecto mantiene el template original `with-supabase`, incluyendo Next.js App Router, autenticación con Supabase SSR, Tailwind CSS y componentes shadcn/ui. Todavía no incluye módulos de negocio de tabuladores salariales.
