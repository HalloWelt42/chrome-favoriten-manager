import '../styles/base.css';
import { mount } from 'svelte';
import { seedDevStorage } from '../app/devSeed';
import Popup from './Popup.svelte';

void seedDevStorage().finally(() => mount(Popup, { target: document.getElementById('app')! }));
