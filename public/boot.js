// El import dinámico permite informar un módulo faltante en vez de dejar el spinner.
import {start} from './startup.js';
await start(()=>import('./app.js'));
