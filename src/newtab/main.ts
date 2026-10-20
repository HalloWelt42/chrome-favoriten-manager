import '../styles/base.css';
import { mount } from 'svelte';
import { startDevReload } from '../app/devReload';
import { seedDevStorage } from '../app/devSeed';
import App from './App.svelte';

startDevReload();
void seedDevStorage().finally(() => mount(App, { target: document.getElementById('app')! }));
