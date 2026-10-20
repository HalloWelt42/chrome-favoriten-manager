import '../styles/base.css';
import { mount } from 'svelte';
import Donate from './Donate.svelte';

document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
mount(Donate, { target: document.getElementById('app')! });
