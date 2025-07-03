<template>
  <div class="admin-chat">
    <div class="sidebar">
      <h3>Usuarios</h3>
      <ul>
        <li v-for="u in users" :key="u" :class="{active: u===currentUser}" @click="selectUser(u)">{{ u }}</li>
      </ul>
    </div>

    <div class="chat-panel" v-if="currentUser">
      <h3>Chat con {{ currentUser }}</h3>
      <div class="messages" ref="msgs">
        <div v-for="m in messages" :key="m._id || m.tempId" :class="['msg', m.fromUserId==='admin'?'sent':'received']">
          <div v-if="m.text">{{ m.text }}</div>
          <img v-if="m.imageUrl" :src="backendOrigin + m.imageUrl" class="img" />
        </div>
      </div>
      <div class="input">
        <input v-model="newMsg" @keyup.enter="send" placeholder="Mensaje..." />
        <input type="file" ref="fileInput" @change="handleFile" hidden />
        <button type="button" @click="send">Enviar</button>
        <button type="button" @click="$refs.fileInput.click()">📎</button>
      </div>
    </div>
    <div v-else class="placeholder">Selecciona un usuario</div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import axios from 'axios';
export default {
  name: 'AdminChat',
  data() {
    return {
      backendOrigin: window.location.origin.replace('8081', '3000'),
      socket: null,
      users: [],
      currentUser: '',
      messages: [],
      newMsg: '',
    };
  },
  methods: {
    async handleFile(e) {
      const file = e.target.files[0];
      if (!file || !this.currentUser) return;
      try {
        const form = new FormData();
        form.append('image', file);
        const res = await axios.post(this.backendOrigin + '/api/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const payload = {
          fromUserId: 'admin',
          toUserId: this.currentUser,
          text: this.newMsg,
          imageUrl: res.data.imageUrl,
          tempId: Date.now(),
        };
        this.messages.push(payload);
        this.socket.emit('chatMessage', payload);
        this.newMsg = '';
        this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
      } catch (err) {
        console.error(err);
      }
    },
    async loadUsers() {
      const { data } = await axios.get(this.backendOrigin + '/api/chat/users');
      this.users = data;
    },
    async selectUser(u) {
      this.currentUser = u;
      this.messages = [];
      const { data } = await axios.get(this.backendOrigin + '/api/messages', { params: { userId: u } });
      this.messages = data;
      this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
    },
    send() {
      if (!this.newMsg.trim()) return;
      const payload = {
        fromUserId: 'admin',
        toUserId: this.currentUser,
        text: this.newMsg,
        imageUrl: '',
        tempId: Date.now(),
      };
      this.messages.push(payload);
      this.socket.emit('chatMessage', payload);
      this.newMsg = '';
      this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
    },
  },
  async mounted() {
    await this.loadUsers();
    this.socket = io(this.backendOrigin);
    this.socket.emit('register', { userId: 'admin' });
    this.socket.on('chatMessage', (m) => {
      if (m.fromUserId === this.currentUser || m.toUserId === this.currentUser) {
        this.messages.push(m);
        this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
      }
      if (!this.users.includes(m.fromUserId) && m.fromUserId !== 'admin') this.users.push(m.fromUserId);
    });
  },
};
</script>

<style scoped>
.admin-chat {
  display: flex;
  height: 90vh;
}
.sidebar {
  width: 200px;
  border-right: 1px solid #ccc;
  padding: 10px;
  overflow-y: auto;
}
.sidebar ul {
  list-style: none;
  padding: 0;
}
.sidebar li {
  padding: 6px;
  cursor: pointer;
}
.sidebar li.active {
  background: #4caf50;
  color: #fff;
}
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}
.msg.sent { text-align:right;}
.msg img { max-width:150px; }
.input { display:flex; gap:6px; padding:8px; border-top:1px solid #ccc; }
.input input{flex:1;padding:8px;}
</style>
