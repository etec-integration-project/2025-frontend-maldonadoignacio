import { createRouter, createWebHistory } from 'vue-router';
import UserLogin from '../components/UserLogin.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/HomePage.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../components/UserRegister.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: UserLogin,
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../components/AdminChat.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
