import '../styles/base.css';
import { mount } from 'svelte';
import { startDevReload } from '../app/devReload';
import App from './App.svelte';

startDevReload();
mount(App, { target: document.getElementById('app')! });
