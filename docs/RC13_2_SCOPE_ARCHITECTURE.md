# RC13.2 — Interfaz unificada por alcance

Todos los perfiles cargan la aplicación principal. Los técnicos cantonales reciben datos filtrados por cantón; los provinciales por provincia. Los cambios de perfiles no administrativos se escriben en un documento de estado dentro de su alcance y nunca reemplazan `plataforma/datos`.

Antes de producción:
- corregir perfiles cantonales con `canton` o `territorioIds`;
- corregir perfiles provinciales con rol provincial y provincia;
- desplegar y revisar `firestore.rules`;
- validar simultaneidad y auditoría.
