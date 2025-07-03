<template>
  <div class="admin-chat">
    <div class="sidebar">
      <h3>Usuarios</h3>
      <ul>
        <li v-for="u in users" :key="u" :class="{active: u===currentUser}" @click="selectUser(u)">{{ u }}</li>
      </ul>
    </div>

    <div class="chat-panel" v-if="currentUser">
      <h3>Chat con {{ currentUser }} <small v-if="typingUser && currentUser!=='Todos'">{{ typingUser }} está escribiendo...</small></h3>
      <div class="messages" ref="msgs">
        <div v-for="m in messages" :key="m._id || m.tempId" :class="['msg', m.fromUserId==='admin'?'sent':'received']">
          <div v-if="m.text">{{ m.text }}</div>
          <img v-if="m.imageUrl" :src="backendOrigin + m.imageUrl" class="img" />
        </div>
      </div>
      <div class="input">
        <div v-if="previewUrl" class="preview">
          <img :src="previewUrl" class="preview-img" />
          <button type="button" class="remove-preview" @click="clearFile">×</button>
          <span v-if="uploadProgress>0">Subiendo {{uploadProgress}}%</span>
        </div>
        <input v-model="newMsg" @input="handleTyping" @keyup.enter="send" placeholder="Mensaje..." />
        <input type="file" ref="fileInput" @change="handleFile" hidden />
        <button type="button" @click="$refs.fileInput.click()">📎</button>
        <button type="button" @click="send">Enviar</button>
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
      uploadProgress: 0,
      typingUser: '',
      pendingFile: null,
      previewUrl: '',
      _typingTimeout: null,
    };
  },
  methods: {
    handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.pendingFile = file;
      this.previewUrl = URL.createObjectURL(file);
      this.uploadProgress = 0;
    },
    clearFile() {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = '';
      this.pendingFile = null;
      this.$refs.fileInput.value = '';
      this.uploadProgress = 0;
    },
    async loadUsers() {
      const { data } = await axios.get(this.backendOrigin + '/api/chat/users');
      // Añadimos opción para ver todas las quejas
      this.users = ['Todos', ...data];
    },
    async selectUser(u) {
      this.currentUser = u;
      this.messages = [];
      const param = u === 'Todos' ? 'all' : u;
      const { data } = await axios.get(this.backendOrigin + '/api/messages', { params: { userId: param } });
      this.messages = data;
      this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
    },
    handleTyping() {
      if(this.currentUser!=='Todos') this.socket.emit('typing',{fromUserId:'admin',toUserId:this.currentUser,typing:true});
    },
    async send() {
      // No permitimos enviar si está seleccionada la vista global
      if (this.currentUser === 'Todos') return;
      if (!this.newMsg.trim() && !this.pendingFile) return;
      let imageUrl = '';
      if (this.pendingFile) {
        try {
          const form = new FormData();
          form.append('image', this.pendingFile);
          const res = await axios.post(this.backendOrigin + '/api/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: e => { if(e.total) this.uploadProgress = Math.round(e.loaded*100/e.total); }
          });
          imageUrl = res.data.imageUrl;
        } catch (err) {
          console.error(err);
        }
      }
      const payload = {
        fromUserId: 'admin',
        toUserId: this.currentUser,
        text: this.newMsg,
        imageUrl,
        tempId: Date.now(),
      };
      this.messages.push(payload);
      this.socket.emit('chatMessage', payload);
      this.uploadProgress = 0;
      this.newMsg = '';
      this.clearFile();
      this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
    },
  },
  async mounted() {
    await this.loadUsers();
    this.socket = io(this.backendOrigin);
    this.socket.emit('register', { userId: 'admin' });
    this.socket.on('chatMessage', (m) => {
      if (this.currentUser === 'Todos') {
        if (m.toUserId === 'admin' || m.fromUserId === 'admin') {
          this.messages.push(m);
          this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
        }
      } else if (m.fromUserId === this.currentUser || m.toUserId === this.currentUser) {
        this.messages.push(m);
        this.$nextTick(() => (this.$refs.msgs.scrollTop = this.$refs.msgs.scrollHeight));
      }
      if (!this.users.includes(m.fromUserId) && m.fromUserId !== 'admin') this.users.push(m.fromUserId);
    });

    this.socket.on('typing', (p) => {
      if(this.currentUser!=='Todos' && p.fromUserId===this.currentUser) {
        this.typingUser = p.fromUserId;
        clearTimeout(this._typingTimeout);
        this._typingTimeout = setTimeout(()=>{this.typingUser='';},1500);
      }
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
.preview {
  display: flex;
  align-items: center;
  gap: 4px;
}
.preview-img {
  max-width: 60px;
  max-height: 60px;
  border-radius: 4px;
}
.remove-preview {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}
</style>
