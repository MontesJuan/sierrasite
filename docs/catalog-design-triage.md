# Triage de detector: ampliación de catálogo

99 avisos, todos advisory. No se suprimieron reglas ni archivos. Se quitaron dos etiquetas introductorias redundantes en el componente nuevo; su regla CSS de 11px también se eliminó. Los 64 avisos de globals.css pertenecen a valores anteriores (varios anulados en la cascada v03), sin cambio visual en esta ampliación. Las escalas fluidas de la tienda conservan el tratamiento establecido de SIERRA; no se canoniza CSS antiguo anulado.

| Archivo/línea | Aviso | Resolución |
| --- | --- | --- |
| app/globals.css:85 | Undocumented color #cdb89d is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:138 | Undocumented color #fff9ea is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:175 | font-size: clamp(10px, 1vw, 15px) has fluid endpoint 10px off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:190 | font-size: clamp(20px, 2.1vw, 30px) has fluid endpoints 20px and 30px off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:213 | Undocumented color #f8edda is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:214 | Undocumented color rgba(28, 30, 22, 0.18) is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:232 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:265 | font-size: 20px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:280 | font-size: clamp(2rem, 4vw, 3.5rem) has fluid endpoints 2rem and 3.5rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:336 | Undocumented color #292e24 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:352 | font-size: clamp(2.5rem, 4vw, 4.6rem) has fluid endpoint 4.6rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:355 | Undocumented color #c7ba98 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:370 | Undocumented color #151b17 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:380 | Undocumented color #fff is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:396 | Undocumented color #fff is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:402 | Undocumented color #0002 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:424 | Undocumented color #dcd0ba is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:429 | font-size: 2.6rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:456 | font-size: 14px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:461 | font-size: clamp(22px, 2.5vw, 36px) has fluid endpoints 22px and 36px off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:473 | Undocumented color #292e24 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:492 | Undocumented color #ffffff35 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:497 | font-size: 10px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:498 | Undocumented color #d7cdb8 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:507 | font-size: 17px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:523 | font-size: 14px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:544 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:545 | Undocumented color #615b4d is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:576 | font-size: 22px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:591 | Undocumented color #101711e8 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:610 | font-size: 32px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:625 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:631 | font-size: 30px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:648 | Undocumented color #fff9ea is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:649 | Undocumented color #dcd0ba is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:653 | Undocumented color #0002 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:676 | font-size: 30px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:679 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:699 | font-size: 10px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:710 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:724 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:751 | font-size: 10px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:808 | font-size: 14px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:838 | font-size: 16px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:866 | font-size: 8px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:888 | font-size: 21px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:898 | font-size: 9px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:913 | font-size: 17px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:926 | font-size: 2.6rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:943 | font-size: 2.3rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:977 | font-size: 28px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:982 | font-size: 10px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:985 | font-size: 2.3rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1023 | font-size: 10px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1046 | font-size: 27px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1115 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1155 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1170 | font-size: 16px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1173 | font-size: 16px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1181 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1221 | font-size: 26px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1240 | font-size: 2rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1241 | font-size: 14px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/globals.css:1250 | font-size: 23px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:2 | font-size: clamp(4rem,7vw,6rem) has fluid endpoint 4rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:3 | Undocumented color #e6e1d8 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:3 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:4 | Undocumented color #777 is outside DESIGN.md colors | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:4 | font-size: clamp(2.5rem,3.5vw,4.4rem) has fluid endpoint 4.4rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:4 | font-size: 25px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:5 | font-size: 14px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:5 | font-size: clamp(2.6rem,4.5vw,5rem) has fluid endpoints 2.6rem and 5rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:6 | font-size: 20px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:6 | font-size: 2.3rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:6 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:7 | font-size: 24px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:8 | font-size: clamp(2.6rem,6vw,5rem) has fluid endpoints 2.6rem and 5rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:8 | font-size: 2.4rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:9 | font-size: 2rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:9 | font-size: 2.7rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:10 | font-size: 2.3rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:10 | font-size: 10px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:26 | font-size: 1.8rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:30 | font-size: 20px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:39 | font-size: 2.4rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:43 | font-size: 20px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:57 | font-size: 11px is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:57 | font-size: 1.6rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:57 | font-size: 2rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:62 | font-size: 1.2rem is off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:62 | font-size: clamp(1.7rem,3vw,2.7rem) has fluid endpoints 1.7rem and 2.7rem off the DESIGN.md type ramp | Se conserva: declaración anterior, fuera de este cambio. |
| app/tienda/store.css:64 | font-size: 14px is off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:64 | font-size: clamp(3rem,5vw,5rem) has fluid endpoint 5rem off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:64 | font-size: 11px is off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:64 | font-size: clamp(1.9rem,2.5vw,2.9rem) has fluid endpoints 1.9rem and 2.9rem off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:64 | font-size: 22px is off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:64 | font-size: 10px is off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:65 | font-size: 2rem is off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
| app/tienda/store.css:66 | font-size: 2.6rem is off the DESIGN.md type ramp | Se conserva escala fluida de títulos/etiquetas del catálogo; comprobada visualmente en desktop/móvil. |
