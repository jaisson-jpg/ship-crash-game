# 📱 Como Acessar o Ship Crash no Celular

## 🚀 Servidor Configurado

O servidor está configurado para aceitar conexões externas e funcionar no celular.

### 📋 Informações do Servidor

- **IP Local**: 192.168.100.45
- **Porta**: 3000
- **URL Local**: http://localhost:3000
- **URL Externa**: http://192.168.100.45:3000

## 📱 Como Acessar no Celular

### 1. **Certifique-se que o celular e PC estão na mesma rede WiFi**

### 2. **Acesse no navegador do celular:**
```
http://192.168.100.45:3000
```

### 3. **Se não funcionar, tente:**
- Verificar se o firewall do Windows está bloqueando
- Verificar se o antivírus está bloqueando
- Tentar outros IPs da rede

## 🔧 Solução de Problemas

### **Se não conseguir acessar:**

1. **Verificar se o servidor está rodando:**
   ```bash
   netstat -ano | findstr :3000
   ```

2. **Verificar firewall do Windows:**
   - Abrir "Firewall do Windows Defender"
   - Permitir Node.js nas regras de entrada

3. **Verificar antivírus:**
   - Adicionar exceção para a porta 3000

4. **Testar conectividade:**
   ```bash
   ping 192.168.100.45
   ```

### **Se o IP mudar:**

1. **Obter novo IP:**
   ```bash
   ipconfig | findstr "IPv4"
   ```

2. **Atualizar URL no celular**

## 📱 Funcionalidades no Celular

- ✅ **Login/Registro** - Funciona normalmente
- ✅ **Jogo Crash** - Interface responsiva
- ✅ **WebSocket** - Comunicação em tempo real
- ✅ **Sistema de Promotores** - Todas as funcionalidades

## 🎮 Dicas para Uso no Celular

1. **Adicionar à tela inicial** - Para acesso rápido
2. **Usar modo paisagem** - Melhor experiência no jogo
3. **Verificar conexão WiFi** - Para estabilidade

## 🔄 Scripts Úteis

### **Iniciar servidor com informações do IP:**
```bash
npm run mobile
```

### **Iniciar servidor normal:**
```bash
npm start
```

### **Iniciar com auto-reload (desenvolvimento):**
```bash
npm run dev
```

## 📞 Suporte

Se tiver problemas:
1. Verificar se PC e celular estão na mesma rede
2. Tentar acessar pelo IP correto
3. Verificar se o servidor está rodando
4. Testar no navegador do PC primeiro

---

**🎯 Agora você pode jogar Ship Crash no seu celular!** 