import { createApp } from 'vue';
import Dashboard from './Dashboard.vue';
import { initLocale } from '@/shared/i18n';
import '@/ui/styles/tailwind.css';

initLocale().finally(() => createApp(Dashboard).mount('#app'));
