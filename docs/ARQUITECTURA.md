# Arquitectura — Sprint 1.2A

SmartRisk CZ5 mantiene una arquitectura frontend modular sin dependencias externas.

## Core

- constants
- config
- storage
- utils
- theme
- router

## Datos

- mock-data

## Componentes

- icon
- button
- card
- table
- chart
- modal
- loader
- toast
- sidebar
- navbar

## Módulos

- dashboard
- territorios
- instituciones
- sitios
- acciones

## Decisiones técnicas

- Enrutamiento por hash para compatibilidad con GitHub Pages.
- SVG embebido para evitar dependencias.
- CSS variables para temas.
- LocalStorage para preferencias visuales.
- Datos demostrativos desacoplados en `mock-data.js`.
