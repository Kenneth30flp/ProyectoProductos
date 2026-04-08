# 🧾 ProyectoProductos

**Sistema Web de Gestión de Productos**

---

## 📌 Descripción

Proyecto web desarrollado para la gestión integral de productos, proveedores, distribución, salidas y reportes.
El sistema permite administrar información de manera eficiente mediante una interfaz web estructurada y una base de datos en SQL Server.

---

## 🎓 Información Académica

* **Universidad:** Universidad de San Carlos de Guatemala (CUNOR)
* **Curso:** Sistemas de Bases de Datos / Desarrollo Web
* **Estudiante:** Kenneth Christian Arnaldo Téllez
* **Año:** 2026

---

## 🛠️ Tecnologías Utilizadas

* **Backend:** Node.js, Express
* **Frontend:** EJS, HTML, CSS
* **Base de Datos:** SQL Server
* **Control de versiones:** Git & GitHub

---

## 📂 Estructura del Proyecto

```
ProyectoProductos/
│
├── database/
│   └── database.sql
│
├── src/
│   ├── controllers/
│   ├── middlewares/
│   ├── public/
│   ├── routes/
│   ├── views/
│   ├── db.js
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

---

## ⚙️ Instalación y Ejecución

### 1. Clonar el repositorio

```
git clone https://github.com/Kenneth30flp/ProyectoProductos.git
```

### 2. Acceder al proyecto

```
cd ProyectoProductos
```

### 3. Instalar dependencias

```
npm install
```

### 4. Configurar variables de entorno

Crear un archivo `.env` basado en `.env.example`:

```
PORT=3000
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_SERVER=localhost
DB_DATABASE=ProyectoProductos
DB_PORT=1433
```

---

### 5. Configurar la base de datos

1. Abrir SQL Server Management Studio
2. Crear una base de datos llamada: `ProyectoProductos`
3. Ejecutar el archivo:

```
database/database.sql
```

---

### 6. Ejecutar el sistema

```
node src/server.js
```

---

## 🔐 Funcionalidades Principales

* Gestión de productos
* Gestión de proveedores
* Registro de salidas
* Módulo de distribución
* Reportes del sistema
* Autenticación de usuarios

---

## ⚠️ Consideraciones

* El sistema requiere SQL Server instalado localmente
* Es necesario configurar correctamente el archivo `.env`
* No incluye despliegue en servidor (solo entorno local)

---

## 👨‍💻 Autor

**Kenneth Christian Arnaldo Téllez**

---

## 📎 Repositorio

🔗 https://github.com/Kenneth30flp/ProyectoProductos
