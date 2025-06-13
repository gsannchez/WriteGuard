# WriteGuard

WriteGuard es una aplicación de escritorio inteligente que corrige automáticamente el texto que copias al portapapeles, mejorando la calidad de tu escritura en tiempo real.

## Características

- ✅ Corrección automática de texto
- 📋 Monitoreo del portapapeles
- 🔔 Notificaciones del sistema
- 📚 Historial de correcciones
- 🧪 Modo de prueba local
- 📝 Sistema de logging
- ⚙️ Configuración persistente
- 🔄 Actualizaciones automáticas
- 🖥️ Multiplataforma (Windows, macOS, Linux)

## Instalación

### Windows

1. Descarga el instalador `.exe` desde la [página de releases](https://github.com/yourusername/writeguard/releases)
2. Ejecuta el instalador y sigue las instrucciones
3. La aplicación se instalará y creará accesos directos en el escritorio y menú inicio

### macOS

1. Descarga el archivo `.dmg` desde la [página de releases](https://github.com/yourusername/writeguard/releases)
2. Abre el archivo `.dmg` y arrastra WriteGuard a la carpeta Aplicaciones
3. Ejecuta WriteGuard desde la carpeta Aplicaciones

### Linux

#### AppImage
1. Descarga el archivo `.AppImage` desde la [página de releases](https://github.com/yourusername/writeguard/releases)
2. Haz el archivo ejecutable: `chmod +x WriteGuard-*.AppImage`
3. Ejecuta el archivo: `./WriteGuard-*.AppImage`

#### Debian/Ubuntu
1. Descarga el archivo `.deb` desde la [página de releases](https://github.com/yourusername/writeguard/releases)
2. Instala el paquete: `sudo dpkg -i writeguard_*.deb`
3. Ejecuta WriteGuard desde el menú de aplicaciones

## Configuración

WriteGuard se puede configurar a través del panel de control:

- **Apariencia**
  - Tema claro/oscuro
  - Personalización de notificaciones

- **Comportamiento**
  - Inicio automático con el sistema
  - Sonido de notificaciones
  - Intervalo de verificación

- **Backend**
  - URL del servidor
  - Modo de prueba local
  - Nivel de logging

## Desarrollo

### Requisitos

- Node.js 18+
- npm 9+

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/yourusername/writeguard.git
cd writeguard

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run electron:dev

# Construir la aplicación
npm run electron:build
```

### Scripts disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación
- `npm run electron:dev`: Inicia la aplicación en modo desarrollo
- `npm run electron:build`: Construye la aplicación para distribución
- `npm run pack`: Crea un paquete sin instalador
- `npm run dist`: Crea instaladores para todas las plataformas

## Contribuir

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

WriteGuard Team - [@writeguard](https://twitter.com/writeguard)

Link del proyecto: [https://github.com/yourusername/writeguard](https://github.com/gsannchez/writeguard)
