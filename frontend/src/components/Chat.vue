<template>
  <div>
    <!-- Toggle button when chat is closed -->
    <div v-if="!isOpen" class="chat-toggle" @click="toggleChat">
      💬
    </div>

    <!-- Chat panel -->
    <div v-show="isOpen" class="chat-container">
      <div class="chat-header" @click="toggleChat">
        Chat
        <span class="close-btn">×</span>
      </div>
      <div class="messages" ref="messagesContainer" @scroll.passive="onScroll">
        <div
          v-for="msg in messages"
          :key="msg._id || msg.tempId"
          :class="['message', msg.fromUserId === userId ? 'sent' : 'received']"
        >
          <div v-if="msg.text" class="text" @dblclick="addReaction(msg,'👍')">{{ msg.text }}</div>
          <img
            v-if="msg.imageUrl"
            :src="backendOrigin + msg.imageUrl"
            class="image"
            @click="openImage(msg.imageUrl)"
          />
          <span class="timestamp">{{ formatDate(msg.createdAt) }}</span>
          <span v-for="(r,i) in msg.reactions" :key="i" class="reaction">{{ r.emoji }}</span>
        </div>
      </div>
      <div class="input-area">
        <div v-if="previewUrl" class="preview">
          <img :src="previewUrl" class="preview-img" />
          <progress v-if="uploadProgress>0 && uploadProgress<100" :value="uploadProgress" max="100" class="prog" />
          <button type="button" class="remove-preview" @click="clearFile">×</button>
        </div>
        
        <input
          v-model="newMessage"
          @input="handleTyping"
          @keyup.enter="sendMessage"
          placeholder="Escribe un mensaje..."
        />
        <input type="file" ref="fileInput" @change="handleFile" hidden />
        <button class="attach" type="button" @click="$refs.fileInput.click()">📎 Adjuntar</button>
        <button class="send" type="button" @click="sendMessage">📨 Enviar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import axios from 'axios';

export default {
  name: 'ChatWidget',
  data() {
    return {
      backendOrigin: window.location.origin.replace('8081', '3000'),
      socket: null,
      messages: [],
      newMessage: '',
      isOpen: false,
      userId: localStorage.getItem('username') || 'guest-' + Math.random().toString(36).substring(2, 8),
      pendingFile: null,
      previewUrl: '',
      uploadProgress: 0,
      oldestTs: null,
    };
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleTimeString();
    },
    openImage(url) {
      window.open(this.backendOrigin + url, '_blank');
    },
    handleFile(e) {
      const file = e.target.files[0];
      if (file) {
        this.pendingFile = file;
        this.previewUrl = URL.createObjectURL(file);
      }
    },
    clearFile() {
      this.uploadProgress = 0;
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }
      this.previewUrl = '';
      this.pendingFile = null;
      this.$refs.fileInput.value = '';
    },
    handleTyping() {
      this.socket.emit('typing', { fromUserId: this.userId, toUserId: 'admin', typing: true });
    },
    async sendMessage() {
      if (!this.newMessage.trim() && !this.pendingFile) return;

      let imageUrl = '';
      if (this.pendingFile) {
        try {
          const form = new FormData();
          form.append('image', this.pendingFile);
          const res = await axios.post(this.backendOrigin + '/api/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              if (e.total) this.uploadProgress = Math.round((e.loaded * 100) / e.total);
            },
          });
          imageUrl = res.data.imageUrl;
        } catch (err) {
          console.error(err);
        }
      }

      this.emitMessage({ text: this.newMessage, imageUrl });
      this.newMessage = '';
      this.clearFile();
      this.uploadProgress = 0;
    },
    emitMessage({ text = '', imageUrl = '' }) {
      const payload = {
        fromUserId: this.userId,
        toUserId: 'admin',
        text,
        imageUrl,
      };
      // temp id for optimistic UI
      payload.tempId = Date.now();
      this.messages.push(payload);
      this.$nextTick(() => {
        this.scrollBottom();
        if(!this.oldestTs || payload.createdAt<this.oldestTs) this.oldestTs = payload.createdAt;
      });
      this.socket.emit('chatMessage', payload);
    },
    toggleChat() {
       this.isOpen = !this.isOpen;
       if (this.isOpen) this.$nextTick(() => this.scrollBottom());
     },
     scrollBottom() {
      const el = this.$refs.messagesContainer;
      if (el) el.scrollTop = el.scrollHeight;
    },
    async fetchHistory() {
      try {
        const res = await axios.get(this.backendOrigin + '/api/messages', {
          params: { userId: this.userId },
        });
        this.messages = res.data;
        if(res.data.length) this.oldestTs = res.data[0].createdAt;
        this.$nextTick(() => this.scrollBottom());
      } catch (err) {
        console.error(err);
      }
    },
    onScroll(e) {
      const el = e.target;
      if (el.scrollTop === 0 && this.oldestTs) {
        this.loadMore();
      }
    },
    async loadMore() {
      try {
        const res = await axios.get(this.backendOrigin + '/api/messages', {
          params: { userId: this.userId, oldestTs: this.oldestTs },
        });
        this.messages = [...res.data, ...this.messages];
        if(res.data.length) this.oldestTs = res.data[0].createdAt;
      } catch (err) {
        console.error(err);
      }
    },
    addReaction(msg, emoji) {
      this.socket.emit('reaction', { messageId: msg._id, emoji, userId: this.userId });
    },
  },
  mounted: async function () {
    // Primero obtener el historial
    await this.fetchHistory();

    // Conectar socket.io
    this.socket = io(this.backendOrigin);

    this.socket.on('connect', () => {
      this.socket.emit('register', { userId: this.userId });
      console.log('socket registered');
      console.log('socket connected');
    });

    this.socket.on('reaction',(r)=>{
      const m=this.messages.find(m=>m._id===r.messageId);
      if(m){if(!m.reactions) m.reactions=[]; m.reactions.push({emoji:r.emoji,userId:r.userId});}
    });

    this.socket.on('chatMessage', (msg) => {
      this.messages.push(msg);
      this.$nextTick(() => this.scrollBottom());
    });
  },
};
</script>

<style scoped>
.chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  max-height: 500px;
  background: #000;
  color: #fff;
  border: 1px solid #ccc;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}
.messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}
.message {
  color: #000;
  margin-bottom: 10px;
  max-width: 80%;
  word-wrap: break-word;
}
.sent {
  align-self: flex-end;
  background: #dcf8c6;
  padding: 6px 8px;
  border-radius: 8px 8px 0 8px;
}
.received {
  align-self: flex-start;
  background: #eee;
  padding: 6px 8px;
  border-radius: 8px 8px 8px 0;
}
.image {
  max-width: 100%;
  border-radius: 6px;
  margin-top: 4px;
  cursor: pointer;
}
.input-area {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid #ddd;
  padding: 6px;
  background: #fff;
}
.input-area input {
  flex: 1;
  border: none;
  padding: 10px;
  background: #000000;
  color: #ffffff;
  border-radius: 4px;
}
.input-area button {
  border: none;
  background: #4caf50;
  color: white;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
}
.input-area button.attach {
  background: #1976d2;
}
.input-area button.send:disabled {
  background: #9e9e9e;
  cursor: not-allowed;
}
.chat-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #4caf50;
  color: #fff;
  border: none;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #4caf50;
  color: #fff;
  padding: 8px 12px;
}

.close-btn {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
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
