import { createApp } from 'vue';
import Popup from './Popup.vue';
import { initLocale } from '@/shared/i18n';
import '@/ui/styles/tailwind.css';

initLocale().finally(() => createApp(Popup).mount('#app'));
